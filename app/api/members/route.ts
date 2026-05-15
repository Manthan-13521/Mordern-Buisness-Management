import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { dbConnect } from "@/lib/mongodb";
import { Member } from "@/models/Member";
import { EntertainmentMember } from "@/models/EntertainmentMember";
import { Payment } from "@/models/Payment";
import QRCode from "qrcode";
import crypto from "crypto";
import { uploadBuffer } from "@/lib/local-upload";
import { savePhoto } from "@/lib/savePhoto";
import { signQRToken } from "@/lib/qrSigner";
import { PRIVATE_API_STALE_MS } from "@/lib/apiCache";
import { getTenantFilter, requireTenant, resolvePoolId } from "@/lib/tenant";
import { getCachedDashboard } from "@/lib/dashboardCache";
import { withQueryTimeout } from "@/lib/queryTimeout";
import { resolveUser, AuthUser } from "@/lib/authHelper";
import { secureFindById } from "@/lib/tenantSecurity"; 
import { withTransaction } from "@/lib/withTransaction";
import { computeDefaulterStatus } from "@/lib/defaulterEngine";
import { Subscription } from "@/models/Subscription";
import { Ledger } from "@/models/Ledger";

export const dynamic = "force-dynamic";


// Fields to exclude from list queries for performance (Section 6C)
const LIST_SELECT = "-faceDescriptor -photoUrl";

import { generateMemberId } from "@/lib/generateMemberId";
import { MemberCreateSchema } from "@/lib/validators";

export async function GET(req: Request) {
    try {
        const user = await resolveUser(req);
        await dbConnect();

        if (!user)
            return NextResponse.json({ error: "Unauthorized" }, {  status: 401 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });

        // ── Tenant isolation guard (Hardened Golden Rule) ───────────────
        let poolId;
        try {
            poolId = requireTenant(user);
        } catch (err: any) {
             return NextResponse.json({ error: err.message }, { status: err.message === "Unauthorized" ? 401 : 400, headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        }

        const url = new URL(req.url);
        const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1"));
        const limit = Math.min(
            20,
            Math.max(1, parseInt(url.searchParams.get("limit") ?? "20"))
        );
        const skip = (page - 1) * limit;
        const search = url.searchParams.get("search") || "";
        const planFilter = url.searchParams.get("planId") || "";
        const statusFilter = url.searchParams.get("status") || "";
        const balanceOnly = url.searchParams.get("balanceOnly") || "";
        const memberType = url.searchParams.get("type") || "all";

        // Determine if this request is cacheable (no search/filter params)
        const isCacheable = !search && !planFilter && !statusFilter && !balanceOnly && memberType === "all" && !url.searchParams.get("deleted");

        // ── Build match filter ───────────────────────────────────────────
        const tenantFilter = getTenantFilter(user);
        
        const deletedFilter = url.searchParams.get("deleted");
        const isDeletedValue = deletedFilter === "true" ? true : false;
        
        const baseMatch: Record<string, unknown> = { isDeleted: isDeletedValue, ...tenantFilter };

        if (search) {
            baseMatch.$text = { $search: search };
        }
        if (planFilter) baseMatch.planId = new mongoose.Types.ObjectId(planFilter);
        if (statusFilter === "active") baseMatch.isExpired = false;
        if (statusFilter === "expired") baseMatch.isExpired = true;
        if (balanceOnly === "true") baseMatch.balanceAmount = { $gt: 0 };

        if (memberType === "member") {
            baseMatch.memberType = "regular";
        } else if (memberType === "entertainment") {
            baseMatch.memberType = "entertainment";
        }

        // ── Check if we should query Members, Entertainment, or both ─────
        const includeRegular = memberType === "all" || memberType === "member";
        const includeEntertainment = memberType === "all" || memberType === "entertainment";

        // ── Aggregation pipeline with optional $unionWith ────────────────
        const pipeline: mongoose.PipelineStage[] = [];
        
        if (includeRegular) {
            pipeline.push({ $match: baseMatch });
            pipeline.push({ $addFields: { _source: "regular" } });
        } else if (includeEntertainment) {
            // Seed pipeline with empty match to satisfy $unionWith standard pattern
            pipeline.push({ $match: { _id: null } }); 
        }

        if (includeEntertainment) {
            pipeline.push({
                $unionWith: {
                    coll: "entertainment_members",
                    pipeline: [
                        { $match: baseMatch },
                        { $addFields: { _source: "entertainment" } },
                    ],
                },
            });
        }
        
        // Exclude the mock { _id: null } document if used for seeding
        if (!includeRegular && includeEntertainment) {
            pipeline.push({ $match: { _source: "entertainment" } });
        }

        pipeline.push(
            { $sort: { createdAt: -1, _id: -1 } },
            { $skip: skip },
            { $limit: limit },
            {
                $lookup: {
                    from: "plans",
                    localField: "planId",
                    foreignField: "_id",
                    as: "_plan",
                    pipeline: [
                        { $match: { poolId } },
                        { $sort: { createdAt: -1, _id: -1 } },
                        { $project: { name: 1, durationDays: 1, durationHours: 1, durationMinutes: 1, price: 1, voiceAlert: 1, hasTokenPrint: 1, quickDelete: 1 } },
                    ],
                },
            },
            { $addFields: { planId: { $arrayElemAt: ["$_plan", 0] } } },
            {
                $project: {
                    _plan: 0, faceDescriptor: 0, photoUrl: 0, equipmentTaken: 0, qrCodeUrl: 0, qrToken: 0,
                },
            }
        );

        // ── Fetcher function (shared between cached and uncached paths) ────
        const fetchMembers = async () => {
            const [regularBaseCount, entertainmentBaseCount, rawData] = await Promise.all([
                includeRegular ? Member.countDocuments(baseMatch) : 0,
                includeEntertainment ? EntertainmentMember.countDocuments(baseMatch) : 0,
                Member.aggregate(pipeline),
            ]);
            const total = regularBaseCount + entertainmentBaseCount;

            // ── Batch defaulter resolution: 2 queries for ALL members instead of 2*N ──
            const regularIds = rawData
                .filter((m: any) => m._source !== "entertainment" && !m.isDeleted)
                .map((m: any) => m._id);

            const [batchSubs, batchLedgers] = regularIds.length > 0
                ? await Promise.all([
                    Subscription.find({ memberId: { $in: regularIds }, status: "active", poolId }).lean(),
                    Ledger.find({ memberId: { $in: regularIds }, poolId }).lean(),
                ])
                : [[], []];

            const subMap = new Map((batchSubs as any[]).map(s => [s.memberId.toString(), s]));
            const ledgerMap = new Map((batchLedgers as any[]).map(l => [l.memberId.toString(), l]));
            const now = new Date();

            const data = rawData.map((m: any) => {
                if (m._source === "entertainment" || m.isDeleted) {
                    m.isDefaulter = false; m.defaulterStatus = "active"; m.overdueDays = 0;
                    return m;
                }
                const sub = subMap.get(m._id.toString());
                const ledger = ledgerMap.get(m._id.toString());
                if (!sub || !ledger || (ledger as any).balance <= 0 || new Date((sub as any).nextDueDate) >= now) {
                    m.isDefaulter = false; m.defaulterStatus = "active"; m.overdueDays = 0;
                } else {
                    const overdueDays = Math.floor((now.getTime() - new Date((sub as any).nextDueDate).getTime()) / 86400000);
                    m.isDefaulter = true;
                    m.overdueDays = overdueDays;
                    m.defaulterStatus = computeDefaulterStatus(overdueDays);
                }
                return m;
            });

            return {
                success: true,
                data: Array.isArray(data) ? data : [],
                meta: {
                    stable: true,
                    total,
                    page,
                    limit,
                    totalPages: Math.ceil(total / limit),
                }
            };
        };

        // ── Use Redis cache for default list requests (15s TTL) ────────────
        let response;
        if (isCacheable) {
            const cacheKey = `members:${poolId}:p${page}:l${limit}:t${memberType}`;
            response = await getCachedDashboard(cacheKey, () => withQueryTimeout(fetchMembers(), 8000), 15);
        } else {
            response = await withQueryTimeout(fetchMembers(), 8000);
        }

        const headers: Record<string, string> = isCacheable
            ? {
                "Cache-Control": "public, max-age=0, s-maxage=15, stale-while-revalidate=30",
                "X-Cache": "MEMBERS",
              }
            : { "Cache-Control": "no-store, no-cache, must-revalidate, private" };

        return NextResponse.json(response, { headers });
    } catch (error) {
        console.error("[GET /api/members]", error);
        return NextResponse.json({ error: "Failed to fetch members" }, {  status: 500 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
    }
}



export async function POST(req: Request) {
    try {
        const user = await resolveUser(req);
        await dbConnect();

        if (!user)
            return NextResponse.json({ error: "Unauthorized" }, {  status: 401 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        const body = await req.json();

        // Rate limiting is now handled globally by middleware
        
        // --- STEP 12 SaaS Gating: Enforce Tenant Limits ---
        const poolId = resolvePoolId(user, body.poolId);
        try {
            const { enforceMemberCreationLimit } = await import("@/lib/saasGuard");
            await enforceMemberCreationLimit(poolId);
        } catch (e: any) {
            if (e.message === "SaaS_Member_Limit_Reached") {
                return NextResponse.json({ error: "Organization member limit reached. Please upgrade your SaaS plan." }, {  status: 403 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
            }
            throw e; // Bubble up unexpected errors
        }
        // ------------------------------------------------

        // Map frontend fields to match Zod schema expectations
        const mappedBody = {
            ...body,
            paymentMethod: body.paymentMode || body.paymentMethod || "cash",
            photo: body.photoBase64 || body.photo,
        };

        const result = MemberCreateSchema.safeParse(mappedBody);
        if (!result.success) {
            const errs = result.error.flatten().fieldErrors;
            const errMsg = Object.entries(errs).map(([f, m]) => `${f}: ${m?.join(", ")}`).join(" | ");
            console.error("Zod Validation Failed:", errMsg, mappedBody);
            // Return error string explicitly to prevent [object Object] on UI
            return NextResponse.json({ error: String(errMsg) }, {  status: 400 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        }
        const data = result.data;

        // Use standard structure now that we've validated
        const {
            name,
            phone,
            planId,
            paymentMethod,
            transactionId,
            planQuantity,
            paidAmount,
            balanceAmount
        } = data;

        // Handle photo separately (since the Zod schema expects photo as string but the UI might send photoBase64)
        const photoBase64 = body.photoBase64 || data.photo;

        const { Plan } = await import("@/models/Plan");
        const plan = await secureFindById(Plan, planId, user, { lean: true });
        if (!plan)
            return NextResponse.json({ error: "Invalid Plan" }, {  status: 400 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });

        // Atomic ID generation via Counters collection (Section 5)
        const isEntertainment = plan.hasEntertainment ?? false;
        const memberId = await generateMemberId(poolId, isEntertainment);

        // Save photo locally (Section 6)
        let photoUrl = "";
        if (photoBase64) {
            try {
                photoUrl = await savePhoto(photoBase64);
            } catch (err) {
                console.warn("Local photo save failed, skipping:", err);
            }
        }

        // Random token for physical card/QR (instant)
        const qrToken = crypto.randomUUID();
        const qrCodeUrl = ""; // Will be generated on-demand during PDF download

        // Calculate plan end date — duration is NOT multiplied by qty
        // Qty means N people using the same plan, not extended duration
        const qty = Math.min(25, Math.max(1, planQuantity || 1));
        const startDate = new Date();
        const planEndDate = new Date();

        if (plan.durationSeconds) {
            planEndDate.setSeconds(planEndDate.getSeconds() + plan.durationSeconds);
        } else if (plan.durationMinutes) {
            planEndDate.setMinutes(planEndDate.getMinutes() + plan.durationMinutes);
        } else if (plan.durationHours) {
            planEndDate.setHours(planEndDate.getHours() + plan.durationHours);
        } else {
            planEndDate.setDate(planEndDate.getDate() + (plan.durationDays || 30));
        }

        // ── Safe-amount guards (prevent Infinity/NaN from reaching DB) ────────
        const safePaid    = Number.isFinite(paidAmount)    ? Math.min(9_999_999_999, paidAmount)    : 0;
        const safeBalance = Number.isFinite(balanceAmount) ? Math.min(9_999_999_999, balanceAmount) : 0;

        const paymentStatus =
            safeBalance <= 0 ? "paid" : safePaid > 0 ? "partial" : "pending";

        // Build equipment array from string (if provided)
        let equipmentArr: { itemName: string; issuedDate: Date; isReturned: boolean }[] = [];
        if (body.equipmentTaken && typeof body.equipmentTaken === "string") {
            equipmentArr = body.equipmentTaken
                .split(",")
                .map((s: string) => s.trim())
                .filter(Boolean)
                .map((item: string) => ({
                    itemName: item,
                    issuedDate: new Date(),
                    isReturned: false,
                }));
        }

        const MemberModel = isEntertainment ? EntertainmentMember : Member;

        const newMember = new MemberModel({
            memberId,
            poolId,
            organizationId: poolId, // Ensure org-scoped queries include this member
            name,
            phone,
            photoUrl,
            planId,
            planQuantity: qty,
            planStartDate: startDate,
            planEndDate,
            startDate,
            expiryDate: planEndDate,
            paidAmount:    safePaid,
            balanceAmount: safeBalance,
            paymentStatus,
            paymentMode: body.paymentMode ?? "cash",
            equipmentTaken: equipmentArr,
            qrCodeUrl,
            qrToken,
            isActive: true,
            isExpired: false,
            isDeleted: false,
            status: "active",
            cardStatus: "ready",
        });

        await withTransaction(async (dbSession) => {
            const saveOpts = dbSession ? { session: dbSession } : undefined;
            await newMember.save(saveOpts);

            // ── Enterprise Rule: Increment immutable counter explicitly within transaction
            const { PoolStats } = await import("@/models/PoolStats");
            const currentYear = new Date().getFullYear();
            
            const statsOpts = dbSession ? { upsert: true, session: dbSession } : { upsert: true };
            await PoolStats.findOneAndUpdate(
                { poolId, year: currentYear },
                { $inc: isEntertainment ? { totalEntertainmentMembers: 1 } : { totalMembers: 1 } },
                statsOpts
            );
        }).catch(txnError => {
            console.error("Atomic transaction failed during member creation:", txnError);
            // Surface meaningful error for common cases
            if (txnError?.code === 11000) {
                throw new Error("A member with this ID already exists. Please try again.");
            }
            if (txnError?.name === "ValidationError") {
                const fields = Object.keys(txnError.errors || {}).join(", ");
                throw new Error(`Validation failed for: ${fields}`);
            }
            throw new Error(`Failed to save member: ${txnError?.message || 'Unknown error'}`);
        });

        // ── STEP 7B: Automated Subscription & Revenue Ledger Generation ──────────────
        try {
            const initialDue = (plan.price || 0) * qty;
            const { Ledger } = await import("@/models/Ledger");
            const { Subscription } = await import("@/models/Subscription");

            await Promise.all([
                Ledger.create({
                    memberId: newMember._id,
                    poolId,
                    totalDue: initialDue,
                    totalPaid: safePaid,
                    balance: initialDue - safePaid,
                }),
                Subscription.create({
                    memberId: newMember._id,
                    poolId,
                    planId,
                    startDate,
                    nextDueDate: planEndDate,
                    status: "active",
                })
            ]);
        } catch (dbErr) {
            console.error("Failed to generate Subscription and Ledger artifacts:", dbErr);
        }

        // ── Real-Time Pool Analytics Update (New Member) ───────────────────
        const memberDateStr = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
        try {
            const { PoolAnalytics } = await import("@/models/PoolAnalytics");
            await PoolAnalytics.findOneAndUpdate(
                { poolId, yearMonth: memberDateStr },
                { $inc: { newMembers: 1 } },
                { upsert: true }
            );
        } catch (analyticsErr) {
            console.error("Failed to update Pool Analytics newMembers:", analyticsErr);
        }

        // NOTE: PoolSession is NOT created here — occupancy only increases
        // when a member scans in via the QR Entry page (/api/entry).

        // Auto-create Payment record so it shows on the Payments page
        if (safePaid > 0) {
            try {
                const modeMap: Record<string, string> = { cash: "cash", upi: "upi", card: "cash", online: "razorpay_online" };
                await Payment.create({
                    memberId: newMember._id,
                    planId,
                    poolId,
                    memberCollection: isEntertainment ? "entertainment_members" : "members",
                    amount: safePaid,
                    paymentMethod: modeMap[body.paymentMode] || "cash",
                    recordedBy: (typeof user.id === "string" && user.id.length === 24)
                        ? new mongoose.Types.ObjectId(user.id)
                        : undefined,
                    status: "success",
                    notes: `Auto-recorded on member registration`,
                });

                // ── Real-Time Pool Analytics Update (Income) ───────────────────
                const { PoolAnalytics } = await import("@/models/PoolAnalytics");
                await PoolAnalytics.findOneAndUpdate(
                    { poolId, yearMonth: memberDateStr },
                    { $inc: { totalIncome: safePaid } },
                    { upsert: true }
                );
            } catch (payErr) {
                console.warn("Payment creation failed (non-critical):", payErr);
            }
        }

        const savedMember = isEntertainment
            ? await secureFindById(EntertainmentMember, newMember._id.toString(), user, { populate: { path: "planId", select: "name hasTokenPrint quickDelete price" } })
            : await secureFindById(Member, newMember._id.toString(), user, { populate: { path: "planId", select: "name hasTokenPrint quickDelete price" } });

        // No background job needed since generation is inline

        // Invalidate dashboard cache so new member shows immediately
        import("@/lib/dashboardCache").then(m => m.invalidateDashboard(poolId)).catch(() => {});

        return NextResponse.json(savedMember, {  status: 201 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
    } catch (error: any) {
        console.error("[POST /api/members]", error);
        return NextResponse.json({ error: error?.message || "Server error creating member" }, {  status: 500 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
    }
}
