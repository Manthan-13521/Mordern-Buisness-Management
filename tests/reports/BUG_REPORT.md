# Bug Report — AquaSync Enterprise Validation

**Date:** 2026-07-14
**Phase:** API Validation (Final Sweep Coverage)

---

## CRITICAL

### BUG-001: ObjectId Validation Missing — 500 instead of 400

**Severity:** Critical
**Affected Routes:**
- `POST /api/hostel/[hostelSlug]/staff/advance` — `staffId` field in body
- `POST /api/hostel/[hostelSlug]/staff/[staffId]/payments` — `staffId` URL param
- `GET /api/hostel/[hostelSlug]/staff/[staffId]/summary` — `staffId` URL param
- `GET /api/business/labour/[id]/summary` — `id` URL param
- `GET /api/business/labour/[id]/payments` — `id` URL param

**Description:** When a non-ObjectId string is passed as a resource identifier, the API attempts to cast it directly to `mongoose.Types.ObjectId` without validation. This throws an unhandled `CastError` that results in a 500 response.

**Steps to Reproduce:**
```bash
curl -X POST http://localhost:3000/api/hostel/test-hostel/staff/advance \
  -H "Content-Type: application/json" \
  -b "<session>" \
  -d '{"staffId":"ST001","month":"2026-07","amount":2000}'
```

**Expected:** 400 Bad Request — "Invalid staffId format"
**Actual:** 500 Internal Server Error — `Cast to ObjectId failed for value "ST001"`

**Evidence:**
```
{"error":"Cast to ObjectId failed for value \"ST001\" (type string) at path \"staffId\" for model \"HostelStaffAdvance\""}
```

**Root Cause:** Application does not validate MongoDB ObjectId format before using it in database queries. Mongoose's auto-cast throws an unhandled error.

**Recommended Fix:** Add middleware or validation to check `mongoose.Types.ObjectId.isValid(id)` before database operations. Return 400 with a descriptive error message for invalid IDs.

---

## HIGH

### BUG-002: Empty Route File — super-admin/pools/[id]

**Severity:** High
**Affected Route:** `GET /api/super-admin/pools/[id]/subscription`

**Description:** The route file at `app/api/super-admin/pools/[id]/route.ts` exists but is empty (0 lines). No handlers are exported, causing Next.js to return 405 Method Not Allowed for all HTTP methods.

**Expected:** 200 (subscription data) or 404 (not found)
**Actual:** 405 Method Not Allowed

**Root Cause:** Route file was created (directory structure exists) but handler implementation was never written.

**Recommended Fix:** Implement the route handler or remove the empty file.

---

### BUG-003: Missing GET Handler — superadmin/ads/[id]

**Severity:** High
**Affected Route:** `GET /api/superadmin/ads/[id]`

**Description:** The ads detail route only exports `PUT` and `DELETE` handlers. `GET` is not supported, causing a 405 response when trying to fetch a single ad by ID.

**Root Cause:** The route was implemented for update/delete but not for retrieval.

**Recommended Fix:** Add `export async function GET()` handler to retrieve a single ad by ID.

---

### BUG-004: Missing GET Handler — hostel/payments/[id]

**Severity:** High
**Affected Route:** `GET /api/hostel/payments/[id]`

**Description:** The hostel payment detail route only exports `PUT` and `DELETE` handlers. `GET` is not supported, causing a 405 response when trying to fetch a single payment by ID.

**Root Cause:** Route was implemented for update/delete but not for retrieval.

**Recommended Fix:** Add `export async function GET()` handler to retrieve a single hostel payment by ID.

---

## Summary

| ID | Severity | Type | Route | Status |
|---|---|---|---|---|
| BUG-001 | Critical | Missing input validation | 6 hostel/business staff routes | Unhandled 500 |
| BUG-002 | High | Missing implementation | super-admin/pools/[id] | Empty route file |
| BUG-003 | High | Missing GET handler | superadmin/ads/[id] | 405 |
| BUG-004 | High | Missing GET handler | hostel/payments/[id] | 405 |
