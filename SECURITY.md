# Security Policy — AquaSync SaaS Platform

## Overview

AquaSync is a multi-tenant SaaS platform for managing swimming pools, hostels, and workforce operations. This document describes the security architecture and how to report vulnerabilities.

---

## Authentication Model

### NextAuth.js v4 + RBAC

| Component | Implementation |
|-----------|---------------|
| **Provider** | Credentials-based (email + bcrypt password hash) |
| **Session** | JWT strategy with encrypted tokens |
| **Roles** | `superadmin`, `admin`, `operator` |
| **Middleware** | `withAuth()` wrapper with `authorized()` callback — rejects unauthenticated requests at the edge |
| **Tenant Isolation** | Every API route enforces `poolId`/`hostelId`/`businessId` scoping via `requireTenant()` and `secureFindById()` |

### Role-Based Access Control (RBAC)

- **SuperAdmin**: Platform-wide access. Can manage all pools, hostels, and businesses.
- **Admin**: Full access within their assigned tenant (pool/hostel/business).
- **Operator**: Limited access — can register members, record payments, and view dashboard.

### Session Security

- JWTs are signed with `NEXTAUTH_SECRET` (min 16 chars, enforced at startup).
- Sessions are stateless (no server-side session store required).
- CSRF protection via double-submit cookie pattern + origin/referer checking on all mutating requests.

---

## Rate Limiting Strategy

### Upstash Redis

| Layer | Implementation |
|-------|---------------|
| **Provider** | Upstash Redis (serverless-compatible) |
| **Algorithm** | Sliding window rate limiting |
| **Scope** | Per-IP + per-user combined key |
| **Limits** | Configurable per-role (operators get higher limits) |
| **Abuse Detection** | Separate abuse layer tracks repeated violations and auto-blocks |
| **Fallback** | In-memory rate limiter if Redis is unavailable (with warning) |

### Load Testing

Load test bypass requires ALL of:
1. `LOAD_TEST=true` env var
2. `NODE_ENV !== "production"` (hard-blocked in production via `env.ts`)
3. `x-load-test-secret` header matching `LOAD_TEST_SECRET`
4. Request IP in `LOAD_TEST_ALLOWED_IPS` allowlist

---

## Content Security Policy (CSP)

```
default-src 'self';
script-src 'self' 'unsafe-inline' checkout.razorpay.com;
connect-src 'self' https://checkout.razorpay.com https://api.razorpay.com https://upstash.io https://*.sentry.io;
img-src 'self' data: blob: https://res.cloudinary.com;
frame-src checkout.razorpay.com;
frame-ancestors 'none';
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
font-src 'self' data: https://fonts.gstatic.com;
object-src 'none';
base-uri 'self';
form-action 'self';
worker-src 'self' blob:;
```

### Additional Security Headers

| Header | Value | Purpose |
|--------|-------|---------|
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` | Forces HTTPS |
| `X-Content-Type-Options` | `nosniff` | Prevents MIME sniffing |
| `X-Frame-Options` | `DENY` | Prevents clickjacking |
| `Cross-Origin-Opener-Policy` | `same-origin` | Isolates browsing context |
| `Cross-Origin-Resource-Policy` | `same-origin` | Prevents cross-origin reads |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Limits referrer leakage |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()` | Denies device APIs |

---

## Payment Security (Razorpay)

- **Order creation**: Server-side only. Amount is derived from DB plan price (never trusted from client).
- **Signature verification**: HMAC-SHA256 with `timingSafeEqual()` — prevents timing side-channel attacks.
- **Webhook verification**: `x-razorpay-signature` validated against `RAZORPAY_WEBHOOK_SECRET` before processing.
- **Idempotency**: Duplicate payment detection via `razorpayPaymentId` and `razorpayOrderId` lookups.
- **Amount verification**: Webhook cross-checks paid amount against server-side pricing table.
- **Circuit breaker**: Razorpay API calls wrapped in circuit breaker pattern to fail fast during outages.

---

## Seed Endpoint

- **Blocked in production** by default (`NODE_ENV === "production" && !SEED_ENABLED` returns 403).
- Protected by `SEED_SECRET` bearer token (min 32 chars).
- Token comparison uses `crypto.timingSafeEqual()`.
- Passwords sourced from environment variables — never hardcoded.

---

## Cron Job Security

- All cron endpoints verify the `CRON_SECRET` header (set via Vercel's built-in cron authentication).
- `CRON_SECRET` is required in production (enforced at startup by `env.ts`).

---

## Data Protection

- **Tenant isolation**: Every query is scoped to the authenticated user's tenant via `getTenantFilter()`.
- **Cross-tenant access auditing**: Failed lookups trigger `auditCrossTenantAccess()` for security monitoring.
- **Soft deletes**: Member deletions archive to `DeletedMember` collection before removal.
- **Backup**: Automated S3 backups via cron jobs.
- **Data retention**: Configurable retention policies with automated cleanup.

---

## Error Handling & Observability

- **Sentry**: Client, server, and edge error tracking with 10% trace sampling.
- **Structured logging**: All API routes use structured `logger` with audit trail support.
- **Console stripping**: `removeConsole` in Next.js compiler strips `console.log` from production builds (only `error` and `warn` preserved).

---

## Reporting Vulnerabilities

If you discover a security vulnerability, please report it responsibly:

1. **Email**: Send details to the project maintainer (do not open a public GitHub issue).
2. **Include**: Description of the vulnerability, steps to reproduce, and potential impact.
3. **Response**: We aim to acknowledge within 48 hours and provide a fix within 7 days for critical issues.

> ⚠️ **Do not** publicly disclose vulnerabilities before they are patched.
