# Phase 1: Optimize Workforce Management (Labour) page - Research

## Current State Analysis

### Frontend: `app/business/[businessSlug]/admin/labour/page.tsx`
- **Size**: 820 lines, monolithic client component.
- **Styling**: Extensive use of inline styles (`S` object and inline `style` props).
- **Data Fetching**: Fetches all labour records with full `recentAttendance` and `payments` history in one go.
- **State Management**: Uses multiple `useState` hooks for modals, search, loading, and expanded rows.
- **Components**: Includes `MiniCalendar` and large inline render blocks for staff rows.

### Backend: `api/business/labour/route.ts`
- **GET**: Uses MongoDB aggregation with `$lookup` to join `businessattendances` and `businesslabourpayments`.
- **Performance**: Joins entire collections without limits, which will slow down as data grows.

## Proposed Optimization Strategy

### 1. UI Simplification (Per User Requirements)
- **Top Summary**: Refactor to show only:
  - Total Staff
  - Present Today
  - Total Paid (current month)
  - Total Due
- **Staff List**:
  - Simplify row layout to columns: Name, Salary, Present days, Earned, Paid, Due, Status.
  - Use status color indicators (Green/Yellow/Red) for the "Status" column.
- **Quick Actions**:
  - Replace large buttons with small icon buttons (e.g., Check for Present, X for Absent, Wallet/Rupee for Pay).
  - Ensure actions are inline (no modals for attendance).

### 2. Performance & Data Optimization
- **Lazy Loading Details**:
  - The "Expandable Details" (calendar, history) should only be rendered when a row is expanded.
  - To truly "avoid loading full calendar for all users", we should ideally stop fetching full history in the main list.
  - **Proposed Change**: Limit the initial `GET` to only return what's needed for the list (e.g., current month's attendance summary).
  - **Alternative (Safe)**: If backend changes are risky, at least prevent the frontend from rendering the `MiniCalendar` components for all staff hidden in the background.

### 3. Code Refactoring
- Break down the monolithic `page.tsx` into smaller, reusable components:
  - `LabourSummary.tsx`
  - `LabourList.tsx`
  - `LabourRow.tsx`
  - `AttendanceActions.tsx`
  - `StaffDetails.tsx` (Expandable part)
- Move inline styles to a dedicated CSS file or use a more structured approach (though user prefers Vanilla CSS, I'll keep it clean).

## Technical Implementation Details

### Salary Calculations
- **Earned**: `(present_days * salary) + (half_days * 0.5 * salary)`.
- **Due**: `Lifetime_Earned - Lifetime_Paid`.
- **Note**: To maintain these without backend changes, we still need the aggregate data. I will focus on UI performance first.

### Quick Actions Logic
- **Mark Present/Absent**: Use `quickAttendance` function with appropriate status.
- **Pay Salary**: Keep the `showPaymentModal` but trigger it from a small icon button.

## Risk Assessment
- **Calculations**: Must ensure refactored logic matches existing `getStats` function exactly.
- **Backend**: Avoid touching `api/business/labour` unless performance is critical, as per constraints.

## Success Criteria
- Page load time improved (less DOM elements initially).
- UI is significantly cleaner and more compact.
- Admin can mark attendance with a single click from the list.
- Summary cards match the requested 4.
