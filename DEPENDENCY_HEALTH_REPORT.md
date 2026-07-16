# DEPENDENCY_HEALTH_REPORT.md

## Package Summary

| Category | Count |
|----------|-------|
| **Production dependencies** | 47 |
| **Dev dependencies** | 18 |
| **Total** | 65 |

## Vulnerability Report (npm audit)

| Severity | Count | Notable |
|----------|-------|---------|
| **CRITICAL** | 0 | — |
| **HIGH** | 6 | tmp path traversal (GHSA-ph9p-34f9-6g65) |
| **MODERATE** | 15 | uuid buffer bounds (GHSA-w5hq-g745-h8pq) |
| **LOW** | 2 | Minor issues |
| **Total** | **23** | |

### High-Severity Details

| Package | Version | Issue | Fix Available |
|---------|---------|-------|---------------|
| tmp | <0.2.6 | Path Traversal via unsanitized prefix/postfix (directory escape) | `npm audit fix` |
| qs | various | Prototype pollution (transitive) | Update affected |

## Outdated Packages

| Package | Current | Latest | Age | Type |
|---------|---------|--------|-----|------|
| mongoose | 9.2.4 | 9.7.4 | +5 minor | **prod** |
| next | 16.2.1 | 16.2.10 | +9 patch | **prod** |
| @sentry/nextjs | 10.47.0 | 10.65.0 | +18 minor | **prod** |
| twilio | 5.12.2 | 6.0.2 | **+1 major** | **prod** |
| nodemailer | 7.0.13 | 9.0.3 | **+2 major** | **prod** |
| tailwindcss | 4.2.1 | 4.3.2 | +1 minor | dev |
| eslint | 9.39.4 | 10.7.0 | **+1 major** | dev |
| typescript | 5.9.3 | 7.0.2 | **+2 major** | dev |
| react-dom | 19.2.3 | 19.2.7 | +4 patch | **prod** |
| react | 19.2.3 | 19.2.7 | +4 patch | **prod** |
| mongoose | 9.2.4 | 9.7.4 | +5 minor | **prod** |
| axios | 1.15.0 | 1.18.1 | +3 minor | **prod** |
| cloudinary | 2.9.0 | 2.10.0 | +1 minor | **prod** |
| @tanstack/react-query | 5.94.5 | 5.101.2 | +7 minor | **prod** |
| zod | 4.3.6 | 4.4.3 | +1 minor | **prod** |
| framer-motion | 12.38.0 | 12.42.2 | +4 minor | **prod** |
| @upstash/redis | 1.37.0 | 1.38.0 | +1 minor | **prod** |
| @upstash/qstash | 2.10.1 | 2.11.2 | +1 minor | **prod** |
| uuid | 14.0.0 | 14.0.1 | +1 patch | **prod** |

**Total outdated: 40 packages (5 major versions behind)**

## Unused Dependencies

### Unused Production
| Package | Suggested Action |
|---------|-----------------|
| @vladmandic/face-api | Remove (face detection not actively used) |
| axios | Remove (fetch-based API client used instead) |
| pino-pretty | Move to devDependencies |
| tailwind-merge | Remove (clsx used elsewhere) |
| uuid | Remove (crypto.randomUUID() available in Node 25) |

### Unused Dev
| Package | Suggested Action |
|---------|-----------------|
| @tailwindcss/postcss | Check if needed (Tailwind v4 uses CSS config) |
| @types/node-cron | Remove |
| @types/react-dom | Remove (types included with react-dom) |
| @types/uuid | Remove (uuid unused) |
| @types/validator | Remove |
| eslint, eslint-config-next, eslint-plugin-react-hooks | Remove (flat config uses @eslint/eslintrc) |
| tailwindcss | Remove (Tailwind v4 uses @tailwindcss/postcss) |

## Missing Dependencies

| Package | Required By | Impact |
|---------|-------------|--------|
| @eslint/eslintrc | `eslint.config.mjs` | **Lint broken** |
| @aws-sdk/s3-request-presigner | `lib/s3Presign.ts` | **Runtime error** on presigned URL path |
| nanoid | `app/api/super-admin/pools/route.ts` | **Runtime error** on superadmin operations |

## License Risks

All direct dependencies use permissive licenses (MIT, Apache-2.0, ISC). No GPL/AGPL dependencies found.

## Bundle Impact

| Package | Estimated Size | Impact |
|---------|---------------|--------|
| framer-motion | ~150KB gzip | HIGH — on every admin page |
| recharts | ~100KB gzip | HIGH — analytics pages only |
| lucide-react | ~50KB gzip (tree-shaken) | MEDIUM |
| @vladmandic/face-api | ~3MB (ML models) | **HIGH — unused** |
| exceljs | ~500KB | MEDIUM — export routes only |
| pdf-lib | ~200KB | LOW — job workers only |

## Recommendations

1. **HIGH:** Add missing `@eslint/eslintrc` (lint broken)
2. **HIGH:** Add missing `@aws-sdk/s3-request-presigner` (runtime error possible)
3. **HIGH:** Add missing `nanoid` or switch to `crypto.randomUUID()`
4. **MEDIUM:** Run `npm audit fix` for high-severity vulns
5. **MEDIUM:** Remove @vladmandic/face-api (~3MB unused ML model bundle)
6. **MEDIUM:** Review major version upgrades for twilio, nodemailer, eslint, typescript
7. **LOW:** Clean up unused dependencies (depcheck output)
8. **LOW:** Regular dependency update cadence (monthly npm update)
