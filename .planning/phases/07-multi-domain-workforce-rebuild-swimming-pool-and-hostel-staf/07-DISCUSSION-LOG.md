# Phase 7: Unified Workforce Engine - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-24
**Phase:** 07-multi-domain-workforce-rebuild-swimming-pool-and-hostel-staf
**Areas discussed:** Attendance Mode Architecture, Monthly Salary Proration, Migration Strategy, Domain Config & Payment Cycle

---

## Attendance Mode Architecture

| Option | Description | Selected |
|--------|-------------|----------|
| Separate models per domain | 3 attendance models (current state) | |
| Single schema, no validation | One model with all fields optional | |
| Single schema + mode-based API validation | attendanceMode field, API enforces valid combinations | ✓ |

**User's choice:** Single schema + strict mode-based validation at API level
**Notes:** User flagged this as ISSUE 1 — mixing STATUS/TIME/SHIFT is dangerous without enforcement. Mode determines which fields are valid. LABOUR=STATUS only, POOL=SHIFT, HOSTEL=STATUS+optional TIME.

---

## Monthly Salary Proration

| Option | Description | Selected |
|--------|-------------|----------|
| Return full monthly rate | `return staff.rate` (simple but wrong) | |
| Prorate by calendar days | `rate / daysInMonth * presentDays` | |
| Prorate by working days (26) | `rate / 26 * presentDays + halfDays * 0.5 * (rate/26)` | ✓ |

**User's choice:** Prorated by 26 working days (standard payroll). Make configurable later.
**Notes:** User flagged as ISSUE 2. Real businesses don't pay Sundays. Absence = no pay. workingDays=26 is default, configurable per tenant later.

---

## Migration Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Big bang replace | Delete old models, create new ones | |
| In-place schema migration | Modify existing models in place | |
| Parallel + gradual cutover | New models alongside old, dual read, then switch | ✓ |

**User's choice:** Parallel + Gradual Cutover (5-phase: Create → Migrate → Dual Read → Switch UI → Delete Old)
**Notes:** Migration MUST be reversible until final step. Feature flag `useNewSystem` for dual-read period.

---

## Domain Config & Payment Cycle

| Option | Description | Selected |
|--------|-------------|----------|
| Hard-coded config only | DOMAIN_CONFIG object in code | |
| Database-only config | Admin editable in DB | |
| Hybrid (code defaults + DB override later) | Start code, add DB customization later | ✓ |

**User's choice:** Hybrid — DOMAIN_CONFIG in code now, DB override later.
**Notes:** Add `paymentCycle` and `workingDays` to staff schema. No over-engineering. Fast development now, customization later.

---

## Agent's Discretion

- Component naming within `/components/workforce/`
- Error handling patterns and toast messages
- Loading skeleton styles
- MongoDB index optimization

## Deferred Ideas

- QR/Face scan attendance (TIME mode already supports it)
- Admin-customizable roles per tenant (DB config override)
- Automated salary/payslip generation
- Weekly payment cycle UI
- Pool trainer session tracking
