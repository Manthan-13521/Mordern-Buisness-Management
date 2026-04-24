# Phase 7: Unified Workforce Engine — Context

**Gathered:** 2026-04-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Build a single unified workforce management engine with a `domain` discriminator (`LABOUR | POOL | HOSTEL`) that replaces 3 fragmented staff systems (BusinessLabour, Staff, HostelStaff). Same powerful Labour page — domain-aware, zero duplicated code. Scalable for future domains (Gym, School, Factory).

</domain>

<decisions>
## Implementation Decisions

### D-01: Attendance Mode Architecture
- **Single schema + strict mode-based API validation**
- `attendanceMode: "STATUS" | "SHIFT" | "TIME"`
- LABOUR → only STATUS allowed (`present | half_day | absent`)
- POOL → SHIFT mode (`shift: MORNING | EVENING` + `status: present | absent`)
- HOSTEL → STATUS mode (+ optional TIME mode later via `checkInTime/checkOutTime`)
- **API enforcement:** `if (domain === "LABOUR" && attendanceMode !== "STATUS") reject()`
- One collection, clean logic per domain, future-proof for QR/face scan

### D-02: Monthly Salary Proration
- **Formula:** `perDay = monthlySalary / workingDays; earned = presentDays * perDay + halfDays * 0.5 * perDay`
- **Working days = 26 (default)** — NOT calendar days. Real businesses don't pay Sundays.
- Make `workingDays` configurable per tenant later (default 26 in DOMAIN_CONFIG).
- **Absence rule:** Absence reduces salary. No attendance = no pay.

### D-03: Migration Strategy — Parallel + Gradual Cutover
- **Phase A:** Create new unified models (WorkforceStaff, WorkforceAttendance, WorkforcePayment) alongside old models. Keep old system untouched.
- **Phase B:** Data migration script — copy and normalize (dates → ISO, attendance → unified format).
- **Phase C:** Dual read period — feature flag `useNewSystem` switches between old/new APIs.
- **Phase D:** Switch UI — Labour/Pool/Hostel pages all point to new unified API.
- **Phase E:** Delete old models (only after verification).
- **RULE:** Migration must be reversible until final step.

### D-04: Domain Config & Payment Cycle — Hybrid Approach
- **Start with code:** `DOMAIN_CONFIG` object with defaults per domain.
- **Add to Staff schema:** `paymentCycle: "DAILY" | "WEEKLY" | "MONTHLY"` and `workingDays?: number`
- **DB customization later** — admin can override roles, salary types per tenant.
- No over-engineering now. Fast development, customization later.

### Agent's Discretion
- Component naming conventions within `/components/workforce/`
- Error handling patterns and toast messages
- Loading skeleton styles
- MongoDB index optimization

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing Labour System (Source of Truth)
- `models/BusinessLabour.ts` — Current staff schema (name, role, salary, businessId)
- `models/BusinessAttendance.ts` — Current attendance (present/half_day/absent, Date type)
- `models/BusinessLabourPayment.ts` — Current payment schema (labourId, amount)
- `models/BusinessLabourAdvance.ts` — Current advance tracking (month YYYY-MM, amount)
- `app/api/business/labour/route.ts` — Staff listing API with aggregation pipeline
- `app/api/business/attendance/route.ts` — Attendance upsert + 90-day cleanup
- `app/api/business/labour/[labourId]/payments/route.ts` — Payment recording
- `app/api/business/labour/[labourId]/summary/route.ts` — Last 3 months summary
- `app/api/business/labour/advance/route.ts` — Advance upsert

### Existing Pool Staff (To Be Unified)
- `models/Staff.ts` — Pool staff (poolId, NO salary field, roles: Trainer/Manager/Staff)
- `models/StaffAttendance.ts` — Pool attendance (clock_in/clock_out, qr/face_scan/manual)

### Existing Hostel Staff (To Be Unified)
- `models/HostelStaff.ts` — Hostel staff (hostelId, roles: Worker/Staff/Cook/Guard/Cleaner, salary, joiningDate, blockId)
- `models/HostelStaffAttendance.ts` — Hostel attendance (Present/Absent capitalized, date as String YYYY-MM-DD, checkIn/checkOutTime)

### Frontend Components (Reusable Base)
- `components/admin/labour/LabourRow.tsx` — Expandable staff card (416 lines, full feature set)
- `components/admin/labour/LabourSummary.tsx` — 4-card dashboard component
- `components/admin/labour/AttendanceActions.tsx` — Present/Absent toggle buttons
- `app/business/[businessSlug]/admin/labour/page.tsx` — Full page with search, stats, optimistic updates

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `LabourRow.tsx` — Complete expandable card with pay, attendance, advance, 3-month summary. Refactor into domain-aware `StaffCard.tsx`.
- `LabourSummary.tsx` — 4-card dashboard. Make labels dynamic via domain config.
- `AttendanceActions.tsx` — Present/Absent buttons. Extend with shift toggle for POOL domain.
- `useBusinessLabour` hook — React Query data fetching. Generalize to `useWorkforceStaff(domain)`.
- `useLabourSummary` hook — Lazy 3-month summary loading. Generalize to `useWorkforceSummary(staffId)`.

### Established Patterns
- MongoDB aggregation with $lookup for joining staff + attendance + payments + advances
- Optimistic UI updates with rollback on failure
- React Query for data fetching with cache invalidation
- Tenant isolation via `requireBusinessId(user)` — generalize to `requireTenantId(user, domain)`

### Integration Points
- New routes: `/api/workforce/*` (unified API)
- New page routes: Pool admin and Hostel admin staff pages
- DOMAIN_CONFIG drives UI theming (accent colors, labels, role dropdowns)

</code_context>

<specifics>
## Specific Ideas

- **Salary formula (locked):** `earned = presentDays * (monthlySalary / 26) + halfDays * 0.5 * (monthlySalary / 26)` for MONTHLY; `earned = presentDays * dailyRate + halfDays * 0.5 * dailyRate` for DAILY
- **Domain themes:** LABOUR = purple (#8b5cf6), POOL = cyan (#06b6d4), HOSTEL = slate (#64748b)
- **Adding new domain (future):** Only requires new entry in DOMAIN_CONFIG + new page route. Zero new models/APIs.

</specifics>

<deferred>
## Deferred Ideas

- QR/Face scan attendance method (future — TIME mode already supports it)
- Admin-customizable roles per tenant (future — DB-based config override)
- Automated salary generation / payslip (future phase)
- Weekly payment cycle support (schema-ready, UI later)
- Session tracking for pool trainers (future — schema extensible)

</deferred>

---

*Phase: 07-multi-domain-workforce-rebuild-swimming-pool-and-hostel-staf*
*Context gathered: 2026-04-24*
