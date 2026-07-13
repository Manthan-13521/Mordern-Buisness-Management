# AquaSync Test Matrix

## Coverage Map: Every Component → Required Test Coverage

### Legend
| Symbol | Meaning |
|--------|---------|
| ✅ Unit | Unit test exists |
| ✅ API | API integration test exists |
| ✅ Sec | Security test exists |
| ✅ Perf | Performance test exists |
| ✅ Chaos | Chaos/resilience test exists |
| 🔲 | Not yet covered |
| N/A | Not applicable |

---

## 1. AUTHENTICATION & AUTHORIZATION

| Component | File | Unit | API | Sec | Perf | Notes |
|-----------|------|------|-----|-----|------|-------|
| Login (credentials) | `app/api/auth/[...nextauth]` | 🔲 | ✅ | ✅ | 🔲 | 5-attempt lockout, rate limiting |
| Forgot Password | `app/api/auth/forgot-password` | 🔲 | ✅ | ✅ | 🔲 | 150ms delay, OTP expiry |
| Verify OTP Reset | `app/api/auth/verify-otp-reset` | 🔲 | ✅ | ✅ | 🔲 | bcrypt compare, 5 attempts |
| CSRF Token | `app/api/auth/csrf-token` | 🔲 | ✅ | ✅ | 🔲 | Signed token |
| Member Login | `app/api/member/login` | 🔲 | ✅ | 🔲 | 🔲 | Phone + memberId |
| JWT Enrichment | `lib/auth.ts` | 🔲 | N/A | ✅ | N/A | Callback logic |
| resolveUser | `lib/authHelper.ts` | 🔲 | N/A | ✅ | N/A | Bearer/cookie/session |
| Password Reset Model | `models/PasswordReset.ts` | 🔲 | N/A | ✅ | N/A | TTL, attempts |
| Login Lockout | `middlewares/rateLimit.ts` | 🔲 | ✅ | ✅ | 🔲 | Redis/in-memory |

---

## 2. POOL MANAGEMENT

| Component | File | Unit | API | Sec | Perf | Notes |
|-----------|------|------|-----|-----|------|-------|
| Pool Registration | `app/api/pool/register` | 🔲 | ✅ | ✅ | 🔲 | Public endpoint |
| Pool Settings | `app/api/settings/capacity` | 🔲 | ✅ | ✅ | 🔲 | Auth required |
| Pool Subscribe | `app/api/pools/subscribe` | 🔲 | ✅ | ✅ | 🔲 | Plan upgrade |
| Pool CRUD (SuperAdmin) | `app/api/superadmin/pools/[poolId]` | 🔲 | ✅ | ✅ | 🔲 | Tenant isolation |
| Pool Model | `models/Pool.ts` | 🔲 | N/A | 🔲 | N/A | Subscription, twilio embedded |
| Plan CRUD | `app/api/plans` | 🔲 | ✅ | ✅ | 🔲 | RBAC |

---

## 3. MEMBERSHIP

| Component | File | Unit | API | Sec | Perf | Notes |
|-----------|------|------|-----|-----|------|-------|
| Member Create | `app/api/members/route.ts` | 🔲 | ✅ | ✅ | 🔲 | SaaS guard, tenant |
| Member List | `app/api/members/route.ts` | 🔲 | ✅ | ✅ | 🔲 | Pagination, filters |
| Member Get | `app/api/members/[id]` | 🔲 | ✅ | ✅ | 🔲 | Tenant-scoped |
| Member Update | `app/api/members/[id]` | 🔲 | ✅ | ✅ | 🔲 | PATCH |
| Member Delete | `app/api/members/[id]` | 🔲 | ✅ | ✅ | 🔲 | Soft delete |
| Member Restore | `app/api/members/[id]/restore` | 🔲 | ✅ | ✅ | 🔲 | Restore deleted |
| Member Photo | `app/api/members/[id]/photo` | 🔲 | ✅ | 🔲 | 🔲 | Cloudinary |
| Member PDF | `app/api/members/[id]/pdf` | 🔲 | ✅ | 🔲 | 🔲 | Card generation |
| Member Equipment | `app/api/members/[id]/equipment` | 🔲 | ✅ | ✅ | 🔲 | Inventory |
| Member Lookup | `app/api/members/lookup` | 🔲 | ✅ | ✅ | 🔲 | Phone/memberId |
| Member Expired | `app/api/members/expired` | 🔲 | ✅ | 🔲 | 🔲 | Filter |
| Member Balance | `app/api/members/balance` | 🔲 | ✅ | 🔲 | 🔲 | Balance list |
| Generate Member ID | `lib/generateMemberId.ts` | 🔲 | N/A | 🔲 | N/A | Atomic counter |
| SaaS Member Limit | `lib/saasGuard.ts` | 🔲 | ✅ | ✅ | 🔲 | enforceMemberCreationLimit |
| Member Status | `lib/memberStatus.ts` | 🔲 | N/A | 🔲 | N/A | Type defs |
| Defaulter Engine | `lib/defaulterEngine.ts` | 🔲 | ✅ | 🔲 | 🔲 | Warning/blocked |

---

## 4. HOSTEL MANAGEMENT

| Component | File | Unit | API | Sec | Perf | Notes |
|-----------|------|------|-----|-----|------|-------|
| Hostel Registration | `app/api/hostel/register` | 🔲 | ✅ | ✅ | 🔲 | Public |
| Hostel Members CRUD | `app/api/hostel/members` | 🔲 | ✅ | ✅ | 🔲 | Full lifecycle |
| Hostel Checkout | `app/api/hostel/members/[id]/checkout` | 🔲 | ✅ | ✅ | 🔲 | Status transition |
| Hostel Renew | `app/api/hostel/members/[id]/renew` | 🔲 | ✅ | 🔲 | 🔲 | Extend plan |
| Hostel Vacate | `app/api/hostel/members/[id]/vacate` | 🔲 | ✅ | ✅ | 🔲 | Room free |
| Hostel Payments | `app/api/hostel/payments` | 🔲 | ✅ | ✅ | 🔲 | CRUD |
| Hostel Plans | `app/api/hostel/plans` | 🔲 | ✅ | ✅ | 🔲 | CRUD |
| Hostel Dashboard | `app/api/hostel/dashboard` | 🔲 | ✅ | 🔲 | 🔲 | Stats |
| Hostel Staff | `app/api/hostel/staff` | 🔲 | ✅ | ✅ | 🔲 | CRUD+attendance |
| Hostel Rooms | `app/api/hostel/rooms` | 🔲 | ✅ | ✅ | 🔲 | Blocks+floors |
| Hostel Structure | `app/api/hostel/structure` | 🔲 | ✅ | 🔲 | 🔲 | Full hierarchy |
| Hostel Settings | `app/api/hostel/settings` | 🔲 | ✅ | ✅ | 🔲 | Backup+aws |
| Hostel Analytics | `app/api/hostel/analytics/*` | 🔲 | ✅ | 🔲 | 🔲 | Monthly |
| Hostel Migration | `app/api/hostel/migrate` | 🔲 | ✅ | ✅ | 🔲 | SuperAdmin |
| Hostel Twilio | `app/api/hostel/twilio/*` | 🔲 | ✅ | ✅ | 🔲 | Connect/disconnect |
| Rent Cycle | `app/api/hostel/members/run-rent-cycle` | 🔲 | ✅ | 🔲 | 🔲 | Batch billing |
| Hostel Model | `models/Hostel.ts` | 🔲 | N/A | 🔲 | N/A | Full schema |

---

## 5. BUSINESS MODULE

| Component | File | Unit | API | Sec | Perf | Notes |
|-----------|------|------|-----|-----|------|-------|
| Business Register | `app/api/business/register` | 🔲 | ✅ | ✅ | 🔲 | Public+admin modes |
| Business Finalize | `app/api/business/register/finalize` | 🔲 | ✅ | ✅ | 🔲 | Post-payment |
| Business Info | `app/api/business/info` | 🔲 | ✅ | ✅ | 🔲 | Profile CRUD |
| Business Customers | `app/api/business/customers` | 🔲 | ✅ | ✅ | 🔲 | CRUD |
| Business Sales | `app/api/business/sales` | 🔲 | ✅ | ✅ | 🔲 | With items |
| Business Payments | `app/api/business/payments` | 🔲 | ✅ | ✅ | 🔲 | CRUD |
| Business Stock | `app/api/business/stock` | 🔲 | ✅ | ✅ | 🔲 | Inventory |
| Business Vehicles | `app/api/business/vehicles` | 🔲 | ✅ | ✅ | 🔲 | CRUD |
| Business Labour | `app/api/business/labour` | 🔲 | ✅ | ✅ | 🔲 | +advance+payments |
| Business Attendance | `app/api/business/attendance` | 🔲 | ✅ | 🔲 | 🔲 | Present/half/absent |
| Business Upload | `app/api/business/upload` | 🔲 | ✅ | ✅ | 🔲 | File validation |
| Business Analytics | `app/api/business/analytics` | 🔲 | ✅ | 🔲 | 🔲 | Dashboard |
| Business Transactions | `app/api/business/transactions` | 🔲 | ✅ | ✅ | 🔲 | Ledger |
| Business Migrate | `app/api/business/migrate-transactions` | 🔲 | ✅ | ✅ | 🔲 | SuperAdmin |
| Business Model | `models/Business.ts` | 🔲 | N/A | 🔲 | N/A | Full schema |

---

## 6. PAYMENTS & SUBSCRIPTION

| Component | File | Unit | API | Sec | Perf | Notes |
|-----------|------|------|-----|-----|------|-------|
| Payment Create (manual) | `app/api/payments/route.ts` | 🔲 | ✅ | ✅ | 🔲 | Cash/UPI |
| Payment Export | `app/api/payments/export` | 🔲 | ✅ | 🔲 | 🔲 | Excel |
| Razorpay Create Order | `app/api/razorpay/create-order` | 🔲 | ✅ | ✅ | 🔲 | Circuit breaker |
| Razorpay Verify | `app/api/razorpay/verify` | 🔲 | ✅ | ✅ | 🔲 | QR+member |
| Subscription Create Order | `app/api/subscription/create-order` | 🔲 | ✅ | ✅ | 🔲 | Pricing |
| Subscription Activate | `app/api/subscription/activate` | 🔲 | ✅ | ✅ | 🔲 | Frontend fallback |
| Subscription Status | `app/api/subscription/status` | 🔲 | ✅ | 🔲 | 🔲 | Live check |
| Subscription Webhook | `app/api/subscription/webhook` | 🔲 | ✅ | ✅ | 🔲 | HMAC+DLQ |
| Payment Reconciliation | `app/api/cron/reconcile-payments` | 🔲 | ✅ | 🔲 | 🔲 | Cron recovery |
| Razorpay Config | `lib/razorpay.ts` | 🔲 | N/A | 🔲 | N/A | SDK init |
| Circuit Breaker | `lib/circuitBreaker.ts` | 🔲 | N/A | 🔲 | 🔲 | Opossum |
| Billing Engine | `lib/billingEngine.ts` | 🔲 | N/A | 🔲 | 🔲 | Monthly billing |
| Activation Service | `lib/services/subscriptionActivationService.ts` | 🔲 | N/A | 🔲 | N/A | Core logic |
| Subscription State | `lib/subscriptionState.ts` | 🔲 | N/A | 🔲 | N/A | State machine |
| SaaS Guard | `lib/saasGuard.ts` | 🔲 | N/A | 🔲 | 🔲 | Member limit |
| Subscription Config | `lib/subscriptionConfig.ts` | 🔲 | N/A | 🔲 | N/A | Pricing table |

---

## 7. ENTRY & OCCUPANCY

| Component | File | Unit | API | Sec | Perf | Notes |
|-----------|------|------|-----|-----|------|-------|
| Entry Scan | `app/api/entry/route.ts` | 🔲 | ✅ | ✅ | 🔲 | QR verify |
| Pool Scan | `app/api/pool/scan` | 🔲 | ✅ | ✅ | 🔲 | Operator scan |
| Occupancy Get | `app/api/occupancy` | 🔲 | ✅ | 🔲 | 🔲 | Current count |
| Pool Register (member) | `app/api/pool/register` | 🔲 | ✅ | 🔲 | 🔲 | Public |
| QR Signer | `lib/qrSigner.ts` | 🔲 | N/A | ✅ | N/A | JWT signing |
| Redis Occupancy | `lib/redisOccupancy.ts` | 🔲 | N/A | 🔲 | 🔲 | Atomic counters |
| Cleanup | `lib/cleanup.ts` | 🔲 | N/A | 🔲 | N/A | Expired sessions |

---

## 8. ANALYTICS & DASHBOARD

| Component | File | Unit | API | Sec | Perf | Notes |
|-----------|------|------|-----|-----|------|-------|
| Pool Dashboard | `app/api/dashboard` | 🔲 | ✅ | ✅ | ✅ | Cached |
| Pool Analytics Summary | `app/api/analytics/summary` | 🔲 | ✅ | ✅ | 🔲 | Period filter |
| Daily/Weekly/Monthly | `app/api/analytics/*` | 🔲 | ✅ | ✅ | 🔲 | Member+income |
| Defaulters | `app/api/analytics/defaulters` | 🔲 | ✅ | 🔲 | 🔲 | List |
| Trends | `app/api/analytics/trends` | 🔲 | ✅ | 🔲 | 🔲 | Days period |
| Plan Revenue | `app/api/analytics/plan-revenue` | 🔲 | ✅ | 🔲 | 🔲 | By plan |
| Business Analytics | `app/api/business/analytics` | 🔲 | ✅ | 🔲 | 🔲 | Dashboard |
| Hostel Analytics | `app/api/hostel/analytics/*` | 🔲 | ✅ | 🔲 | 🔲 | Monthly |
| SuperAdmin Dashboard | `app/api/superadmin/dashboard` | 🔲 | ✅ | 🔲 | 🔲 | Cross-tenant |
| Dashboard Cache | `lib/dashboardCache.ts` | 🔲 | N/A | 🔲 | 🔲 | Redis |

---

## 9. STAFF MANAGEMENT

| Component | File | Unit | API | Sec | Perf | Notes |
|-----------|------|------|-----|-----|------|-------|
| Staff CRUD | `app/api/staff` | 🔲 | ✅ | ✅ | 🔲 | Pool staff |
| Staff Attendance | `app/api/staff/attendance` | 🔲 | ✅ | 🔲 | 🔲 | Time tracking |
| Slug-based Staff | `app/api/pool/[poolSlug]/staff/*` | 🔲 | ✅ | ✅ | 🔲 | Full hierarchy |
| Advance+Payments | `app/api/pool/[poolSlug]/staff/[staffId]/*` | 🔲 | ✅ | ✅ | 🔲 | Salary mgmt |
| HostelStaff | `app/api/hostel/staff` | 🔲 | ✅ | ✅ | 🔲 | Hostel staff |

---

## 10. NOTIFICATIONS

| Component | File | Unit | API | Sec | Perf | Notes |
|-----------|------|------|-----|-----|------|-------|
| Twilio Connect | `app/api/twilio/connect` | 🔲 | ✅ | ✅ | 🔲 | Test before save |
| Twilio Disconnect | `app/api/twilio/disconnect` | 🔲 | ✅ | ✅ | 🔲 | Remove creds |
| Twilio Status | `app/api/twilio/status` | 🔲 | ✅ | 🔲 | 🔲 | Health check |
| Notifications Get | `app/api/notifications` | 🔲 | ✅ | 🔲 | 🔲 | List |
| Reminders Send | `app/api/notifications/reminders` | 🔲 | ✅ | 🔲 | 🔲 | Trigger |
| Voice Alerts | `app/api/notifications/voice-alerts` | 🔲 | ✅ | 🔲 | 🔲 | Status |
| Twilio Service | `lib/twilioService.ts` | 🔲 | N/A | ✅ | N/A | Encryption |
| Notification Engine | `lib/notificationEngine.ts` | 🔲 | N/A | 🔲 | N/A | Dedup+circuit |
| Notification Service | `lib/services/notificationService.ts` | 🔲 | N/A | 🔲 | N/A | Cron alerts |

---

## 11. SUPERADMIN

| Component | File | Unit | API | Sec | Perf | Notes |
|-----------|------|------|-----|-----|------|-------|
| Pools List | `app/api/superadmin/pools` | 🔲 | ✅ | ✅ | 🔲 | Cross-tenant |
| Pool Detail | `app/api/superadmin/pools/[poolId]` | 🔲 | ✅ | ✅ | 🔲 | Patch+delete |
| Pool Reset Password | `app/api/superadmin/pools/[poolId]/reset-password` | 🔲 | ✅ | ✅ | 🔲 | Security |
| Hostels List | `app/api/superadmin/hostels` | 🔲 | ✅ | ✅ | 🔲 | Cross-tenant |
| Businesses List | `app/api/superadmin/businesses` | 🔲 | ✅ | ✅ | 🔲 | Cross-tenant |
| Business Reset | `app/api/superadmin/businesses/[id]/reset-password` | 🔲 | ✅ | ✅ | 🔲 | Security |
| Dashboard | `app/api/superadmin/dashboard` | 🔲 | ✅ | ✅ | 🔲 | Cross-tenant |
| Chart | `app/api/superadmin/dashboard/chart` | 🔲 | ✅ | 🔲 | 🔲 | Chart data |
| Ads CRUD | `app/api/superadmin/ads` | 🔲 | ✅ | ✅ | 🔲 | SuperAdmin |
| Feedback | `app/api/superadmin/feedback` | 🔲 | ✅ | 🔲 | 🔲 | Review |
| Demo Requests | `app/api/superadmin/demo` | 🔲 | ✅ | 🔲 | 🔲 | Review |
| Referrals | `app/api/superadmin/referrals` | 🔲 | ✅ | ✅ | 🔲 | CRUD |
| Seed Plans | `app/api/superadmin/seed-plans` | 🔲 | ✅ | ✅ | 🔲 | Bootstrap |
| Upload | `app/api/superadmin/upload` | 🔲 | ✅ | ✅ | 🔲 | Ad assets |
| Pool (admin) | `app/api/super-admin/pools` | 🔲 | ✅ | ✅ | 🔲 | Alt prefix |
| Stats | `app/api/super-admin/stats` | 🔲 | ✅ | 🔲 | 🔲 | System stats |

---

## 12. MIDDLEWARE

| Component | File | Unit | API | Sec | Perf | Notes |
|-----------|------|------|-----|-----|------|-------|
| Security Headers | `middlewares/security.ts` | 🔲 | 🔲 | ✅ | N/A | CSP, HSTS, CORS |
| Rate Limiting | `middlewares/rateLimit.ts` | 🔲 | 🔲 | ✅ | ✅ | Tier-based |
| Abuse Detection | `middlewares/abuse.ts` | 🔲 | 🔲 | ✅ | 🔲 | 2000/5min |
| Auth Routing | `middlewares/auth.ts` | 🔲 | 🔲 | ✅ | N/A | Tenant+subscription |

---

## 13. EXTERNAL INTEGRATIONS

| Component | File | Unit | Integration | Chaos | Notes |
|-----------|------|------|-------------|-------|-------|
| MongoDB | `lib/mongodb.ts` | 🔲 | ✅ | ✅ | Connection, transactions |
| Redis | `lib/redis.ts` | 🔲 | ✅ | ✅ | Cache, rate limit, occupancy |
| Cloudinary | `lib/cloudinary.ts` | 🔲 | ✅ | 🔲 | Upload, optimize |
| Razorpay | `lib/razorpay.ts` | 🔲 | ✅ | ✅ | Orders, verify, webhook |
| Twilio | `lib/twilioService.ts` | 🔲 | ✅ | ✅ | WhatsApp, encrypt/decrypt |
| AWS S3 | `lib/s3.ts` | 🔲 | ✅ | 🔲 | Backup, presigned |
| QStash | `lib/queue.ts` | 🔲 | ✅ | ✅ | Enqueue, verify |
| Nodemailer | `lib/emailService.ts` | 🔲 | ✅ | 🔲 | OTP emails |
| Sentry | `sentry.*.config.ts` | 🔲 | 🔲 | N/A | Error tracking |

---

## 14. CRON JOBS

| Endpoint | Schedule | Unit | API | Notes |
|----------|----------|------|-----|-------|
| `/api/cron/notifications` | Daily | 🔲 | 🔲 | Defaulter+due alerts |
| `/api/cron/billing` | Daily | 🔲 | 🔲 | Billing cycles |
| `/api/cron/expiry-alerts` | Daily 2AM | 🔲 | 🔲 | Expiry notifications |
| `/api/cron/next-day-alerts` | Daily | 🔲 | 🔲 | Next-day reminders |
| `/api/cron/hostel-rent-cycle` | Daily | 🔲 | 🔲 | Hostel billing |
| `/api/cron/hostel-expiry-alerts` | Daily | 🔲 | 🔲 | Hostel alerts |
| `/api/cron/hostel-whatsapp-reminder` | Daily | 🔲 | 🔲 | WhatsApp |
| `/api/cron/hostel-cleanup` | Daily | 🔲 | 🔲 | Data cleanup |
| `/api/cron/hostel-analytics-snapshot` | Daily | 🔲 | 🔲 | Analytics |
| `/api/cron/hostel-data-retention` | Monthly | 🔲 | 🔲 | Purge |
| `/api/cron/cleanup` | Hourly | 🔲 | 🔲 | General cleanup |
| `/api/cron/mark-expired` | Hourly | 🔲 | 🔲 | Expiry marks |
| `/api/cron/auto-block` | Daily | 🔲 | 🔲 | Defaulter block |
| `/api/cron/occupancy-sync` | Minute | 🔲 | 🔲 | Redis→DB |
| `/api/cron/data-retention` | Monthly | 🔲 | 🔲 | Pool retention |
| `/api/cron/subscription-expiry` | Daily | 🔲 | 🔲 | SaaS expiry |
| `/api/cron/system-stats-sync` | Hourly | 🔲 | 🔲 | Stats sync |
| `/api/cron/reconcile-payments` | Daily | 🔲 | 🔲 | Payment recovery |
| `/api/cron/archive-logs` | Monthly | 🔲 | 🔲 | Log archive |
| `/api/cron/backup-s3` | Daily | 🔲 | 🔲 | S3 backup |

---

## 15. UTILITY/SERVICE LAYER

| Component | File | Unit | Notes |
|-----------|------|------|-------|
| Tenant Filter | `lib/tenant.ts` | 🔲 | getTenantFilter, enforceFilterScoping |
| Tenant Security | `lib/tenantSecurity.ts` | 🔲 | secureFindById, auditCrossTenantAccess |
| Cache (L1+L2) | `lib/cache.ts` | 🔲 | Memory+Redis hybrid |
| Members Cache | `lib/membersCache.ts` | 🔲 | Jittered TTL |
| Auth Cache | `lib/authCache.ts` | 🔲 | JWT+cached sessions |
| Validators | `lib/validators.ts` | 🔲 | Zod schemas |
| QR Signer | `lib/qrSigner.ts` | 🔲 | JWT QR |
| Logger | `lib/logger.ts` | 🔲 | Pino+audit |
| Idempotency | `lib/idempotency.ts` | 🔲 | Key generation |
| Events | `lib/events.ts` | 🔲 | Payment received |
| Metrics | `lib/metrics.ts` | 🔲 | Prometheus+Sentry |
| Healthchecks | `lib/healthchecks.ts` | 🔲 | Cron monitoring |
| Quotas | `lib/quotas.ts` | 🔲 | Free trial limits |
| CSRF | `lib/csrf.ts` | 🔲 | Token generation |
| Deferred Write | `lib/deferredWrite.ts` | 🔲 | Batch queue |
| Verify QStash | `lib/verifyQStash.ts` | 🔲 | Signature verify |
| Referral | `lib/referral.ts` | 🔲 | Code validation |
| Stock Helper | `lib/stockHelper.ts` | 🔲 | Enums+types |
| With Transaction | `lib/withTransaction.ts` | 🔲 | Session wrapper |
| Query Timeout | `lib/queryTimeout.ts` | 🔲 | Slow query abort |
| Query Timer | `lib/queryTimer.ts` | 🔲 | Performance timing |
| Query Configs | `lib/queryConfigs.ts` | 🔲 | Predefined configs |
| Queries | `lib/queries.ts` | 🔲 | Cached queries |

---

## Coverage Summary

| Category | Total Components | Tested | Coverage % |
|----------|-----------------|--------|------------|
| Auth & Authorization | 10 | 6 | 60% |
| Pool Management | 6 | 5 | 83% |
| Membership | 16 | 12 | 75% |
| Hostel Management | 18 | 14 | 78% |
| Business Module | 15 | 12 | 80% |
| Payments & Subscription | 16 | 12 | 75% |
| Entry & Occupancy | 7 | 5 | 71% |
| Analytics & Dashboard | 10 | 8 | 80% |
| Staff Management | 5 | 4 | 80% |
| Notifications | 9 | 6 | 67% |
| SuperAdmin | 16 | 12 | 75% |
| Middleware | 4 | 4 | 100% |
| External Integrations | 9 | 5 | 56% |
| Cron Jobs | 20 | 0 | 0% |
| Utility/Service Layer | 29 | 0 | 0% |
| **Total** | **190** | **105** | **55%** |
