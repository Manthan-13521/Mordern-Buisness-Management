# SCALABILITY_REPORT.md

## Status: REQUIRES LOAD TESTING FOR NUMERICAL LIMITS

## Architecture Scalability Assessment

| Dimension | Current Capacity | Bottleneck | Next Bottleneck |
|-----------|-----------------|------------|-----------------|
| **API Throughput** | 60-9,999 req/min/tenant | Rate limit tier | Mongo connection pool (25) |
| **Database** | Single MongoDB cluster | maxPoolSize: 25 | Aggregation pipelines |
| **Cache** | Upstash Redis | 100MB default | — |
| **Queue** | QStash HTTP queue | 60s function timeout | — |
| **Cron** | 21 concurrent max | Vercel limit | — |
| **File Storage** | Cloudinary + S3 | Bandwidth-bound | — |

## Scaling Bottlenecks (Ranked)

### 1. MongoDB Connection Pool (First Bottleneck)
- **Current:** maxPoolSize: 25
- **Limit:** ~500 concurrent users (assuming 5% active at once)
- **Fix:** Increase maxPoolSize to 100-200, or use connection pooling

### 2. Aggregation Pipeline Performance (Second Bottleneck)
- **Current:** 30+ aggregations, some with 3-4 $lookup stages
- **Impact:** Dashboard loads trigger 6 separate aggregations
- **Fix:** Consolidate pipelines, add caching, use materialized views

### 3. EntryLog Data Growth (Third Bottleneck)
- **Current:** TTL index at 15 days — adequate
- **Future:** At 50K members × 500 entries/day = 25M docs at any time
- **Fix:** Shard or archive to separate collection

### 4. Serverless Function Timeout
- **Current:** Cron maxDuration: 60s
- **Impact:** Backup export, analytics could timeout at scale
- **Fix:** Break large operations into batches via QStash

### 5. In-Memory Caches (Serverless Cold Starts)
- **Current:** LRU caches reset on cold start
- **Impact:** Thundering herd on first request after idle
- **Mitigation:** Stale-while-revalidate pattern helps

## Tenant Scale Estimates

| Tenant Tier | Max Members | Max Payments/Day | Max QR Scans/Day | Notes |
|------------|-------------|-----------------|------------------|-------|
| Trial | 20 | 20 | 100 | Hard limit in OrgUsage |
| Quarterly | Unlimited | 200 | 1,000 | No hard limit |
| Yearly | Unlimited | 500 | 2,500 | No hard limit |
| Enterprise | Unlimited | 1,000+ | 5,000+ | Highest rate limit |

## System Limits (From Code Analysis)

| Resource | Limit | Where Set |
|----------|-------|-----------|
| **Rate limit (FREE)** | 60 req/min | middlewares/rateLimit.ts |
| **Rate limit (ENTERPRISE)** | 9,999 req/min | middlewares/rateLimit.ts |
| **Rate limit (abuse)** | 200 req/5min | lib/abuse.ts |
| **Payload size (default)** | 100 KB | middlewares/security.ts |
| **Payload size (uploads)** | 8 MB | middlewares/security.ts |
| **Cache TTL (dashboard)** | 30-60s + jitter | lib/dashboardCache.ts |
| **Cache TTL (members)** | 10s + jitter | lib/membersCache.ts |
| **Idempotency window** | 10s default, 24h max | lib/idempotency.ts |
| **Circuit breaker reset** | 30s | lib/circuitBreaker.ts |
| **Query timeout** | 8s | lib/queryTimeout.ts |
| **Function timeout (cron)** | 60s | vercel.json |

## Recommendations

1. **HIGH:** Increase MongoDB maxPoolSize (configurable via MONGODB_URI options)
2. **HIGH:** Consolidate hostel dashboard 6 aggregations into 1-2
3. **MEDIUM:** Add caching for analytics aggregation results
4. **MEDIUM:** Consider sharding EntryLog by poolId at 50M+ documents
5. **MEDIUM:** Add pagination to all list endpoints (prevent unbounded queries)
6. **LOW:** Monitor Vercel cold start times and consider provisioned concurrency

**Cannot determine from repository:** Actual breaking point under load (requires load testing).
