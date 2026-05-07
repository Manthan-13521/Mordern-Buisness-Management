# Phase 1: Optimize Workforce Management (Labour) page - UI Specification

## Visual Direction: Neo-Dark Premium
- **Theme**: Dark mode (#020617 background).
- **Cards**: Glassmorphism with subtle borders (#1f2937) and glow effects on hover.
- **Typography**: Inter (Sans-serif), font-weights 500 (medium), 600 (semibold), 800 (bold).

## Layout & Components


### 1. Top Summary Section
- **Content**: Exactly 4 cards (Total Staff, Present Today, Total Paid, Total Due).
- **Style**: Ultra-minimalist cards with color-coded values.

### 2. Staff List & Rows
- **Columns**: Name | ₹/day | Present | Earned | Paid | Due | Status.
- **Attendance Actions**: 
  - [✔] (Present) - Emerald
  - [❌] (Absent) - Rose
- **Payment Action (Inline)**:
  - Inside each row or expanded state: `[ ₹____ ] [Pay]`.
  - Input: Small, numeric-only, subtle border.
  - Button: "Pay" button, violet background.

### 3. Interaction & Transitions
- **Row Expansion**: Minimal height transition to show payment history or inline pay input.
- **Status**: Small colored dot next to status text (Paid, Partial, Due).

## Design Tokens
- `accent-violet`: #8b5cf6
- `accent-emerald`: #10b981
- `accent-rose`: #f43f5e
- `bg-input`: rgba(255,255,255,0.05)

---

*Phase: 01-optimize-workforce-management-labour-page-for-minimal-data-h*
*UI Spec created: 2026-04-23*
