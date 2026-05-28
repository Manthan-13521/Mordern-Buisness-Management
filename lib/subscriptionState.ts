export type SubscriptionState = 
    | "ACTIVE" 
    | "EXPIRED_GRACE_PERIOD" 
    | "EXPIRED_LOCKED" 
    | "NONE" 
    | "SUSPENDED" 
    | "CANCELLED";

export const GRACE_PERIOD_DAYS = 3;

/**
 * Resolves the precise subscription state based on the expiry date.
 * Enforces a 3-day read-only grace period before full lockout.
 */
export function resolveSubscriptionState(
    expiryDate: Date | string | null | undefined, 
    baseStatus?: string // optional "suspended" or "cancelled" from DB
): SubscriptionState {
    if (baseStatus === "suspended") return "SUSPENDED";
    if (baseStatus === "cancelled") return "CANCELLED";
    
    if (!expiryDate) return "NONE";

    const expiry = new Date(expiryDate);
    const now = new Date();

    if (now <= expiry) {
        return "ACTIVE";
    }

    // Check grace period
    const graceEnd = new Date(expiry.getTime() + GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000);
    if (now <= graceEnd) {
        return "EXPIRED_GRACE_PERIOD";
    }

    // Hard expired
    return "EXPIRED_LOCKED";
}

/**
 * Read-only mode applies during the 3-day grace period.
 * Users can view data but cannot mutate it.
 */
export function isReadOnlyMode(state: SubscriptionState): boolean {
    return state === "EXPIRED_GRACE_PERIOD";
}

/**
 * Locked mode applies after the grace period ends, or if suspended/cancelled.
 * Users are blocked from all protected APIs and redirected to renewal.
 */
export function isSubscriptionLocked(state: SubscriptionState): boolean {
    return state === "EXPIRED_LOCKED" || state === "SUSPENDED" || state === "CANCELLED" || state === "NONE";
}
