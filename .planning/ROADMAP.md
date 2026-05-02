

### Phase 1: Optimize Workforce Management (Labour) page for minimal data, high efficiency, and easy admin usage.

**Goal:** Make the page lightweight, fast, and focused on quick actions. Avoid clutter and unnecessary information.
**Requirements**:
- TOP SUMMARY: Keep only 4 cards (Total Staff, Present Today, Total Paid, Total Due).
- STAFF LIST: Simplify rows to Name, Salary, Present days, Earned, Paid, Due, and Status.
- QUICK ACTIONS: Add icon buttons for Mark Present, Mark Absent, and Pay Salary (no modals).
- EXPANDABLE DETAILS: Staff row click shows calendar and payment history (hidden by default).
- UI OPTIMIZATION: Use color indicators, compact layout, and reduced vertical space.
- PERFORMANCE: Load detailed data (calendar) only when expanded.
**Constraints**:
- Do not change backend logic unnecessarily.
- Maintain existing salary calculations.
- Focus on simplicity and speed.
**Depends on:** Phase 0
**Plans:** 1 plan

Plans:

- [x] [Plan 1: Optimize Workforce Management (Labour) page](file:///Users/manthanjaiswal/buisness/.planning/phases/01-optimize-workforce-management-labour-page-for-minimal-data-h/01-PLAN.md)

### Phase 2: Intelligent Workforce System

**Goal:** Transform the labour tool into an intelligent system with bulk actions and smart insights.
**Requirements**:
- SMART HIGHLIGHTS: Visual cues for high due amounts (Big Red) and low amounts.
- BULK ACTIONS: "Mark All Present" button and multi-select for "Pay Multiple".
- TODAY VIEW: A filtered view focusing only on today's attendance status and urgent payments.
- AUTO CALCULATION: Robust backend-sync for real-time salary and due updates.
**Depends on:** Phase 1
**Plans:** 0 plans

### Phase 3: Enhance Labour page with Last 3 Months Summary and improved readability

**Goal:** Provide clear historical insights (attendance + payment) with a UI that is easy to read, not congested, and comfortable for daily use by admin users (age 25–50).
**Requirements**:
- LAST 3 MONTHS SUMMARY: For each staff, display month-wise summary (Month | Present Days | Status) in expanded section. Status = CLEARED (paid >= earned) or DUE ₹amount.
- BACKEND API: Extend labour API to return last 3 months data grouped by month, filtered by staffId and businessId. Optimize query for performance.
- LAZY LOADING: Load last 3 months data only when row expands. Do not increase initial page load.
- ROW HEIGHT: Increase row height (min-height: 60–72px) with padding for better readability.
- SPACING: Add vertical spacing between rows. Avoid tight text grouping.
- SUMMARY DISPLAY: Show last 3 months in stacked rows (not inline cramped text) with clear separation between months.
- COLOR SYSTEM: CLEARED → green, DUE → red. Keep contrast strong and readable.
- TYPOGRAPHY: Slightly larger font for key numbers. Avoid very small text.
**Constraints**:
- Do not overcrowd UI. Maintain minimal design. Focus on clarity over compactness.
- Avoid dense layouts. Ensure spacing between elements.
- Make UI comfortable for non-technical users (age 25–50).
**Depends on:** Phase 1
**Plans:** 0 plans

Plans:
- [ ] TBD (run /gsd-plan-phase 3 to break down)

### Phase 4: Last 3 Months Summary and Readable UI Upgrade

**Goal:** [To be planned]
**Requirements**: TBD
**Depends on:** Phase 3
**Plans:** 0 plans

Plans:
- [ ] TBD (run /gsd-plan-phase 4 to break down)

### Phase 5: Fix Revenue Consistency — Centralized Analytics Service and MongoDB Aggregation Audit

**Goal:** Eliminate revenue inconsistencies between Dashboard and Analytics pages by creating a single source of truth for all financial calculations. Revenue = SUM(SALE + sent) ONLY. Proper calendar-based date filtering for monthly/yearly.
**Requirements**:
- CENTRALIZED SERVICE: Create /services/analyticsService.ts as the single source of truth for getRevenue, getExpenses, getProfit, getReceivables.
- REVENUE RULE: Revenue = SUM of BusinessTransaction where category=SALE AND transactionType=sent. NO payments, NO received-sales (those are expenses).
- DATE FILTERING: Use calendar boundaries (startOfMonth, startOfYear) not rolling windows. IST-aware for consistency.
- FIX DASHBOARD API: /api/business/analytics/route.ts must filter by transactionType=sent for revenue (currently counts ALL sales including received=purchases).
- FIX ANALYTICS API: /api/business/analytics/advanced/route.ts must use same centralized service.
- INDEXING: Add compound index on {businessId, category, transactionType, date} for aggregation performance.
- DEBUG LOGGING: Log date ranges, transaction counts, and final totals for traceability.
- EDGE CASES: Handle single-month data gracefully (monthly==yearly is valid).
**Constraints**:
- Do NOT change the BusinessTransaction schema or data model.
- Do NOT break existing cash flow calculation logic (that is correct).
- Maintain backward compatibility with frontend field names.
**Depends on:** None (critical fix, independent)
**Plans:** 1 plan

Plans:
- [x] Plan 1: Implement centralized analytics service and fix all revenue APIs

### Phase 6: Fix React duplicate API calls and over-fetching issues

**Goal:** [To be planned]
**Requirements**: TBD
**Depends on:** Phase 5
**Plans:** 0 plans

Plans:
- [ ] TBD (run /gsd-plan-phase 6 to break down)

### Phase 7: Multi-Domain Workforce Rebuild — Swimming Pool and Hostel Staff Management Systems

**Goal:** [To be planned]
**Requirements**: TBD
**Depends on:** Phase 6
**Plans:** 0 plans

Plans:
- [ ] TBD (run /gsd-plan-phase 7 to break down)
