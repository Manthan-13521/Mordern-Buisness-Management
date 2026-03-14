/**
 * Daily backup cron script.
 * Run this with: node scripts/backup-cron.js
 * Or schedule via pm2 / cron:
 *   0 2 * * * node /path/to/swimming-pool-system/scripts/backup-cron.js
 */

const cron = require("node-cron");
const https = require("https");
const http = require("http");

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
const CRON_SECRET = process.env.CRON_SECRET || "cron123";

async function triggerBackup() {
    const url = `${BASE_URL}/api/settings/backup/excel`;
    const protocol = url.startsWith("https") ? https : http;

    return new Promise((resolve, reject) => {
        const req = protocol.request(
            url,
            {
                method: "GET",
                headers: { Authorization: `Bearer ${CRON_SECRET}` },
            },
            (res) => {
                console.log(`[Backup Cron] ${new Date().toISOString()} — Status: ${res.statusCode}`);
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    resolve(true);
                } else {
                    reject(new Error(`Backup failed: HTTP ${res.statusCode}`));
                }
            }
        );
        req.on("error", reject);
        req.end();
    });
}

// Also trigger JSON backup
async function triggerJsonBackup() {
    const url = `${BASE_URL}/api/settings/backup`;
    const protocol = url.startsWith("https") ? https : http;

    return new Promise((resolve, reject) => {
        const req = protocol.request(
            url,
            {
                method: "GET",
                headers: { Authorization: `Bearer ${CRON_SECRET}` },
            },
            (res) => {
                console.log(`[JSON Backup Cron] ${new Date().toISOString()} — Status: ${res.statusCode}`);
                resolve(res.statusCode);
            }
        );
        req.on("error", reject);
        req.end();
    });
}

// Schedule: daily at 2:00 AM
cron.schedule("0 2 * * *", async () => {
    console.log("[Backup Cron] Starting daily backup at", new Date().toISOString());
    try {
        await triggerBackup();
        console.log("[Backup Cron] Excel backup completed successfully.");
    } catch (err) {
        console.error("[Backup Cron] Excel backup failed:", err.message);
    }
    try {
        await triggerJsonBackup();
        console.log("[Backup Cron] JSON backup completed successfully.");
    } catch (err) {
        console.error("[Backup Cron] JSON backup failed:", err.message);
    }
}, {
    timezone: "Asia/Kolkata",
});

console.log("[Backup Cron] Scheduler started. Daily backup scheduled at 2:00 AM IST.");
console.log("[Backup Cron] Target URL:", BASE_URL);
