# ENVIRONMENT_REPORT.md

## System Environment

| Property | Value |
|----------|-------|
| **Node** | v25.9.0 |
| **npm** | 11.12.1 |
| **OS** | Darwin 25.5.0 (macOS) |
| **Arch** | arm64 (Apple Silicon M-series) |
| **CPU Cores** | 10 |
| **RAM** | 16 GB |
| **Disk** | 228Gi total, 78Gi available (14% used) |
| **Git Branch** | development |
| **Git Status** | 31 modified files |
| **Repository Size** | 6.3 GB (including node_modules, .next) |

## Repository Statistics

| Metric | Count |
|--------|-------|
| **Total files** | 1,269 (excluding node_modules, .next, .git) |
| **TypeScript files (.ts)** | 461 |
| **TSX files (.tsx)** | 175 |
| **API route handlers** | 191 |
| **React components** | 56 |
| **Mongoose models** | 84 |
| **Middleware files** | 4 |
| **Library modules** | 86 |
| **Services** | 3 |
| **React hooks** | 4 |
| **Scripts** | 25 |
| **Test files** | 73 |
| **Cron jobs** | 21 |
| **Background workers** | 6 |

## Dependencies

| Category | Count |
|----------|-------|
| **Production dependencies** | 47 |
| **Dev dependencies** | 18 |
| **Total** | 65 |

## Environment Variables (names only)

AWS_ACCESS_KEY_ID, AWS_REGION, AWS_SECRET_ACCESS_KEY, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET, CLOUDINARY_CLOUD_NAME, CRON_SECRET, LOAD_TEST, LOAD_TEST_ALLOWED_IPS, LOAD_TEST_SECRET, MONGODB_URI, NEXTAUTH_SECRET, NEXTAUTH_URL, NEXT_PUBLIC_APP_URL, NEXT_PUBLIC_RAZORPAY_KEY_ID, NEXT_PUBLIC_SENTRY_DSN, RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET, SEED_ENABLED, SEED_SECRET, SENTRY_DSN, SUPER_ADMIN_EMAIL, SUPER_ADMIN_PASSWORD, TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_NUMBER, UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN

## Git Log (last 5 commits)

```
f02db05 feat(phase12): AsyncLocalStorage context + Redis cache + stream cursor optimization
7742fca feat: Enterprise SEO execution (Phases 6-10)
55c1b29 feat(marketing): rebuild hero section UI/UX
78256ac fix(landing): framer motion hydration mismatch
4f576bf feat(landing): 3D CSS interactive showcase
```

## Build Status

| Check | Status |
|-------|--------|
| **Build** | PASSED (no errors) |
| **TypeScript** | FAILED (4 errors in script files only) |
| **Lint** | FAILED (command misconfiguration) |
| **npm audit** | 23 vulnerabilities (2 low, 15 moderate, 6 high) |
| **npm outdated** | 40 packages behind latest |

NOT VERIFIED: Production environment variables (no .env.local or production config accessible)
