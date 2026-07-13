"use server";

import { dbConnect } from "@/lib/mongodb";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { BusinessInventoryItem } from "@/models/BusinessInventoryItem";
import { BusinessInventoryTransaction } from "@/models/BusinessInventoryTransaction";
import { StockAction, StockReason } from "@/lib/stockHelper";
import { logger } from "@/lib/logger";
import { revalidatePath } from "next/cache";

function generateTxnId(): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const random = Math.floor(Math.random() * 100000).toString().padStart(5, "0");
  return `TXN-${date}-${random}`;
}

async function getAuthContext() {
  const sessionAuth = await getServerSession(authOptions);
  const user = sessionAuth?.user as any;
  if (!user) return { error: "Unauthorized" as const, user: null, businessId: null };
  const businessId = user.businessId as string | undefined;
  if (!businessId) return { error: "Tenant context lost" as const, user: null, businessId: null };
  return { error: null, user, businessId };
}

export async function createStockItem(name: string, sku: string, unit: string, category: string, minimumStock: number) {
  try {
    if (!name?.trim() || !sku?.trim() || !unit?.trim()) return { error: "Name, SKU, and Unit are required." };

    await dbConnect();
    const auth = await getAuthContext();
    if (auth.error) return { error: auth.error };
    const { user, businessId } = auth;

    const existing = await BusinessInventoryItem.findOne({ businessId, sku: sku.trim() }).lean();
    if (existing) return { error: "An item with this SKU already exists." };

    const [newItem] = await BusinessInventoryItem.create([{
      name: name.trim(),
      sku: sku.trim(),
      category: (category || "General").trim(),
      unit: unit.trim(),
      currentStock: 0,
      minimumStock: Math.max(0, minimumStock || 0),
      businessId,
      version: 1,
      createdBy: user.id,
      updatedBy: user.id
    }]);

    revalidatePath(`/business/[businessSlug]/admin/stock`, "page");
    return { success: true, item: JSON.parse(JSON.stringify(newItem)) };
  } catch (err: any) {
    logger.error("createStockItem error", { error: err.message });
    return { error: err.message };
  }
}

export async function stockIn(itemId: string, quantity: number, reason: StockReason, notes?: string) {
  try {
    if (!itemId) return { error: "Item ID is required." };
    if (!Number.isFinite(quantity) || quantity <= 0) return { error: "Quantity must be a positive number." };

    await dbConnect();
    const auth = await getAuthContext();
    if (auth.error) return { error: auth.error };
    const { user, businessId } = auth;

    const item = await BusinessInventoryItem.findOne({ _id: itemId, businessId });
    if (!item) return { error: "Item not found or access denied." };

    const previousQuantity = item.currentStock;
    const newQuantity = previousQuantity + quantity;

    // Atomic update with optimistic concurrency check
    const updateResult = await BusinessInventoryItem.updateOne(
      { _id: item._id, version: item.version },
      {
        $inc: { currentStock: quantity, version: 1 },
        $set: { updatedBy: user.id }
      }
    );

    if (updateResult.modifiedCount === 0) {
      return { error: "Stock was updated by another process simultaneously. Please try again." };
    }

    const txn = await BusinessInventoryTransaction.create([{
      txnId: generateTxnId(),
      itemId: item._id,
      businessId,
      action: StockAction.STOCK_IN,
      reason,
      quantity,
      previousQuantity,
      newQuantity,
      notes: notes?.trim(),
      userId: user.id
    }]);

    revalidatePath(`/business/[businessSlug]/admin/stock`, "page");
    return { success: true, newQuantity, txnId: txn[0].txnId };
  } catch (err: any) {
    logger.error("stockIn error", { error: err.message, itemId });
    return { error: err.message };
  }
}

export async function stockOut(itemId: string, quantity: number, reason: StockReason, notes?: string) {
  try {
    if (!itemId) return { error: "Item ID is required." };
    if (!Number.isFinite(quantity) || quantity <= 0) return { error: "Quantity must be a positive number." };

    await dbConnect();
    const auth = await getAuthContext();
    if (auth.error) return { error: auth.error };
    const { user, businessId } = auth;

    const item = await BusinessInventoryItem.findOne({ _id: itemId, businessId });
    if (!item) return { error: "Item not found or access denied." };

    const previousQuantity = item.currentStock;
    const newQuantity = previousQuantity - quantity;

    // Reject before touching the DB — never allow negative stock
    if (newQuantity < 0) {
      return { error: `Insufficient stock. Available: ${previousQuantity}, Requested: ${quantity}.` };
    }

    // Atomic update with optimistic concurrency check
    const updateResult = await BusinessInventoryItem.updateOne(
      { _id: item._id, version: item.version, currentStock: { $gte: quantity } },
      {
        $inc: { currentStock: -quantity, version: 1 },
        $set: { updatedBy: user.id }
      }
    );

    if (updateResult.modifiedCount === 0) {
      return { error: "Stock was updated by another process simultaneously or stock is insufficient. Please refresh and try again." };
    }

    const txn = await BusinessInventoryTransaction.create([{
      txnId: generateTxnId(),
      itemId: item._id,
      businessId,
      action: StockAction.STOCK_OUT,
      reason,
      quantity,
      previousQuantity,
      newQuantity,
      notes: notes?.trim(),
      userId: user.id
    }]);

    revalidatePath(`/business/[businessSlug]/admin/stock`, "page");
    return { success: true, newQuantity, txnId: txn[0].txnId };
  } catch (err: any) {
    logger.error("stockOut error", { error: err.message, itemId });
    return { error: err.message };
  }
}
