### Phase 3: Last 3 Months Summary + Readable UI Upgrade

GOAL:
Add a simple, readable "Last 3 Months Summary" for each staff and improve UI spacing for better usability (age 25–50).

---

## WAVE 1: BACKEND (FOUNDATION)

[1.1] Extend Labour API

* Update API to return last 3 months data per staff
* Group data by month

For each month return:
{
month: "Jan",
presentDays: number,
earned: number,
paid: number,
status: "CLEARED" | "DUE",
dueAmount: number
}

LOGIC:

* presentDays = count of "present"
* earned = presentDays × salaryPerDay
* paid = sum of payments in that month
* if paid >= earned → CLEARED
* else → DUE

---

## WAVE 2: FRONTEND (DISPLAY)

[2.1] Update LabourRow (Expandable Section)

* Add section: "Last 3 Months"
* Show data in vertical stacked format (NOT inline)

Layout:

Jan    20 days    CLEARED
Feb    17 days    CLEARED
Mar    23 days    DUE ₹200

* Use clean spacing between rows
* Do not use cards or heavy UI

---

## WAVE 3: LAZY LOADING

[3.1] Load on Expand

* Do NOT fetch this data on initial page load
* Fetch only when a staff row is expanded

Example:
if (expandedRow === staffId) → fetch summary

---

## WAVE 4: UI READABILITY IMPROVEMENTS

[4.1] Row Height

* Set min-height: 64px–72px
* Add vertical padding

[4.2] Spacing

* Add spacing between rows (margin or gap)
* Avoid tight grouping of text

[4.3] Typography

* Increase font size slightly for numbers
* Keep labels readable (no tiny fonts)

[4.4] Color System

* CLEARED → green
* DUE → red
* Ensure strong contrast (dark theme compatible)

---

## WAVE 5: VALIDATION

* Check calculations match backend data
* Verify lazy loading works correctly
* Ensure UI is not congested
* Test readability (scan test: info visible in <2 seconds)

---

## CONSTRAINTS

* Do not introduce heavy components
* Do not increase initial page load time
* Keep UI minimal and clean
* Optimize for real admin usage (not developer view)

---

## FINAL TASK

Implement last 3 months summary with lazy loading and improved spacing, ensuring a clean, readable, and efficient admin experience.
