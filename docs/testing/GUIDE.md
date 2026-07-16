# Testing Guide

## Quick Start
```bash
# Install dependencies
npm install
npx playwright install chromium

# Start dev server
npm run dev

# Seed test data
npx tsx tests/seed/seed.ts

# Run all API tests
for suite in tests/api/*/; do for test in "$suite"*.test.ts; do [ -f "$test" ] && npx tsx "$test"; done; done

# Run Playwright E2E
npx playwright test --config tests/e2e/playwright.config.ts

# Run security tests
npx tsx tests/security/owasp-top10.spec.ts

# Run k6 performance tests
k6 run tests/performance/load/load-v2.test.js
k6 run tests/performance/load/stress.test.js
k6 run tests/performance/load/spike.test.js
k6 run tests/performance/load/soak.test.js
k6 run tests/performance/load/chaos.test.js
```

## Test Architecture
- `tests/api/`: API integration tests (per-module directories + coverage sweep)
- `tests/e2e/`: Playwright browser tests (auth, pool, hostel, business, superadmin, responsive)
- `tests/security/`: OWASP Top 10 security test suite
- `tests/performance/`: k6 load/stress/spike/soak/chaos scripts
- `tests/integration/`: External service integration tests (cloudinary, email, s3, twilio, qstash)
- `tests/helpers/`: Shared test utilities (TestClient, db, retry, validators, fixtures)
- `tests/seed/`: Database seed script
- `tests/reports/`: Generated test reports and audit documents

## Test Client
See `tests/helpers/testClient.ts`. Supports auth (session-based), cookies, CSRF, and all HTTP methods.

## CI Pipeline
See `.github/workflows/ci.yml`. Eight jobs: lint, typecheck, build, db-validation, api-tests, security-tests, integration-tests, coverage, e2e-tests, performance-smoke.
