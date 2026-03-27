import { NextResponse } from "next/server";

/**
 * Centralized cron authentication helper.
 * Returns null if authorized, or a 401 NextResponse if not.
 *
 * Usage:
 *   const err = requireCronAuth(req);
 *   if (err) return err;
 */
export function requireCronAuth(req: Request): NextResponse | null {
    const secret = process.env.CRON_SECRET;
    if (!secret) {
        throw new Error("[Security] CRON_SECRET env var is not set. Cannot authenticate cron requests.");
    }

    const authHeader = req.headers.get("authorization");
    if (authHeader === `Bearer ${secret}`) {
        return null; // Authorized
    }

    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
