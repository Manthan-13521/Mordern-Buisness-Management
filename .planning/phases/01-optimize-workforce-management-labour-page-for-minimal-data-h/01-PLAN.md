# Phase 1: Optimize Workforce Management (Labour) page - Plan

## Goal
Refactor the Labour management page to be minimal, fast, and efficient for daily admin use, avoiding over-engineering.

## Summary of Changes
1. **Minimal Component Strategy**: Create only 3 essential components (`LabourSummary`, `LabourRow`, `AttendanceActions`).
2. **UI Simplification**: 4-card summary and ultra-compact staff list rows.
3. **Inline Payment UX**: Replace modals with inline payment inputs `[ ₹____ ] [Pay]`.
4. **Logic Consolidation**: Keep orchestration simple in `page.tsx`.

## Wave 1: Essential Components (Parallel)
### [1.1] Create `LabourSummary.tsx`
- Implement 4 cards ONLY: Total Staff, Present Today, Total Paid, Total Due.
- acceptance_criteria: `LabourSummary.tsx` exists and renders 4 cards.

### [1.2] Create `AttendanceActions.tsx`
- Implement simple icon buttons: ✔ (Present) and ❌ (Absent).
- acceptance_criteria: `AttendanceActions.tsx` exists and handles click callbacks.

### [1.3] Create `LabourRow.tsx`
- Implement compact row: Name, Salary, Present, Earned, Paid, Due, Status.
- Include `AttendanceActions` and inline payment input.
- acceptance_criteria: `LabourRow.tsx` exists and displays all 7 columns.

## Wave 2: Orchestration & Refactor (Sequential)
### [2.1] Update Main Page
- Replace monolithic content in `app/business/[businessSlug]/admin/labour/page.tsx` with the 3 new components.
- Implement simple `expandedRow` state to load details on demand.
- Remove old `MiniCalendar`, `PaymentModal`, and `AddModal` logic if not needed for the core flow (keep "Hire Staff" but simplify).

### [2.2] Implement Inline Payment Logic
- Add state and handler for the inline payment input in `LabourRow`.
- Ensure it hits the existing payment API correctly.

## Verification Criteria
- [ ] Summary shows exactly 4 cards.
- [ ] Staff rows are compact and show exactly Name, Salary, Present, Earned, Paid, Due, Status.
- [ ] Attendance marked via icons (✔/❌) without modals.
- [ ] Payments recorded via inline input + Pay button.
- [ ] `page.tsx` is clean and significantly reduced in size.

---

*Phase: 01-optimize-workforce-management-labour-page-for-minimal-data-h*
*Plan updated: 2026-04-23*
