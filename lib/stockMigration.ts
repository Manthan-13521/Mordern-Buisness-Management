import { dbConnect } from "@/lib/mongodb";
import { BusinessStock } from "@/models/BusinessStock";
import { BusinessInventoryItem } from "@/models/BusinessInventoryItem";
import { BusinessInventoryTransaction } from "@/models/BusinessInventoryTransaction";
import { StockAction, StockReason } from "@/lib/stockHelper";
import mongoose from "mongoose";
import { logger } from "@/lib/logger";

function generateTxnId() {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const random = Math.floor(Math.random() * 100000).toString().padStart(5, "0");
  return `TXN-${date}-${random}`;
}

export async function migrateTenantStock(businessId: string, userId?: string) {
  try {
    await dbConnect();

    // 1. Fetch all legacy stock for this business
    const legacyStocks = await BusinessStock.find({ businessId }).lean();
    if (legacyStocks.length === 0) return { migrated: 0 };

    let migratedCount = 0;

    for (const legacy of legacyStocks) {
      // 2. Check if already migrated by checking SKU (using legacy _id as SKU)
      const sku = `LEGACY-${legacy._id.toString()}`;
      
      const existing = await BusinessInventoryItem.findOne({ businessId, sku }).lean();
      if (existing) continue;

      // 3. Create the new item (Sequential, No Session to support local standalone MongoDB)
      const [newItem] = await BusinessInventoryItem.create([{
        name: legacy.name,
        sku,
        category: "General",
        unit: legacy.unit || "Piece",
        currentStock: legacy.currentQuantity,
        minimumStock: 0,
        businessId,
        version: 1,
        notes: "Auto-migrated from legacy system",
        createdBy: userId ? new mongoose.Types.ObjectId(userId) : undefined,
        updatedBy: userId ? new mongoose.Types.ObjectId(userId) : undefined
      }]);

      // 4. Create Opening Stock transaction if quantity > 0
      if (legacy.currentQuantity > 0) {
        await BusinessInventoryTransaction.create([{
          txnId: generateTxnId(),
          itemId: newItem._id,
          businessId,
          action: StockAction.STOCK_IN,
          reason: StockReason.OPENING_STOCK,
          quantity: legacy.currentQuantity,
          previousQuantity: 0,
          newQuantity: legacy.currentQuantity,
          notes: "Legacy balance auto-migration",
          userId: userId ? new mongoose.Types.ObjectId(userId) : undefined
        }]);
      }
      migratedCount++;
    }

    if (migratedCount > 0) {
      logger.info(`Migrated ${migratedCount} stock items for tenant ${businessId}`);
    }

    return { migrated: migratedCount };
  } catch (err: any) {
    logger.error("Tenant stock migration failed", { businessId, error: err.message });
    throw err;
  }
}
