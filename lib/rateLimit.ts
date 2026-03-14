/**
 * Simple in-memory rate limiter.
 * Uses a Map keyed by IP. Eviction happens on each check (lazy cleanup).
 * Not suitable for multi-instance deployments (use Redis in production).
 */

type RateLimitEntry = { count: number; resetAt: number };

const store = new Map<string, RateLimitEntry>();

interface RateLimitOptions {
    /** Max requests allowed within the window */
    limit: number;
    /** Window length in seconds */
    windowSec: number;
}

export function checkRateLimit(
    ip: string,
    key: string,
    opts: RateLimitOptions
): { allowed: boolean; remaining: number; resetAt: number } {
    const mapKey = `${key}:${ip}`;
    const now = Date.now();

    const entry = store.get(mapKey);

    if (!entry || now > entry.resetAt) {
        // Fresh window
        const resetAt = now + opts.windowSec * 1000;
        store.set(mapKey, { count: 1, resetAt });
        return { allowed: true, remaining: opts.limit - 1, resetAt };
    }

    if (entry.count >= opts.limit) {
        return { allowed: false, remaining: 0, resetAt: entry.resetAt };
    }

    entry.count++;
    return { allowed: true, remaining: opts.limit - entry.count, resetAt: entry.resetAt };
}

/** Brute-force login protection */
const loginAttempts = new Map<string, { count: number; lockedUntil: number }>();

export function recordFailedLogin(ip: string): { locked: boolean; attemptsLeft: number } {
    const now = Date.now();
    const entry = loginAttempts.get(ip);

    if (entry && now < entry.lockedUntil) {
        return { locked: true, attemptsLeft: 0 };
    }

    const current = entry && now < entry.lockedUntil + 5 * 60 * 1000 ? entry : { count: 0, lockedUntil: 0 };
    current.count++;

    if (current.count >= 5) {
        current.lockedUntil = now + 5 * 60 * 1000; // 5-minute lockout
        loginAttempts.set(ip, current);
        return { locked: true, attemptsLeft: 0 };
    }

    loginAttempts.set(ip, current);
    return { locked: false, attemptsLeft: 5 - current.count };
}

export function isLoginLocked(ip: string): boolean {
    const entry = loginAttempts.get(ip);
    if (!entry) return false;
    return Date.now() < entry.lockedUntil;
}

export function clearLoginAttempts(ip: string) {
    loginAttempts.delete(ip);
}

export function getClientIp(req: Request): string {
    return (
        req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
        req.headers.get("x-real-ip") ||
        "unknown"
    );
}
