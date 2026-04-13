import { NextResponse } from "next/server";
import { resolveUser, AuthUser } from "@/lib/authHelper";
import { Plan } from "@/models/Plan"; // Added import for group QR handling
import { dbConnect } from "@/lib/mongodb";
import { Member } from "@/models/Member";
import { EntryLog } from "@/models/EntryLog";
import { PoolSession } from "@/models/PoolSession";
import { Pool } from "@/models/Pool";
import { getSettings } from "@/models/Settings"; // Kept for legacy global fallback if needed

import { logger } from "@/lib/logger";
import { verifyQRToken } from "@/lib/qrSigner";
import mongoose from "mongoose";
import { runOccupancyCleanupInBackground } from "@/lib/cleanup";
import { getOccupancy, incrOccupancy } from "@/lib/redisOccupancy"; // 1.3 Fast Occupancy
import { redis } from "@/lib/redis"; // 1.3 Safe fallback checking

export const dynamic = "force-dynamic";

const SCAN_COOLDOWN_MS = 3000; // 3-second cooldown

export async function POST(req: Request) {
    // Rate limiting is now handled globally by middleware

    const startTime = Date.now(); // 1.3 Perf Tracking
    try {
        const [, user, body] = await Promise.all([
            dbConnect(),
            resolveUser(req),
            req.json(),
        ]);
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, {  status: 401 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        }

        const { qrPayload } = body; // Format: "memberId:qrToken"  OR legacy plain memberId

        if (!qrPayload) {
            return NextResponse.json({ error: "Missing QR payload" }, {  status: 400 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        }

        // Parse payload — support JWT (Section 10), legacy "memberId:token", and legacy plain memberId
        let memberId: string = "";
        let providedToken: string | null = null;
        let planId: string | null = null;

        // Try JWT verification first
        const jwtVerifiedId = await verifyQRToken(qrPayload);
        if (jwtVerifiedId) {
            memberId = jwtVerifiedId;
            // The JWT itself is cryptographically secure, so we don't need to do string-matching 
            // against the DB UUID qrToken.
            providedToken = null; 
        } else if (qrPayload.includes(":")) {
            const parts = qrPayload.split(":");
            const possibleId = parts[0];
            const possibleToken = parts.slice(1).join(":");

            const plan = await Plan.findById(possibleId).lean().catch(() => null);
            if (plan && plan.groupToken && plan.groupToken === possibleToken) {
                planId = possibleId;
                providedToken = possibleToken;
            } else {
                memberId = possibleId;
                providedToken = possibleToken;
            }
        } else {
            memberId = qrPayload;
        }

        // Auto-cleanup expired sessions before checking capacity
        await runOccupancyCleanupInBackground();

        let member = null;
        if (planId) {
            // Group QR handling
            const plan = await Plan.findById(planId).lean();
            if (!plan) {
                logger.scan("QR scan denied — plan not found", { planId });
                await EntryLog.create({
                    status: "denied",
                    reason: "Plan Not Found",
                    operatorId: user.id ? new mongoose.Types.ObjectId(user.id) : undefined,
                    rawPayload: qrPayload,
                });
                return NextResponse.json({ error: "Plan not found" }, {  status: 404 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
            }

            const numPersons = plan.maxEntriesPerQR || 1;
            
            // 1.3 Hybrid Occupancy Lookup
            const pool = await Pool.findOne({ poolId: user.poolId }).select("capacity").lean();
            const poolCapacity = pool?.capacity || 100;
            
            let currentOccupancy = await getOccupancy(user.poolId || "UNKNOWN");

            // Check capacity for the whole group
            if (currentOccupancy + numPersons > poolCapacity) {
                await EntryLog.create({
                    poolId: user.poolId,
                    status: "denied",
                    reason: "Pool Capacity Full for Group",
                    rawPayload: qrPayload,
                });
                return NextResponse.json({ 
                    error: `Pool cannot accommodate ${numPersons} more people (${currentOccupancy}/${poolCapacity})` 
                }, {  status: 400 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
            }

            if (plan.remainingEntries && plan.remainingEntries > 0) {
                // Decrement remaining entries atomically
                await Plan.updateOne({ _id: planId, remainingEntries: { $gt: 0 } }, { $inc: { remainingEntries: -1 } });
                
                // Calculate expiry for this user
                const expiryTime = new Date();
                if (plan.durationSeconds) expiryTime.setSeconds(expiryTime.getSeconds() + plan.durationSeconds);
                else if (plan.durationMinutes) expiryTime.setMinutes(expiryTime.getMinutes() + plan.durationMinutes);
                else if (plan.durationHours) expiryTime.setHours(expiryTime.getHours() + plan.durationHours);
                else {
                    const settings = await getSettings();
                    const durationMinutes = settings.occupancyDurationMinutes || 60;
                    expiryTime.setMinutes(expiryTime.getMinutes() + durationMinutes);
                }

                // Create PoolSession for automated checkout
                await PoolSession.create({
                    poolId: user.poolId,
                    numPersons,
                    expiryTime,
                    status: "active",
                });
                
                await incrOccupancy(user.poolId || "UNKNOWN", numPersons); // 1.3 Atomic sync

                // Log entry without member association
                await EntryLog.create({
                    poolId: user.poolId,
                    status: "granted",
                    reason: "Group QR Entry",
                    rawPayload: qrPayload,
                    numPersons,
                });
                
                console.log(`[PERF] entry: ${Date.now() - startTime}ms (group: ${planId})`);
                
                return NextResponse.json({ 
                    message: "Group entry granted", 
                    numPersons,
                    occupancy: {
                        current: currentOccupancy + numPersons,
                        capacity: poolCapacity
                    }
                }, {  status: 200 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
            } else {
                logger.scan("QR scan denied — group quota exhausted", { planId });
                await EntryLog.create({
                    status: "denied",
                    reason: "Group QR quota exhausted",
                    rawPayload: qrPayload,
                });
                return NextResponse.json({ error: "Group QR token has no remaining entries" }, {  status: 403 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
            }
        }

        // 1.3 Pre-fetch occupancy for early rejection (Individual & Entertainment)
        const pool = await Pool.findOne({ poolId: user.poolId }).select("capacity").lean();
        const poolCapacity = pool?.capacity || 100;
        let currentOccupancy = await getOccupancy(user.poolId || "UNKNOWN");

        // Existing individual member flow
        const baseMatch = user.role !== "superadmin" ? { poolId: user.poolId || "UNASSIGNED_POOL" } : {};
        member = await Member.findOne({ memberId, ...baseMatch }).populate("planId");

        // Fallback to EntertainmentMember if not found in regular Member collection
        if (!member) {
            const { EntertainmentMember } = await import("@/models/EntertainmentMember");
            member = await EntertainmentMember.findOne({ memberId, ...baseMatch }).populate("planId");
        }

        if (!member) {
            logger.scan("QR scan denied — member not found", { memberId });
            await EntryLog.create({
                poolId: user.poolId || "UNKNOWN",
                status: "denied",
                reason: "Member Not Found",
                operatorId: user.id ? new mongoose.Types.ObjectId(user.id) : undefined,
                rawPayload: qrPayload,
            });
            return NextResponse.json({ error: "Member not found" }, {  status: 404 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        }

        // ── QR Token Verification ────────────────────────────────────────────
        if (providedToken && member.qrToken && providedToken !== member.qrToken) {
            logger.scan("QR scan denied — invalid token (possible screenshot reuse)", {
                memberId,
                ip: req.headers.get("x-forwarded-for")?.split(",")[0] || "unknown",
            });
            await EntryLog.create({
                poolId: user.poolId,
                memberId: member._id,
                status: "denied",
                reason: "Invalid QR Token (possible screenshot reuse)",
                operatorId: new mongoose.Types.ObjectId(user.id),
                qrToken: providedToken,
                rawPayload: qrPayload,
            });
            return NextResponse.json({ error: "QR code is invalid or already used. Please regenerate your QR." }, {  status: 403 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        }

        // ── Duplicate Scan Cooldown ──────────────────────────────────────────
        if (member.lastScannedAt) {
            const msSinceLastScan = Date.now() - new Date(member.lastScannedAt).getTime();
            if (msSinceLastScan < SCAN_COOLDOWN_MS) {
                logger.scan("QR scan denied — cooldown", { memberId, msSinceLastScan });
                return NextResponse.json({ error: `Please wait ${Math.ceil((SCAN_COOLDOWN_MS - msSinceLastScan) / 1000)} seconds before scanning again.` }, {  status: 429 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
            }
        }

        // ── Membership Expiry Check ──────────────────────────────────────────
        const isEntertainment = !('status' in (member as any));
        const memberStatus = isEntertainment ? ((member as any).isActive && !(member as any).isExpired ? "active" : "expired") : (member as any).status;
        const expiryFieldValue = isEntertainment ? (member as any).planEndDate : (member as any).expiryDate;

        if (memberStatus !== "active" || new Date(expiryFieldValue ?? 0) < new Date()) {
            if (isEntertainment) {
                if ((member as any).isActive) {
                    (member as any).isActive = false;
                    (member as any).isExpired = true;
                    await member.save();
                }
            } else {
                if ((member as any).status === "active") {
                    (member as any).status = "expired";
                    await member.save();
                }
            }
            await EntryLog.create({
                poolId: user.poolId,
                memberId: member._id,
                status: "denied",
                reason: "Membership Expired",
                operatorId: new mongoose.Types.ObjectId(user.id),
                rawPayload: qrPayload,
            });
            logger.scan("QR scan denied — expired", { memberId });
            return NextResponse.json({ error: "Membership has expired" }, {  status: 403 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        }

        // ── STEP 8: Defaulter Gate Enforcement ───────────────────────────────
        if (!isEntertainment) {
            // 1.3 Fast Access State Check (Short-circuit heavy joins)
            const fastAccess = (member as any).accessState;
            const mAccess = (member as any).accessStatus;
            
            // If denormalized accessState says active, we can skip the heavy defaulterEngine logic
            // UNLESS it's explicitly blocked in accessStatus
            if (fastAccess === "active" && mAccess === "active") {
                // Skip to next step
            } else if (mAccess === "blocked" || mAccess === "suspended") {
                let overdueDays = 0;
                if (mAccess === "blocked") {
                    const { resolveDefaulterState } = await import("@/lib/defaulterEngine");
                    const defaulterObj = await resolveDefaulterState(member._id, user.poolId || "UNASSIGNED_POOL");
                    overdueDays = defaulterObj.overdueDays;
                }

                const isSuspended = mAccess === "suspended";
                const reasonStr = isSuspended ? "Admin Suspended" : `Defaulter Blocked (${overdueDays} days overdue)`;
                const failReason = isSuspended ? "suspended_admin" : "blocked_defaulter";

                await EntryLog.create({
                    poolId: user.poolId,
                    memberId: member._id,
                    status: "denied",
                    reason: reasonStr,
                    failReason: failReason,
                    operatorId: user.id ? new mongoose.Types.ObjectId(user.id) : undefined,
                    rawPayload: qrPayload,
                });
                logger.scan(`QR scan denied — ${failReason}`, { memberId, overdueDays });

                if (isSuspended) {
                    return NextResponse.json({ 
                        reason: "suspended_admin",
                        message: "Access suspended by administrator." 
                    }, {  status: 403 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
                }

                return NextResponse.json({ 
                    error: "Access denied due to pending dues", // keep legacy error string for UI compatibility
                    reason: "blocked_defaulter",
                    overdueDays,
                    balance: (member as any).balanceAmount || 0,
                    message: "Access denied due to pending dues" 
                }, {  status: 403 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
            }
        }

        // ── Entry Limit Check (Total & Daily) ───────────────────────────────
        // Preliminary check for fast rejection
        if (!isEntertainment) {
            const entriesUsed = (member as any).entriesUsed || 0;
            const totalEntriesAllowed = (member as any).totalEntriesAllowed || 1;

            if (entriesUsed >= totalEntriesAllowed) {
                await EntryLog.create({
                    poolId: user.poolId,
                    memberId: member._id,
                    status: "denied",
                    reason: "Entry Limit Reached",
                    operatorId: new mongoose.Types.ObjectId(user.id),
                    rawPayload: qrPayload,
                });
                logger.scan("QR scan denied — entry limit", { memberId, entriesUsed, totalEntriesAllowed });
                return NextResponse.json({ error: "Entry limit reached" }, {  status: 400 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
            }
        }

        // ── Daily 1-Time Entry Limit Check (C-6 FIX: IST midnight, not UTC) ───
        // IST = UTC+5:30. We compute today's midnight in IST, then convert back to UTC for the DB query.
        const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
        const nowForIST = new Date(Date.now() + IST_OFFSET_MS);
        const istMidnightUTC = new Date(
            Date.UTC(nowForIST.getUTCFullYear(), nowForIST.getUTCMonth(), nowForIST.getUTCDate())
            - IST_OFFSET_MS
        );

        const alreadyEnteredToday = await EntryLog.findOne({
            poolId: user.poolId,
            memberId: member._id,
            status: "granted",
            createdAt: { $gte: istMidnightUTC },
        });

        if (alreadyEnteredToday) {
            await EntryLog.create({
                poolId: user.poolId,
                memberId: member._id,
                status: "denied",
                reason: "Already Entered Today",
                operatorId: new mongoose.Types.ObjectId(user.id),
                rawPayload: qrPayload,
            });
            logger.scan("QR scan denied — already entered today", { memberId });
            return NextResponse.json({ error: "Member has already entered once today." }, {  status: 403 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        }

        const numPersons = (member as any).planQuantity || 1;

        if (currentOccupancy + numPersons > poolCapacity) {
            await EntryLog.create({
                poolId: user.poolId,
                memberId: member._id,
                status: "denied",
                reason: "Pool at Full Capacity",
                operatorId: new mongoose.Types.ObjectId(user.id),
                rawPayload: qrPayload,
            });
            logger.scan("QR scan denied — pool full", {
                memberId,
                occupancy: currentOccupancy,
                capacity: poolCapacity,
                requested: numPersons
            });
            return NextResponse.json({
                    error: `Pool cannot accommodate ${numPersons} more people (${currentOccupancy}/${poolCapacity}).`,
                }, {  status: 400 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        }

        // ── Grant Entry (Atomic Update - Section 9) ──────────────────────────
        const oldToken = member.qrToken;
        const newToken = require("crypto").randomUUID();

        if (!isEntertainment) {
            // Use findOneAndUpdate to atomically increment entriesUsed while ensuring it's strictly less than total allowed
            const updatedMember = await mongoose.models.Member.findOneAndUpdate(
                { 
                    _id: member._id, 
                    entriesUsed: { $lt: (member as any).totalEntriesAllowed || 1 } 
                },
                { 
                    $inc: { entriesUsed: 1 },
                    $set: { lastScannedAt: new Date(), qrToken: newToken }
                },
                { returnDocument: 'after' }
            );

            if (!updatedMember) {
                // Race condition! Another request beat us to the limit.
                return NextResponse.json({ error: "Entry limit reached (Double Scan Prevented)" }, {  status: 400 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
            }
            member = updatedMember; // Sync local object for logging
        } else {
            // Entertainment members don't have entry limits
            member.lastScannedAt = new Date();
            member.qrToken = newToken;
            await member.save();
        }

        // Create PoolSession for automated checkout
        let expiryFieldValueForSession = new Date();
        const planObj = (member as any).planId;
        const settings = await getSettings();
        const durationMinutes = settings.occupancyDurationMinutes || 60;

        if (!isEntertainment && planObj && planObj.durationHours && !planObj.durationDays) {
            // Hourly plan
            expiryFieldValueForSession.setHours(expiryFieldValueForSession.getHours() + planObj.durationHours);
            if (planObj.durationMinutes) {
                expiryFieldValueForSession.setMinutes(expiryFieldValueForSession.getMinutes() + planObj.durationMinutes);
            }
        } else {
            // Daily/Monthly/Yearly plan or Entertainment member -> use occupancy setting
            expiryFieldValueForSession.setMinutes(expiryFieldValueForSession.getMinutes() + durationMinutes);
        }

        await PoolSession.create({
            poolId: user.poolId,
            memberId: member._id,
            numPersons,
            expiryTime: expiryFieldValueForSession,
            status: "active",
        });

        await incrOccupancy(user.poolId || "UNKNOWN", numPersons); // 1.3 Atomic sync

        const entry = await EntryLog.create({
            poolId: user.poolId,
            memberId: member._id,
            status: "granted",
            operatorId: (typeof user.id === "string" && user.id.length === 24) 
                ? new mongoose.Types.ObjectId(user.id) 
                : undefined,
            qrToken: oldToken,
            rawPayload: qrPayload,
            numPersons,
        });

            logger.scan("QR scan granted", {
            memberId,
            memberName: member.name,
            occupancy: currentOccupancy + numPersons,
            capacity: poolCapacity,
        });

        import("@/lib/events").then(mod => {
            mod.dispatchEvent("entry.logged", { poolId: user.poolId, count: currentOccupancy + numPersons });
        }).catch(() => {});

        const endTime = Date.now();
        console.log(`[PERF] entry: ${endTime - startTime}ms (member: ${memberId || planId})`);

        return NextResponse.json({
                message: "Entry Granted",
                member: {
                    name: member.name,
                    memberId: member.memberId,
                    photoUrl: member.photoUrl,
                    planName: (member.planId as any)?.name || "Active Plan",
                    planQuantity: member.planQuantity || 1,
                    voiceAlert: (member.planId as any)?.voiceAlert || false,
                    expiryDate: expiryFieldValueForSession,
                },
                entry,
                occupancy: {
                    current: currentOccupancy + numPersons,
                    capacity: poolCapacity,
                    available: poolCapacity - (currentOccupancy + numPersons),
                },
            }, {  status: 200 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
    } catch (error) {
        logger.error("Entry API error", { error: String(error) });
        return NextResponse.json({ error: "Server error processing entry" }, {  status: 500 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
    }
}
