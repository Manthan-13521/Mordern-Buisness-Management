import { z } from 'zod'

// ── Safe money amount: integer rupees, max 10 digits (₹9,999,999,999) ────────
const MAX_AMOUNT = 9_999_999_999;

// For JSON payloads — expects a real JS number
const safeAmount = (min = 0) =>
  z.number()
    .min(min, `Amount must be at least ₹${min}`)
    .max(MAX_AMOUNT, `Amount cannot exceed ₹${MAX_AMOUNT.toLocaleString('en-IN')}`)
    .refine(v => Number.isFinite(v), 'Amount must be a finite number')
    .refine(v => !isNaN(v), 'Amount must be a valid number');

// For FormData payloads — coerces strings ("0", "500") to numbers before validation
const coercedSafeAmount = (min = 0) =>
  z.coerce.number()
    .min(min, `Amount must be at least ₹${min}`)
    .max(MAX_AMOUNT, `Amount cannot exceed ₹${MAX_AMOUNT.toLocaleString('en-IN')}`)
    .refine(v => Number.isFinite(v), 'Amount must be a finite number')
    .refine(v => !isNaN(v), 'Amount must be a valid number');

export const MemberCreateSchema = z.object({
  name: z.string().min(2).max(30).trim(),
  phone: z.string().min(10).max(13),
  planId: z.string().min(1).max(50),
  paymentMethod: z.enum(['cash', 'upi', 'razorpay_online', 'card', 'online']),
  transactionId: z.string().max(100).optional(),
  photo: z.string().optional(),
  planQuantity: z.number().int().min(1).max(100).optional().default(1),
  paidAmount: safeAmount().optional().default(0),
  balanceAmount: safeAmount().optional().default(0),
})

export const EntertainmentMemberCreateSchema = z.object({
  name: z.string().min(2).max(30).trim(),
  phone: z.string().min(10).max(13),
  planId: z.string().min(1).max(50),
  dob: z.string().optional(),
  photoBase64: z.string().optional(),
  aadharCard: z.string().max(20).optional(),
  address: z.string().max(300).optional(),
  planQuantity: z.number().int().min(1).max(100).optional().default(1),
  paidAmount: safeAmount().optional().default(0),
  balanceAmount: safeAmount().optional().default(0),
})

export const PaymentSchema = z.object({
  memberId: z.string().min(1).max(50),
  planId: z.string().min(1).max(50),
  memberCollection: z.enum(['members', 'entertainment_members']).optional().default('members'),
  amount: safeAmount(1),  // Positive, max ₹9,999,999,999
  paymentMethod: z.enum(['cash', 'upi', 'razorpay_online', 'card', 'online']),
  transactionId: z.string().max(100).optional(),
  clientId: z.string().max(100).optional(), // 🚀 Offline Sync Deduplication Key
  idempotencyKey: z.string().max(100).optional(),
  notes: z.string().max(500).optional(),
})

export const PlanSchema = z.object({
  name: z.string().min(2).max(30).trim(),
  durationDays: z.number().int().min(0).max(3650).optional().default(0),
  durationHours: z.number().int().min(0).max(1000).optional().default(0),
  durationMinutes: z.number().int().min(0).max(1000).optional().default(0),
  durationSeconds: z.number().int().min(0).max(1000).optional().default(0),
  price: safeAmount(),  // Max ₹9,999,999,999
  description: z.string().max(200).optional(),
  features: z.array(z.string().max(100)).max(20).optional().default([]),
  whatsAppAlert: z.boolean().optional(),
  enableWhatsAppAlerts: z.boolean().optional(),
  allowQuantity: z.boolean().optional(),
  hasEntertainment: z.boolean().optional(),
  hasFaceScan: z.boolean().optional(),
  quickDelete: z.boolean().optional(),
  hasTokenPrint: z.boolean().optional(),
  voiceAlert: z.boolean().optional(),
  maxEntriesPerQR: z.number().int().min(1).max(1000).optional().default(1),
  messages: z.object({
    beforeExpiry: z.object({
      text: z.string().max(1000).optional(),
      mediaUrl: z.string().url().nullable().optional(),
    }).optional(),
    afterExpiry: z.object({
      text: z.string().max(1000).optional(),
      mediaUrl: z.string().url().nullable().optional(),
    }).optional(),
  }).optional(),
})

export const PaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().max(100).optional().default(''),
  status: z.enum(['active', 'expired', 'all']).optional().default('all'),
})

export const ScanSchema = z.object({
  poolId: z.string().min(1).max(50),
  scanToken: z.string().min(1).max(200),
  type: z.enum(['entry', 'exit']),
  method: z.enum(['qr', 'face', 'manual']).optional().default('qr'),
})

export const RazorpayOrderSchema = z.object({
  planId: z.string().min(1).max(50),
  memberId: z.string().min(1).max(50).optional(), // For renewals — absent on new registrations
  cartQuantity: z.number().int().min(1).max(100).optional().default(1),
})

export const StaffCreateSchema = z.object({
  name: z.string().min(2).max(30).trim(),
  phone: z.string().min(10).max(13),
  role: z.enum(['Trainer', 'Manager', 'Staff']),
})

export const SettingsCapacitySchema = z.object({
  poolCapacity: z.number().int().min(1).max(10_000).optional(),
  currentOccupancy: z.number().int().min(0).max(10_000).optional(),
  occupancyDurationMinutes: z.number().int().min(1).max(1440).optional(),
})

export const TwilioConnectSchema = z.object({
  sid: z.string().min(1).max(50).regex(/^AC/, { message: "Twilio SID must start with AC" }),
  authToken: z.string().min(1).max(100),
  whatsappNumber: z.string().min(1).max(30),
  testPhone: z.string().min(10).max(20),
})

// ── Phase 2A FIX 7: Hostel & Business Zod Schemas ────────────────────────────
// These follow the same patterns as existing pool schemas above.

/** ObjectId format: 24-character hex string */
const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Must be a valid ObjectId')

export const HostelMemberCreateSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100).trim(),
  // Phone: accepts 10-15 digits, strips leading +91 or spaces before validation
  phone: z.string().transform(v => v.replace(/^\+91/, '').replace(/\s/g, '')).pipe(
    z.string().regex(/^\d{10,15}$/, 'Phone must be 10-15 digits')
  ),
  planId: objectId,
  blockNo: z.string().min(1).max(50),
  // floorNo & roomNo always arrive as strings from both JSON and FormData — coerce is safe
  floorNo: z.coerce.string().min(1).max(50),
  roomNo: z.coerce.string().min(1).max(50),
  bedNo: z.coerce.number().int().min(1).max(50).optional(),
  paymentMode: z.enum(['cash', 'upi', 'bank_transfer', 'card', 'online']).optional().default('cash'),
  // coercedSafeAmount handles both JSON numbers and FormData strings ("0", "500")
  paidAmount: coercedSafeAmount().optional().default(0),
  notes: z.string().max(500).optional(),
  collegeName: z.string().max(200).optional(),
})

export const HostelPaymentSchema = z.object({
  memberId: objectId,
  amount: safeAmount(1), // Must be at least ₹1
  paymentMethod: z.enum(['cash', 'upi', 'bank_transfer', 'card', 'online']).optional().default('cash'),
  transactionId: z.string().max(100).optional(),
  notes: z.string().max(500).optional(),
  paymentType: z.enum(['initial', 'renewal', 'balance', 'advance', 'refund']).optional().default('balance'),
  idempotencyKey: z.string().max(100).optional(),
})

export const BusinessCustomerSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100).trim(),
  phone: z.string().regex(/^\d{10,15}$/).optional(),
  businessName: z.string().max(200).optional(),
  address: z.string().max(500).optional(),
  gstNumber: z.string().regex(
    /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/,
    'Invalid GST number format'
  ).optional(),
})

export const BusinessTransactionSchema = z.object({
  customerId: objectId,
  amount: safeAmount(0),
  category: z.enum(['SALE', 'PAYMENT']),
  transactionType: z.enum(['sent', 'received', 'paid']),
  paymentMethod: z.enum(['cash', 'upi', 'bank_transfer', 'card', 'online']).optional(),
  paidAmount: safeAmount().optional().default(0),
  description: z.string().max(500).optional(),
  notes: z.string().max(500).optional(),
  items: z.array(z.object({
    name: z.string().max(200),
    quantity: z.number().min(0).max(999999),
    price: safeAmount(),
  })).max(100).optional(),
})

