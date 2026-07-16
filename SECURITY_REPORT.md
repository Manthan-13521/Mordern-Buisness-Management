# SECURITY_REPORT.md

## Authentication

| Aspect | Assessment | Status |
|--------|-----------|--------|
| **JWT Strategy** | HS256, NEXTAUTH_SECRET env var | ✅ |
| **Login Rate Limit** | 5 attempts → 15min lockout (Redis + LRU) | ✅ |
| **Password Hashing** | bcrypt (bcryptjs.compare) | ✅ |
| **Session Management** | JWT-only (no DB sessions) | ✅ |
| **Forgot Password** | OTP-based reset with expiry | ✅ |

## Authorization

| Aspect | Assessment | Status |
|--------|-----------|--------|
| **Role-based access** | superadmin > admin > operator | ✅ |
| **Tenant scoping** | poolId/hostelId/businessId in JWT | ✅ |
| **Subscription guard** | Blocks locked/expired tenants | ✅ |
| **Feature gating** | Plan-based feature checks | ✅ |

## CSRF

| Aspect | Assessment | Status |
|--------|-----------|--------|
| **Token implementation** | HMAC-SHA256 via Web Crypto API | ✅ |
| **Edge-compatible** | Yes — uses Web Crypto | ✅ |
| **Double-submit cookie** | Pattern: token in header + body | ✅ |

## CORS

| Aspect | Assessment | Status |
|--------|-----------|--------|
| **Whitelist origins** | NEXT_PUBLIC_APP_URL based | ✅ |
| **Exposed headers** | RateLimit headers exposed | ✅ |

## CSP

| Aspect | Assessment | Status |
|--------|-----------|--------|
| **script-src** | 'self', 'unsafe-inline', Razorpay CDN | ⚠️ 'unsafe-inline' |
| **connect-src** | Self, Razorpay, Sentry, Upstash | ✅ |
| **frame-src** | Razorpay only | ✅ |
| **frame-ancestors** | 'none' | ✅ |
| **form-action** | 'self' | ✅ |
| **base-uri** | 'self' | ✅ |
| **CSP reporting** | /api/csp-report endpoint | ✅ |

**NOTE:** `'unsafe-inline'` for script-src is required by Next.js for inline scripts. Cannot be avoided with Next.js App Router.

## Headers

| Header | Value | Status |
|--------|-------|--------|
| X-Content-Type-Options | nosniff | ✅ |
| X-Frame-Options | DENY | ✅ |
| HSTS | max-age=63072000; includeSubDomains; preload | ✅ |
| Referrer-Policy | strict-origin-when-cross-origin | ✅ |
| Permissions-Policy | camera=(), microphone=(), geolocation=(), ... | ✅ |
| X-Powered-By | REMOVED (poweredByHeader: false) | ✅ |

## Encryption

| Data | Algorithm | Key Management | Status |
|------|-----------|---------------|--------|
| Aadhaar numbers | AES-256-GCM | Env var (64 hex chars), key versioning | ✅ |
| Twilio credentials | AES-256-GCM | Per-tenant, encrypted at rest | ✅ |
| Passwords | bcrypt | Salted hash | ✅ |
| QR Tokens | JWT (HS256) | Signed with secret | ✅ |
| CSRF Tokens | HMAC-SHA256 | Web Crypto API | ✅ |

## Webhook Security

| Webhook | Verification | Status |
|---------|-------------|--------|
| Razorpay | HMAC-SHA256 signature | ✅ |
| Razorpay | Idempotency key dedup | ✅ |
| QStash | upstash-signature header | ✅ |
| Webhook DLQ | Failed events stored with TTL=7d | ✅ |

## Vulnerability Analysis

### NoSQL Injection
**Routes use `new mongoose.Types.ObjectId(string)` directly** without calling `isValidObjectId()` first. If the string is malformed, Mongoose throws CastError (handled by withDB wrapper).

**Risk: LOW** — CastError is caught but a malformed ObjectId could cause a 500 error. Not an injection vector.

### SSRF (Server-Side Request Forgery)
| fetch() call | URL Source | Validation | Risk |
|-------------|-----------|------------|------|
| lib/healthchecks.ts | `HEALTHCHECKS_URL` env var | Hardcoded | LOW |
| app/api/members/[id]/photo/route.ts | `member.photoUrl` from DB | Trusted | LOW |
| app/api/jobs/generate-card/route.ts | Cloudinary URL | Trusted origin | LOW |
| lib/local-db/syncQueue.ts | Relative `/api/*` | Internal only | LOW |

### Path Traversal
- **npm vulnerability:** tmp@0.2.6 has path traversal (HIGH severity)
- Codebase does not appear to use `tmp` directly (transitive dependency)

### PII Exposure
- **Logger:** Pino redact configured for email, phone, name — ✅ [REDACTED]
- **Aadhaar:** AES-256-GCM encrypted, masked in responses — ✅
- **Logs:** Structured audit events do not log PII — ✅

### Open Redirects
None found in API routes or middleware.

### Rate Limit Bypass
| Mechanism | Protection | Status |
|-----------|-----------|--------|
| LOAD_TEST=true | Blocked in production via env.ts | ✅ |
| LOAD_TEST requires IP allowlist | `LOAD_TEST_ALLOWED_IPS` checked | ✅ |
| LOAD_TEST requires secret header | `x-load-test-secret` matched to `LOAD_TEST_SECRET` | ✅ |
| Tier-based limits | Redis + LRU fallback | ✅ |

## Findings

| ID | Severity | Finding | Location |
|----|----------|---------|----------|
| SEC-001 | MEDIUM | Missing ObjectId validation before cast — 30+ routes cast directly | various route.ts files |
| SEC-002 | MEDIUM | `'unsafe-inline'` in CSP script-src (Next.js requirement) | next.config.ts |
| SEC-003 | LOW | `catch {}` empty blocks swallow errors silently | app/api/superadmin/* (20+ occurrences) |
| SEC-004 | HIGH | tmp@0.2.6 path traversal vulnerability (transitive) | npm audit |
| SEC-005 | MEDIUM | 293 `as any` casts weaken type safety | Throughout codebase |

## Recommendations

1. **HIGH:** Add `isValidObjectId()` check before all `new mongoose.Types.ObjectId()` casts
2. **HIGH:** Upgrade transitive tmp dependency (npm audit fix)
3. **MEDIUM:** Replace empty `catch {}` with at minimum a logged warning
4. **MEDIUM:** Reduce `as any` usage (293 occurrences is high for a TypeScript project)
5. **LOW:** Add `AADHAAR_ENCRYPTION_KEY` to .env.example documentation
