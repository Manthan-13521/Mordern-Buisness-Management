import { NextResponse } from "next/server";
import { resolveUser, AuthUser } from "@/lib/authHelper";
import { dbConnect } from "@/lib/mongodb";
import { getSettings } from "@/models/Settings";
import { EntryLog } from "@/models/EntryLog";
import { Member } from "@/models/Member";

import os from "os";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Simple 30-second in-memory cache for dashboard stats
let dashboardCache: { data: any; expiresAt: number } | null = null;

export async function GET(req: Request) {
    try {
        await dbConnect();

        const user = await resolveUser(req);
        if (!user || user.role !== "admin") {
            return NextResponse.json({ error: "Unauthorized" }, {  status: 403 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        }

        const settings = await getSettings();

        // Read last lines of error log
        const errorLogPath = path.join(process.cwd(), "logs", "errors.log");
        let recentErrors: string[] = [];
        try {
            if (fs.existsSync(errorLogPath)) {
                const content = fs.readFileSync(errorLogPath, "utf8");
                const lines = content.trim().split("\n").filter(Boolean);
                recentErrors = lines.slice(-5).reverse();
            }
        } catch {
            recentErrors = [];
        }

        // MongoDB connection state: 0=disconnected, 1=connected, 2=connecting, 3=disconnecting
        const mongooseState = require("mongoose").connection.readyState;
        const mongoStates: Record<number, string> = {
            0: "disconnected",
            1: "connected",
            2: "connecting",
            3: "disconnecting",
        };

        const uptime = process.uptime();
        const uptimeHours = Math.floor(uptime / 3600);
        const uptimeMinutes = Math.floor((uptime % 3600) / 60);

        const memUsage = process.memoryUsage();
        const totalMem = os.totalmem();
        const freeMem = os.freemem();

        // Today's active scans
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const [todaysScans, totalExpired] = await Promise.all([
            EntryLog.countDocuments({ scanTime: { $gte: today }, status: "granted" }),
            Member.countDocuments({ status: "expired" }),
        ]);

        return NextResponse.json({
            system: {
                uptime: `${uptimeHours}h ${uptimeMinutes}m`,
                nodeVersion: process.version,
                platform: process.platform,
                memoryUsedMB: Math.round(memUsage.heapUsed / 1024 / 1024),
                memoryTotalMB: Math.round(memUsage.heapTotal / 1024 / 1024),
                systemMemoryUsedMB: Math.round((totalMem - freeMem) / 1024 / 1024),
                systemMemoryTotalMB: Math.round(totalMem / 1024 / 1024),
                systemMemoryPercent: Math.round(((totalMem - freeMem) / totalMem) * 100),
            },
            database: {
                status: mongoStates[mongooseState] || "unknown",
                poolCapacity: settings.poolCapacity,
                currentOccupancy: settings.currentOccupancy,
                lastBackupAt: settings.lastBackupAt || null,
            },
            activity: {
                todaysScans,
                totalExpired,
            },
            recentErrors,
        }, { headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Failed to fetch health data" }, {  status: 500 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
    }
}
