/**
 * Client staleTime for TanStack Query — keep in sync with private API Cache-Control
 * (e.g. `Cache-Control: private, max-age=10` on GET /api/members).
 */
export const PRIVATE_API_STALE_MS = 10_000; // 10s — prevents re-fetch storms on navigation/tab-switch

/** Invalidate all member list queries after mutations. */
export const membersListQueryKeyPrefix = ["members", "list"] as const;
