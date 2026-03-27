/**
 * Environment variable validation.
 * Import this at the top of lib/mongodb.ts to fail fast if required vars are missing.
 */

const REQUIRED_ENV_VARS = [
    "MONGODB_URI",
    "NEXTAUTH_SECRET",
    "NEXTAUTH_URL",
    "CRON_SECRET",
];

const isBuild = 
    process.env.npm_lifecycle_event === "build" || 
    process.env.NEXT_PHASE === "phase-production-build" ||
    (process.env.CI === "true" && !process.env.CRON_SECRET);

if (!isBuild) {
    for (const key of REQUIRED_ENV_VARS) {
        if (!process.env[key]) {
            throw new Error(`[Startup] Missing required environment variable: ${key}`);
        }
    }
}

export {}; // Module marker
