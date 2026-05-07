/**
 * ═══════════════════════════════════════════════════════════════════════
 *  React Query Configuration — Per-Query Overrides
 *  Global default: 10s staleTime (set in apiCache.ts)
 *  These overrides apply to specific query types
 * ═══════════════════════════════════════════════════════════════════════
 */

/**
 * Payment status queries — REAL-TIME required.
 * Payments must always show current state (pending/success/failed).
 */
export const paymentQueryConfig = {
    staleTime: 0,                    // Always refetch
    gcTime: 30_000,                  // GC after 30s
    refetchOnWindowFocus: true,
    retry: 2,
} as const;

/**
 * Dashboard stats — 15s staleTime matches Redis cache TTL.
 * No benefit refetching more frequently than cache invalidates.
 */
export const dashboardQueryConfig = {
    staleTime: 15_000,               // Match Redis TTL
    gcTime: 60_000,                  // GC after 60s
    refetchOnWindowFocus: true,
    refetchInterval: false as const, // No auto-polling
    retry: 1,
} as const;

/**
 * Member list — changes infrequently.
 * Only invalidated on member creation/deletion mutations.
 */
export const membersListQueryConfig = {
    staleTime: 30_000,               // 30s — mutations invalidate anyway
    gcTime: 120_000,                 // GC after 2min
    refetchOnWindowFocus: false,     // Don't refetch on tab switch
    retry: 2,
} as const;

/**
 * Entry/attendance log — semi-real-time.
 * Entry scans need to show up quickly for occupancy tracking.
 */
export const entryLogQueryConfig = {
    staleTime: 5_000,                // 5s — balance freshness vs load
    gcTime: 30_000,
    refetchOnWindowFocus: true,
    retry: 1,
} as const;

/**
 * Analytics/revenue charts — low frequency, heavy computation.
 * Server-side computed, cached aggressively.
 */
export const analyticsQueryConfig = {
    staleTime: 60_000,               // 60s — charts don't need real-time
    gcTime: 300_000,                 // GC after 5min
    refetchOnWindowFocus: false,
    retry: 1,
} as const;

/**
 * Plans list — rarely changes.
 * Only invalidated on plan CRUD mutations.
 */
export const plansQueryConfig = {
    staleTime: 120_000,              // 2 min
    gcTime: 300_000,                 // GC after 5min
    refetchOnWindowFocus: false,
    retry: 1,
} as const;
