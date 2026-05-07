# AquaSync SaaS — All-in-One Business Management

A production-ready SaaS platform for managing Swimming Pools, Hostels, and Workforce. Built with **Next.js 15**, **React 19**, **MongoDB**, and **TypeScript**.

## 🚀 Key Modules

- **🏊 Swimming Pool Management**: Complete membership lifecycle, plan creation, QR-based attendance tracking, and revenue analytics.
- **🏠 Hostel Management**: Room & block allocation, rent cycles, member billing, and vacancy tracking.
- **💼 Workforce & Business**: Staff attendance, payroll management, advance tracking, and performance analytics.
- **📊 Unified Dashboard**: Consolidated metrics for income, active members, and system health.

## ✨ Premium Features

- **🛡️ Secure Auth**: NextAuth.js with role-based access control (SuperAdmin, Admin, Operator).
- **📱 Smart Entry**: QR Code generation for members and integrated camera scanner for validation.
- **💬 Automation**: Automated WhatsApp reminders via Twilio for overdue payments and expiry alerts.
- **💳 Payment Integration**: Support for Cash, UPI, and Razorpay online payments.
- **📄 Digital Receipts**: Automated PDF generation and Thermal Receipt printing for instant billing.
- **📷 Photo Capture**: Integrated webcam capture for member registration.
- **🌓 Modern UI**: Neo-dark 3D glass aesthetics with full dark/light mode support.

## 🛠️ Technical Stack

- **Frontend**: Next.js 15 (App Router), Tailwind CSS 4, Framer Motion, Lucide Icons.
- **Backend**: Next.js API Routes, Mongoose (MongoDB Atlas), Upstash Redis (Rate limiting).
- **DevOps**: Vercel (Deployment), Sentry (Error tracking), GitHub Actions.

## 🏁 Getting Started

1. **Clone & Install**
   ```bash
   npm install
   ```

2. **Environment Setup**
   Copy `.env.example` to `.env.local` and fill in:
   - `MONGODB_URI`
   - `NEXTAUTH_SECRET`
   - `NEXTAUTH_URL`

3. **Database Seed**
   ```bash
   curl -H "Authorization: Bearer YOUR_SEED_SECRET" http://localhost:3000/api/seed
   ```

4. **Run Dev**
   ```bash
   npm run dev
   ```

## ☁️ Vercel Deployment

1. Connect your GitHub repository to Vercel.
2. Add all environment variables from `.env.example`.
3. Set the build command to `npm run build`.
4. Ensure `CRON_SECRET` is set to secure the scheduled tasks in `vercel.json`.

---
Developed for modern businesses with performance and aesthetics in mind.
