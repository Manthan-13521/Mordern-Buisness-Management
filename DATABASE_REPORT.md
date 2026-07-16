# DATABASE_REPORT.md

## Overview

**Database:** MongoDB via Mongoose 9.2.4
**Connection:** Cached singleton pattern (lib/mongodb.ts)
**Pool Size:** maxPoolSize: 25
**Models:** 84 Mongoose schemas

## Collection Analysis

From integration tests: **82 collections** found in the connected database.

## Model Health

| Property | Assessment |
|----------|-----------|
| Schema definitions | Well-defined with types, required fields, defaults | ✅ |
| Indexes defined | Present in model files + migration scripts | ✅ |
| TTL indexes | EntryLog (15d), CronLog (30d), DeletedHostelMember (30d) | ✅ |
| Encrypted fields | Aadhaar (AES-256-GCM) | ✅ |
| Virtuals | Used where appropriate | ✅ |
| Pre-save hooks | Used for encryption, ID generation | ✅ |
| Post-save hooks | Used for cache invalidation | ✅ |

## Aggregation Pipeline Analysis

### High-Cost Aggregations (4+ pipeline stages)

**Payments Export** (`/api/payments/export/route.ts`):
```
4x $lookup + $match + $sort
$lookup: members, plans, subscriptions, entrylogs
```
**RISK:** 4 $lookup stages on a single aggregation — potential performance issue on large datasets.

**Hostel Dashboard** (`/api/hostel/dashboard/route.ts`):
```
6 separate aggregation calls
$lookup across HostelRoom, HostelMember, HostelPayment
```
**RISK:** Each dashboard load triggers 6 aggregations. Consider caching.

### Missing Index Risks

The following queries lack supporting indexes (detected via code analysis):

| Query Pattern | Collection | Fields | Risk |
|--------------|------------|--------|------|
| `HostelPayment.aggregate($lookup)` | hostelpayments | memberId (string) | **COLLSCAN** without index |
| `BusinessTransaction.aggregate($match + $group)` | businesstransactions | businessId, type, date | **COLLSCAN** on date range |
| `EntryLog.aggregate($match + $group)` | entrylogs | poolId, scanTime | Missing date sort index |
| `Payment.aggregate($lookup)` | payments | memberId (string ref) | **COLLSCAN** without proper index |

### N+1 Query Detection

| Pattern | Location | Risk |
|---------|----------|------|
| `Ledger.findOne()` per member in loop | notificationEngine.ts:178-205 | **N+1** — 1 query per defaulter |
| `Member.find()` per member in defaulter batch | defaulterEngine.ts:34-35 | **N+1** — per-member subscription lookup |
| `HostelPayment.aggregate()` called 3-6x per dashboard load | dashboard route | **N+1 adjacent** |

### Lean() Usage

Lean is used in ~90% of read queries. Areas without lean (verified in code):

- `lib/notificationEngine.ts` — all queries use `.lean()` ✅
- `lib/defaulterEngine.ts` — all queries use `.lean()` ✅  
- `lib/tenantSecurity.ts` — secureFindById/Update/Delete use `.lean()` ✅
- `lib/queries.ts` — cached queries use `.lean()` ✅

## Document Growth Risk

| Collection | Document Size | Growth Pattern | Risk |
|-----------|--------------|----------------|------|
| EntryLog | ~1KB | ~500 entries/day/pool = ~1.5M/year | HIGH — needs TTL |
| BusinessTransaction | ~2KB | ~50/day/business = ~18K/year | MEDIUM |
| NotificationLog | ~0.5KB | ~100/day/tenant | LOW (capped) |
| AccessLog | ~0.3KB | ~1000/day | HIGH — needs TTL |
| HostelPaymentArchive | ~1KB | ~30/month/hostel | LOW |

## Transactions

`lib/withTransaction.ts` provides MongoDB transaction support with Atlas free-tier fallback.

- Used in: billing engine, payment processing
- Fallback: logs warning when transactions unavailable
- Risk: `console.warn()` used instead of logger — silent in production

## Index Verification

REQUIRES LIVE DATABASE — Cannot verify actual index usage, COLLSCAN, or IXSCAN without `explain()` on production-like data.

## Recommendations

1. **HIGH:** Add compound index on `{ poolId: 1, scanTime: -1 }` for EntryLog aggregation
2. **HIGH:** Add index on `{ memberId: 1, poolId: 1 }` for Payment $lookup performance
3. **MEDIUM:** Batch member/ledger lookups in notificationEngine to eliminate N+1
4. **MEDIUM:** Add TTL index to AccessLog collection
5. **MEDIUM:** Cache hostel dashboard aggregation results (currently 6 separate calls per load)
6. **LOW:** Review mongoose.connect() maxPoolSize=25 for higher user counts
