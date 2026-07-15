import { NextResponse } from "next/server";
import { resolveUser, AuthUser } from "@/lib/authHelper";
import { isTrial, TRIAL_LIMITS } from "@/lib/quotas";
import mongoose from "mongoose";
import { dbConnect } from "@/lib/mongodb";
import { requestContext } from "@/lib/requestContext";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {

        const requestId = req ? (req.headers.get("x-request-id") || crypto.randomUUID()) : crypto.randomUUID();
        const clientIp = req ? (req.headers.get("x-forwarded-for")?.split(",")[0].trim() || req.headers.get("x-real-ip") || "unknown") : "unknown";
        const routePath = req ? new URL(req.url).pathname : "unknown";
        const requestMethod = "GET";

        return requestContext.run({
            requestId,
            ip: clientIp,
            route: routePath,
            method: requestMethod,
            startTime: Date.now()
        }, async () => {
            try {
            const user = await resolveUser(req);
            if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

            // If not a trial, no quotas apply
            if (!isTrial(user)) {
                return NextResponse.json({ isTrial: false, quotas: null }, { headers: { "Cache-Control": "no-store" } });
            }

            await dbConnect();

            const quotas: Record<string, { current: number; limit: number; percentage: number }> = {};
            
            let daysRemaining = 0;
            if (user.subscriptionExpiryDate) {
                const expiry = new Date(user.subscriptionExpiryDate).getTime();
                const now = Date.now();
                daysRemaining = Math.max(0, Math.ceil((expiry - now) / (1000 * 60 * 60 * 24)));
            }

            const buildQuota = async (resource: string, limit: number, modelName: string, query: any) => {
                if (!mongoose.models[modelName]) return; // Fallback
                const current = await mongoose.models[modelName].countDocuments(query);
                quotas[resource] = {
                    current,
                    limit,
                    percentage: limit > 0 ? Math.round((current / limit) * 100) : 0
                };
            };

            if (user.poolId) {
                const limits = TRIAL_LIMITS.pool;
                await Promise.all([
                    buildQuota("members", limits.members, "Member", { poolId: user.poolId, isDeleted: false }),
                    buildQuota("plans", limits.plans, "Plan", { poolId: user.poolId, deletedAt: null })
                ]);
                quotas["twilio"] = { current: 0, limit: limits.twilio ? 1 : 0, percentage: limits.twilio ? 0 : 100 };
                return NextResponse.json({ isTrial: true, module: "pool", quotas, daysRemaining }, { headers: { "Cache-Control": "no-store" } });
            }

            if (user.hostelId) {
                const limits = TRIAL_LIMITS.hostel;
                await Promise.all([
                    buildQuota("members", limits.members, "HostelMember", { hostelId: user.hostelId, isDeleted: false }),
                    buildQuota("plans", limits.plans, "HostelPlan", { hostelId: user.hostelId, isActive: true })
                ]);
                
                // For blocks, we look up the blocks count
                if (mongoose.models.HostelBlock) {
                    const currentBlocks = await mongoose.models.HostelBlock.countDocuments({ hostelId: user.hostelId });
                    quotas["blocks"] = {
                        current: currentBlocks,
                        limit: limits.blocks,
                        percentage: limits.blocks > 0 ? Math.round((currentBlocks / limits.blocks) * 100) : 0
                    };
                }
                quotas["twilio"] = { current: 0, limit: limits.twilio ? 1 : 0, percentage: limits.twilio ? 0 : 100 };
                return NextResponse.json({ isTrial: true, module: "hostel", quotas, daysRemaining }, { headers: { "Cache-Control": "no-store" } });
            }

            if (user.businessId) {
                const limits = TRIAL_LIMITS.business;
                await Promise.all([
                    buildQuota("customers", limits.customers, "BusinessCustomer", { businessId: user.businessId }),
                    buildQuota("staff", limits.staff, "BusinessLabour", { businessId: user.businessId, isActive: true }),
                    buildQuota("invoices", limits.invoices, "BusinessTransaction", { businessId: user.businessId, category: "SALE" })
                ]);
                quotas["twilio"] = { current: 0, limit: limits.twilio ? 1 : 0, percentage: limits.twilio ? 0 : 100 };
                return NextResponse.json({ isTrial: true, module: "business", quotas, daysRemaining }, { headers: { "Cache-Control": "no-store" } });
            }

            return NextResponse.json({ isTrial: true, quotas: null, daysRemaining }, { headers: { "Cache-Control": "no-store" } });

        } catch (error) {
            console.error("[GET /api/quotas]", error);
            return NextResponse.json({ error: "Failed to fetch quotas" }, { status: 500 });
        }
        });
            
}
