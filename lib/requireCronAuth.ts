import { NextResponse } from "next/server";
import crypto from "crypto";

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
    const headerSecret = req.headers.get("x-cron-secret");

    // Phase 2A FIX 5: Use constant-time comparison to prevent timing side-channel attacks
    const candidateSecret = authHeader?.startsWith("Bearer ")
        ? authHeader.slice(7)
        : headerSecret;

    if (candidateSecret && candidateSecret.length === secret.length) {
        const isValid = crypto.timingSafeEqual(
            Buffer.from(candidateSecret, "utf8"),
            Buffer.from(secret, "utf8")
        );
        if (isValid) return null; // Authorized
    }

    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

