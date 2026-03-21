import { z } from 'zod'

export const MemberCreateSchema = z.object({
  name: z.string().min(2).max(100),
  phone: z.string().min(1, 'Phone number is required'),
  planId: z.string().min(1),
  paymentMethod: z.enum(['cash', 'upi', 'razorpay_online', 'card', 'online']),
  transactionId: z.string().optional(),
  photo: z.string().optional(),
  planQuantity: z.number().int().min(1).optional().default(1),
  paidAmount: z.number().min(0).optional().default(0),
  balanceAmount: z.number().min(0).optional().default(0),
})

export const PaymentSchema = z.object({
  memberId: z.string().min(1),
  planId: z.string().min(1),
  memberCollection: z.enum(['members', 'entertainment_members']).optional().default('members'),
  amount: z.number().positive(),
  paymentMethod: z.enum(['cash', 'upi', 'razorpay_online', 'card', 'online']),
  transactionId: z.string().optional(),
  idempotencyKey: z.string().optional(),
  notes: z.string().optional(),
})

export const PlanSchema = z.object({
  name: z.string().min(2).max(50),
  durationDays: z.number().int().min(0).max(3650).optional().default(0),
  durationHours: z.number().int().min(0).max(1000).optional().default(0),
  durationMinutes: z.number().int().min(0).max(1000).optional().default(0),
  durationSeconds: z.number().int().min(0).max(1000).optional().default(0),
  price: z.number().min(0),
  description: z.string().max(200).optional(),
  features: z.array(z.string()).optional().default([]),
  whatsAppAlert: z.boolean().optional(),
  allowQuantity: z.boolean().optional(),
  hasEntertainment: z.boolean().optional(),
  hasFaceScan: z.boolean().optional(),
  quickDelete: z.boolean().optional(),
  hasTokenPrint: z.boolean().optional(),
  voiceAlert: z.boolean().optional(),
  maxEntriesPerQR: z.number().int().min(1).optional().default(1),
})

export const PaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().max(100).optional().default(''),
  status: z.enum(['active', 'expired', 'all']).optional().default('all'),
})
