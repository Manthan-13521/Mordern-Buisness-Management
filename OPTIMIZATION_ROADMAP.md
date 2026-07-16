# OPTIMIZATION_ROADMAP.md

## Prioritized Optimization Opportunities

### P0 — Critical (Impact: Security / Test Infrastructure)

| # | Optimization | Current | Evidence | Gain | Risk | Effort |
|---|-------------|---------|----------|------|------|--------|
| 1 | **Create `tests/helpers/setup.ts`** | Missing file blocks vitest entirely | 40 suites fail, 0 tests run | ✅ All tests runnable | LOW | 1 hour |
| 2 | **Add ObjectId validation before cast** | 30+ routes cast without validation | grep shows `new mongoose.Types.ObjectId(x)` without isValidObjectId | ✅ Prevent 500 errors | LOW | 2 hours |
| 3 | **Fix empty `catch {}` blocks** | 20+ empty catches in superadmin routes | Code review | ✅ Errors don't disappear | LOW | 1 hour |

### P1 — High Impact (Performance / Reliability)

| # | Optimization | Current | Evidence | Gain | Risk | Effort |
|---|-------------|---------|----------|------|------|--------|
| 4 | **Consolidate hostel dashboard aggregations** | 6 separate pipeline calls per load | `/api/hostel/dashboard/route.ts` | ✅ 5x fewer DB queries | MEDIUM | 4 hours |
| 5 | **Add analytics result caching** | 5 pipelines per analytics call | `services/analyticsService.ts` | ✅ Reuse within TTL | LOW | 2 hours |
| 6 | **Fix N+1 in notificationEngine** | Per-member query in loop | `lib/notificationEngine.ts:178-205` | ✅ Batch member lookup | LOW | 2 hours |
| 7 | **Paginate all list endpoints** | Potentially unbounded member/ payment lists | `app/api/members/route.ts` | ✅ Memory safety | LOW | 4 hours |
| 8 | **Convert console.* to structured logger** | 923 console.* calls | Static analysis | ✅ Production observability | LOW | 6 hours |
| 9 | **Reduce `as any` casts (293 total)** | Type safety erosion | Static analysis | ✅ Better type coverage | MEDIUM | 8 hours |

### P2 — Medium Impact (Scalability / Maintainability)

| # | Optimization | Current | Evidence | Gain | Risk | Effort |
|---|-------------|---------|----------|------|------|--------|
| 10 | **Upgrade 40 outdated dependencies** | Includes mongoose (9.2→9.7), next (16.2→16.2.10) | npm outdated | ✅ Bug fixes, perf | MEDIUM | 4 hours |
| 11 | **Fix npm audit (23 vulns)** | 6 high, 15 moderate, 2 low | npm audit | ✅ Security | MEDIUM | 2 hours |
| 12 | **Add OpenAPI/Swagger** | No API documentation | Project audit | ✅ Developer experience | LOW | 8 hours |
| 13 | **Stream Excel exports** | Full buffer in memory | `app/api/payments/export/route.ts` | ✅ Lower memory | MEDIUM | 3 hours |
| 14 | **Add Docker support** | No containerization | Project audit | ✅ Dev onboarding | LOW | 2 hours |
| 15 | **Clean up module-level setInterval** | Abuse + ads track intervals | `lib/abuse.ts:29`, `ads/track/route.ts:12` | ✅ No stale state | LOW | 1 hour |

### P3 — Lower Impact (Code Quality)

| # | Optimization | Current | Evidence | Gain | Risk | Effort |
|---|-------------|---------|----------|------|------|--------|
| 16 | **Replace `console.warn` in withTransaction** | Uses console instead of logger | `lib/withTransaction.ts:56` | ✅ Observability | LOW | 30 min |
| 17 | **Add TTL index to AccessLog** | No auto-cleanup | Code analysis | ✅ Storage savings | LOW | 30 min |
| 18 | **Standardize error responses** | Mix of patterns across routes | Case-by-case | ✅ Consistency | LOW | 4 hours |

## ROI Matrix

```
                   High ROI
                     │
                     │  1, 2, 3, 4, 5, 6, 7, 8
                     │
    Low Effort ──────┼────── High Effort
                     │  9, 10, 11, 13
                     │  12, 14, 15, 16, 17, 18
                     │
                   Low ROI
```

## Quick Wins (Do First)

1. **Create `tests/helpers/setup.ts`** — unblocks entire vitest infrastructure
2. **Add ObjectId validation** — prevents 500 errors on malformed IDs
3. **Fix empty catch blocks** — stops error swallowing
4. **Paginate member lists** — memory safety for large datasets
5. **Cache analytics results** — reduces DB load significantly
