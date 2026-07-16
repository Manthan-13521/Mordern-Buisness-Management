# API_ANALYSIS.md

## Overview

**Total API routes:** 191 route handlers across 41 route groups

## Route Groups

| Group | Count | Auth | Rate Limited | Public |
|-------|-------|------|-------------|--------|
| admin/ | 2 | ✅ | ✅ | ❌ |
| ads/ | 2 | ✅ | ✅ | ❌ |
| analytics/ | 8 | ✅ | ✅ | ❌ |
| app-init/ | 1 | ✅ | ✅ | ❌ |
| auth/ | 3 | ❌ | ✅ | ✅ |
| backups/ | 2 | ✅ | ✅ | ❌ |
| business/ | 15 | ✅ | ✅ | ❌ |
| competitions/ | 2 | ✅ | ✅ | ❌ |
| contact/ | 1 | ❌ | ✅ | ✅ |
| cron/ | 21 | CRON_SECRET | ❌ | ✅ (restricted) |
| csp-report/ | 1 | ❌ | ❌ | ✅ |
| dashboard/ | 1 | ✅ | ✅ | ❌ |
| demo/ | 1 | ❌ | ✅ | ✅ |
| entertainment-members/ | 1 | ✅ | ✅ | ❌ |
| entry/ | 1 | ✅ | ✅ | ❌ |
| export/ | 1 | ✅ (middleware) | ✅ | ❌ |
| feedback/ | 1 | ✅ | ✅ | ❌ |
| health/ | 4 | ❌ | ❌ | ✅ |
| hostel/ | 35 | ✅ | ✅ | ❌ |
| jobs/ | 2 | CRON_SECRET | ❌ | ❌ |
| member/ | 1 | ✅ | ✅ | ❌ |
| members/ | 10 | ✅ | ✅ | ❌ |
| metrics/ | 3 | ❌ | ❌ | ✅ |
| notifications/ | 3 | ✅ | ✅ | ❌ |
| occupancy/ | 1 | ✅ | ✅ | ❌ |
| payments/ | 2 | ✅ | ✅ | ❌ |
| plans/ | 2 | ✅ | ✅ | ❌ |
| pool/ | 8 | ✅ | ✅ | ❌ |
| pools/ | 1 | ✅ | ✅ | ❌ |
| quotas/ | 1 | ✅ | ✅ | ❌ |
| razorpay/ | 3 | ❌ (webhook) | ✅ | ✅ |
| referral/ | 1 | ✅ | ✅ | ❌ |
| seed/ | 1 | SEED_SECRET | ❌ | ❌ (dev only) |
| settings/ | 6 | ✅ | ✅ | ❌ |
| staff/ | 2 | ✅ | ✅ | ❌ |
| subscription/ | 4 | ✅ | ✅ | ❌ |
| super-admin/ | 3 | ✅ | ✅ | ❌ |
| superadmin/ | 14 | ✅ | ✅ | ❌ |
| twilio/ | 3 | ✅ | ✅ | ❌ |
| warmup/ | 1 | ❌ | ❌ | ✅ |
| workers/ | 4 | QStash verify | ❌ | ❌ (internal) |

## Public Endpoints (No Auth Required)

| Route | Purpose | Risk Level |
|-------|---------|------------|
| /api/health | Health checks | LOW |
| /api/health/live | Liveness | LOW |
| /api/health/ready | Readiness | LOW |
| /api/health/sentry-test | Sentry test | LOW |
| /api/metrics | Prometheus metrics | LOW |
| /api/metrics/health | Health metrics | LOW |
| /api/metrics/payment | Payment metrics | LOW |
| /api/warmup | Cache warming | LOW |
| /api/csp-report | CSP violation collector | LOW |
| /api/contact | Contact form | LOW |
| /api/demo | Demo requests | LOW |
| /api/auth/* | Auth callbacks | LOW (required) |

## Routes Without Internal Auth Check (Middleware Only)

| Route | Auth Source | Risk |
|-------|-------------|------|
| export/ | Middleware proxy.ts | LOW — middleware blocks |
| app-init/ | resolveUser() | LOW |
| business/register/ | resolveUser() | LOW |
| hostel/register/ | resolveUser() | LOW |
| pool/register/ | resolveUser() | LOW |

## Aggregation-Heavy Endpoints (Performance Risk)

| Route | Aggregations | Lookups | Risk |
|-------|-------------|---------|------|
| /api/payments/export | 4x $lookup | Member, Plan, Subscription, EntryLog | HIGH |
| /api/hostel/staff | 3x $lookup | Multiple collections | HIGH |
| /api/hostel/dashboard | 6x aggregate | Rooms, Members, Payments | HIGH |
| /api/business/customers | 2x $lookup | Transactions | MEDIUM |
| /api/members/ | 1x $lookup | Plans | MEDIUM |
| /api/occupancy/ | 2x aggregate | PoolSession, EntryLog | LOW |

## Tenant Isolation Verification

| Check | Implementation | Status |
|-------|---------------|--------|
| Query scoping | `getTenantFilter()` applied in every route | ✅ PASS |
| Cross-tenant prevention | `enforceFilterScoping()` in critical routes | ✅ PASS |
| Secure CRUD | `secureFindById/Update/Delete` wrappers | ✅ PASS |
| Audit logging | Cross-tenant attempts logged | ✅ PASS |

NOT VERIFIED: Response times, throughput, actual rate limit hits (requires production deployment)
