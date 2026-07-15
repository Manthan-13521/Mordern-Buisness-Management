# Known Limitations

**Last Updated:** 2026-07-13

---

## Testing Infrastructure

| # | Limitation | Impact | Workaround |
|---|-----------|--------|------------|
| 1 | No WebSocket/SSE testing | Real-time features untested | Manual verification |
| 2 | No browser E2E in CI (no Playwright browsers installed) | UI regression risk | Run `npx playwright install` before CI |
| 3 | Vitest coverage requires running Next.js server separately | Coverage data is HTTP-level only | Not a true unit-test coverage |
| 4 | 191 route files, only 73 tested (~38%) | Significant coverage gap | Prioritize P0/P1 routes |
| 5 | No fuzz testing on input validation | Edge cases with malformed input | Add fuzzing in Phase 4 |
| 6 | No mutation testing | Test quality not measured | Consider Stryker for mutation testing |
| 7 | Cron/worker routes not tested (22 files) | Automated jobs may fail silently | Review manually, add smoke tests |

## Application

| # | Limitation | Impact | Workaround |
|---|-----------|--------|------------|
| 8 | Razorpay webhook not testable without real payments | Payment notifications untested | Manual test with Razorpay dashboard |
| 9 | Twilio integration not fully testable | SMS/WhatsApp alerts unverified | Check Twilio logs manually |
| 10 | Cloudinary upload not tested | Photo upload reliability unknown | Unit test the upload function |
| 11 | Offline/local-db not tested | Offline sync reliability unknown | Dexie-based, test separately |
| 12 | No rate limiting test with Redis | In-memory fallback differs from Redis | Deploy with Redis, then test |
| 13 | Subscription webhook untested | Payment→subscription activation gap | Manual test with Razorpay test mode |

## Security

| # | Limitation | Impact | Workaround |
|---|-----------|--------|------------|
| 14 | No DAST scanning | OWASP Top 10 not automated | Schedule ZAP/Burp scan quarterly |
| 15 | No dependency vulnerability scan | Supply chain risk | Add `npm audit` to CI |
| 16 | No secret scanning in CI | Credential leak risk | Add `truffleHog` or `git-secrets` |
| 17 | No CSP evaluation tool | CSP bypasses possible | Regular manual review |

## Performance

| # | Limitation | Impact | Workaround |
|---|-----------|--------|------------|
| 18 | No sustained load test | Memory leaks possible | Run k6 soak test for 24h |
| 19 | No database query profiling | Slow queries not detected | Enable MongoDB profiler |
| 20 | No CDN/caching benchmark | Static asset performance unknown | Test with Lighthouse |

## Observability

| # | Limitation | Impact | Workaround |
|---|-----------|--------|------------|
| 21 | Readiness endpoint not verified | K8s rolling updates risky | Add readiness test |
| 22 | Sentry error grouping not validated | Alert fatigue possible | Manual review of Sentry |
| 23 | No structured log validation | Log parsing failures possible | Add log schema tests |
