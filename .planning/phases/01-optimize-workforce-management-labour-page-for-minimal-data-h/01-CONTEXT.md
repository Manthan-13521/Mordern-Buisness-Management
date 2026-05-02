# Phase 1: Optimize Workforce Management (Labour) page - Context

**Gathered:** 2026-04-23
**Status:** Ready for planning
**Source:** User Request

<domain>
## Phase Boundary

Refactor the Labour management page to be minimal, efficient, and lightweight. Focus on quick actions and reduced data clutter for daily admin use.

</domain>


<decisions>
## Implementation Decisions

### Top Summary
- Display exactly 4 cards: Total Staff, Present Today, Total Paid (current month), Total Due.
- No extra cards or information.

### Staff List Row
- Display only: Name, Salary/day, Present days, Earned, Paid, Due, Status.
- Compact layout, no extra text.

### Quick Actions (Attendance)
- Small icon buttons only:
  - Present: ✔
  - Absent: ❌
- No dropdowns or modals for attendance.

### Payment UX (Inline)
- Replace payment modal with an inline input and button within the expanded staff row or the row itself.
- Flow: [ ₹____ ] [Pay]. Faster and less code.

### Expandable Details
- Load additional details (history) only when row is expanded.
- Do not render heavy components like the full calendar by default.

### Code Structure
- Refactor into 3 essential components only:
  - `LabourSummary.tsx`
  - `LabourRow.tsx`
  - `AttendanceActions.tsx`
- Keep `page.tsx` extremely clean and small.

### Constraints
- Do not introduce complex architecture or over-engineering.
- Maintain existing salary logic.
- Focus on speed and simplicity.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Frontend Pages
- `app/business/[businessSlug]/admin/labour/page.tsx` — Target for refactoring.

</canonical_refs>

<specifics>
## Specific Ideas
- Inline payment: Use a small numeric input field next to a "Pay" button for immediate action.
- Status indicators: Use subtle color dots or text colors to keep the UI clean.

</specifics>

<deferred>
## Deferred Ideas
- None — all items covered in this phase.

</deferred>

---

*Phase: 01-optimize-workforce-management-labour-page-for-minimal-data-h*
*Context gathered: 2026-04-23*
