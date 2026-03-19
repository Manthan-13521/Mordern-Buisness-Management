# Telangana Swimming Pool Management System

A production-ready Next.js 15 application for managing swimming pool memberships, plans, payments, QR code entry logs, and WhatsApp automated reminders. Made with Tailwind CSS, TypeScript, and MongoDB.

## Features Included

- **Authentication:** NextAuth credentials based login with session management. Role-based access (Admin & Operator).
- **Member Management:** Registration with webcam photo capture, auto-id generation (e.g. M0001), expiry calculation.
- **Plans & Payments:** Custom plan creation, recording payments via Cash or UPI (with transaction ID).
- **ID Cards:** Automated PDF generation with member photo and QR code (using `pdf-lib` & `qrcode`).
- **QR Entry System:** React webcam scanner to scan member cards, validate expiration, log entries, and prevent duplicates.
- **Analytics Dashboard:** Recharts-based dashboard showing Active/Expired members, Revenue, Plan popularity, and expiring soon alerts.
- **Notifications:** Built-in Twilio WhatsApp Reminder Cron Endpoint + UI to track message logs.
- **System Logs & Exports:** Consolidated log timeline of registrations, entries, and payments with Excel Export via `exceljs`.
- **System Settings:** Light/Dark/System theme switching and Full Database JSON Backup Export.
- **Global Error Handling:** Custom `error.tsx` and `not-found.tsx` components.

## Prerequisites
- Node.js 18.17+
- MongoDB instance (local or Atlas)
- Twilio Account (for WhatsApp messages - *Optional*)

## Getting Started

1. **Environment Variables**
Create a `.env.local` file in the root. Copy `.env.example` and fill in your values:
```env
MONGODB_URI="mongodb+srv://..."
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXTAUTH_SECRET="<generate: openssl rand -base64 64>"
NEXTAUTH_URL="http://localhost:3000"
SEED_SECRET="<generate: openssl rand -hex 32>"
CRON_SECRET="<generate: openssl rand -hex 32>"

# Optional: Twilio WhatsApp
TWILIO_ACCOUNT_SID=""
TWILIO_AUTH_TOKEN=""
TWILIO_WHATSAPP_NUMBER="+14155238886"

# Optional: Cloudinary (photo storage)
CLOUDINARY_CLOUD_NAME=""
CLOUDINARY_API_KEY=""
CLOUDINARY_API_SECRET=""
```
> ⚠️ **Never commit real secret values.** Generate unique secrets before deploying.

2. **Install Dependencies**
```bash
npm install
```

3. **Start Development Server**
```bash
npm run dev
```

4. **Seed the Database (First-time run)**
The seed endpoint is protected. Pass your `SEED_SECRET` value:
```bash
curl -H "Authorization: Bearer <YOUR_SEED_SECRET>" http://localhost:3000/api/seed
```
*Default credentials are set by environment variables — see `.env.example`.*

5. **Login and Explore**
Navigate to `http://localhost:3000/<pool-slug>/admin/login` and sign in.

## Project Architecture Highlight
- `/app/admin/(dashboard)/*`: Protected admin layout with sidebar and NextAuth session validation via middleware.
- `/app/api/*`: Backend logical endpoints integrated with mongoose aggregations and strict validation workflows.
- `models/`: Mongoose schemas outlining Members, Plans, EntryLogs, NotificationLogs, Payments and Users.
- `lib/mongodb.ts`: Centralized MongoDB connector utilizing connection caching to prevent hot-reload connection spikes next dev.

Developed keeping real-world production constraints in mind with robust global boundaries and comprehensive UI componentry utilizing Lucide icons and pure Tailwind logic.
