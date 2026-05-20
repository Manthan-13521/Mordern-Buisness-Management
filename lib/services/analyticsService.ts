import { dbConnect } from "@/lib/mongodb";
import { Organization } from "@/models/Organization";
import { Pool } from "@/models/Pool";
import { Hostel } from "@/models/Hostel";
import { Business } from "@/models/Business";
import { Member } from "@/models/Member";

export type OrganizationHealth = {
    _id: string;
    name: string;
    plan: string;
    status: string;
    revenue: number;
    risk: "green" | "yellow" | "red";
    trialEndsAt?: Date;
    currentPeriodEnd?: Date;
    referralCodeUsed: string | null;
    discountApplied: number;
};

export type TimelinePoint = {
    month: string;
    pool: number;
    hostel: number;
    business: number;
    active: number;
};

export type EcosystemSnapshot = {
    kpis: {
        activeOrgs: number;
        trialOrgs: number;
        expiringSoon: number;
        expiredOrgs: number;
        totalPools: number;
        totalHostels: number;
        totalBusinesses: number;
        totalMembers: number;
        conversionRate: number;
    };
    timeline: TimelinePoint[];
    validatedOrgs: any[]; // The sanitized array of orgs for downstream logic
    activePoolIds: Set<string>;
    activeHostelIds: Set<string>;
    activeBusinessIds: Set<string>;
};

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export async function getEcosystemSnapshot(): Promise<EcosystemSnapshot> {
    await dbConnect();

    const now = new Date();
    const twoDaysFromNow = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);

    const [
        allOrgsRaw,
        allPoolsRaw,
        allHostelsRaw,
        allBusinessesRaw,
        totalMembers,
    ] = await Promise.all([
        Organization.find({}).populate("planId").lean(),
        Pool.find({}).select("poolId status createdAt").lean(),
        Hostel.find({}).select("hostelId status createdAt").lean(),
        Business.find({}).select("businessId isActive createdAt").lean(),
        Member.countDocuments({}),
    ]);

    const allOrgs = allOrgsRaw as any[];
    const allPools = allPoolsRaw as any[];
    const allHostels = allHostelsRaw as any[];
    const allBusinesses = allBusinessesRaw as any[];

    // 2. Add Status Validation for Subtenants
    const activePools = allPools.filter(p => p.status === "ACTIVE");
    const activeHostels = allHostels.filter(h => h.status === "ACTIVE");
    const activeBusinesses = allBusinesses.filter(b => b.isActive === true);

    const activePoolIds = new Set(activePools.map(p => p.poolId));
    const activeHostelIds = new Set(activeHostels.map(h => h.hostelId));
    const activeBusinessIds = new Set(activeBusinesses.map(b => b.businessId));

    // Core validation rule: isOrgEffectivelyActive
    const isOrgEffectivelyActive = (o: any) => {
        // Exclude completely deleted or suspended org records if such flags exist
        if (o.isDeleted === true || o.deletedAt) return false;
        if (o.status === "suspended") return false;

        // Exclude SuperAdmins from SaaS metrics
        if (o.isSuperAdmin) return false;

        const hasActivePool = o.poolIds?.some((id: string) => activePoolIds.has(id));
        const hasActiveHostel = o.hostelIds?.some((id: string) => activeHostelIds.has(id));
        const hasActiveBusiness = o.businessIds?.some((id: string) => activeBusinessIds.has(id));
        
        // If the org has any sub-tenants registered, at least one MUST be active
        if ((o.poolIds?.length || 0) + (o.hostelIds?.length || 0) + (o.businessIds?.length || 0) > 0) {
            return hasActivePool || hasActiveHostel || hasActiveBusiness;
        }
        // If it has NO sub-tenants, it's just an empty shell. We don't count empty shells as "Active Organizations"
        return false;
    };

    // 1. Deduplicate Organizations Safely
    const uniqueOrgIds = new Set<string>();
    const deduplicatedOrgs = allOrgs.filter(org => {
        const id = org._id?.toString();
        if (!id || uniqueOrgIds.has(id)) return false;
        uniqueOrgIds.add(id);
        return true;
    }).map(org => {
        return {
            ...org,
            _isEffectivelyActive: isOrgEffectivelyActive(org)
        };
    });

    // Filter Orgs
    const activeOrgs = deduplicatedOrgs.filter((o: any) => o.status === "active" && o._isEffectivelyActive);
    const trialOrgs = deduplicatedOrgs.filter((o: any) => o.status === "trial" && o._isEffectivelyActive);
    const expiredOrgs = deduplicatedOrgs.filter((o: any) => o.status === "expired" || (o.status === "active" && !o._isEffectivelyActive));

    // Expiring soon: trial ending in <2 days OR subscription ending in <2 days
    const expiringSoon = deduplicatedOrgs.filter((o: any) => {
        if (!o._isEffectivelyActive) return false;
        if (o.status === "trial" && o.trialEndsAt && new Date(o.trialEndsAt) <= twoDaysFromNow && new Date(o.trialEndsAt) > now) return true;
        if (o.status === "active" && o.currentPeriodEnd && new Date(o.currentPeriodEnd) <= twoDaysFromNow && new Date(o.currentPeriodEnd) > now) return true;
        return false;
    });

    // Conversion rate: paid / trial (using all effectively active historical funnels)
    const everActive = deduplicatedOrgs.filter((o: any) => o._isEffectivelyActive);
    const totalEverTrial = everActive.length;
    const convertedToPaid = activeOrgs.length;
    const conversionRate = totalEverTrial > 0 ? Math.round((convertedToPaid / totalEverTrial) * 100) : 0;

    // 3. Fix Chart Aggregation Properly (Timeline)
    // Build 12-month timeline
    const monthMap: Record<string, { pool: number; hostel: number; business: number; active: number }> = {};
    for (let i = 0; i < 12; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        monthMap[key] = { pool: 0, hostel: 0, business: 0, active: 0 };
    }

    // Aggregate ONLY validated active subtenants bucketed by createdAt month
    activePools.forEach(p => {
        if (!p.createdAt) return;
        const d = new Date(p.createdAt);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        if (monthMap[key]) monthMap[key].pool += 1;
    });

    activeHostels.forEach(h => {
        if (!h.createdAt) return;
        const d = new Date(h.createdAt);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        if (monthMap[key]) monthMap[key].hostel += 1;
    });

    activeBusinesses.forEach(b => {
        if (!b.createdAt) return;
        const d = new Date(b.createdAt);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        if (monthMap[key]) monthMap[key].business += 1;
    });

    // Calculate system active users (Organizations) by their creation date
    activeOrgs.forEach(o => {
        if (!o.createdAt) return;
        const d = new Date(o.createdAt);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        if (monthMap[key]) monthMap[key].active += 1;
    });

    // Format timeline for frontend
    const timeline = Object.keys(monthMap).sort().map(key => {
        const data = monthMap[key];
        const [, monthStr] = key.split("-");
        const monthIdx = parseInt(monthStr, 10) - 1;
        return {
            month: MONTH_NAMES[monthIdx],
            pool: data.pool,
            hostel: data.hostel,
            business: data.business,
            active: data.active,
        };
    });

    // Optional debug validation in development
    if (process.env.NODE_ENV === "development") {
        console.log("=== [Analytics Debug Validation] ===");
        console.log(`Raw Orgs: ${allOrgs.length} | Deduped: ${deduplicatedOrgs.length}`);
        console.log(`Active Orgs KPI: ${activeOrgs.length} | Trial Orgs KPI: ${trialOrgs.length}`);
        console.log(`Active Subtenants -> Pools: ${activePools.length}, Hostels: ${activeHostels.length}, Businesses: ${activeBusinesses.length}`);
    }

    return {
        kpis: {
            activeOrgs: activeOrgs.length,
            trialOrgs: trialOrgs.length,
            expiringSoon: expiringSoon.length,
            expiredOrgs: expiredOrgs.length,
            totalPools: activePools.length,
            totalHostels: activeHostels.length,
            totalBusinesses: activeBusinesses.length,
            totalMembers,
            conversionRate,
        },
        timeline,
        validatedOrgs: deduplicatedOrgs,
        activePoolIds,
        activeHostelIds,
        activeBusinessIds,
    };
}
