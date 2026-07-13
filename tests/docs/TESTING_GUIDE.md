# AquaSync Testing Guide

## Purpose
This guide describes the complete testing strategy, architecture, and execution plans for the AquaSync SaaS platform.

## Testing Philosophy

1. **Shift Left**: Test early, test often. Unit and integration tests run on every PR.
2. **Defense in Depth**: Multiple testing layers (unit → integration → API → security → performance → chaos).
3. **Realistic**: Tests run against actual API endpoints with real database (test mode).
4. **Idempotent**: Tests are safe to run multiple times.
5. **Comprehensive**: Focus on 80-90% meaningful coverage of critical business flows.

## Test Pyramid

```
         ╱  E2E  ╲           ← Few: critical business flows
        ╱─────────╲
       ╱  Security ╲         ← Some: OWASP Top 10, auth bypass
      ╱─────────────╲
     ╱  Performance  ╲       ← Some: smoke, load, stress, soak
    ╱─────────────────╲
   ╱  Integration API  ╲     ← Many: all API endpoints
  ╱─────────────────────╲
 ╱   Middleware / Unit   ╲    ← Many: individual components
╱─────────────────────────╲
```

## Test Types

| Type | Location | Tool | Purpose |
|------|----------|------|---------|
| API Integration | `tests/api/` | tsx + fetch | Test endpoint contracts |
| Middleware | `tests/middleware/` | tsx + fetch | Test auth, rate limit, tenant isolation |
| Security | `tests/security/` | tsx + fetch | OWASP Top 10, injection, XSS |
| Integration | `tests/integration/` | tsx | External service integration |
| Edge Cases | `tests/api/edge/` | tsx + fetch | Nulls, unicode, race conditions |
| Load | `tests/performance/load/` | k6 | Progressive load (1→100 VU) |
| Stress | `tests/performance/stress/` | k6 | Breaking point (50→250 VU) |
| Soak | `tests/performance/soak/` | k6 | Endurance (50 VU, 30 min) |
| Spike | `tests/performance/spike/` | k6 | Sudden traffic surges |
| Chaos | `tests/performance/chaos/` | k6 | Degraded dependencies |
| E2E | `tests/e2e/` | tsx | Full business flow orchestration |

## Coverage Targets

| Area | Current | Target |
|------|---------|--------|
| Auth & Authorization | 60% | 90% |
| Pool Management | 83% | 95% |
| Membership | 75% | 90% |
| Hostel Management | 78% | 90% |
| Business Module | 80% | 90% |
| Payments & Subscription | 75% | 90% |
| Entry & Occupancy | 71% | 85% |
| Analytics & Dashboard | 80% | 85% |
| Staff Management | 80% | 85% |
| Notifications | 67% | 80% |
| SuperAdmin | 75% | 90% |
| Middleware | 100% | 100% |
| External Integrations | 56% | 80% |
| Cron Jobs | 0% | 50% |
| Utility/Service Layer | 0% | 70% |
| **Total** | **55%** | **85%** |

## Running Tests

```bash
# Run everything
npx tsx tests/runner.ts

# Run specific module
npx tsx tests/runner.ts --module=auth

# Run single test file
npx tsx tests/api/auth/auth.test.ts

# Run k6 performance tests
k6 run tests/performance/load/smoke.test.js
k6 run tests/performance/load/load.test.js
k6 run tests/performance/stress/stress.test.js
k6 run tests/performance/soak/soak.test.js
k6 run tests/performance/spike/spike.test.js
```

## Test Data

Test users (password: `testpass123`):
- `admin@ts.com` — Pool Admin
- `h@1.com` — Hostel Admin
- `b@1.com` — Business Admin
- `superadmin@tspools.com` — Super Admin

## CI/CD Pipeline

See [CI_CD.md](./CI_CD.md) for full pipeline documentation.

The CI pipeline runs:
1. Lint + TypeCheck + Build
2. Functional & API Tests
3. Security Tests
4. Integration Tests
5. Performance Smoke Test (k6)
6. Coverage Report

## Adding New Tests

1. Create test file in appropriate `tests/api/<module>/` directory
2. Follow the header template (see existing tests)
3. Use `TestClient` from `tests/helpers/testClient.ts` for API calls
4. Use `TestRunner` from `tests/helpers/runner.ts` for test orchestration
5. Add the suite to `tests/runner.ts`
6. Update `tests/docs/TEST_MATRIX.md`
7. Run `npx tsx tests/runner.ts` to verify

## Common Failures

| Issue | Solution |
|-------|----------|
| Dev server not running | `npm run dev` |
| MongoDB not running | `brew services start mongodb-community` |
| Port 3000 in use | Kill process: `lsof -ti:3000 | xargs kill` |
| Test users missing | Run seed script |
| Rate limited | Wait 15 minutes or restart dev server |
| `MODULE_NOT_FOUND` | `npm install` |
