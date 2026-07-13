# How to Run Tests

## Quick Start

```bash
# 1. Start dev server
npm run dev

# 2. In another terminal, run all tests
npx tsx tests/runner.ts
```

## Run Individual Test Suites

```bash
# Auth
npx tsx tests/api/auth/auth.test.ts

# Pool Management
npx tsx tests/api/pool/pool.test.ts

# Members
npx tsx tests/api/members/members.test.ts

# Hostel
npx tsx tests/api/hostel/hostel.test.ts

# Business
npx tsx tests/api/business/business.test.ts

# Payments
npx tsx tests/api/payments/payments.test.ts

# SuperAdmin
npx tsx tests/api/superadmin/superadmin.test.ts

# Entry / Occupancy
npx tsx tests/api/entry/entry.test.ts

# Analytics
npx tsx tests/api/analytics/analytics.test.ts

# Middleware
npx tsx tests/middleware/middleware.test.ts

# Security
npx tsx tests/security/security.test.ts

# Edge Cases
npx tsx tests/api/edge/edge.test.ts

# Integration: Database
npx tsx tests/integration/database/database.test.ts

# Integration: Redis
npx tsx tests/integration/redis/redis.test.ts

# Integration: Razorpay
npx tsx tests/integration/razorpay/razorpay.test.ts
```

## Run k6 Performance Tests

```bash
# Smoke Test
k6 run tests/performance/load/smoke.test.js

# Load Test
k6 run tests/performance/load/load.test.js

# Stress Test
k6 run tests/performance/stress/stress.test.js

# Soak Test
k6 run tests/performance/soak/soak.test.js

# Spike Test
k6 run tests/performance/spike/spike.test.js

# Chaos Test
k6 run tests/performance/chaos/chaos.test.js
```

## Run Filtered Module

```bash
npx tsx tests/runner.ts --module=auth
npx tsx tests/runner.ts --module=hostel
npx tsx tests/runner.ts --module=business
npx tsx tests/runner.ts --module=payment
```

## Quick Smoke Check

```bash
curl http://localhost:3000/api/health
curl http://localhost:3000/api/metrics
```

## Environment Variables

| Variable | Default | Required |
|----------|---------|----------|
| `TEST_BASE_URL` | `http://localhost:3000` | No |
| `MONGODB_URI` | (from .env.local) | Yes |
| `NEXTAUTH_SECRET` | (from .env.local) | Yes |
