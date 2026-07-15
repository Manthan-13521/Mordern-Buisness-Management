# Release Checklist

**Application:** AquaSync

---

## Pre-Release

### Code Quality
- [ ] Lint passes (`npm run lint`)
- [ ] TypeScript typecheck passes (`npx tsc --noEmit`)
- [ ] Production build succeeds (`npm run build`)
- [ ] No `TODO` or `FIXME` in changed files
- [ ] No `console.log` in production code

### Testing
- [ ] All 124 API tests pass
- [ ] All 8 security tests pass
- [ ] All 8 multi-tenant isolation tests pass
- [ ] Seed data creates successfully (`npx tsx tests/seed/seed.ts`)
- [ ] Database validation tests pass
- [ ] Integration tests pass (database, redis, razorpay)
- [ ] Playwright E2E tests pass (if configured)
- [ ] Coverage report generated (>0% threshold)

### Security
- [ ] No authentication bypasses in production
- [ ] CSRF protection verified
- [ ] Rate limiting verified
- [ ] Security headers present
- [ ] CORS configured for production domain
- [ ] CSP policy updated for production
- [ ] `LOAD_TEST` env var NOT set in production
- [ ] `TEST_MODE` env var NOT set in production

### Configuration
- [ ] `NEXTAUTH_SECRET` set to strong random value
- [ ] `JWT_SECRET` set to strong random value
- [ ] `MONGODB_URI` points to production database
- [ ] `NEXTAUTH_URL` set to production domain
- [ ] Environment variables validated in deployment

### Database
- [ ] Database migrations applied (if any)
- [ ] Indexes created
- [ ] Backup taken before deployment
- [ ] Connection string verified

---

## Deployment

- [ ] Git tag created (`vX.Y.Z`)
- [ ] Build artifact verified
- [ ] Staging deployment successful
- [ ] Smoke tests pass on staging
- [ ] Health endpoint returns 200
- [ ] Login flow works on staging
- [ ] API tests pass on staging

---

## Post-Deployment

- [ ] Production health endpoint returns 200
- [ ] Metrics endpoint accessible
- [ ] Sentry error reporting active
- [ ] Monitor error rates for 1 hour
- [ ] Monitor response times for 1 hour
- [ ] Verify subscription webhook processing
- [ ] Verify cron jobs are running
- [ ] Check backup was created

---

## Rollback Plan

1. Revert to previous deployment
2. Restore database from pre-deployment backup
3. Verify health endpoint
4. Notify stakeholders

---

## Sign-off

```
Release Manager: __________________
Date: __________________
Approved: [ ] Yes  [ ] No
```
