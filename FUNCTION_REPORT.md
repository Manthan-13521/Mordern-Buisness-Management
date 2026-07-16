# FUNCTION_REPORT.md (Key Functions)

## Critical Path Functions

### 1. `resolveUser()` — lib/authHelper.ts (224 lines)
| Property | Value |
|----------|-------|
| **Purpose** | Resolve authenticated user from request |
| **Frequency** | Every API route (191 routes) |
| **Dependencies** | next-auth/jose, authCache, mongodb |
| **Complexity** | MEDIUM — 3 auth strategies, cache, active check |
| **Cost** | LOW — cached JWTs, fast check |
| **Optimization** | ✅ Already optimized with authCache |
| **Risk** | LOW |

### 2. `computeMemberStatus()` — lib/memberStatus.ts (67 lines)
| Property | Value |
|----------|-------|
| **Purpose** | Compute member status from plan dates |
| **Frequency** | Every member list render |
| **Dependencies** | None (pure function) |
| **Complexity** | LOW — pure date comparison |
| **Cost** | LOW |
| **Optimization** | ✅ Already efficient |
| **Risk** | LOW |

### 3. `notificationEngine.sendReminders()` — lib/notificationEngine.ts (401 lines)
| Property | Value |
|----------|-------|
| **Purpose** | Send WhatsApp reminders for due payments |
| **Frequency** | Daily cron |
| **Dependencies** | Subscription, Member, Ledger, Twilio, Pool |
| **Complexity** | HIGH — batch processing, dedup, tenant isolation |
| **Cost** | MEDIUM — multiple queries, external API calls |
| **Optimization** | Has N+1 in member lookup per subscriber |
| **Risk** | HIGH — Twilio circuit breaker could fail silently |

### 4. `getFullSummary()` — services/analyticsService.ts (536 lines)
| Property | Value |
|----------|-------|
| **Purpose** | Full business analytics summary |
| **Frequency** | On-demand (admin analytics page) |
| **Dependencies** | BusinessTransaction, BusinessCustomer, BusinessPayment |
| **Complexity** | HIGH — 5 aggregation pipelines |
| **Cost** | HIGH — multiple aggregations |
| **Optimization** | Cache results with stale-while-revalidate |
| **Risk** | MEDIUM — could time out on large datasets |

### 5. `enqueueJob()` / `recordFailedJob()` — lib/queue.ts (91 lines)
| Property | Value |
|----------|-------|
| **Purpose** | Enqueue background jobs via QStash |
| **Frequency** | Per-payment, per-notification |
| **Dependencies** | QStash, FailedJob model |
| **Complexity** | LOW |
| **Cost** | LOW |
| **Optimization** | ✅ Simple and direct |
| **Risk** | LOW |

### 6. `isDuplicate()` — lib/idempotency.ts (87 lines)
| Property | Value |
|----------|-------|
| **Purpose** | Cross-instance dedup using Redis setnx |
| **Frequency** | Every payment/billing operation |
| **Dependencies** | Redis, LRUCache |
| **Complexity** | LOW |
| **Cost** | LOW (single Redis call) |
| **Optimization** | ✅ Well-optimized with Redis + LRU fallback |
| **Risk** | LOW |

### 7. `saasGuard.requireActiveSubscription()` — lib/saasGuard.ts (354 lines)
| Property | Value |
|----------|-------|
| **Purpose** | Check tenant subscription status |
| **Frequency** | Every write operation |
| **Dependencies** | Organization, OrgSubscription, User |
| **Complexity** | HIGH — multi-tenant, multi-plan state machine |
| **Cost** | MEDIUM — DB queries per check |
| **Optimization** | Cache subscription status in Redis |
| **Risk** | MEDIUM — complex state transitions |

### 8. `dashboardCache.getDashboard()` — lib/dashboardCache.ts (179 lines)
| Property | Value |
|----------|-------|
| **Purpose** | Cached dashboard data with stale-while-revalidate |
| **Frequency** | Every admin dashboard load |
| **Dependencies** | Redis, in-memory lock |
| **Complexity** | MEDIUM — distributed locking, jittered TTL |
| **Cost** | LOW (cache hit) → MEDIUM (cache miss) |
| **Optimization** | ✅ Well-optimized cache layer |
| **Risk** | LOW |

### 9. `withRetry()` — lib/withRetry.ts (121 lines)
| Property | Value |
|----------|-------|
| **Purpose** | Exponential backoff with full jitter |
| **Frequency** | S3 operations, external calls |
| **Dependencies** | None (pure promise wrapper) |
| **Complexity** | LOW |
| **Cost** | LOW — only on failures |
| **Optimization** | ✅ Full jitter, configurable, max 30s cap |
| **Risk** | LOW |

### 10. `circuitBreaker.createBreaker()` — lib/circuitBreaker.ts (113 lines)
| Property | Value |
|----------|-------|
| **Purpose** | Circuit breaker for external services |
| **Frequency** | Twilio/Razorpay calls |
| **Dependencies** | opossum |
| **Complexity** | MEDIUM |
| **Cost** | LOW — negligible overhead |
| **Optimization** | ✅ 50% threshold, 5 volume min, 30s reset |
| **Risk** | LOW |

## Top Optimization Candidates

| Function | File | Lines | Complexity | Reason |
|----------|------|-------|-----------|--------|
| notificationEngine | lib/notificationEngine.ts | 401 | HIGH | N+1 queries, large batch processing |
| analyticsService | services/analyticsService.ts | 536 | HIGH | 5 aggregations per call, no caching |
| auth.ts (NextAuth) | lib/auth.ts | 487 | HIGH | Login rate limiting, multiple strategies |
| saasGuard.ts | lib/saasGuard.ts | 354 | HIGH | Complex state machine |
| hostel dashboard | app/api/hostel/dashboard/route.ts | 200+ | HIGH | 6 separate aggregates per request |

## Recommendations

1. **HIGH:** Split notificationEngine.sendReminders() into batch-friendly operations
2. **HIGH:** Cache analyticsService results with dashboardCache infrastructure
3. **MEDIUM:** Consolidate hostel dashboard aggregations into 1-2 pipelines
4. **MEDIUM:** Split saasGuard into smaller focused functions
5. **LOW:** Extract shared aggregation patterns into dedicated service
