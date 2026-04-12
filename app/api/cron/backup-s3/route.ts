import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { Member } from "@/models/Member";
import { EntertainmentMember } from "@/models/EntertainmentMember";
import { Payment } from "@/models/Payment";
import { CronLog } from "@/models/CronLog";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { Readable } from "stream";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function* generateBackupStream() {
    yield '{"members":[';
    let first = true;
    for await (const doc of Member.find().cursor()) {
        if (!first) yield ',';
        yield JSON.stringify(doc);
        first = false;
    }
    
    yield '],"entertainmentMembers":[';
    first = true;
    for await (const doc of EntertainmentMember.find().cursor()) {
        if (!first) yield ',';
        yield JSON.stringify(doc);
        first = false;
    }

    yield '],"payments":[';
    first = true;
    for await (const doc of Payment.find().cursor()) {
        if (!first) yield ',';
        yield JSON.stringify(doc);
        first = false;
    }
    
    yield ']}';
}

export async function GET(req: Request) {
    if (req.headers.get("Authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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

        const key = `backups/db-shapshot-${Date.now()}.json`;

        // Create elegant Node stream from our asynchronous Mongo Generator
        const stream = Readable.from(generateBackupStream());

        await s3Client.send(
            new PutObjectCommand({
                Bucket: BUCKET,
                Key: key,
                Body: stream,
                ContentType: "application/json",
            })
        );

        log.status = "success";
        log.completedAt = new Date();
        log.metadata = { key };
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
}
