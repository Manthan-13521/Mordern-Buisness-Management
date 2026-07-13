# Performance Testing Guide

## Purpose
Documentation of the AquaSync performance testing framework, metrics, and historical results.

## Performance Test Types

| Test | Tool | File | Duration | Target |
|------|------|------|----------|--------|
| Smoke | k6 | `tests/performance/load/smoke.test.js` | 30s | Quick validation |
| Load | k6 | `tests/performance/load/load.test.js` | ~8m | Progressive 1→100 VU |
| Stress | k6 | `tests/performance/stress/stress.test.js` | ~10m | Breaking point |
| Soak | k6 | `tests/performance/soak/soak.test.js` | ~34m | 30-min endurance |
| Spike | k6 | `tests/performance/spike/spike.test.js` | ~2m | Sudden surges |
| Chaos | k6 | `tests/performance/chaos/chaos.test.js` | 3m | Degraded deps |

## Key Metrics

| Metric | Description | Target |
|--------|-------------|--------|
| P95 | 95th percentile response time | < 2000ms (load), < 5000ms (stress) |
| Error Rate | Percentage of failed requests | < 5% (load), < 10% (stress) |
| RPS | Requests per second | > 50 (sustained) |
| P99 | 99th percentile response time | < 5000ms |
| Max | Maximum observed response time | < 30s |
| Server Errors | 5xx status codes | 0 |

## Historical Performance Results

### Load Test Results (2026-07-13)
| Stage | VUs | Avg (ms) | P95 (ms) | RPS | Errors |
|-------|-----|----------|----------|-----|--------|
| Smoke | 1 | 15 | 35 | 9.9 | 0% |
| Light | 10 | 446 | 964 | 18.7 | 0% |
| Medium | 25 | 451 | 853 | 46.4 | 0% |
| Heavy | 50 | 588 | 959 | 74.1 | 0% |
| Full Ramp | 1→100 | 470 | 1,804 | 58.2 | 0% |

### Stress Test Results (2026-07-13)
| Phase | VUs | P95 (ms) | Error Rate | Notes |
|-------|-----|----------|------------|-------|
| Warm-up | 50 | ~500ms | 0% | Normal |
| Normal peak | 100 | ~1,200ms | 0% | Comfortable |
| Above expected | 150 | ~2,000ms | 0% | Strained |
| Stress | 200 | ~2,500ms | 0.22% | Breaking point |
| Breaking | 250 | >3,000ms | 0.65% | Errors appear |

### Soak Test Results (2026-07-13)
| Metric | Value |
|--------|-------|
| Duration | 30 min |
| Total requests | 135,206 |
| Avg RPS | 74.9 |
| Avg latency | 546 ms |
| P95 | 1,562 ms |
| P99 | 2,663 ms |
| Max | 13.72 s |
| Error rate | 0% |
| Server errors | 0 |

## Capacity Estimates

| Environment | Safe Capacity | Peak RPS | Expected P95 |
|-------------|---------------|----------|-------------|
| Local Dev | 100 concurrent | 60-75 | < 1s |
| Vercel Prod (estimated) | 500-1,000+ | 300+ | < 500ms |
| Vercel + Redis cache + CDN | 2,000+ | 1,000+ | < 200ms |

## Running Performance Tests

```bash
# All performance tests
k6 run tests/performance/load/smoke.test.js
k6 run tests/performance/load/load.test.js
k6 run tests/performance/stress/stress.test.js
k6 run tests/performance/soak/soak.test.js
k6 run tests/performance/spike/spike.test.js
k6 run tests/performance/chaos/chaos.test.js

# With custom base URL
k6 run -e BASE_URL=https://staging.aquasync.com tests/performance/load/load.test.js

# With output (for analysis)
k6 run --out json=results.json tests/performance/load/load.test.js
```
