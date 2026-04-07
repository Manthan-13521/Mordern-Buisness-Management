import { z } from 'zod'

// ── Safe money amount: integer rupees, max 10 digits (₹9,999,999,999) ────────
const MAX_AMOUNT = 9_999_999_999;

const safeAmount = (min = 0) =>
  z.number()
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
