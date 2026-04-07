import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { Redis } from "@upstash/redis";
import { dbConnect } from "@/lib/mongodb";

export const dynamic = "force-dynamic";

export async function GET() {
    let dbStatus = "disconnected";
    let redisStatus = "disconnected";
    const start = Date.now();

    // 1. Probe DB
    try {
        await dbConnect();
        const state = mongoose.connection.readyState;
        if (state === 1) dbStatus = "connected";
        else if (state === 2) dbStatus = "connecting";
    } catch {
        dbStatus = "error";
    }

    // 2. Probe Redis
    try {
        if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
            const redis = new Redis({
                url: process.env.UPSTASH_REDIS_REST_URL,
                token: process.env.UPSTASH_REDIS_REST_TOKEN,
            });
            await redis.ping();
            redisStatus = "connected";
        } else {
            redisStatus = "skipped";
        }
    } catch {
        redisStatus = "error";
    }

    const latencyMs = Date.now() - start;
    const isHealthy = dbStatus === "connected" && redisStatus !== "error";

    const health = {
        status: isHealthy ? "ok" : "degraded",
        db: dbStatus,
        redis: redisStatus,
        queue: process.env.QSTASH_TOKEN ? "active" : "disabled",
        latencyMs,
        timestamp: new Date().toISOString()
    };

    return NextResponse.json(health, { 
        status: isHealthy ? 200 : 503,
        headers: { "Cache-Control": "no-store" }
    });
}
