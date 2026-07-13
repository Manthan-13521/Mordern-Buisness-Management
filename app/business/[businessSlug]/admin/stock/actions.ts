"use server";

import { dbConnect } from "@/lib/mongodb";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { BusinessInventoryItem } from "@/models/BusinessInventoryItem";
import { BusinessInventoryTransaction } from "@/models/BusinessInventoryTransaction";
import { StockAction, StockReason } from "@/lib/stockHelper";
import { logger } from "@/lib/logger";
import { revalidatePath } from "next/cache";
import mongoose from "mongoose";

export async function createStockItem(name: string, sku: string, unit: string, category: string, minimumStock: number) {
  try {
    if (!name || !sku || !unit) return { error: "Name, SKU, and Unit are required." };

    await dbConnect();
    const sessionAuth = await getServerSession(authOptions);
    const user = sessionAuth?.user as any;
    if (!user) return { error: "Unauthorized" };

    const businessId = user.businessId;
    if (!businessId) return { error: "Tenant context lost" };

    // Check if SKU already exists
    const existing = await BusinessInventoryItem.findOne({ businessId, sku }).lean();
    if (existing) return { error: "An item with this SKU already exists." };

    const [newItem] = await BusinessInventoryItem.create([{
      name,
      sku,
      category: category || "General",
      unit,
      currentStock: 0,
      minimumStock: minimumStock || 0,
      businessId,
      version: 1,
      createdBy: user.id,
      updatedBy: user.id
    }]);

    revalidatePath(`/business/[businessSlug]/admin/stock`, 'page');
    return { success: true, item: JSON.parse(JSON.stringify(newItem)) };
  } catch (err: any) {
    logger.error("createStockItem error", { error: err.message, sku });
    return { error: err.message };
  }
}
function generateTxnId() {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const random = Math.floor(Math.random() * 100000).toString().padStart(5, "0");
  return `TXN-${date}-${random}`;
}

export async function stockIn(itemId: string, quantity: number, reason: StockReason, notes?: string) {
  try {
    if (quantity <= 0) return { error: "Quantity must be greater than zero." };

    await dbConnect();
    const sessionAuth = await getServerSession(authOptions);
    const user = sessionAuth?.user as any;
    if (!user) return { error: "Unauthorized" };

    const businessId = user.businessId;
    if (!businessId) return { error: "Tenant context lost" };
    
    let result;

    const item = await BusinessInventoryItem.findOne({ _id: itemId, businessId });
    if (!item) throw new Error("Item not found");

    const previousQuantity = item.currentStock;
    const newQuantity = previousQuantity + quantity;

    // Update item atomically with version check for optimistic concurrency
    const updateResult = await BusinessInventoryItem.updateOne(
      { _id: item._id, version: item.version },
      { 
        $inc: { currentStock: quantity, version: 1 },
        $set: { updatedBy: user.id }
      }
    );

    if (updateResult.modifiedCount === 0) {
      throw new Error("ConcurrencyError: Item was updated by another process. Please try again.");
    }

    // Record transaction
    const txn = await BusinessInventoryTransaction.create([{
      txnId: generateTxnId(),
      itemId: item._id,
      businessId,
      action: StockAction.STOCK_IN,
      reason,
      quantity,
      previousQuantity,
      newQuantity,
      notes,
      userId: user.id
    }]);

    result = { success: true, newQuantity, txnId: txn[0].txnId };
    
    revalidatePath(`/business/[businessSlug]/admin/stock`, 'page');
    return result;

  } catch (err: any) {
    logger.error("stockIn error", { error: err.message, itemId });
    return { error: err.message };
  }
}

export async function stockOut(itemId: string, quantity: number, reason: StockReason, notes?: string) {
  try {
    if (quantity <= 0) return { error: "Quantity must be greater than zero." };

    await dbConnect();
    const sessionAuth = await getServerSession(authOptions);
    const user = sessionAuth?.user as any;
    if (!user) return { error: "Unauthorized" };

    const businessId = user.businessId;
    if (!businessId) return { error: "Tenant context lost" };
    
    let result;

    const item = await BusinessInventoryItem.findOne({ _id: itemId, businessId });
    if (!item) throw new Error("Item not found");

    const previousQuantity = item.currentStock;
    const newQuantity = previousQuantity - quantity;

    if (newQuantity < 0) {
      throw new Error("Insufficient stock. Stock cannot become negative.");
    }

    // Update item atomically with version check
    const updateResult = await BusinessInventoryItem.updateOne(
      { _id: item._id, version: item.version },
      { 
        $inc: { currentStock: -quantity, version: 1 },
        $set: { updatedBy: user.id }
      }
    );

    if (updateResult.modifiedCount === 0) {
      throw new Error("ConcurrencyError: Item was updated by another process. Please try again.");
    }

    // Record transaction
    const txn = await BusinessInventoryTransaction.create([{
      txnId: generateTxnId(),
      itemId: item._id,
      businessId,
      action: StockAction.STOCK_OUT,
      reason,
      quantity,
      previousQuantity,
      newQuantity,
      notes,
      userId: user.id
    }]);

    result = { success: true, newQuantity, txnId: txn[0].txnId };

    revalidatePath(`/business/[businessSlug]/admin/stock`, 'page');
    return result;

  } catch (err: any) {
    logger.error("stockOut error", { error: err.message, itemId });
    return { error: err.message };
  }
}
