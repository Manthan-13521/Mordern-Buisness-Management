# LOAD_TEST_REPORT.md

## Status: NOT EXECUTED

Load testing was not executed during this audit due to:

1. **k6 not installed** on this macOS environment
2. **No running server** to target for HTTP-based load tests
3. **No production or staging environment** available with representative data

## Available Load Test Scripts

The repository contains these load test scripts:

| Script | Purpose |
|--------|---------|
| `scripts/load-test.js` | Custom Node.js load test |
| `scripts/progressive-load-test.js` | Progressive ramp-up test |
| `tests/performance/load/load-v2.test.js` | k6 load test (CI) |
| `tests/performance/load/spike.test.js` | k6 spike test (CI) |
| `tests/performance/load/chaos.test.js` | k6 chaos test (CI) |

## CI Pipeline Load Testing

The CI pipeline runs k6 tests with `continue-on-error: true`:
```yaml
- name: Run k6 load test
  run: k6 run -e BASE_URL=http://localhost:3000 tests/performance/load/load-v2.test.js
  continue-on-error: true
```

## Performance Baselines (From Code Analysis)

| Metric | Estimated | Evidence |
|--------|-----------|----------|
| **Safe concurrent users** | REQUIRES PRODUCTION ENVIRONMENT | — |
| **Max RPS (API)** | REQUIRES LOAD TEST | — |
| **Max RPS (cron)** | 22 concurrent max (Vercel limit) | vercel.json |
| **MongoDB connection pool** | 25 concurrent | lib/mongodb.ts |
| **Rate limit ceiling** | 9,999 req/min (ENTERPRISE tier) | middlewares/rateLimit.ts |
| **Function timeout (cron)** | 60s max | vercel.json |

## Recommendations

1. Install k6 and run against a staging environment with realistic data volume
2. Profile these specific endpoints under load:
   - `/api/entry` — QR scanning (highest frequency)
   - `/api/members` — List with aggregations
   - `/api/hostel/dashboard` — 6 aggregations per load
   - `/api/payments/export` — 4 $lookup pipeline
3. Test with 50, 100, 250 concurrent users targeting entry/member endpoints
4. Monitor for 429 rate limit hits under burst scenarios
