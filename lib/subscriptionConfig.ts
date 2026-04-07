/**
 * Server-side pricing table for SaaS subscriptions.
 * NEVER trust frontend amounts — always derive price from this table.
 */
export const SUBSCRIPTION_PRICES: Record<string, number> = {
    trial:          2,      // ₹2
    pool_quarterly: 2999,   // ₹2,999
    pool_yearly:    7999,   // ₹7,999
    hostel_1:       5999,   // ₹5,999 — 1 block
    hostel_2:       9999,   // ₹9,999 — 2 blocks
    hostel_3:       12999,  // ₹12,999 — 3 blocks
    hostel_4:       14999,  // ₹14,999 — 4 blocks
};

export type SubscriptionPlanType = "trial" | "quarterly" | "yearly" | "block-based";
export type SubscriptionModule   = "pool" | "hostel";

/**
 * Derive the pricing key from plan params.
 * Returns null if the combination is invalid.
 */
export function getPriceKey(
    planType: SubscriptionPlanType,
    module: SubscriptionModule,
    blocks?: number
): string | null {
    if (planType === "trial") return "trial";
    if (module === "pool") {
        if (planType === "quarterly") return "pool_quarterly";
        if (planType === "yearly")    return "pool_yearly";
    }
    if (module === "hostel" && planType === "block-based" && blocks && blocks >= 1 && blocks <= 4) {
        return `hostel_${blocks}`;
    }
    return null;
}
