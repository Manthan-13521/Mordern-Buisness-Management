/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * CENTRALIZED ANALYTICS SERVICE — Single Source of Truth
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * ALL revenue, expense, profit, and receivable calculations MUST go through
 * this service. No other file should independently compute these metrics.
 *
 * REVENUE RULE (STRICT):
 *   Revenue = SUM of BusinessTransaction where:
 *     - category = "SALE"
 *     - transactionType = "sent"  (goods sent to customer = we sold)
 *
 *   DO NOT include:
 *     - PAYMENT transactions (those are cash flow, not revenue)
 *     - SALE + received (those are purchases/expenses from suppliers)
 *
 * EXPENSE RULE:
 *   Expenses = SUM of BusinessTransaction where:
 *     - category = "SALE"
 *     - transactionType = "received"  (goods received from supplier = we purchased)
 *
 * DATE CONVENTION:
 *   All date boundaries use IST (UTC+5:30) calendar boundaries,
 *   converted to UTC for MongoDB queries.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { dbConnect } from "@/lib/mongodb";
import { BusinessTransaction } from "@/models/BusinessTransaction";
import { BusinessCustomer } from "@/models/BusinessCustomer";
import { logger } from "@/lib/logger";

// ── Constants ────────────────────────────────────────────────────────────────

// Max time for MongoDB aggregation queries (ms).
// Atlas M0/M2 can spike under load; Vercel functions have 10-60s execution limits.
// Setting this to 10s ensures we fail fast instead of hitting Vercel's hard timeout.
const AGGREGATION_TIMEOUT_MS = 10_000;

// ── Types ────────────────────────────────────────────────────────────────────

export type DateRange = "daily" | "monthly" | "yearly";

export interface DateBounds {
  startDate: Date;
  endDate: Date;
  label: string;
}

export interface RevenueResult {
  total: number;
  transactionCount: number;
  dateRange: DateBounds;
}

export interface ExpenseResult {
  total: number;
  transactionCount: number;
  dateRange: DateBounds;
}

export interface ProfitResult {
  revenue: number;
  expenses: number;
  netProfit: number;
  dateRange: DateBounds;
}

export interface ReceivablesResult {
  totalReceivables: number;
  totalPayables: number;
}

export interface CashFlowResult {
  cashIn: number;
  cashOut: number;
  netCashFlow: number;
  breakdown: {
    paymentReceived: number;
    salePaidIn: number;
    paymentGiven: number;
    salePaidOut: number;
  };
  dateRange: DateBounds;
}

export interface FullSummary {
  revenue: RevenueResult;
  expenses: ExpenseResult;
  profit: ProfitResult;
  receivables: ReceivablesResult;
  cashFlow: CashFlowResult;
}

// ── Local Date Bounds (System Timezone) ──────────────────────────────────────

/**
 * Compute date boundaries using local system timezone.
 * Uses standard new Date() logic to prevent UTC offset issues in logs.
 */
export function getLocalDateBounds(range: DateRange): DateBounds {
  const now = new Date();

  let startDate: Date;
  let label: string;

  switch (range) {
    case "daily": {
      // Start of today
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      label = `Today (Local)`;
      break;
    }
    case "monthly": {
      // Start of current month
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      label = `Month (Local)`;
      break;
    }
    case "yearly": {
      // Start of current year
      startDate = new Date(now.getFullYear(), 0, 1);
      label = `Year (Local)`;
      break;
    }
  }

  return { startDate, endDate: now, label };
}

/**
 * Compute date bounds for rolling windows (7d, 30d, etc.)
 * Used only for trend charts, NOT for summary metrics.
 */
export function getRollingDateBounds(days: number): DateBounds {
  const now = new Date();
  const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  return { startDate, endDate: now, label: `Last ${days} days` };
}

// ── Core Revenue Calculation ─────────────────────────────────────────────────

/**
 * Revenue = SUM(amount) where category=SALE AND transactionType=sent
 *
 * This is the ONLY correct way to calculate revenue.
 * "sent" means goods sent TO customer = a sale we made = our revenue.
 */
export async function getRevenue(
  businessId: string,
  range: DateRange
): Promise<RevenueResult> {
  await dbConnect();
  const dateBounds = getLocalDateBounds(range);

  const matchFilter = {
    businessId,
    category: "SALE" as const,
    transactionType: "sent" as const,
    date: { $gte: dateBounds.startDate, $lte: dateBounds.endDate },
  };

  const [result] = await BusinessTransaction.aggregate([
    { $match: matchFilter },
    {
      $group: {
        _id: null,
        total: { $sum: "$amount" },
        count: { $sum: 1 },
      },
    },
  ]).option({ maxTimeMS: AGGREGATION_TIMEOUT_MS });

  const output: RevenueResult = {
    total: result?.total || 0,
    transactionCount: result?.count || 0,
    dateRange: dateBounds,
  };

  if (process.env.DEBUG_ANALYTICS === "true") {
    logger.debug("Analytics revenue", {
      businessId,
      range,
      startDate: dateBounds.startDate.toISOString(),
      endDate: dateBounds.endDate.toISOString(),
      transactionCount: output.transactionCount,
      total: output.total,
    });
  }

  return output;
}

// ── Core Expense Calculation ─────────────────────────────────────────────────

/**
 * Expenses = SUM(amount) where category=SALE AND transactionType=received
 *
 * "received" means goods received FROM supplier = a purchase we made = our expense.
 */
export async function getExpenses(
  businessId: string,
  range: DateRange
): Promise<ExpenseResult> {
  await dbConnect();
  const dateBounds = getLocalDateBounds(range);

  const matchFilter = {
    businessId,
    category: "SALE" as const,
    transactionType: "received" as const,
    date: { $gte: dateBounds.startDate, $lte: dateBounds.endDate },
  };

  const [result] = await BusinessTransaction.aggregate([
    { $match: matchFilter },
    {
      $group: {
        _id: null,
        total: { $sum: "$amount" },
        count: { $sum: 1 },
      },
    },
  ]).option({ maxTimeMS: AGGREGATION_TIMEOUT_MS });

  const output: ExpenseResult = {
    total: result?.total || 0,
    transactionCount: result?.count || 0,
    dateRange: dateBounds,
  };

  if (process.env.DEBUG_ANALYTICS === "true") {
    logger.debug("Analytics expenses", {
      businessId,
      range,
      startDate: dateBounds.startDate.toISOString(),
      endDate: dateBounds.endDate.toISOString(),
      transactionCount: output.transactionCount,
      total: output.total,
    });
  }

  return output;
}

// ── Profit ───────────────────────────────────────────────────────────────────

/**
 * Profit = Revenue - Expenses (for the same date range)
 */
export async function getProfit(
  businessId: string,
  range: DateRange
): Promise<ProfitResult> {
  const [revenue, expenses] = await Promise.all([
    getRevenue(businessId, range),
    getExpenses(businessId, range),
  ]);

  return {
    revenue: revenue.total,
    expenses: expenses.total,
    netProfit: revenue.total - expenses.total,
    dateRange: revenue.dateRange,
  };
}

// ── Receivables & Payables ───────────────────────────────────────────────────

/**
 * Receivables = SUM(currentDue) where currentDue > 0 (customers owe us)
 * Payables = SUM(|currentDue|) where currentDue < 0 (we owe customers/suppliers)
 *
 * These are balance-sheet items — NOT time-filtered.
 */
export async function getReceivables(
  businessId: string
): Promise<ReceivablesResult> {
  await dbConnect();

  const [result] = await BusinessCustomer.aggregate([
    { $match: { businessId } },
    {
      $group: {
        _id: null,
        totalReceivables: {
          $sum: { $cond: [{ $gt: ["$currentDue", 0] }, "$currentDue", 0] },
        },
        totalPayables: {
          $sum: {
            $cond: [{ $lt: ["$currentDue", 0] }, { $abs: "$currentDue" }, 0],
          },
        },
      },
    },
  ]).option({ maxTimeMS: AGGREGATION_TIMEOUT_MS });

  return {
    totalReceivables: result?.totalReceivables || 0,
    totalPayables: result?.totalPayables || 0,
  };
}

// ── Cash Flow ────────────────────────────────────────────────────────────────

/**
 * Cash Flow tracks actual money movement (separate from revenue/expenses):
 *
 * Cash IN:
 *   - PAYMENT(received) — standalone payment received from customer
 *   - SALE(sent).paidAmount — inline payment collected at time of sale
 *
 * Cash OUT:
 *   - PAYMENT(paid) — standalone payment given to supplier/customer
 *   - SALE(received).paidAmount — inline payment made when receiving goods
 */
export async function getCashFlow(
  businessId: string,
  range: DateRange
): Promise<CashFlowResult> {
  await dbConnect();
  const dateBounds = getLocalDateBounds(range);

  const dateFilter = {
    businessId,
    date: { $gte: dateBounds.startDate, $lte: dateBounds.endDate },
  };

  const [result] = await BusinessTransaction.aggregate([
    { $match: dateFilter },
    {
      $group: {
        _id: null,
        paymentReceived: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: ["$category", "PAYMENT"] },
                  { $eq: ["$transactionType", "received"] },
                ],
              },
              "$amount",
              0,
            ],
          },
        },
        salePaidIn: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: ["$category", "SALE"] },
                  { $eq: ["$transactionType", "sent"] },
                ],
              },
              { $ifNull: ["$paidAmount", 0] },
              0,
            ],
          },
        },
        paymentGiven: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: ["$category", "PAYMENT"] },
                  { $eq: ["$transactionType", "paid"] },
                ],
              },
              "$amount",
              0,
            ],
          },
        },
        salePaidOut: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: ["$category", "SALE"] },
                  { $eq: ["$transactionType", "received"] },
                ],
              },
              { $ifNull: ["$paidAmount", 0] },
              0,
            ],
          },
        },
      },
    },
  ]).option({ maxTimeMS: AGGREGATION_TIMEOUT_MS });

  const cf = result || {
    paymentReceived: 0,
    salePaidIn: 0,
    paymentGiven: 0,
    salePaidOut: 0,
  };
  const cashIn = cf.paymentReceived + cf.salePaidIn;
  const cashOut = cf.paymentGiven + cf.salePaidOut;

  return {
    cashIn,
    cashOut,
    netCashFlow: cashIn - cashOut,
    breakdown: {
      paymentReceived: cf.paymentReceived,
      salePaidIn: cf.salePaidIn,
      paymentGiven: cf.paymentGiven,
      salePaidOut: cf.salePaidOut,
    },
    dateRange: dateBounds,
  };
}

// ── Full Summary (used by Dashboard) ─────────────────────────────────────────

/**
 * Get complete financial summary for a business.
 * Runs all calculations in parallel for performance.
 */
export async function getFullSummary(
  businessId: string,
  range: DateRange
): Promise<FullSummary> {
  const [revenue, expenses, receivables, cashFlow] = await Promise.all([
    getRevenue(businessId, range),
    getExpenses(businessId, range),
    getReceivables(businessId),
    getCashFlow(businessId, range),
  ]);

  return {
    revenue,
    expenses,
    profit: {
      revenue: revenue.total,
      expenses: expenses.total,
      netProfit: revenue.total - expenses.total,
      dateRange: revenue.dateRange,
    },
    receivables,
    cashFlow,
  };
}

// ── Revenue by Custom Date Range (for advanced analytics) ────────────────────

/**
 * Revenue aggregated within an arbitrary date window.
 * Used by advanced analytics for rolling windows (7d, 30d).
 */
export async function getRevenueForDateRange(
  businessId: string,
  startDate: Date,
  endDate: Date
): Promise<{ revenue: number; expenses: number; paymentsReceived: number; paymentsGiven: number }> {
  await dbConnect();

  const dateFilter = { businessId, date: { $gte: startDate, $lte: endDate } };

  const [result] = await BusinessTransaction.aggregate([
    { $match: dateFilter },
    {
      $group: {
        _id: null,
        revenue: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: ["$category", "SALE"] },
                  { $eq: ["$transactionType", "sent"] },
                ],
              },
              "$amount",
              0,
            ],
          },
        },
        expenses: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: ["$category", "SALE"] },
                  { $eq: ["$transactionType", "received"] },
                ],
              },
              "$amount",
              0,
            ],
          },
        },
        paymentsReceived: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: ["$category", "PAYMENT"] },
                  { $eq: ["$transactionType", "received"] },
                ],
              },
              "$amount",
              0,
            ],
          },
        },
        paymentsGiven: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: ["$category", "PAYMENT"] },
                  { $eq: ["$transactionType", "paid"] },
                ],
              },
              "$amount",
              0,
            ],
          },
        },
      },
    },
  ]).option({ maxTimeMS: AGGREGATION_TIMEOUT_MS });

  return {
    revenue: result?.revenue || 0,
    expenses: result?.expenses || 0,
    paymentsReceived: result?.paymentsReceived || 0,
    paymentsGiven: result?.paymentsGiven || 0,
  };
}
