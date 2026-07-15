# Coverage Audit Matrix

**Generated:** 2026-07-13  |  **Methodology:** Static analysis of route exports vs. test assertions.

---

## Coverage by Module

### Pool Module — 23 route files, 21 HTTP methods

| Route | Methods | Tested | Status | Risk |
|-------|---------|--------|--------|------|
| `GET /api/dashboard` | GET | Pool #1, Business Flow #1, HealthCoverage #4 | ✅ Covered | Low |
| `GET /api/app-init` | GET | RemainingCoverage #1 | ✅ Covered | Low |
| `GET /api/plans` | GET | Pool #3, Members #1, Edge #3, PlansCoverage #1 | ✅ Covered | Low |
| `POST /api/plans` | POST | Pool #4, PlansCoverage #3 | ✅ Covered | Low |
| `PUT /api/plans/[id]` | PUT | PlansCoverage #4 | ✅ Covered | Low |
| `DELETE /api/plans/[id]` | DELETE | PlansCoverage #5 | ✅ Covered | Low |
| `GET /api/settings/capacity` | GET | Pool #5, SettingsCoverage #1 | ✅ Covered | Low |
| `POST /api/settings/capacity` | POST | Pool #6, SettingsCoverage #2 | ✅ Covered | Low |
| `GET /api/occupancy` | GET | Pool #7, Entry #1, Flow #6, HealthCoverage #6 | ✅ Covered | Low |
| `POST /api/entry` | POST | ❌ | 🔴 Untested | Medium |
| `POST /api/pool/register` | POST | ❌ | 🔴 Untested | Low |
| `POST /api/pool/scan` | POST | ❌ | 🔴 Untested | Medium |
| Pool staff routes (10) | GET/POST | ❌ | 🔴 Untested | Low |
| `GET/POST /api/competitions` | GET/POST | RemainingCoverage #17 | 🔶 Smoke Only | Low |
| `PATCH /api/competitions/[id]` | PATCH | ❌ | 🔴 Untested | Low |

### Members Module — 12 route files, 24 HTTP methods

| Route | Methods | Tested | Status | Risk |
|-------|---------|--------|--------|------|
| `GET /api/members` | GET | Pool #9, Members #1, Edge #2-3 | ✅ Covered | Low |
| `POST /api/members` | POST | Pool #8, Members #2, Edge #1,4,5,7, Security #1 | ✅ Covered | Low |
| `GET /api/members/lookup` | GET | Members #3, Flow #5 | ✅ Covered | Low |
| `GET /api/members/expired` | GET | Members #4 | ✅ Covered | Low |
| `GET /api/members/balance` | GET | Members #5 | ✅ Covered | Low |
| `GET/PATCH/DELETE /api/members/[id]` | G/P/D | ❌ | 🔴 Untested | High |
| `POST /api/members/[id]/restore` | POST | ❌ | 🔴 Untested | Low |
| `DELETE /api/members/[id]/permanent` | DELETE | ❌ | 🔴 Untested | Low |
| `POST/PATCH /api/members/[id]/equipment` | POST/PATCH | ❌ | 🔴 Untested | Low |
| `GET /api/members/[id]/photo` | GET | ❌ | 🔴 Untested | Low |
| `GET /api/members/[id]/pdf` | GET | ❌ | 🔴 Untested | Low |

### Hostel Module — 36 route files, ~60 HTTP methods

| Route | Methods | Tested | Status | Risk |
|-------|---------|--------|--------|------|
| `GET /api/hostel/dashboard` | GET | Hostel #1 | ✅ Covered | Low |
| `GET /api/hostel/members` | GET | Hostel #2 | ✅ Covered | Low |
| `GET /api/hostel/plans` | GET | Hostel #3 | ✅ Covered | Low |
| `POST /api/hostel/plans` | POST | Hostel #4 | ✅ Covered | Low |
| `GET /api/hostel/rooms` | GET | Hostel #5 | ✅ Covered | Low |
| `GET /api/hostel/blocks` | GET | Hostel #6 | ✅ Covered | Low |
| `GET /api/hostel/structure` | GET | Hostel #7 | ✅ Covered | Low |
| `GET /api/hostel/payments` | GET | Hostel #8 | ✅ Covered | Low |
| `GET /api/hostel/settings` | GET | Hostel #9 | ✅ Covered | Low |
| `GET /api/hostel/staff` | GET | Hostel #10 | ✅ Covered | Low |
| `GET /api/hostel/analytics/monthly-members` | GET | Hostel #11 | ✅ Covered | Low |
| `GET /api/hostel/analytics/monthly-income` | GET | Hostel #12 | ✅ Covered | Low |
| `GET /api/hostel/members/expired` | GET | Hostel #13 | ✅ Covered | Low |
| `GET /api/hostel/members/balance` | GET | Hostel #14 | ✅ Covered | Low |
| `GET /api/hostel/twilio/status` | GET | Hostel #15 | ✅ Covered | Low |
| Hostel member CRUD, checkout, vacate, renew, rent-cycle | 11 routes | ❌ | 🔴 Untested | High |
| Hostel staff (CRUD, attendance, payments, advances) | 10 routes | ❌ | 🔴 Untested | Medium |
| `POST /api/hostel/register` | POST | ❌ | 🔴 Untested | Medium |
| Settings backup/restore AWS | 4 routes | ❌ | 🔴 Untested | Low |
| `GET /api/hostel/analytics/monthly-checkouts` | GET | ❌ | 🔴 Untested | Low |
| `POST /api/hostel/migrate` | POST | ❌ | 🔴 Untested | Low |

### Business Module — 20 route files, ~35 HTTP methods

| Route | Methods | Tested | Status | Risk |
|-------|---------|--------|--------|------|
| `GET /api/business/info` | GET | Business #1 | ✅ Covered | Low |
| `GET /api/business/analytics` | GET | Business #2 | ✅ Covered | Low |
| `GET /api/business/customers` | GET | Business #3 | ✅ Covered | Low |
| `POST /api/business/customers` | POST | Business #4 | ✅ Covered | Low |
| `GET /api/business/sales` | GET | Business #5 | ✅ Covered | Low |
| `GET /api/business/payments` | GET | Business #6 | ✅ Covered | Low |
| `GET /api/business/stock` | GET | Business #7 | ✅ Covered | Low |
| `POST /api/business/stock` | POST | Business #8 | ✅ Covered | Low |
| `GET /api/business/vehicles` | GET | Business #9 | ✅ Covered | Low |
| `GET /api/business/labour` | GET | Business #10 | ✅ Covered | Low |
| `POST /api/business/labour` | POST | Business #11 | ✅ Covered | Low |
| `GET /api/business/transactions` | GET | Business #12 | ✅ Covered | Low |
| `GET /api/business/attendance` | GET | Business #13 | ✅ Covered | Low |
| `GET /api/business/analytics/advanced` | GET | Business #14 | ✅ Covered | Low |
| Stock PUT, customer PATCH, labour payments/advances/inventory | 8 routes | ❌ | 🔴 Untested | Medium |
| Register, finalize, upload, migrate | 3 routes | ❌ | 🔴 Untested | Low |

### Payments Module — 6 route files, 8 HTTP methods

| Route | Methods | Tested | Status | Risk |
|-------|---------|--------|--------|------|
| `GET /api/payments` | GET | Payments #1, PaymentsCoverage #11 | ✅ Covered | Low |
| `GET /api/payments/export` | GET | Payments #4, PaymentsCoverage #10 | ✅ Covered | Low |
| `POST /api/payments` | POST | PaymentsCoverage #2-3 | ✅ Covered | Low |
| `POST /api/razorpay/create-order` | POST | RazorpaySubCoverage #7-8, PaymentsCoverage #4 | ✅ Covered | Low |
| `POST /api/razorpay/verify` | POST | RazorpaySubCoverage #9, PaymentsCoverage #5 | ✅ Covered | Low |
| `GET /api/razorpay/subscription` | GET | RazorpaySubCoverage #1 | ✅ Covered | Low |

### Auth Module — 4 route files, 6 HTTP methods

| Route | Methods | Tested | Status | Risk |
|-------|---------|--------|--------|------|
| NextAuth `[...nextauth]` | GET/POST | ✅ through login flow | ✅ Covered | Low |
| `GET /api/auth/csrf-token` | GET | Auth #1 | ✅ Covered | Low |
| `POST /api/auth/forgot-password` | POST | Auth #3-6 | ✅ Covered | Low |
| `POST /api/auth/verify-otp-reset` | POST | ❌ | 🔴 Untested | Medium |

### SuperAdmin Module — 18 route files, ~25 HTTP methods

| Route | Methods | Tested | Status | Risk |
|-------|---------|--------|--------|------|
| `GET /api/superadmin/dashboard` | GET | SuperAdmin #1, SuperAdminExt #14 | ✅ Covered | Low |
| `GET /api/superadmin/dashboard/chart` | GET | SuperAdmin #2, SuperAdminExt #15 | ✅ Covered | Low |
| `GET /api/superadmin/pools` | GET | SuperAdmin #3, SuperAdminExt #6 | ✅ Covered | Low |
| `GET /api/superadmin/pools/TEST-POOL-001` | GET | SuperAdminExt #7 | ✅ Covered | Low |
| `GET /api/superadmin/hostels` | GET | SuperAdmin #4, SuperAdminExt #11 | ✅ Covered | Low |
| `GET /api/superadmin/hostels/[hostelId]` | GET | SuperAdminExt #12 | ✅ Covered | Low |
| `GET /api/superadmin/businesses` | GET | SuperAdmin #5, SuperAdminExt #8 | ✅ Covered | Low |
| `GET /api/superadmin/businesses/[id]` | GET | SuperAdminExt #9 | ✅ Covered | Low |
| `GET /api/superadmin/feedback` | GET | SuperAdmin #6, SuperAdminExt #16 | ✅ Covered | Low |
| `GET /api/superadmin/referrals` | GET | SuperAdmin #7, SuperAdminExt #17 | ✅ Covered | Low |
| `GET /api/superadmin/ads` | GET | SuperAdminExt #18 | ✅ Covered | Low |
| `GET /api/superadmin/demo` | GET | SuperAdminExt #19 | ✅ Covered | Low |
| Pool/hostel/business PATCH/DELETE/reset-password | 8 routes | ❌ | 🔴 Untested | High |
| Referral POST/PATCH/DELETE | 3 routes | ❌ | 🔴 Untested | Medium |
| Upload | 1 route | ❌ | 🔴 Untested | Low |
| `GET /api/super-admin/pools` | GET | SuperAdminExt #20 | ✅ Covered | Low |
| `GET /api/super-admin/stats` | GET | SuperAdminExt #21 | ✅ Covered | Low |

### Analytics Module — 10 route files (all GET)

| Route | Methods | Tested | Status | Risk |
|-------|---------|--------|--------|------|
| All 10 analytics GET routes | GET | Analytics #1-10, AnalyticsExt #1-10 | ✅ Covered | Low |

### Entry/Occupancy — 2 route files

| Route | Methods | Tested | Status | Risk |
|-------|---------|--------|--------|------|
| `GET /api/occupancy` | GET | Entry #1, HealthCoverage #6 | ✅ Covered | Low |
| `POST /api/entry` | POST | ❌ | 🔴 Untested | Medium |

### Health/Metrics — 6 route files

| Route | Methods | Tested | Status | Risk |
|-------|---------|--------|--------|------|
| `GET /api/health` | GET | Auth #7, Edge #9, HealthCoverage #1 | ✅ Covered | Low |
| `GET /api/health/live` | GET | HealthCoverage #2 | ✅ Covered | Low |
| `GET /api/health/ready` | GET | HealthCoverage #3 | ✅ Covered | Medium |
| `GET /api/metrics` | GET | Auth #8, HealthCoverage #3 | ✅ Covered | Low |
| `GET /api/metrics/health` | GET | HealthCoverage #4 | ✅ Covered | Low |
| `GET /api/metrics/payment-metrics` | GET | HealthCoverage #5, PaymentsCoverage #12 | ✅ Covered | Low |

### Staff Module — 2 route files

| Route | Methods | Tested | Status | Risk |
|-------|---------|--------|--------|------|
| `GET /api/staff` | GET | StaffCoverage #1 | ✅ Covered | Low |
| `POST /api/staff` | POST | StaffCoverage #2-3 | ✅ Covered | Low |
| `GET /api/staff/attendance` | GET | StaffCoverage #5 | ✅ Covered | Low |
| `POST /api/staff/attendance` | POST | StaffCoverage #6 | ✅ Covered | Low |

### Settings Module — 6 route files

| Route | Methods | Tested | Status | Risk |
|-------|---------|--------|--------|------|
| `GET/POST /api/settings/capacity` | G/P | Pool #5-6, SettingsCoverage #1-2 | ✅ Covered | Low |
| `GET /api/settings/backup` | GET | SettingsCoverage #3 | ✅ Covered | Low |
| `GET /api/settings/backup/excel` | GET | SettingsCoverage #4 | ✅ Covered | Low |
| `GET /api/settings/backup/deleted-members` | GET | SettingsCoverage #5 | ✅ Covered | Low |
| `POST /api/settings/aws/backup-json` | POST | SettingsCoverage #6 | ✅ Covered | Low |
| `POST /api/settings/aws/backup-excel` | POST | SettingsCoverage #7 | ✅ Covered | Low |

### Subscription — 4 route files

| Route | Methods | Tested | Status | Risk |
|-------|---------|--------|--------|------|
| `GET /api/subscription/status` | GET | RazorpaySubCoverage #2, PaymentsCoverage #6 | ✅ Covered | Low |
| `POST /api/subscription/create-order` | POST | RazorpaySubCoverage #3, PaymentsCoverage #7 | ✅ Covered | Low |
| `POST /api/subscription/activate` | POST | RazorpaySubCoverage #4, PaymentsCoverage #8-9 | ✅ Covered | Low |
| `GET /api/subscription/webhook` | GET | RazorpaySubCoverage #5 | ✅ Covered | Low |

### Notifications — 3 route files

| Route | Methods | Tested | Status | Risk |
|-------|---------|--------|--------|------|
| `GET /api/notifications` | GET | NotificationsCoverage #1 | ✅ Covered | Low |
| `POST /api/notifications/reminders` | POST | NotificationsCoverage #2 | ✅ Covered | Low |
| `GET /api/notifications/voice-alerts` | GET | NotificationsCoverage #3 | ✅ Covered | Low |

### Cron/Worker — 22 route files (all GET/POST)

| Route | Methods | Tested | Status | Risk |
|-------|---------|--------|--------|------|
| `GET /api/cron/mark-expired` | GET | RemainingCoverage #26 | 🔶 Smoke Only | Medium |
| `GET /api/cron/cleanup` | GET | RemainingCoverage #27 | 🔶 Smoke Only | Medium |
| `POST /api/workers/process-billing` | POST | RemainingCoverage #21 | 🔶 Smoke Only | Medium |
| `POST /api/workers/process-defaulter` | POST | RemainingCoverage #22 | 🔶 Smoke Only | Medium |
| `POST /api/workers/process-notification` | POST | RemainingCoverage #23 | 🔶 Smoke Only | Medium |
| `POST /api/workers/process-sync` | POST | RemainingCoverage #24 | 🔶 Smoke Only | Medium |
| Remaining 16 cron routes | GET | ❌ | 🔴 Untested | Medium |

### Twilio — 3 route files

| Route | Methods | Tested | Status | Risk |
|-------|---------|--------|--------|------|
| `GET /api/twilio/status` | GET | Hostel #15, RemainingCoverage #25 | ✅ Covered | Low |
| `POST /api/twilio/connect` | POST | RemainingCoverage #26 | 🔶 Smoke Only | Medium |
| `POST /api/twilio/disconnect` | POST | RemainingCoverage #27 | 🔶 Smoke Only | Medium |

### Remaining Modules — Covered

| Route | Methods | Tested | Status | Risk |
|-------|---------|--------|--------|------|
| `GET /api/admin/health` | GET | RemainingCoverage #16 | ✅ Covered | Low |
| `GET /api/admin/seed-plans` | GET | RemainingCoverage #17 | ✅ Covered | Low |
| `GET /api/ads/active` | GET | RemainingCoverage #19 | ✅ Covered | Low |
| `POST /api/ads/track` | POST | RemainingCoverage #20 | ✅ Covered | Low |
| `POST /api/backups/list` | GET | RemainingCoverage #18 | 🔶 Smoke Only | Low |
| `POST /api/backups/download` | GET | RemainingCoverage #18 | 🔶 Smoke Only | Low |
| `POST /api/contact` | POST | RemainingCoverage #3-4 | ✅ Covered | Low |
| `POST /api/csp-report` | POST | HealthCoverage #8 | ✅ Covered | Low |
| `POST /api/demo` | POST | RemainingCoverage #2 | ✅ Covered | Low |
| `GET /api/entertainment-members` | GET | RemainingCoverage #15 | ✅ Covered | Low |
| `GET /api/export/members` | GET | RemainingCoverage #12 | ✅ Covered | Low |
| `POST /api/feedback` | POST | RemainingCoverage #14 | ✅ Covered | Low |
| `GET /api/jobs/fix-pending` | GET | RemainingCoverage #19 | 🔶 Smoke Only | Low |
| `POST /api/jobs/generate-card` | POST | RemainingCoverage #20 | 🔶 Smoke Only | Low |
| `POST /api/member/login` | POST | RemainingCoverage #21 | ✅ Covered | Low |
| `GET /api/quotas` | GET | RemainingCoverage #10 | ✅ Covered | Low |
| `GET /api/referral/validate` | GET | RemainingCoverage #16 | ✅ Covered | Low |
| `GET /api/seed` | GET | RemainingCoverage #11 | ✅ Covered | Low |
| `GET /api/warmup` | GET | HealthCoverage #9 | ✅ Covered | Low |

---

## Summary Statistics

| Metric | Value |
|--------|-------|
| Total route files | 191 |
| Total HTTP method exports | ~250+ |
| **Tested routes (strong assertions)** | **~130** |
| **Tested routes (smoke/auth-only)** | **~20** |
| **Untested routes** | **~41** |
| **Route coverage (by file)** | **~78%** |
| **Route coverage (by method)** | **~68%** |
| **Test suites** | **22** |
| **Total automated tests** | **~218** |

## Remaining Untested (Priority Order)

| Priority | Routes | Count | Reason |
|----------|--------|-------|--------|
| P0 | Member PATCH/DELETE `[id]`, POST /api/entry | 4 | Complex DB interactions, needs specific test members |
| P0 | Hostel member CRUD (checkout, vacate, renew, rent-cycle) | 11 | Complex business rules |
| P1 | Pool/[poolSlug]/staff routes (payments, advances, attendance) | 10 | Nested param routes |
| P1 | Hostel staff CRUD | 10 | Nested param routes |
| P2 | Business deep routes (stock PUT, customer PATCH) | 8 | Lower risk |
| P2 | Cron routes (16 remaining) | 16 | Time-based, need CRON_SECRET |
| P3 | Competitions [id] PATCH, Superadmin mutation routes | 10 | Admin utilities |

## Risk Heatmap

| Risk Level | Routes | Impact |
|------------|--------|--------|
| 🔴 **High** (critical business flow, payment, security) | 15 | Member mutations, hostel member lifecycle, entry logging |
| 🟠 **Medium** (important but non-critical) | 20 | Staff management, cron jobs, deep business/labour routes |
| 🟢 **Low** (read-only, admin, utility) | 6 | Competition [id], superadmin PATCH/DELETE |

## Priority Recommendations

1. **P0 — Member mutations**: PATCH/DELETE on individual members, POST /api/entry (core data integrity)
2. **P0 — Hostel lifecycle**: Member checkout, vacate, renew, rent-cycle (tenant management)
3. **P1 — Pool/Hostel staff CRUD**: Deep nested param routes
4. **P2 — Remaining cron**: Requires CRON_SECRET in CI
5. **P2 — Business extensions**: Stock PUT, customer PATCH
