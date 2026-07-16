# ARCHITECTURE_REPORT.md

## Overall Architecture Assessment

| Dimension | Score (1-10) | Notes |
|-----------|-------------|-------|
| Module Separation | 8/10 | Clear verticals (Pool/Hostel/Business) |
| Dependency Management | 7/10 | Core lib shared, some duplication |
| Layering | 8/10 | Middleware → API → Lib → Models |
| Extensibility | 7/10 | New module requires new route group + models |
| Maintainability | 6/10 | 293 `as any`, 923 `console.*`, 40 outdated deps |
| Testability | 4/10 | Vitest infrastructure broken |

## Strengths

### 1. Clean Module Separation
Each business vertical has its own model namespace, API routes, and admin pages. New verticals can be added without affecting existing ones.

### 2. Robust Middleware Chain
The edge middleware (`proxy.ts`) provides defense-in-depth:
- Security headers at edge
- Rate limiting before business logic
- Authentication before data access
- Subscription guard before admin access

### 3. Multi-Layer Caching
```
L1: In-memory (5s)
L2: Redis (configurable TTL)
L3: Stale-while-revalidate (dashboard)
```
Every Redis path has an in-memory fallback.

### 4. Resilient External Service Integration
- **Circuit breakers** for Twilio/Razorpay
- **Exponential backoff** for S3 operations
- **Idempotency keys** for payment processing
- **DLQ** for failed jobs and webhooks

### 5. Solid Security Foundation
- CSP, HSTS, CORS, CSRF all implemented
- AES-256-GCM encryption for PII
- Rate limiting at multiple tiers
- Tenant isolation enforced at query level

## Weaknesses

### 1. Test Infrastructure Broken
**Critical:** `vitest.config.ts` references a non-existent `setup.ts`. All 40 vitest suites fail to load.

### 2. Serverless Pattern Violations
- `setInterval()` at module level (`lib/abuse.ts`, `app/api/ads/track/route.ts`) — valid but accumulates in long-running cron executions
- Module-level state in serverless context (abuseMap, trackingCache)
- In-memory LRU caches reset on cold starts (acceptable trade-off)

### 3. Aggregation Pipeline Sprawl
- 30+ aggregation pipelines across the codebase
- Hostel dashboard does 6 separate aggregations per request
- Payments export has 4 $lookup stages in single pipeline

### 4. Code Quality
- 293 `as any` casts spread across codebase
- 923 `console.*` calls (should use logger)
- 20+ empty `catch {}` blocks
- `console.warn` used instead of logger in withTransaction.ts

### 5. No OpenAPI/Swagger Documentation
API has no machine-readable specification. Makes integration and client generation difficult.

### 6. Missing Docker Support
No Dockerfile or docker-compose.yml. Local development requires manual MongoDB setup.

## Circular Dependencies

NOT VERIFIED — Requires dependency graph tooling.

## Module Coupling

| Module | Coupled To | Coupling Strength |
|--------|-----------|-------------------|
| Pool | lib/*, models/*, services/* | HIGH (all core deps) |
| Hostel | lib/*, models/* | MEDIUM |
| Business | lib/*, models/*, services/analyticsService | MEDIUM |
| Superadmin | All models | HIGH |
| SaaS/Sub | Organization, User, Pool, Hostel, Business | HIGH |

## Recommendations

1. **HIGH:** Fix vitest infrastructure — create `tests/helpers/setup.ts`
2. **HIGH:** Convert page-level `console.*` calls to structured logger
3. **HIGH:** Add `isValidObjectId()` validation to all ObjectId casts
4. **MEDIUM:** Consolidate hostel dashboard aggregations into single pipeline
5. **MEDIUM:** Add OpenAPI/Swagger spec generation
6. **MEDIUM:** Replace empty `catch {}` with logged warnings
7. **LOW:** Add Docker support for local development
8. **LOW:** Extract shared aggregation logic into dedicated query service
