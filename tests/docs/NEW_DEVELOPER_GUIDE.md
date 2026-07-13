# New Developer Guide

## Welcome to AquaSync Testing!

This guide will help you get started with the AquaSync enterprise testing ecosystem.

## Prerequisites

```bash
# Required
node >= 20
npm >= 10
mongodb-community (brew install mongodb-community)
k6 (brew install k6)  # for performance testing

# Recommended
tsx (npm install -g tsx)
mongosh (brew install mongosh)
```

## First-Time Setup

```bash
# 1. Clone and install
git clone <repo>
cd AquaSync
npm install

# 2. Set up environment
cp .env.example .env.local
# Edit .env.local with your MongoDB URI and NEXTAUTH_SECRET

# 3. Start MongoDB
brew services start mongodb-community

# 4. Seed test data
npx tsx scripts/seed-test-data.ts
# Or: npx tsx scripts/create-superadmin.js

# 5. Start dev server
npm run dev

# 6. Verify it's running
curl http://localhost:3000/api/health
# → {"status":"ok","timestamp":"..."}

# 7. Run the test suite
npx tsx tests/runner.ts
```

## Understanding the Test Architecture

### Directory Structure
```
tests/
├── api/              # API endpoint tests
│   ├── auth/         # Authentication flows
│   ├── pool/         # Pool management
│   ├── hostel/       # Hostel management
│   ├── business/     # Business module
│   ├── payments/     # Payment flows
│   ├── members/      # Member CRUD
│   └── ...           # Other modules
├── middleware/        # Middleware tests
├── security/         # Security & penetration tests
├── performance/      # k6 load tests
├── integration/      # External service tests
├── helpers/          # Shared test utilities
├── docs/             # Documentation
└── runner.ts         # Test orchestrator
```

### Key Helpers

```typescript
// TestClient — makes authenticated HTTP requests
import { TestClient, TEST_USERS } from "./helpers";

const client = new TestClient();
await client.login(TEST_USERS.poolAdmin);
await client.get("/api/members");
await client.post("/api/members", { name: "...", phone: "..." });

// TestRunner — orchestrates tests
import { TestRunner } from "./helpers";

const runner = new TestRunner();
await runner.run("Suite Name", [
  { name: "Test", fn: async () => { /* ... */ } },
]);
```

## Writing Your First Test

1. Create a test file in `tests/api/<module>/<test-name>.test.ts`
2. Follow the header template (copy from an existing test)
3. Use `TestClient` and `TestRunner` from helpers
4. Test both positive and negative cases
5. Add the suite to `tests/runner.ts`
6. Update `tests/docs/TEST_MATRIX.md`

## Test Users

| Email | Password | Role |
|-------|----------|------|
| admin@ts.com | testpass123 | Pool Admin |
| h@1.com | testpass123 | Hostel Admin |
| b@1.com | testpass123 | Business Admin |
| superadmin@tspools.com | testpass123 | Super Admin |

## Running Tests

```bash
# Full suite
npx tsx tests/runner.ts

# Single test file
npx tsx tests/api/auth/auth.test.ts

# Filtered by module
npx tsx tests/runner.ts --module=hostel

# Performance tests
k6 run tests/performance/load/smoke.test.js
```

## Common Commands

```bash
npm run dev          # Start dev server
npm run lint         # Lint check
npm run typecheck    # TypeScript check
npm run build        # Production build
npx tsx tests/runner.ts  # Run all tests
```

## Best Practices

1. **Idempotency**: Tests should be safe to run multiple times
2. **Isolation**: Each test should not depend on other tests
3. **Clarity**: Use descriptive test names
4. **Graceful**: Use `[INFO]` for non-fatal observations
5. **Coverage**: Focus on critical business flows first

## Getting Help

- Read the test file headers for documentation
- Check `tests/docs/TROUBLESHOOTING.md` for common issues
- Ask the team in the #engineering Slack channel
- Review existing tests as examples
