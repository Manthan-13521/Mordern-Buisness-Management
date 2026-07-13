# Security Testing Guide

## Purpose
Security test patterns and OWASP Top 10 coverage for AquaSync.

## OWASP Top 10 Coverage

### A1: Broken Access Control ✅
- Tenant isolation tests
- Role-based access tests
- IDOR tests (cross-tenant access)
- SuperAdmin endpoint protection

### A2: Cryptographic Failures ✅
- JWT token validation
- Password hashing (bcrypt)
- CSRF signed tokens
- AES-256-GCM encryption for Twilio credentials

### A3: Injection ✅
- NoSQL injection attempts
- SQL injection in login
- XSS payload rejection
- Mass assignment protection

### A4: Insecure Design ✅
- Rate limiting (tier-based)
- Abuse detection
- Subscription state machine
- Graceful degradation

### A5: Security Misconfiguration ✅
- Security headers (CSP, HSTS, XFO)
- CORS whitelisting
- Payload size limits
- Environment validation

### A6: Vulnerable Components 🔲
- Dependency scanning (npm audit)
- Snyk/Dependabot integration pending

### A7: Auth Failures ✅
- Brute force protection
- Login lockout (5 attempts)
- Empty password rejection
- OTP expiry and attempt limits

### A8: Data Integrity Failures ✅
- Idempotency keys
- Webhook HMAC verification
- Signature verification (timing-safe)
- Race condition guards

### A9: Logging & Monitoring ✅
- Audit logging
- Sentry integration
- Metrics collection
- CSP violation reporting

### A10: SSRF 🔲
- Not yet tested (requires external dependency simulation)

## Test Execution

```bash
# Run all security tests
npx tsx tests/security/security.test.ts
```

## Test Categories

### Authentication Tests
- Wrong password → 401
- Non-existent user → 401
- Empty password → 401
- SQL injection → 401
- Rate limiting on failed attempts → 429

### Authorization Tests
- Pool admin → hostel endpoints → 401/403
- Pool admin → business endpoints → 401/403
- Hostel admin → pool endpoints → 401/403
- Business admin → pool endpoints → 401/403
- Pool admin → superadmin endpoints → 401/403

### XSS Tests
Payloads tested:
- `<script>alert('xss')</script>`
- `<img src=x onerror=alert(1)>`
- `javascript:alert(1)`
- `<svg onload=alert(1)>`
- Various JS encoding variants

### NoSQL Injection Tests
Payloads tested:
- `{"$gt": ""}`
- `{"$ne": ""}`
- `{"$where": "1==1"}`
- `{"$regex": ".*"}`
- `admin' || '1'=='1`

### CSRF Tests
- Mutation without CSRF token → rejected
- CSRF token endpoint returns valid token

### Sensitive Data Exposure
- Password hashes not in API responses
- Error messages don't contain stack traces
- No sensitive data in URL parameters

## Security Headers

Expected headers on all responses:
- `Content-Security-Policy`
- `Strict-Transport-Security`
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy`
- `Permissions-Policy`

## Rate Limiting

| Tier | Rate Limit |
|------|------------|
| Free Trial | 60 req/min |
| 3 Month | 360 req/min |
| Yearly | 560 req/min |
| Enterprise | 9999 req/min |
| IP Fallback | 120 req/min |
| Abuse Threshold | 2000 req/5min → 15min block |
