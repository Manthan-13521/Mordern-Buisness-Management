export type StockStatus = "Healthy" | "Near Minimum" | "Low Stock" | "Out Of Stock";

export enum StockAction {
  STOCK_IN = "STOCK_IN",
  STOCK_OUT = "STOCK_OUT"
}

export enum StockReason {
  OPENING_STOCK = "OPENING_STOCK",
  PURCHASE = "PURCHASE",
  SALE = "SALE",
  CONSUMPTION = "CONSUMPTION",
  DAMAGE = "DAMAGE",
  WASTAGE = "WASTAGE",
  RETURN = "RETURN",
  ADJUSTMENT = "ADJUSTMENT"
}

export function computeStockStatus(currentStock: number, minimumStock: number): StockStatus {
  if (currentStock === 0) {
    return "Out Of Stock";
  } else if (currentStock <= minimumStock) {
    return "Low Stock";
  } else if (currentStock <= minimumStock * 1.25) {
    return "Near Minimum";
  } else {
    return "Healthy";
  }
}
