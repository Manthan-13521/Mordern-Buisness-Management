# AquaSync Enterprise Test Suite

## Architecture

```
tests/
├── api/                          # API endpoint tests (one per module)
│   ├── auth/                     # Authentication & authorization tests
│   ├── pool/                     # Pool management tests
│   ├── hostel/                   # Hostel management tests
│   ├── business/                 # Business module tests
│   ├── payments/                 # Payment flow tests
│   ├── subscription/             # Subscription & billing tests
│   ├── superadmin/               # SuperAdmin operations tests
│   ├── members/                  # Member CRUD & lifecycle tests
│   ├── entry/                    # Entry/scan/occupancy tests
│   ├── analytics/                # Analytics & reporting tests
│   ├── staff/                    # Staff management tests
│   ├── twilio/                   # Twilio integration tests
│   ├── health/                   # Health check endpoint tests
│   ├── cron/                     # Cron job execution tests
│   ├── export/                   # CSV/Excel export tests
│   ├── competitions/             # Competition management tests
│   ├── contact/                  # Contact/demo/feedback tests
│   └── referral/                 # Referral code tests
├── middleware/                   # Middleware unit tests
├── security/                     # Security & penetration tests
├── performance/                  # Performance & load tests
│   ├── load/                     # k6 load test scripts
│   ├── stress/                   # k6 stress test scripts
│   ├── soak/                     # k6 soak/endurance test scripts
│   ├── spike/                    # k6 spike test scripts
│   └── chaos/                    # Chaos engineering scripts
├── integration/                  # Integration tests (external services)
│   ├── database/                 # Database connectivity & transaction tests
│   ├── redis/                    # Redis caching tests
│   ├── cloudinary/               # Cloudinary upload tests
│   ├── razorpay/                 # Razorpay payment gateway tests
│   ├── twilio/                   # Twilio WhatsApp/SMS tests
│   ├── s3/                       # AWS S3 backup tests
│   ├── qstash/                   # QStash queue tests
│   └── email/                    # Email service tests
├── e2e/                          # End-to-end business flow tests
├── fixtures/                     # Test data fixtures (JSON/YAML)
├── helpers/                      # Test utility functions
├── mocks/                        # Mock service implementations
├── utils/                        # Generic test utilities
└── docs/                         # Test documentation
    ├── TESTING_GUIDE.md
    ├── HOW_TO_RUN_TESTS.md
    ├── TEST_MATRIX.md
    ├── API_TESTS.md
    ├── LOAD_TESTING.md
    ├── SECURITY_TESTING.md
    ├── PERFORMANCE_TESTING.md
    ├── CHAOS_TESTING.md
    ├── CI_CD.md
    ├── TROUBLESHOOTING.md
    └── NEW_DEVELOPER_GUIDE.md
```

## Coverage Areas

- **Auth**: Login, register, forgot-password, OTP verify, JWT, CSRF, session
- **Pool**: CRUD, registration, subscription, plans, settings, capacity
- **Hostel**: CRUD, registration, rooms, blocks, staff, settings, twilio
- **Business**: Registration, finalize, info, customers, sales, stock, labour
- **Payments**: Create, verify, webhook, export, reconciliation, refunds
- **Subscription**: Plans, create-order, activate, webhook, expiry, state machine
- **Members**: Create, lookup, renew, vacate, transfer, restore, photo
- **Entry**: Scan, QR verify, occupancy, session management
- **Analytics**: Dashboard, trends, income, member counts, defaulters
- **Staff**: CRUD, attendance, advance, payments, summary
- **SuperAdmin**: Tenant management, ads, referrals, seed, stats
- **Security**: Auth bypass, IDOR, CSRF, XSS, injection, rate limiting
- **Performance**: Smoke, load, stress, spike, soak, chaos
- **Integration**: MongoDB, Redis, Cloudinary, Razorpay, Twilio, S3, QStash

## Quick Start

```bash
# Run all API tests
npx tsx tests/api/runner.ts

# Run specific module tests
npx tsx tests/api/auth/auth.test.ts
npx tsx tests/api/pool/pool.test.ts

# Run security tests
npx tsx tests/security/security.test.ts

# Run load tests (requires k6)
k6 run tests/performance/load/smoke.test.js

# Run all tests with coverage
npx tsx tests/runner.ts --coverage
```

## Dependencies

- Node.js >= 20
- MongoDB (local or `mongodb://localhost:27017/swimming-pool-system`)
- k6 (for performance tests)
- Environment variables in `.env.local` (see `tests/docs/NEW_DEVELOPER_GUIDE.md`)

## Conventions

- Every test file starts with a detailed header comment
- Tests use the shared helper in `tests/helpers/` for auth, DB, and assertions
- Fixtures in `tests/fixtures/` provide reusable test data
- Mock implementations in `tests/mocks/` for external services
- All tests are idempotent — safe to run multiple times
