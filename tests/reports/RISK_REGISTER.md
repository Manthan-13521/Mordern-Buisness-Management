# Risk Register

**Last Updated:** 2026-07-13

| ID | Risk | Likelihood | Impact | Score | Mitigation | Owner |
|----|------|-----------|--------|-------|-----------|-------|
| R01 | Razorpay webhook processing fails silently | Medium | Critical | 16 | Add webhook smoke test, Sentry alert | Backend |
| R02 | Subscription expiry not triggered on time | Low | High | 12 | Verify cron runs hourly, add alert | SRE |
| R03 | Tenant isolation bypass (horizontal privilege escalation) | Low | Critical | 12 | Multi-tenant test suite (8 tests passing) | Security |
| R04 | JWT secret rotation breaks active sessions | Medium | High | 12 | Document rotation procedure | DevOps |
| R05 | Redis outage causes rate limit bypass | Medium | Low | 6 | In-memory fallback verified | SRE |
| R06 | CSRF protection bypassed on POST endpoints | Low | High | 8 | CSRF middleware tested via POST flow | Security |
| R07 | MongoDB connection pool exhaustion | Low | High | 8 | Connection singleton verified in integration tests | Backend |
| R08 | XSS in member name field (no sanitization) | Low | Medium | 6 | Mitigated at frontend | Frontend |
| R09 | Deprecated API routes not removed | Medium | Low | 6 | Add route inventory to CI | Architect |
| R10 | Database migration without rollback | Medium | High | 12 | Require migration tests | DevOps |
| R11 | OAuth token leak in client-side bundle | Low | Critical | 8 | No OAuth used (credentials-only) | Security |
| R12 | Load test bypass enabled in production | Low | Critical | 6 | ENV block at startup (env.ts) | SRE |
| R13 | No Playwright E2E in CI | High | Medium | 8 | Configured but needs browser install | QA |
| R14 | Offline sync conflict causes data loss | Low | Medium | 4 | Dexie-based, not critical path | Frontend |

## Scoring

- **Likelihood**: 1 (Rare) → 5 (Almost Certain)
- **Impact**: 1 (Negligible) → 5 (Critical)
- **Score**: Likelihood × Impact (Max 25)

### Critical (>12)
| Risk | Score | Action |
|------|-------|--------|
| R01 — Webhook failure | 16 | Add monitoring + smoke test |
| R02 — Subscription expiry | 12 | Verify cron, add alert |
| R03 — Tenant isolation | 12 | ✅ Tested (8/8 passing) |
| R04 — JWT rotation | 12 | Document procedure |
| R10 — Migration rollback | 12 | Add migration tests |

### High (8-12)
| Risk | Score | Action |
|------|-------|--------|
| R06 — CSRF bypass | 8 | ✅ Tested via POST flow |
| R07 — MongoDB pool | 8 | ✅ Connection singleton verified |
| R11 — OAuth leak | 8 | ✅ Not applicable |
| R13 — No E2E in CI | 8 | Configure Playwright |

### Medium (4-6)
| Risk | Score | Action |
|------|-------|--------|
| R05 — Redis fallback | 6 | ✅ Tested |
| R08 — XSS name | 6 | Frontend mitigation |
| R09 — Deprecated routes | 6 | Add inventory |
| R12 — Load test bypass | 6 | ✅ ENV blocked |
| R14 — Offline sync | 4 | Monitor |
