/**
 * lib/shared/cashflow.ts
 * ─────────────────────────────────────────────────────────────────────────
 * CENTRALIZED cashflow classification for AquaSync Business SaaS.
 *
 * EVERY component that determines whether a transaction is a "receipt"
 * (money in) or "disbursement" (money out) MUST use this helper.
 * This eliminates double-counting and ensures dashboard totals, ledger
 * rows, analytics, exports, and charts always agree.
 *
 * ═══════════════════════════════════════════════════════════════════════
 * ACCOUNTING RULES:
 *
 *   SALE category (goods movement):
 *     transactionType === "sent"      → RECEIPT   (we sold → money IN)
 *     transactionType === "received"  → DISBURSEMENT (return/refund → money OUT)
 *
 *   PAYMENT category (standalone cash movement):
 *     transactionType === "received"  → RECEIPT   (customer paid us → money IN)
 *     transactionType === "paid"      → DISBURSEMENT (we paid supplier → money OUT)
 *     transactionType === "sent"      → DISBURSEMENT (we sent money → money OUT)
 *
 * ═══════════════════════════════════════════════════════════════════════
 * AMOUNT RULES:
 *
 *   SALE  → use paidAmount (the actual cash collected/returned)
 *   PAYMENT → use amount
 *
 * A transaction is NEVER both a receipt AND a disbursement.
 * ─────────────────────────────────────────────────────────────────────────
 */

export interface CashflowClassification {
    /** True if money flows INTO the business */
    isReceipt: boolean;
    /** True if money flows OUT of the business */
    isDisbursement: boolean;
    /** The safe, canonical amount for this transaction's cashflow */
    cashflowAmount: number;
    /** Display label: "received" or "paid" */
    label: "received" | "paid";
}

export interface ClassifiableTransaction {
    category?: "SALE" | "PAYMENT" | string;
    transactionType?: "received" | "paid" | "sent" | string;
    amount?: number;
    paidAmount?: number;
}

/**
 * Classify a single transaction as receipt or disbursement.
 *
 * @param txn  Any object with category, transactionType, amount, paidAmount
 * @returns    Classification with isReceipt, isDisbursement, cashflowAmount, label
 */
export function classifyCashflow(txn: ClassifiableTransaction): CashflowClassification {
    const isSale = txn.category === "SALE";

    // ── Determine direction ──────────────────────────────────────────────
    const isReceipt = isSale
        ? txn.transactionType === "sent"       // goods sent = sale = money IN
        : txn.transactionType === "received";   // payment received = money IN

    const isDisbursement = isSale
        ? txn.transactionType === "received"    // goods received back = refund = money OUT
        : (
            txn.transactionType === "paid" ||   // explicit "paid" = money OUT
            txn.transactionType === "sent"      // payment sent = money OUT
        );

    // ── Determine canonical amount ───────────────────────────────────────
    // SALE uses paidAmount (actual cash exchanged), PAYMENT uses amount
    const rawAmount = isSale
        ? (txn.paidAmount ?? 0)
        : (txn.amount ?? 0);

    // Safety: prevent NaN, undefined, negative amounts from corrupting totals
    const cashflowAmount = Number.isFinite(rawAmount) && rawAmount >= 0
        ? rawAmount
        : 0;

    return {
        isReceipt,
        isDisbursement,
        cashflowAmount,
        label: isReceipt ? "received" : "paid",
    };
}

/**
 * Compute total receipts and disbursements from an array of transactions.
 * Uses classifyCashflow internally — guaranteed single-counting.
 */
export function computeCashflowTotals(transactions: ClassifiableTransaction[]): {
    totalReceipts: number;
    totalDisbursements: number;
    netCashflow: number;
} {
    let totalReceipts = 0;
    let totalDisbursements = 0;

    for (const txn of transactions) {
        const { isReceipt, isDisbursement, cashflowAmount } = classifyCashflow(txn);

        if (isReceipt) {
            totalReceipts += cashflowAmount;
        } else if (isDisbursement) {
            totalDisbursements += cashflowAmount;
        }
        // If neither (shouldn't happen), the transaction is ignored — safe
    }

    return {
        totalReceipts,
        totalDisbursements,
        netCashflow: totalReceipts - totalDisbursements,
    };
}
