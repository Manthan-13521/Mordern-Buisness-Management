# Chaos Engineering Guide

## Purpose
Controlled failure experiments to verify system resilience and graceful degradation.

## Chaos Principles

1. **Hypothesis-driven**: Each experiment has a clear hypothesis about system behavior
2. **Minimal blast radius**: Experiments start small and expand
3. **Automated**: Experiments are reproducible
4. **Measured**: Results are quantified with metrics
5. **Remediated**: Findings lead to improvements

## Chaos Scenarios

### Scenario 1: Database Unavailable
**Hypothesis**: System returns cached data or graceful error message when MongoDB is down.
**How to test**:
```bash
# Stop MongoDB
brew services stop mongodb-community

# Run tests
npx tsx tests/api/health/health.test.ts

# Restart MongoDB
brew services start mongodb-community
```
**Expected**: Health check fails, cached dashboards work, write attempts return 503.

### Scenario 2: Redis Unavailable
**Hypothesis**: System falls back to in-memory caching/rate-limiting.
**How to test**:
```bash
# Stop Redis (if running locally)
redis-cli shutdown

# Run load test
k6 run tests/performance/chaos/chaos.test.js
```
**Expected**: Rate limiting falls back to in-memory, occupancy tracking degrades gracefully.

### Scenario 3: Third-Party Timeout
**Hypothesis**: Circuit breaker opens and system returns cached/fallback response.
**How to test**: Inject slow responses via environment variable or by blocking external calls.
**Expected**: Circuit breaker opens after 5 failures, 503 returned with `CIRCUIT_BREAKER_OPEN`, system continues serving other requests.

### Scenario 4: Network Latency
**Hypothesis**: Increased latency slows but doesn't break the system.
**How to test**: Use `tc` (traffic control) to add latency:
```bash
sudo tc qdisc add dev lo root netem delay 1000ms
k6 run tests/performance/load/smoke.test.js
sudo tc qdisc del dev lo root
```
**Expected**: Response times increase proportionally, timeouts occur for long (>30s) requests.

### Scenario 5: Webhook Failure
**Hypothesis**: Failed webhooks are saved to DLQ and recovered by reconciliation cron.
**How to test**: Send invalid webhook payload, verify it goes to WebhookDLQ, run reconciliation cron.
**Expected**: Invalid webhooks → DLQ → 200 response (stops retries) → cron recovers or flags for manual review.

### Scenario 6: QStash Unavailable
**Hypothesis**: Background jobs fall back to inline execution.
**How to test**: Set `QSTASH_TOKEN` to invalid value, trigger job.
**Expected**: `enqueueJob()` returns `{ success: false, fallback: true }`, job runs inline.

## Resilience Patterns Verified

| Pattern | Component | Status |
|---------|-----------|--------|
| Circuit Breaker | Razorpay orders | ✅ Implemented |
| Circuit Breaker | Twilio messages | ✅ Implemented |
| In-memory fallback | Rate limiting | ✅ Implemented |
| In-memory fallback | Cache | ✅ Implemented |
| Stale-while-revalidate | Dashboard cache | ✅ Implemented |
| Dead Letter Queue | Webhook failures | ✅ Implemented |
| Graceful degradation | All external services | ✅ Implemented |
| Query timeout | MongoDB queries | ✅ Implemented |
| Idempotency keys | Payments | ✅ Implemented |
| Retry with backoff | Cron jobs (QStash) | ✅ Implemented |
| Transaction rollback | Multi-collection ops | ✅ Implemented |

## Future Chaos Experiments

- [ ] CPU spike (stress-ng)
- [ ] Memory pressure (dd if=/dev/zero of=/dev/null)
- [ ] Disk I/O saturation (fio)
- [ ] DNS failure (block external DNS)
- [ ] Certificate expiration
- [ ] Rate limit exhaustion
- [ ] Concurrent payment race conditions
- [ ] Token expiration during active session
- [ ] Webhook replay attack
- [ ] Duplicate webhook delivery

## Running Chaos Tests

```bash
# Basic chaos test (simulated failures)
k6 run tests/performance/chaos/chaos.test.js

# With custom configuration
k6 run -e CHAOS_MODE=aggressive tests/performance/chaos/chaos.test.js
```
