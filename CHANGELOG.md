# Changelog

## [2026-05-07] — Production Security Hardening Audit

### 🔴 CRITICAL — Security Header Fixes

#### `next.config.ts`
- **REMOVED** deprecated `X-XSS-Protection: 1; mode=block` header — Chrome removed support; it provides false confidence and can open XSS vectors in IE via reflection attacks.
- **ADDED** `Cross-Origin-Opener-Policy: same-origin` — prevents cross-origin documents from opening this app in a popup and accessing `window.opener`.
- **ADDED** `Cross-Origin-Resource-Policy: same-origin` — prevents cross-origin reads of responses, mitigating Spectre-style side-channel attacks.
- **ADDED** `frame-ancestors 'none'` to CSP — stronger clickjacking protection than X-Frame-Options alone (CSP takes precedence in modern browsers).
- **FIXED** `img-src` CSP directive: changed `res.cloudinary.com` → `https://res.cloudinary.com` (scheme required for CSP compliance).
- **FIXED** `connect-src` CSP directive: now dynamically includes `NEXT_PUBLIC_APP_URL` so API calls to the app's own domain aren't blocked by CSP.
- **HARDENED** `Permissions-Policy`: changed `camera=(self), payment=(self)` → `camera=(), payment=(), usb=(), interest-cohort=()` — denies all device APIs and FLoC tracking.
- **ADDED** `poweredByHeader: false` — removes `X-Powered-By: Next.js` header that fingerprints the server.

#### `middlewares/security.ts`
- **REMOVED** `X-XSS-Protection` from runtime security headers (synced with next.config.ts).
- **HARDENED** `Permissions-Policy` to deny camera, microphone, geolocation, payment, usb, and interest-cohort.
- **ADDED** `Cross-Origin-Opener-Policy` and `Cross-Origin-Resource-Policy` to runtime headers.

### 🟡 HIGH — Seed Endpoint Hardening

#### `app/api/seed/route.ts`
- **ADDED** `SEED_ENABLED` env var check as defense-in-depth alongside `NODE_ENV` check. Production now returns 403 unless explicitly enabled.

#### `.env.example`
- **ADDED** `SEED_ENABLED=false` with warning comment about production use.

#### `README.md`
- **REPLACED** raw `curl /api/seed` instruction with a safety warning and proper documentation that seed is disabled in production.

### 🟡 HIGH — Sentry Quota Protection

#### `sentry.server.config.ts`
- **REDUCED** `tracesSampleRate` from `1.0` → `0.1` (90% reduction in trace volume).
- **REDUCED** `profilesSampleRate` from `1.0` → `0.1`.

#### `sentry.client.config.ts`
- **REDUCED** `tracesSampleRate` from `1.0` → `0.1`.

#### `sentry.edge.config.ts`
- **REDUCED** `tracesSampleRate` from `1.0` → `0.1`.

### 🟢 MEDIUM — Repo Hygiene

#### `cleanup-repo.sh` (NEW)
- Created cleanup script that `git rm`s debug artifacts (`test-*.js`, `fix_*.js`, etc.), removes `.planning/` and `.agent/` directories, and hardens `.gitignore`.
- Includes instructions for git history scrubbing via `git-filter-repo`.

### 🟢 LOW — Model Fixes

#### `models/Counter.ts`
- **ADDED** `timestamps: true` — was the only model missing timestamps.

### 📝 Documentation

#### `SECURITY.md` (NEW)
- Comprehensive security posture document covering auth model, rate limiting, CSP, RBAC, and vulnerability reporting.

#### `CHANGELOG.md` (NEW)
- This file.

---

### API Route Audit Summary

| Check | Status | Notes |
|-------|--------|-------|
| `dbConnect()` in all handlers | ✅ Present | 9 routes use alternative patterns (metrics, csrf-token, static responses) — acceptable |
| Zod input validation | ⚠️ Partial | Core routes (members, plans, payments, razorpay) validated. Analytics/dashboard GET routes use query params without Zod — low risk since they're read-only with tenant isolation |
| ObjectId validation | ⚠️ Partial | Routes use `secureFindById()` wrapper which handles invalid IDs gracefully. No raw `.findById(params.id)` without guards found |
| Auth on POST/PUT/DELETE | ✅ Present | All mutating routes check `resolveUser()`. Public routes (register, webhook, seed) have explicit auth mechanisms |
| Razorpay webhook HMAC | ✅ Hardened | Both `/api/razorpay/verify` and `/api/subscription/webhook` use `timingSafeEqual` with proper HMAC-SHA256 |
| MongoDB connection caching | ✅ Correct | Uses `global._mongooseCache` pattern with proper pool settings |
| Model indexes | ✅ Comprehensive | All query-filtered fields have `index: true` |
| Model timestamps | ✅ Fixed | Counter was the only missing model — now fixed |
| console.log in catch blocks | ⚠️ 124 files | Mitigated by `removeConsole` in next.config.ts compiler which strips all console.log/error in production builds except `error` and `warn` |
