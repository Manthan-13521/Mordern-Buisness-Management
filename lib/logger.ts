import fs from "fs";
import path from "path";

const LOG_DIR = path.join(process.cwd(), "logs");

function ensureLogDir() {
    if (!fs.existsSync(LOG_DIR)) {
        fs.mkdirSync(LOG_DIR, { recursive: true });
    }
}

function formatEntry(level: string, message: string, meta?: object): string {
    const ts = new Date().toISOString();
    const metaStr = meta ? " " + JSON.stringify(meta) : "";
    return `[${ts}] [${level}] ${message}${metaStr}\n`;
}

function writeLog(file: string, entry: string) {
    // Skip file logging in production (Vercel read-only filesystem)
    if (process.env.NODE_ENV === "production" || process.env.VERCEL) {
        return;
    }
    try {
        ensureLogDir();
        fs.appendFileSync(path.join(LOG_DIR, file), entry, "utf8");
    } catch (e) {
        // Never crash the app because of a logging failure
        console.error("[Logger] Failed to write log:", e);
    }
}

export const logger = {
    info(message: string, meta?: object) {
        const entry = formatEntry("INFO", message, meta);
        console.log(entry.trim());
        writeLog("system.log", entry);
    },
    warn(message: string, meta?: object) {
        const entry = formatEntry("WARN", message, meta);
        console.warn(entry.trim());
        writeLog("system.log", entry);
    },
    error(message: string, meta?: object) {
        const entry = formatEntry("ERROR", message, meta);
        console.error(entry.trim());
        writeLog("system.log", entry);
        writeLog("errors.log", entry);
    },
    scan(message: string, meta?: object) {
        const entry = formatEntry("SCAN", message, meta);
        console.log(entry.trim());
        writeLog("entry_scans.log", entry);
        writeLog("system.log", entry);
    },
};
