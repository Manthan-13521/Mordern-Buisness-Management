# BUGS_AND_ERRORS.md (UPDATED WITH TEST RESULTS)

## P0 — Critical Bugs

### BUG-001: Payments Export Endpoint Returns 500
| Field | Value |
|-------|-------|
| **Severity** | CRITICAL |
| **Category** | Production Bug |
| **Location** | `app/api/payments/export/route.ts` |
| **Evidence** | `GET /api/payments/export` → `500: {"error":"Failed to export payments"}` |
| **Impact** | Payment export feature completely broken. Users cannot download payment records. |
| **Root Cause** | 4-stage `$lookup` aggregation pipeline (members, plans, subscriptions, entrylogs) failing — likely a schema mismatch or missing field reference |
| **Fix** | Debug aggregation pipeline. Check field names in $lookup localField/foreignField against actual model schema. Add error logging to identify which stage fails. |
| **Risk** | HIGH — no workaround for payment exports |

### BUG-002: Vitest Setup File Missing
| Field | Value |
|-------|-------|
| **Severity** | HIGH |
| **Category** | Infrastructure |
| **Location** | `tests/helpers/setup.ts` (DOES NOT EXIST) |
| **Evidence** | `npx vitest run` → `Error: Cannot find module '.../tests/helpers/setup.ts'` |
| **Impact** | All 40 vitest test suites fail to load. 0 tests run. Coverage cannot be generated. |
| **Root Cause** | `vitest.config.ts` references `setupFiles: ["./tests/helpers/setup.ts"]` but file was never created |
| **Fix** | Create `tests/helpers/setup.ts` that imports and re-exports db.ts, env.ts, fixtures.ts, index.ts |
| **Risk** | CI pipeline vitest/coverage job produces no results |

### BUG-003: TypeScript Errors in Script Files
| Field | Value |
|-------|-------|
| **Severity** | HIGH |
| **Category** | Compilation |
| **Location** | `scripts/db-explain-audit.ts`, `tests/scripts/explain-audit.ts` |
| **Evidence** | `npx tsc --noEmit` → 4 TS errors |
| **Impact** | Scripts cannot be executed, DB audit tools broken |
| **Fix** | Fix type assertions in explain-audit scripts |
| **Risk** | Blocked database query analysis |

## P1 — High Severity Bugs

### BUG-004: Empty Catch Blocks Swallow Errors
| Field | Value |
|-------|-------|
| **Severity** | HIGH |
| **Category** | Error Handling |
| **Location** | `app/api/superadmin/pools/[poolId]/route.ts` (12x), `app/api/superadmin/hostels/[hostelId]/route.ts` (12x) |
| **Evidence** | `} catch {}` — 24 occurrences in superadmin routes, verified by code analysis |
| **Impact** | Failures during pool/hostel superadmin operations are completely silent |
| **Fix** | Add `logger.warn()` in all catch blocks |
| **Risk** | Production issues undetectable |

### BUG-005: Missing ObjectId Validation
| Field | Value |
|-------|-------|
| **Severity** | HIGH |
| **Category** | Input Validation |
| **Location** | 30+ route files using `new mongoose.Types.ObjectId(string)` |
| **Evidence** | grep shows direct casts without `isValidObjectId()` check; OWASP tests pass but input validation still needed |
| **Impact** | Malformed ObjectId → CastError → 500 response |
| **Fix** | Add `isValidObjectId()` before all casts |
| **Risk** | LOW — CastError caught by withDB, but unhelpful error response |

### BUG-006: Lint Command Misconfigured
| Field | Value |
|-------|-------|
| **Severity** | HIGH |
| **Category** | Build |
| **Location** | `package.json` → `"lint": "next lint"` |
| **Evidence** | `npm run lint` → `Invalid project directory provided: /Users/.../lint` |
| **Impact** | Lint is completely non-functional in CI |
| **Fix** | The eslint config uses `@eslint/eslintrc` which is a missing dependency. Also eslint flat config may not be compatible with next lint command |
| **Risk** | CI lint job passes with no actual linting |

### BUG-007: N+1 Queries in Notification Engine
| Field | Value |
|-------|-------|
| **Severity** | HIGH |
| **Category** | Performance |
| **Location** | `lib/notificationEngine.ts:178-205` |
| **Evidence** | Code review: per-member Subscription.findOne + Ledger.findOne in for loop |
| **Impact** | 1 query per defaulter → 1000 members = 1000 queries. Cron timeout risk on large tenants |
| **Fix** | Batch member subscription/ledger lookups |
| **Risk** | Cron timeout (60s) on large tenant datasets |

### BUG-008: LOAD_TEST=true in Local Environment
| Field | Value |
|-------|-------|
| **Severity** | HIGH |
| **Category** | Configuration |
| **Location** | `.env.local` (LOAD_TEST=true) |
| **Evidence** | Server startup: `❌ FATAL: LOAD_TEST=true in production — rate limiting is disabled!` |
| **Impact** | Rate limiting should not be disabled even in dev/test |
| **Fix** | Set `LOAD_TEST=false` in `.env.local` |
| **Risk** | During development, rate limiting is bypassed, masking abuse detection issues |

## P2 — Medium Severity Bugs

### BUG-009: Nodemailer 2 Major Versions Behind
| Field | Value |
|-------|-------|
| **Severity** | MEDIUM |
| **Category** | Dependency |
| **Evidence** | `npm outdated` → latest is 9.0.3 (BREAKING) |
| **Impact** | Major version behind, potential security issues |
| **Fix** | Review changelog and upgrade |

### BUG-010: 3 Missing Dependencies
| Field | Value |
|-------|-------|
| **Severity** | MEDIUM |
| **Category** | Dependency |
| **Missing** | `@eslint/eslintrc` (lint broken), `@aws-sdk/s3-request-presigner` (presigned URL), `nanoid` (super-admin pools) |
| **Evidence** | depcheck output |
| **Impact** | Lint broken, presigned URL generation may crash, superadmin pool operations may crash |
| **Fix** | Install missing dependencies |

### BUG-011: Metrics Health Endpoint Inconsistency
| Field | Value |
|-------|-------|
| **Severity** | MEDIUM |
| **Category** | Authorization |
| **Location** | `app/api/metrics/health/route.ts` |
| **Evidence** | Test expects 200 without auth, gets 401 |
| **Impact** | Metrics health check not accessible by monitoring systems without authentication |
| **Fix** | Either make it public (consistent with /api/health) or update monitoring config |

## P3 — Low Severity Bugs

### BUG-012: Module-Level setInterval Memory
| Field | Value |
|-------|-------|
| **Severity** | LOW |
| **Category** | Memory |
| **Location** | `lib/abuse.ts:29`, `app/api/ads/track/route.ts:12` |
| **Evidence** | `setInterval(() => { ... })` at module scope |
| **Fix** | Use on-demand cleanup instead of interval |
| **Risk** | LOW — limited to function lifetime in serverless |

### BUG-013: AADHAAR_ENCRYPTION_KEY Missing from .env.example
| Field | Value |
|-------|-------|
| **Severity** | LOW |
| **Category** | Configuration |
| **Location** | `.env.example` |
| **Fix** | Add to .env.example with generate instructions |

## Test Failures (Non-Code Bugs)

| ID | Test | Expected | Actual | Status |
|----|------|----------|--------|--------|
| TF-001 | GET /api/payments/export | 200 | 500 | 🔴 Broken endpoint |
| TF-002 | GET /api/metrics/health | 200 | 401 | ⚠️ Design decision needed |
