# STATIC_ANALYSIS_REPORT.md

## Lint Results

**Status: FAILED** — `npm run lint` fails because the `next lint` command has a misconfigured directory path:
```
Invalid project directory provided, no such directory: /Users/manthanjaiswal/AquaSync/lint
```
The `package.json` script `"lint": "next lint"` should work from the project root but the eslint config references `@eslint/eslintrc` which is missing.

## TypeScript Errors

**Status: 4 errors** (all in test/script files, zero in production code)

```
scripts/db-explain-audit.ts(40) — Expression not callable (union type incompatibility)
tests/scripts/explain-audit.ts(39) — Property 'executionStats' does not exist
tests/scripts/explain-audit.ts(41) — Property 'executionStats' does not exist on 'never'
tests/scripts/explain-audit.ts(41) — Property 'queryPlanner' does not exist on 'never'
```

**NOTABLE: Zero TypeScript errors in production code (lib/, app/api/, models/, services/, middlewares/)**

## npm Audit — 23 Vulnerabilities

| Severity | Count | Details |
|----------|-------|---------|
| **High** | 6 | tmp path traversal, qs prototype pollution |
| **Moderate** | 15 | uuid buffer bounds, various |
| **Low** | 2 | Minor issues |

**Critical: tmp@0.2.6** — Path Traversal via unsanitized prefix/postfix that enables directory escape (GHSA-ph9p-34f9-6g65)

## npm Outdated — 40 Packages Behind

| Package | Current | Latest | Gap |
|---------|---------|--------|-----|
| mongoose | 9.2.4 | 9.7.4 | +5 minor |
| next | 16.2.1 | 16.2.10 | +9 patch |
| @sentry/nextjs | 10.47.0 | 10.65.0 | +18 minor |
| twilio | 5.12.2 | 6.0.2 | +1 major |
| nodemailer | 7.0.13 | 9.0.3 | +2 major |
| opossum | 8.5.0 | 5.0.1 | MAJOR DOWNGRADE avail |
| tailwindcss | 4.2.1 | 4.3.2 | +1 minor |
| eslint | 9.39.4 | 10.7.0 | +1 major |
| typescript | 5.9.3 | 7.0.2 | +2 major |

## Unused Dependencies (depcheck)

**Unused production deps:** @vladmandic/face-api, axios, pino-pretty, tailwind-merge, uuid
**Unused dev deps:** @tailwindcss/postcss, @types/node-cron, @types/react-dom, @types/uuid, @types/validator, eslint, eslint-config-next, eslint-plugin-react-hooks, tailwindcss

**Missing deps:** @eslint/eslintrc (eslint.config.mjs), @aws-sdk/s3-request-presigner (lib/s3Presign.ts), nanoid (app/api/super-admin/pools/route.ts)

## Code Quality Metrics

| Pattern | Count | Notes |
|---------|-------|-------|
| **TODO** | 2 | Low |
| **FIXME** | 0 | Good |
| **XXX** | 10 | Moderate concern |
| **HACK** | 0 | Good |
| **@ts-ignore** | 3 | Low |
| **@ts-expect-error** | 0 | Good |
| **console.log/warn/error** | 923 | High — needs cleanup |
| **eslint-disable** | 1 | Low |
| **`as any` casts** | 293 | High — type safety concern |

## Largest Files

| File | Lines |
|------|-------|
| app/business/.../customer/page.tsx | 1,110 |
| app/business/.../invoice/page.tsx | 1,019 |
| app/superadmin/ads/page.tsx | 856 |
| app/hostel/.../members/page.tsx | 711 |
| app/select-plan/page.tsx | 698 |
| services/analyticsService.ts | 536 |
| app/api/members/route.ts | 531 |
| lib/auth.ts | 487 |
| components/members/MembershipCardPreview.tsx | 474 |
| lib/notificationEngine.ts | 401 |

## Largest Functions per File

| File | Function Count |
|------|----------------|
| lib/local-db/members.repo.ts | 12 |
| tests/comprehensive-functional-test.ts | 11 |
| services/thermalPrint.service.ts | 9 |
| services/analyticsService.ts | 9 |
| hooks/useAnalytics.ts | 9 |
| lib/notificationEngine.ts | 8 |
| lib/tenant.ts | 7 |
| lib/services/businessProfileService.ts | 7 |

NOT VERIFIED: Runtime circular dependencies (require tooling unavailable)
