/**
 * Shared API types and schemas.
 * Used by BOTH frontend fetch logic and backend route handlers
 * to enforce a single contract.
 */
import { z } from "zod";

// ─── Standard API Response Envelope ────────────────────────────────────
export type ApiResponse<T> = {
  success: boolean;
  data: T;
  error?: string;
  details?: any;
};

// ─── Sale Schema (shared validation) ───────────────────────────────────
export const SaleSchema = z.object({
  customerId: z.string().min(1, "Customer ID required"),
  items: z.array(z.any()),
  totalAmount: z.number().min(0),
  transportationCost: z.number().min(0).default(0),
  paidAmount: z.number().min(0).default(0),
  date: z.string().optional(),
  saleType: z.enum(["sent", "received"]).default("sent"),
  receiptUrl: z.string().optional(),
});

export type SaleInput = z.infer<typeof SaleSchema>;

// ─── Payment Schema (shared validation) ────────────────────────────────
export const PaymentSchema = z.object({
  customerId: z.string().min(1, "Customer ID required"),
  amount: z.number().min(0, "Amount must be positive"),
  type: z.string().min(1),
  paymentType: z.enum(["sent", "received"]),
  fileUrl: z.string().optional(),
  receiptUrl: z.string().optional(),
  date: z.string().optional(),
  notes: z.string().optional(),
});

export type PaymentInput = z.infer<typeof PaymentSchema>;
