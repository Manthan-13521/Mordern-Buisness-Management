# MEMORY_PROFILING_REPORT.md

## Status: CODE ANALYSIS ONLY (No Runtime Profiling)

Memory profiling requires a running application with representative workload. This report is based on static code analysis of allocation patterns.

## Heap Growth Analysis

### Large Buffer Allocations

| Operation | Allocation Size | Location | Risk |
|-----------|---------------|----------|------|
| Excel export | Entire dataset in memory as `workbook.xlsx.writeBuffer()` | `app/api/settings/aws/backup-excel/route.ts:139` | **HIGH** — unbounded by dataset size |
| Excel export (payments) | All payments + 4 $lookup results → Buffer | `app/api/payments/export/route.ts` | **HIGH** — unbounded |
| Excel export (hostel) | All hostel data → Buffer | `app/api/hostel/settings/aws/backup-excel/route.ts:141` | **HIGH** — unbounded |
| PDF generation | PDF document + embedded images + QR code buffer | `app/api/jobs/generate-card/route.ts` | MEDIUM — per-card |
| Photo upload | Base64/Image buffer (max 5MB) | `lib/savePhoto.ts` | LOW — limited to 5MB |

### Map/Set Growth

| Collection | Growth Pattern | Cleanup | Risk |
|-----------|---------------|---------|------|
| `abuseMap` (lib/abuse.ts) | Module-level Map, bounded by 10min cleanup interval | setInterval every 10min | MEDIUM — interval never cleared |
| `trackingCache` (ads/track) | Module-level Map, bounded by 15min cleanup | setInterval every 15min | MEDIUM — interval never cleared |
| `dedupeCache` (idempotency.ts) | LRU cache max 10K entries, 2min TTL | LRU eviction | LOW — bounded by LRU |
| `rateLimitCache` (rateLimiter.ts) | LRU cache per-route | LRU eviction | LOW — bounded |

## Event Loop Blocking (Synchronous Operations)

| Operation | Sync Duration | Location | Risk |
|-----------|--------------|----------|------|
| bcrypt.compare | ~100-200ms | `lib/auth.ts:signIn` | MEDIUM — every login |
| crypto.createCipheriv | ~1-5ms | `lib/aadhaarEncryption.ts` | LOW — per-member |
| JSON serialization (large lists) | Variable | All list endpoints | MEDIUM — unbounded |
| Excel workbook generation | Variable | Export endpoints | HIGH — unbounded |
| PDF generation | Variable | Card generation | MEDIUM — per-card |

## Stream Cleanup

| Stream | Location | Cleanup Verified |
|--------|----------|-----------------|
| S3 upload stream | `lib/s3.ts:uploadStreamBackup` | ✅ Proper |
| Cloudinary upload stream | `lib/cloudinary.ts:upload_stream` | ✅ Proper |

## Listener Leaks

| Listener | Location | Cleanup |
|----------|----------|---------|
| Circuit breaker event handlers | `lib/circuitBreaker.ts` | ✅ Internal to opossum |
| EventEmitter (quotaEvents.ts) | `lib/quotaEvents.ts` | ⚠️ Not verified |

## GC Pressure Points

| Pattern | GC Impact | Location |
|---------|-----------|----------|
| Per-request `new mongoose.Types.ObjectId()` | LOW — small objects | All routes |
| Per-request `crypto.randomUUID()` | LOW | All routes (requestId) |
| Per-aggregation result objects | MEDIUM — large documents | Dashboard/analytics |
| Per-export workbook + buffer | HIGH — large allocations | Export endpoints |

## Recommendations

1. **HIGH:** Convert Excel exports to streaming approach (avoid full buffer)
2. **HIGH:** Add pagination defaults to all list endpoints (prevent unbounded arrays)
3. **MEDIUM:** Clean up stale entries in abuseMap on-demand vs interval
4. **MEDIUM:** Monitor bcrypt.compare duration in auth (consider worker_threads)
5. **LOW:** Add GC metrics to prometheus gauge

NOT VERIFIED: Heap dump analysis, leak detection, allocation profiling (requires runtime)
