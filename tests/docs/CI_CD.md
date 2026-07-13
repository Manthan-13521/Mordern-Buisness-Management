# CI/CD Pipeline Documentation

## Pipeline Overview

The AquaSync CI/CD pipeline is defined in `.github/workflows/ci.yml` and runs on every push to `main`/`develop` and all PRs.

## Pipeline Stages

```
┌─────────────────┐
│  Lint & Build   │ ← npm run lint, typecheck, build
└────────┬────────┘
         │
         ├──────────────────┐
         ▼                  ▼
┌─────────────────┐ ┌─────────────────┐
│  API Tests      │ │  Security Tests │
│  (tsx runner)   │ │  (tsx)          │
└────────┬────────┘ └────────┬────────┘
         │                   │
         ├──────────────────┐│
         ▼                  ▼▼
┌─────────────────┐ ┌─────────────────┐
│  Integration    │ │  Performance    │
│  Tests          │ │  Smoke (k6)     │
└────────┬────────┘ └────────┬────────┘
         │                   │
         ▼                   ▼
┌─────────────────┐ ┌─────────────────┐
│  Coverage       │ │  Notify         │
│  Report         │ │  Status         │
└─────────────────┘ └─────────────────┘
```

## Jobs

### 1. lint-and-typecheck
- **Runs on:** ubuntu-latest
- **Steps:** checkout → setup-node → npm ci → lint → typecheck → build
- **Purpose:** Gate for code quality before any tests run

### 2. functional-tests
- **Needs:** lint-and-typecheck
- **Services:** MongoDB (mongo:8)
- **Steps:** checkout → npm ci → seed data → start dev server → run `tests/runner.ts`

### 3. security-tests
- **Needs:** lint-and-typecheck
- **Services:** MongoDB
- **Steps:** checkout → npm ci → seed data → start dev server → run `tests/security/security.test.ts`

### 4. integration-tests
- **Needs:** lint-and-typecheck
- **Services:** MongoDB + Redis
- **Steps:** checkout → npm ci → test DB connection → test Redis connection

### 5. performance-smoke
- **Needs:** functional-tests
- **Services:** MongoDB
- **Steps:** checkout → npm ci → setup k6 → start dev server → k6 smoke test

### 6. coverage
- **Needs:** functional-tests
- **Steps:** Run coverage tool

### 7. notify
- **Condition:** always()
- **Needs:** All preceding jobs
- **Steps:** Log final status

## Required Secrets

| Secret | Used By |
|--------|---------|
| `MONGODB_URI` | All test jobs |
| `NEXTAUTH_SECRET` | All test jobs (required by NextAuth) |
| `RAZORPAY_KEY_ID` | Payment tests (optional) |
| `RAZORPAY_KEY_SECRET` | Payment tests (optional) |
| `SENTRY_AUTH_TOKEN` | Build (source maps) |

## Local CI Simulation

```bash
# Simulate CI locally
npm run lint && npm run typecheck && npm run build && npx tsx tests/runner.ts
```

## Badges

Status badges are generated on `main` branch pushes:
- Test status
- Coverage percentage
- Build status

## Troubleshooting

### CI fails on lint
```bash
npm run lint -- --fix
```

### CI fails on typecheck
```bash
npm run typecheck
# Fix type errors
```

### CI fails on tests
```bash
# Run locally to debug
npx tsx tests/runner.ts --module=failing-module
```

### MongoDB service not starting in CI
- Check MongoDB image version
- Ensure port 27017 is not in use
- Add `--health-cmd` options if needed
