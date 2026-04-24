# Multi-Business Management System (Workforce + Operations)

A production-ready Next.js application designed to manage multiple business types using a consistent and scalable interface.

Currently supports:
1. Business Workforce Management (Labour)
2. Swimming Pool Staff Management
3. Hostel Staff Management

--------------------------------------------------

## CORE CONCEPT

One unified experience across different businesses.

Each module uses the SAME UI/UX structure:
- Clean dark theme
- Compact staff management layout
- Inline actions for speed
- Expandable detailed views

Users feel like they are using the same system, adapted to different business needs.

--------------------------------------------------

## MODULES

### 1. Business Workforce (Labour)
- Daily wage staff management
- Attendance tracking (Present / Half Day / Absent)
- Earnings calculation based on days worked
- Advance tracking
- Payment management
- Due / Paid status system

---

### 2. Swimming Pool Staff
- Staff types: Trainer, Lifeguard, Cleaner
- Monthly or session-based salary
- Same attendance and payment workflow
- Designed for pool operations without changing UI

---

### 3. Hostel Staff
- Staff types: Warden, Cook, Security, Cleaner
- Monthly salary system
- Daily attendance tracking
- Same payroll and due tracking system

--------------------------------------------------

## KEY FEATURES

### Workforce Dashboard
- Total Staff
- Present Today
- Total Paid
- Total Due

---

### Staff Management UI
- Compact row-based layout
- Columns:
  Name | Rate | Present | Earned | Paid | Due | Status

---

### Attendance System
- One-click actions:
  ✔ Present
  ✖ Absent
- Real-time updates

---

### Earnings Calculation
- Daily / Monthly based logic
- Automatic due calculation

---

### Payment System
- Inline payment entry
- No popup complexity
- Instant updates to due status

---

### Advance Tracking
- Track advance amounts
- Integrated with salary calculation

---

### Expandable Staff View
- Mark attendance
- Add payments
- View last 3 months summary

---

### Last 3 Months Summary
- Month-wise breakdown:
  Days | Earned | Paid | Status

---

### Search & Filtering
- Search staff instantly
- Fast UI response

--------------------------------------------------

## UI/UX PRINCIPLES

- Same design across all business modules
- No learning curve between pages
- Minimal clicks, maximum speed
- Clean and non-congested interface
- No unnecessary modals

--------------------------------------------------

## TECH STACK

- Next.js (App Router)
- MongoDB
- Tailwind CSS
- TypeScript

--------------------------------------------------

## SYSTEM DESIGN APPROACH

- Reuse same UI for multiple domains
- Only change:
  - Labels
  - Roles
  - API endpoints
- No unnecessary complexity
- Fast and maintainable

--------------------------------------------------

## FUTURE EXTENSIBILITY

The system can easily expand to:
- Gym Management
- School Staff
- Factory Workforce

Without redesigning the UI.

--------------------------------------------------

## GOAL

Build a fast, simple, and scalable business management tool where:

"Same system works for multiple businesses with minimal changes."
