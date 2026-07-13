# Auth API Tests

## Purpose
Tests all authentication endpoints: login, logout, session, CSRF token, forgot password, OTP verification.

## Coverage
- Login with valid credentials (all roles)
- Login with invalid credentials (wrong password, non-existent user)
- Login rate limiting (5 attempts lockout)
- CSRF token generation
- Session persistence
- Forgot password flow
- OTP verification flow
- JWT token enrichment (role, tenant IDs)

## Dependencies
- Running Next.js dev server (`npm run dev`)
- MongoDB with test users seeded
- Test users with password `testpass123`

## Execution
```bash
npx tsx tests/api/auth/auth.test.ts
```

## Expected Results
- All login flows return 200 with session cookies
- Invalid credentials return 401 with error message
- CSRF endpoint returns signed token
- Rate limiting blocks after 5 failed attempts
- Forgot password sends OTP (mock mode)

## Common Failures
- Dev server not running → connection refused
- Test users not seeded → 401 on login
- MongoDB not running → 500 errors
- Rate limit still active from previous runs → wait 15 min

## Troubleshooting
- Check `npm run dev` is running on port 3000
- Verify MongoDB is running: `mongosh swimming-pool-system --eval "db.users.count()"`
- Reset rate limit: restart dev server or clear Redis
