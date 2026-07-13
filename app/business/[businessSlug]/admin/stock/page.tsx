import { dbConnect } from "@/lib/mongodb";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { BusinessInventoryItem } from "@/models/BusinessInventoryItem";
import { BusinessInventoryTransaction } from "@/models/BusinessInventoryTransaction";
import { StockAction } from "@/lib/stockHelper";
import { migrateTenantStock } from "@/lib/stockMigration";
import StockClientView from "./StockClientView";

export const dynamic = "force-dynamic";

export default async function EnterpriseStockPage() {
  await dbConnect();

  const session = await getServerSession(authOptions);
  const user = session?.user as any;

  if (!user) {
    return <div className="p-8 text-red-400">Unauthorized</div>;
  }

  const businessId = user.businessId;
  if (!businessId) {
    return <div className="p-8 text-red-400">Tenant context lost</div>;
  }

  // 1. Run seamless migration engine (no-op if already migrated)
  await migrateTenantStock(businessId, user.id);

  // 2. Single O(1) query — lean + projections only
  const items = await BusinessInventoryItem.find({ businessId, isArchived: false })
    .select("name sku category unit currentStock minimumStock updatedAt version")
    .sort({ updatedAt: -1 })
    .lean();

  // 3. Today's consumption — single aggregation
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const todayUsageResult = await BusinessInventoryTransaction.aggregate([
    {
      $match: {
        businessId,
        action: StockAction.STOCK_OUT,
        createdAt: { $gte: startOfDay }
      }
    },
    {
      $group: {
        _id: null,
        totalOut: { $sum: "$quantity" }
      }
    }
  ]);
  const todaysConsumption = todayUsageResult[0]?.totalOut || 0;

  // 4. Compute KPIs in-memory — zero extra queries
  let healthy = 0, nearMinimum = 0, lowStock = 0, outOfStock = 0;
  for (const item of items) {
    if (item.currentStock === 0) outOfStock++;
    else if (item.currentStock <= item.minimumStock) lowStock++;
    else if (item.currentStock <= item.minimumStock * 1.25) nearMinimum++;
    else healthy++;
  }

  const kpis = { totalProducts: items.length, healthy, nearMinimum, lowStock, outOfStock, todaysConsumption };

  // 5. Serialize ObjectIds for Client Components — stable string keys
  const serializedItems = items.map(item => ({
    ...item,
    _id: item._id.toString(),
    updatedAt: (item.updatedAt as Date).toISOString()
  }));

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto animate-in fade-in duration-300 pb-12">
      <StockClientView initialItems={serializedItems} kpis={kpis} />
    </div>
  );
}
