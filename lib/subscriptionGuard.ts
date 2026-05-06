/**
 * ── Centralized Subscription Guard ──────────────────────────────────────
 * Reusable server-side helpers for API routes to enforce subscription access.
 * These check the DATABASE directly (not just JWT) for critical operations.
 *
 * Usage in any API route:
 *   const guard = await requireActiveSubscription(user);
 *   if (guard) return guard; // Returns 403 NextResponse if blocked
 */
import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { User, IUserSubscription } from "@/models/User";
import { logger } from "@/lib/logger";
import type { AuthUser } from "@/lib/authHelper";

// ── Grace period: 3 days of read-only access after expiry ────────────────
const GRACE_PERIOD_DAYS = 3;

interface SubscriptionCheckResult {
    status: "active" | "trial" | "expired" | "grace" | "none" | "suspended" | "cancelled";
    subscription: IUserSubscription | null;
    isActive: boolean;
    isGrace: boolean;
    isReadOnly: boolean;
    daysLeft: number | null;
}

/**
 * Fetch fresh subscription state from DB.
 * This is the SINGLE SOURCE OF TRUTH for subscription status.
 */
export async function checkSubscription(userId: string): Promise<SubscriptionCheckResult> {
    await dbConnect();
    const dbUser = await User.findById(userId)
        .select("subscription role")
        .lean() as any;

    if (!dbUser) {
        return { status: "none", subscription: null, isActive: false, isGrace: false, isReadOnly: true, daysLeft: null };
    }

    // Superadmin always active
    if (dbUser.role === "superadmin") {
        return { status: "active", subscription: null, isActive: true, isGrace: false, isReadOnly: false, daysLeft: null };
    }

    const sub = dbUser.subscription as IUserSubscription | undefined;
    if (!sub || !sub.expiryDate) {
        return { status: "none", subscription: null, isActive: false, isGrace: false, isReadOnly: true, daysLeft: null };
    }

    const now = new Date();
    const expiry = new Date(sub.expiryDate);
    const daysLeft = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    // Check suspended/cancelled first
    if (sub.status === "suspended") {
        return { status: "suspended", subscription: sub, isActive: false, isGrace: false, isReadOnly: true, daysLeft };
    }
    if (sub.status === "cancelled") {
        return { status: "cancelled", subscription: sub, isActive: false, isGrace: false, isReadOnly: true, daysLeft };
    }

    // Active or trial — not yet expired
    if (now <= expiry) {
        const effectiveStatus = sub.status === "trial" ? "trial" : "active";
        return { status: effectiveStatus, subscription: sub, isActive: true, isGrace: false, isReadOnly: false, daysLeft };
    }

    // Expired — check grace period
    const graceEnd = new Date(expiry.getTime() + GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000);
    if (now <= graceEnd) {
        return { status: "grace", subscription: sub, isActive: false, isGrace: true, isReadOnly: true, daysLeft };
    }

    // Hard expired
    return { status: "expired", subscription: sub, isActive: false, isGrace: false, isReadOnly: true, daysLeft };
}

/**
 * Require an active (paid or trial) subscription.
 * Returns a 403 NextResponse if blocked, or null if access is granted.
 */
export async function requireActiveSubscription(user: AuthUser | null): Promise<NextResponse | null> {
    if (!user?.id) {
        return NextResponse.json(
            { error: "Unauthorized", code: "AUTH_REQUIRED" },
            { status: 401, headers: { "Cache-Control": "no-store" } }
        );
    }

    // Superadmin bypass (fast path — avoid DB call)
    if (user.role === "superadmin") return null;

    // Operator inherits admin subscription via poolId/hostelId — check session JWT
    // For operators, we trust the middleware-level check (they don't have their own subscription)
    if (user.role === "operator") {
        const sessionStatus = user.subscriptionStatus;
        if (sessionStatus === "active") return null;
        // If operator's session doesn't have active status, block
        logger.warn("[SubscriptionGuard] Operator blocked — admin subscription inactive", {
            userId: user.id, poolId: user.poolId, status: sessionStatus
        });
        return NextResponse.json(
            { error: "Subscription required. Ask your admin to renew the plan.", code: "SUBSCRIPTION_REQUIRED" },
            { status: 403, headers: { "Cache-Control": "no-store" } }
        );
    }

    const check = await checkSubscription(user.id);

    if (check.isActive) return null; // Access granted

    logger.warn("[SubscriptionGuard] Access denied", {
        userId: user.id,
        status: check.status,
        daysLeft: check.daysLeft,
        route: "api",
    });

    if (check.status === "grace") {
        return NextResponse.json(
            { error: "Subscription expired. You have limited read-only access for 3 days. Please renew.", code: "SUBSCRIPTION_GRACE" },
            { status: 403, headers: { "Cache-Control": "no-store" } }
        );
    }

    const message = check.status === "none"
        ? "No active subscription. Please select a plan to continue."
        : "Subscription expired. Please renew to continue.";

    return NextResponse.json(
        { error: message, code: "SUBSCRIPTION_REQUIRED" },
        { status: 403, headers: { "Cache-Control": "no-store" } }
    );
}

/**
 * Allow both trial and paid subscriptions.
 * Same as requireActiveSubscription but explicitly named for clarity.
 */
export async function requireTrialOrPaid(user: AuthUser | null): Promise<NextResponse | null> {
    return requireActiveSubscription(user);
}

/**
 * Require subscription + correct module access.
 * Verifies the user's subscription matches the requested module.
 */
export async function requireModuleAccess(
    user: AuthUser | null,
    requiredModule: "pool" | "hostel" | "business"
): Promise<NextResponse | null> {
    const baseCheck = await requireActiveSubscription(user);
    if (baseCheck) return baseCheck;

    if (!user?.id || user.role === "superadmin" || user.role === "operator") return null;

    const check = await checkSubscription(user.id);
    if (check.subscription?.module && check.subscription.module !== requiredModule) {
        logger.warn("[SubscriptionGuard] Module mismatch", {
            userId: user.id,
            subscribedModule: check.subscription.module,
            requestedModule: requiredModule,
        });
        return NextResponse.json(
            { error: `Your subscription is for ${check.subscription.module}, not ${requiredModule}.`, code: "MODULE_MISMATCH" },
            { status: 403, headers: { "Cache-Control": "no-store" } }
        );
    }

    return null;
}

/**
 * Check if write operations are allowed.
 * During grace period: only reads allowed, writes blocked.
 */
export async function requireWriteAccess(user: AuthUser | null): Promise<NextResponse | null> {
    const baseCheck = await requireActiveSubscription(user);
    if (baseCheck) return baseCheck;

    if (!user?.id || user.role === "superadmin") return null;

    const check = await checkSubscription(user.id);
    if (check.isReadOnly) {
        return NextResponse.json(
            { error: "Write operations require an active subscription. Your access is read-only during the grace period.", code: "READ_ONLY_MODE" },
            { status: 403, headers: { "Cache-Control": "no-store" } }
        );
    }

    return null;
}
