import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { HostelSettings } from "@/models/HostelSettings";
import { HostelRegistrationLog } from "@/models/HostelRegistrationLog";
import { HostelPaymentLog } from "@/models/HostelPaymentLog";
import { HostelPayment } from "@/models/HostelPayment";
import { DataRetentionLog } from "@/models/DataRetentionLog";
import { logger } from "@/lib/logger";

/**
 * GET /api/cron/hostel-data-retention
 * Protected by CRON_SECRET.
 * 
 * Hostel Data Retention Rules:
 * 1. Registration logs > 90 days are deleted.
 * 2. Payments && Payment logs > 180 days are deleted.
 * 
 * Safety Rule:
 * Sweeps per tenant. Deletion ONLY occurs if AWS backup was successful 
 * within the last 24 hours for that SPECIFIC tenant.
 */
export async function GET(req: Request) {
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = req.headers.get("authorization");
    const querySecret = new URL(req.url).searchParams.get("secret");
    const providedSecret = authHeader?.startsWith("Bearer ")
        ? authHeader.slice(7)
        : querySecret;

    if (!cronSecret || providedSecret !== cronSecret) {
        return NextResponse.json({ error: "Unauthorized", code: "FORBIDDEN" }, { status: 401 });
    }

    try {
        await dbConnect();
        
        const allSettings = await HostelSettings.find({});
        const msIn24Hours = 24 * 60 * 60 * 1000;
        const now = new Date();
        const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        const oneEightyDaysAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
        
        const summary: any[] = [];

        // Sweep each tenant
        for (const settings of allSettings) {
            const hostelId = settings.hostelId;
            
            // --- 1. AWS Backup Safety Check ---
            if (!settings.lastBackupAt) {
                logger.warn(`[HostelDataRetention] Backup safety check failed for ${hostelId}. lastBackupAt is missing.`);
                continue; // Skip safely
            }

            const timeSinceLastBackup = Date.now() - new Date(settings.lastBackupAt).getTime();
            if (timeSinceLastBackup > msIn24Hours) {
                logger.warn(`[HostelDataRetention] Backup safety check failed for ${hostelId}. Backup is older than 24 hours.`, { 
                    lastBackupAt: settings.lastBackupAt 
                });
                continue; // Skip safely
            }

            // --- 2. Execute Data Retention Cleanup ---
            let registrationsDeleted = 0;
            let paymentsDeleted = 0;

            // A. Delete Registration logs older than 90 days
            const regResult = await HostelRegistrationLog.deleteMany({ 
                hostelId, 
                join_date: { $lt: ninetyDaysAgo } 
            });
            if (regResult.deletedCount > 0) {
                registrationsDeleted = regResult.deletedCount;
                await DataRetentionLog.create({
                    deletedType: "hostel_registration",
                    countDeleted: regResult.deletedCount,
                    deletedAt: now,
                });
            }

            // B. Delete Payment logs older than 180 days
            const payLogResult = await HostelPaymentLog.deleteMany({ 
                hostelId, 
                payment_date: { $lt: oneEightyDaysAgo } 
            });

            // C. Delete Payments older than 180 days
            const payResult = await HostelPayment.deleteMany({
                hostelId,
                createdAt: { $lt: oneEightyDaysAgo }
            });

            const totalPayRemoved = payLogResult.deletedCount + payResult.deletedCount;
            if (totalPayRemoved > 0) {
                paymentsDeleted = totalPayRemoved;
                await DataRetentionLog.create({
                    deletedType: "hostel_payment",
                    countDeleted: totalPayRemoved,
                    deletedAt: now,
                });
            }
            
            summary.push({
                hostelId,
                registrationsDeleted,
                paymentsDeleted,
                backupVerifiedAt: settings.lastBackupAt
            });
        }

        logger.info("[HostelDataRetention] Cleanup completed safely.", { tenantsProcessed: summary.length, summary });
        
        return NextResponse.json({ 
            success: true, 
            timestamp: now, 
            tenantsProcessed: summary.length,
            summary 
        });

    } catch (error: any) {
        logger.error("[HostelDataRetention] Cron failed:", { error: error?.message || String(error) });
        return NextResponse.json(
            { error: error?.message || "Data retention cleanup failed" },
            { status: 500 }
        );
    }
}
