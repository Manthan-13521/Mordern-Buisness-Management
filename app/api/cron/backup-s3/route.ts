import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { Member } from "@/models/Member";
import { EntertainmentMember } from "@/models/EntertainmentMember";
import { Payment } from "@/models/Payment";
import { CronLog } from "@/models/CronLog";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { Readable } from "stream";
import { createGzip } from "zlib";
import { withHealthcheck } from "@/lib/healthchecks";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function* generateBackupStream(
    stats: { memberCount: number; entertainmentMemberCount: number; paymentCount: number }
) {
    yield '{"members":[';
    let first = true;
    for await (const doc of Member.find().cursor()) {
        if (!first) yield ',';
        yield JSON.stringify(doc);
        stats.memberCount++;
        first = false;
    }
    
    yield '],"entertainmentMembers":[';
    first = true;
    for await (const doc of EntertainmentMember.find().cursor()) {
        if (!first) yield ',';
        yield JSON.stringify(doc);
        stats.entertainmentMemberCount++;
        first = false;
    }

    yield '],"payments":[';
    first = true;
    for await (const doc of Payment.find().cursor()) {
        if (!first) yield ',';
        yield JSON.stringify(doc);
        stats.paymentCount++;
        first = false;
    }
    
    yield ']}';
}

export async function GET(req: Request) {
    if (req.headers.get("Authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return withHealthcheck({ checkName: "backup-s3", timeoutMs: 55000 }, async () => {
        const jobName = "backup-s3";
        const log = await CronLog.create({ jobName, status: "running" });

        try {
            await dbConnect();

            const s3Client = new S3Client({
                region: process.env.AWS_REGION || "us-east-1",
                credentials: {
                    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "missing",
                    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "missing",
                },
            });

            const BUCKET = process.env.AWS_S3_BUCKET_NAME;
            if (!BUCKET) throw new Error("AWS_S3_BUCKET_NAME is not configured");

            // Fixed typo: db-shapshot → db-snapshot
            // Extension changed to .json.gz to signal gzip encoding to restore tools
            const key = `backups/db-snapshot-${Date.now()}.json.gz`;

            // ── Pipe generator through GZIP before upload ──────────────────────
            // zlib is a Node.js built-in — no new dependency added.
            // Counts are tracked inside the generator as documents are yielded — zero extra DB calls.
            // ContentEncoding: "gzip" tells S3 / restore tools how to decompress.
            // IMPORTANT: If your restore script reads the raw S3 object, pipe it
            // through zlib.createGunzip() before JSON.parse().
            const backupStats = { memberCount: 0, entertainmentMemberCount: 0, paymentCount: 0 };
            const rawStream = Readable.from(generateBackupStream(backupStats));
            const gzipStream = rawStream.pipe(createGzip());

            await s3Client.send(
                new PutObjectCommand({
                    Bucket: BUCKET,
                    Key: key,
                    Body: gzipStream,
                    ContentType: "application/json",
                    ContentEncoding: "gzip",
                    Metadata: {
                        "backup-format": "json-gzip",
                        "backup-version": "2",
                    },
                })
            );

            log.status = "success";
            log.completedAt = new Date();
            // backupStats is fully populated after the generator has run (stream upload complete)
            log.metadata = { key, compressed: true, ...backupStats };
            await log.save();

            return NextResponse.json({ 
                success: true, 
                message: "Streaming backup job completed successfully",
                details: log.metadata 
            });

        } catch (e: any) {
            log.status = "failed";
            log.error = e.message || String(e);
            log.completedAt = new Date();
            await log.save();

            console.error(`[CRON ERROR] ${jobName}:`, e);
            return NextResponse.json({ error: "Failed to run AWS backup streaming job" }, { status: 500 });
        }
    });
}
