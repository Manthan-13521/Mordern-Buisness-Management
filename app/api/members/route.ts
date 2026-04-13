import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { dbConnect } from "@/lib/mongodb";
import { Member } from "@/models/Member";
import { EntertainmentMember } from "@/models/EntertainmentMember";
import { Payment } from "@/models/Payment";
import { getServerSession } from "@/lib/universalAuth";
import { getToken } from "@/lib/universalAuth";
import { authOptions } from "@/lib/auth";
import QRCode from "qrcode";
import crypto from "crypto";
import { uploadBuffer } from "@/lib/local-upload";
import { savePhoto } from "@/lib/savePhoto";
import { signQRToken } from "@/lib/qrSigner";
import { PRIVATE_API_STALE_MS } from "@/lib/apiCache";
import { getTenantFilter, requireTenant, resolvePoolId } from "@/lib/tenant";
import { secureFindById } from "@/lib/tenantSecurity"; 

export const dynamic = "force-dynamic";


// Fields to exclude from list queries for performance (Section 6C)
const LIST_SELECT = "-faceDescriptor -photoUrl";

import { generateMemberId } from "@/lib/generateMemberId";
import { MemberCreateSchema } from "@/lib/validators";

export async function GET(req: Request) {
    try {
        const [token] = await Promise.all([
            getToken({ req: req as any }),
            dbConnect(),
        ]);
        
        if (!token)
            return NextResponse.json({ error: "Unauthorized" }, {  status: 401 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });

        const sessionUser = token as any;

        // ── Tenant isolation guard (Hardened Golden Rule) ───────────────
        let poolId;
        try {
            poolId = requireTenant(sessionUser);
        } catch (err: any) {
             return NextResponse.json({ error: err.message }, { status: err.message === "Unauthorized" ? 401 : 400, headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        }

        const url = new URL(req.url);
        const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1"));
        const limit = Math.min(
            100,
            Math.max(1, parseInt(url.searchParams.get("limit") ?? "12"))
        );
        const skip = (page - 1) * limit;
        const search = url.searchParams.get("search") || "";
        const planFilter = url.searchParams.get("planId") || "";
        const statusFilter = url.searchParams.get("status") || "";
        const balanceOnly = url.searchParams.get("balanceOnly") || "";
        const memberType = url.searchParams.get("type") || "all";

        // ── Build match filter ───────────────────────────────────────────
        const tenantFilter = getTenantFilter(sessionUser);
        
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
            baseMatch.memberId = { $regex: /^M(?!S)/i };
        } else if (memberType === "entertainment") {
            baseMatch.memberId = { $regex: /^MS/i };
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
                    _plan: 0, faceDescriptor: 0,
                },
            }
        );

        const regularBaseCount = includeRegular ? await Member.countDocuments(baseMatch) : 0;
        const entertainmentBaseCount = includeEntertainment ? await EntertainmentMember.countDocuments(baseMatch) : 0;

        // ── Self Healing Fallback Due Generation ────────────────────────────
        // Trigger natively decoupled in-memory preventing dashboard blocking
        if (sessionUser.poolId) {
            import("@/lib/billingEngine").then(m => m.processDueGenerations(sessionUser.poolId).catch(() => {}));
        }

        const [rawData] = await Promise.all([
            Member.aggregate(pipeline)
        ]);
        const total = regularBaseCount + entertainmentBaseCount;

        const { resolveDefaulterState } = await import("@/lib/defaulterEngine");

        const data = await Promise.all(rawData.map(async (m: any) => {
            // ── STEP 8: Inject Native Defaulter UI Matrix ────────────────────
            const isEntertainment = !('status' in m) && m._source === "entertainment";
            let defaulterObj = { isDefaulter: false, overdueDays: 0, defaulterStatus: "active" as ("active"|"warning"|"blocked") };
            
            if (!isEntertainment && !m.isDeleted) {
                defaulterObj = await resolveDefaulterState(m._id, sessionUser.poolId);
            }
            
            m.isDefaulter = defaulterObj.isDefaulter;
            m.defaulterStatus = defaulterObj.defaulterStatus;
            m.overdueDays = defaulterObj.overdueDays;

            return m;
        }));

        const response = {
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

        const headers: HeadersInit = process.env.NODE_ENV === "development"
            ? { "Cache-Control": "no-store, no-cache, must-revalidate, private" }
            : {};

        return NextResponse.json(response, { headers });
    } catch (error) {
        console.error("[GET /api/members]", error);
        return NextResponse.json({ error: "Failed to fetch members" }, {  status: 500 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
    }
}



export async function POST(req: Request) {
    try {
        const [token, body] = await Promise.all([
            getToken({ req: req as any }),
            req.json(),
            dbConnect(),
        ]);
        
        if (!token)
            return NextResponse.json({ error: "Unauthorized" }, {  status: 401 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });

        const sessionUser = token as any;

        // Rate limiting is now handled globally by middleware
        
        // --- STEP 12 SaaS Gating: Enforce Tenant Limits ---
        try {
            const { enforceMemberCreationLimit } = await import("@/lib/saasGuard");
            const poolId = resolvePoolId(sessionUser, body.poolId);
            await enforceMemberCreationLimit(poolId);
        } catch (e: any) {
            if (e.message === "SaaS_Member_Limit_Reached") {
                return NextResponse.json({ error: "Organization member limit reached. Please upgrade your SaaS plan." }, {  status: 403 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
            }
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
        const plan = await secureFindById(Plan, planId, sessionUser, { lean: true });
        if (!plan)
            return NextResponse.json({ error: "Invalid Plan" }, {  status: 400 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });

        const poolId = resolvePoolId(sessionUser, body.poolId);

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

        const mongoose = (await import("mongoose")).default;
        const dbSession = await mongoose.startSession();
        dbSession.startTransaction();

        try {
            await newMember.save({ session: dbSession });

            // ── Enterprise Rule: Increment immutable counter explicitly within transaction
            const { PoolStats } = await import("@/models/PoolStats");
            await PoolStats.findOneAndUpdate(
                { poolId },
                { $inc: isEntertainment ? { totalEntertainmentMembers: 1 } : { totalMembers: 1 } },
                { upsert: true, session: dbSession }
            );

            await dbSession.commitTransaction();
        } catch (txnError) {
            await dbSession.abortTransaction();
            console.error("Atomic transaction failed during member creation:", txnError);
            return NextResponse.json({ error: "Failed to securely save member records" }, {  status: 500 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        } finally {
            dbSession.endSession();
        }

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
                    recordedBy: (typeof sessionUser.id === "string" && sessionUser.id.length === 24)
                        ? new mongoose.Types.ObjectId(sessionUser.id)
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
            ? await secureFindById(EntertainmentMember, newMember._id.toString(), sessionUser, { populate: { path: "planId", select: "name hasTokenPrint quickDelete price" } })
            : await secureFindById(Member, newMember._id.toString(), sessionUser, { populate: { path: "planId", select: "name hasTokenPrint quickDelete price" } });

        // No background job needed since generation is inline

        return NextResponse.json(savedMember, {  status: 201 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
    } catch (error: any) {
        console.error("[POST /api/members]", error);
        return NextResponse.json({ error: error?.message || "Server error creating member" }, {  status: 500 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
    }
}
