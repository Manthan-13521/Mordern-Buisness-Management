# PERFORMANCE_REPORT.md

## Overview

Performance analysis conducted through code analysis, static metrics, and available runtime data.

## Hot Paths (Highest Frequency)

| Path | Frequency Driver | Code Location |
|------|-----------------|---------------|
| **Entry scanning** | Every member entry | app/api/entry/route.ts (492 lines) |
| **Member lookup** | Every admin dashboard load | app/api/members/route.ts (531 lines) |
| **Payment creation** | Every transaction | app/api/payments/route.ts |
| **Dashboard load** | Every admin page visit | app/api/dashboard/route.ts |
| **Occupancy check** | Polled every 10s on entry page | app/api/occupancy/route.ts |

## Memory Analysis

### Known Allocations

| Operation | Allocation | Risk |
|-----------|-----------|------|
| Excel export (full workbook in buffer) | Entire dataset in memory | HIGH on large datasets |
| PDF generation (pdf-lib) | Document + image buffer | MEDIUM |
| Photo upload (base64) | Image data in memory | MEDIUM |
| Member list (unpaginated) | Full members array | MEDIUM |
| Aggregation results | Pipeline result set | MEDIUM |

### Stream Usage

| File | Stream Type | Cleanup |
|------|------------|---------|
| lib/s3.ts | Upload stream | ✅ Proper |
| lib/cloudinary.ts | Upload stream | ✅ Proper |

### Module-Level setInterval (Memory Leak Risk in Serverless)

| File | Interval | Cleanup | Risk |
|------|----------|---------|------|
| lib/abuse.ts | 10 min cleanup | Module-level — NEVER clears | MEDIUM |
| app/api/ads/track/route.ts | 15 min cleanup | Module-level — NEVER clears | MEDIUM |
| app/pool/.../entry/page.tsx | 10s occupancy poll | ✅ Cleaned on unmount | LOW |

**Serverless Note:** In Vercel serverless, these intervals persist only for the function's lifetime. Cold starts reset them. However, in prolonged executions (cron 60s), they accumulate.

### Event Loop Blocking

| Pattern | Location | Risk |
|---------|----------|------|
| Large sync file writes | scripts/* | LOW (scripts only) |
| Large JSON serialization | Excel export | MEDIUM |
| crypto operations | Aadhaar encryption (per-member) | LOW |
| bcrypt.compare | Login (every auth attempt) | MEDIUM |

## Serialization Costs

| Operation | Input | Output | Cost |
|-----------|-------|--------|------|
| Member list response | Full members + populations | JSON array | MEDIUM |
| Dashboard aggregation | 6 aggregate pipelines | JSON object | HIGH |
| Analytics report | Monthly aggregation | JSON | MEDIUM |
| Excel export | Full dataset | Binary buffer | HIGH |

## Caching Effectiveness

| Cache | Hit Rate Estimate | Benefit |
|-------|------------------|---------|
| Dashboard (L1+Redis) | High (30-60s TTL) | HIGH |
| Members list (Redis) | High (10s TTL) | MEDIUM |
| Auth JWT (Redis) | High (15min TTL) | LOW (JWT is already fast) |
| Occupancy (Redis INCR) | Real-time | HIGH |
| Rate limit (Redis/LRU) | Per-request | HIGH |

## Compression

`compress: true` in next.config.ts — Gzip enabled for all responses.

## Recommendations

1. **HIGH:** Convert Excel exports to streaming (avoid full buffer in memory)
2. **HIGH:** Consolidate hostel dashboard 6 aggregations into 1-2 pipeline
3. **MEDIUM:** Add pagination defaults to member list endpoints (currently potentially unbounded)
4. **MEDIUM:** Clean up module-level setInterval in abuse.ts (convert to on-demand)
5. **MEDIUM:** Add response size limits for aggregation endpoints
6. **LOW:** Replace `console.warn` in withTransaction.ts with proper logger

NOT VERIFIED: Heap profiling, GC pressure, actual memory usage (requires production runtime)
