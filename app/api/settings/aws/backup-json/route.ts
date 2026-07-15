import { NextResponse } from "next/server";
import { resolveUser, AuthUser } from "@/lib/authHelper";
import { dbConnect } from "@/lib/mongodb";
import { Member } from "@/models/Member";
import { Payment } from "@/models/Payment";
import { Plan } from "@/models/Plan";
import { EntryLog } from "@/models/EntryLog";
import { DeletedMember } from "@/models/DeletedMember";

import { uploadStreamBackup } from "@/lib/s3";
import { createGzip } from "zlib";
import { Readable } from "stream";
import { requestContext } from "@/lib/requestContext";

export async function POST(req: Request) {

        const requestId = req ? (req.headers.get("x-request-id") || crypto.randomUUID()) : crypto.randomUUID();
        const clientIp = req ? (req.headers.get("x-forwarded-for")?.split(",")[0].trim() || req.headers.get("x-real-ip") || "unknown") : "unknown";
        const routePath = req ? new URL(req.url).pathname : "unknown";
        const requestMethod = "POST";

        return requestContext.run({
            requestId,
            ip: clientIp,
            route: routePath,
            method: requestMethod,
            startTime: Date.now()
        }, async () => {
            try {
            await dbConnect();
            const user = await resolveUser(req);

            if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
                return NextResponse.json({ error: "Unauthorized" }, {  status: 401 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
            }

            const poolId = user.poolId;
            if (!poolId && user.role !== "superadmin") {
                return NextResponse.json({ error: "No pool ID found for user" }, {  status: 400 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
            }

            const baseMatch = poolId ? { poolId } : {};

            // 1. Calculate 365 Days Cutoff
            const oneYearAgo = new Date();
            oneYearAgo.setDate(oneYearAgo.getDate() - 365);

            // 2. Fetch Active, Expired, and Soft-Deleted Members (from original collection)
            const members = await Member.find({
                ...baseMatch,
                $or: [
                    { startDate: { $gte: oneYearAgo } },
                    { planStartDate: { $gte: oneYearAgo } },
                    { expiredAt: { $gte: oneYearAgo } },
                    { deletedAt: { $gte: oneYearAgo } },
                    { createdAt: { $gte: oneYearAgo } }
                ]
            }).lean();

            // 3. Fetch Hard-Deleted Members (from archive collection)
            const deletedMembers = await DeletedMember.find({
                ...baseMatch,
                deletedAt: { $gte: oneYearAgo }
            }).lean();

            // deduplicate if same member exists in both (rare, but possible if recently deleted)
            const memberIdsMap = new Set();
            const uniqueMembers: any[] = [];
            for (const m of members) {
                memberIdsMap.add((m as any).memberId);
                uniqueMembers.push(m);
            }
            for (const m of deletedMembers) {
                const mId = (m as any).memberId;
                if (!memberIdsMap.has(mId)) {
                    uniqueMembers.push((m as any).fullData || m);
                }
            }

            // Generator to stream JSON and pull cursors dynamically
            async function* generateBackupStream() {
                yield `{"backupType":"last-1-year","module":"pool","tenantId":"${poolId || 'superadmin'}","generatedAt":"${new Date().toISOString()}","data":{`;
                
                // Members
                yield `"members":[`;
                for (let i = 0; i < uniqueMembers.length; i++) {
                    yield JSON.stringify(uniqueMembers[i]);
                    if (i < uniqueMembers.length - 1) yield `,`;
                }
                yield `],`;

                // Payments (Cursor Stream)
                yield `"payments":[`;
                const paymentsCursor = Payment.find({ ...baseMatch, date: { $gte: oneYearAgo } }).lean().cursor();
                let isFirstPayment = true;
                for await (const p of paymentsCursor) {
                    if (!isFirstPayment) yield `,`;
                    yield JSON.stringify(p);
                    isFirstPayment = false;
                }
                yield `],`;

                // Entries (Cursor Stream)
                yield `"entries":[`;
                const entriesCursor = EntryLog.find({ ...baseMatch, scanTime: { $gte: oneYearAgo } }).lean().cursor();
                let isFirstEntry = true;
                for await (const e of entriesCursor) {
                    if (!isFirstEntry) yield `,`;
                    yield JSON.stringify(e);
                    isFirstEntry = false;
                }
                yield `],`;

                // Plans (Cursor Stream)
                yield `"plans":[`;
                const plansCursor = Plan.find({ ...baseMatch }).lean().cursor();
                let isFirstPlan = true;
                for await (const pl of plansCursor) {
                    if (!isFirstPlan) yield `,`;
                    yield JSON.stringify(pl);
                    isFirstPlan = false;
                }
                yield `]}}`;
            }

            const dateStrDay = new Date().toISOString().split("T")[0];
            const s3Key = `backups/${poolId || "superadmin"}/pool-backup-last-1-year-${dateStrDay}.json.gz`;

            const gzipStream = Readable.from(generateBackupStream()).pipe(createGzip());
            await uploadStreamBackup(gzipStream, s3Key, "application/gzip");

            return NextResponse.json({ success: true, key: s3Key }, {  status: 200 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        } catch (error: any) {
            console.error("[POST /api/settings/aws/backup-json]", error);
            return NextResponse.json({ error: error?.message || "Backup failed" }, {  status: 500 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        }
        });
            
}

