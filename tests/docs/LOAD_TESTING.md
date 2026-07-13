# Load Testing Guide

## Purpose
Comprehensive load testing framework for AquaSync using k6.

## Test Scenarios

### 1. Smoke Test
**File:** `tests/performance/load/smoke.test.js`
**Purpose:** Quick validation that all endpoints respond correctly.
**Config:** 1 VU, 30s, all endpoint types.
**Threshold:** P95 < 1000ms, 0% errors.
**Command:** `k6 run tests/performance/load/smoke.test.js`

### 2. Load Test
**File:** `tests/performance/load/load.test.js`
**Purpose:** Measure performance under increasing load from 1 to 100 VUs.
**Stages:** 10 → 25 → 50 → 100 VUs with hold periods.
**Threshold:** P95 < 2000ms, error rate < 5%.
**Command:** `k6 run tests/performance/load/load.test.js`

### 3. Stress Test
**File:** `tests/performance/stress/stress.test.js`
**Purpose:** Identify the breaking point of the system.
**Stages:** 50 → 100 → 150 → 200 → 250 VUs.
**Threshold:** P95 < 10000ms, error rate < 10%.
**Command:** `k6 run tests/performance/stress/stress.test.js`

### 4. Soak Test
**File:** `tests/performance/soak/soak.test.js`
**Purpose:** Detect memory leaks and degradation over time.
**Config:** 50 VU, 30 minutes sustained.
**Threshold:** P95 < 3000ms, error rate < 1%.
**Command:** `k6 run tests/performance/soak/soak.test.js`

### 5. Spike Test
**File:** `tests/performance/spike/spike.test.js`
**Purpose:** Test handling of sudden traffic surges.
**Config:** 10 → 200 VU in 10s, sustain 30s, recover.
**Threshold:** P95 < 10000ms, error rate < 15%.
**Command:** `k6 run tests/performance/spike/spike.test.js`

### 6. Chaos Test
**File:** `tests/performance/chaos/chaos.test.js`
**Purpose:** Verify graceful degradation with degraded dependencies.
**Config:** 20 VU, 3 minutes, mixed scenarios.
**Threshold:** P95 < 10000ms, error rate < 20%.
**Command:** `k6 run tests/performance/chaos/chaos.test.js`

## Endpoint Distribution

| Endpoint | Weight | Purpose |
|----------|--------|---------|
| `/api/health` | 10% | Liveness check |
| `/api/app-init?test=true` | 20% | App initialization |
| `/api/dashboard?test=true` | 25% | Dashboard (DB heavy) |
| `/api/members?page=1&limit=20&test=true` | 25% | Member list (DB heavy) |
| `/api/payments?page=1&limit=10&test=true` | 20% | Payment list (DB heavy) |

## Configuration

All shared configuration in `tests/performance/load/config.js`:
- `BASE_URL` — defaults to `http://localhost:3000`, override with `k6 -e BASE_URL=...`
- `AUTH_TOKEN` — optional bearer token for authenticated endpoints
- `thresholds` — standard thresholds applied to all tests
- `ENDPOINTS` — weighted endpoint distribution

## Results Interpretation

Key metrics to watch:
- **P95**: 95th percentile response time (primary SLA metric)
- **Error rate**: Percentage of failed requests
- **RPS**: Requests per second (throughput)
- **Server errors (5xx)**: Backend failures
- **Memory trend**: In soak tests, flat = good, rising = leak

## Historical Results

| Test | Date | P95 (ms) | Error Rate | Max RPS |
|------|------|----------|------------|---------|
| Smoke | 2026-07-13 | 35 | 0% | 9.9 |
| Load (100 VU) | 2026-07-13 | 1,804 | 0% | 74.1 |
| Stress (250 VU) | 2026-07-13 | 2,510 | 0.22% | 63.7 |
| Soak (50 VU, 30m) | 2026-07-13 | 1,562 | 0% | 74.9 |
