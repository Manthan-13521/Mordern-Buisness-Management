import { dbConnect } from "@/lib/mongodb";
import { resolveUser } from "@/lib/authHelper";
import { requireBusinessId } from "@/lib/tenant";
import { BusinessInventoryItem } from "@/models/BusinessInventoryItem";
import { BusinessInventoryTransaction } from "@/models/BusinessInventoryTransaction";
import { StockAction } from "@/lib/stockHelper";
import { migrateTenantStock } from "@/lib/stockMigration";
import StockClientView from "./StockClientView";

export const dynamic = "force-dynamic";

export default async function EnterpriseStockPage() {
  await dbConnect();
  
  // Need to extract the raw Request or use alternative for resolveUser since it requires `req`.
  // Wait, in Next.js Server Components, we don't have `req`.
  // Let's use getServerSession(authOptions) directly here.
  const { getServerSession } = await import("next-auth");
  const { authOptions } = await import("@/lib/auth");
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  
  if (!user) {
    return <div>Unauthorized</div>;
  }
  const businessId = user.businessId;
  if (!businessId) {
    return <div>Tenant context lost</div>;
  }

  // 1. Run Migration seamless engine
  await migrateTenantStock(businessId, user.id);

  // 2. Fetch O(1) Dashboard Data (Lean & Projections)
  const items = await BusinessInventoryItem.find({ businessId, isArchived: false })
    .select("name sku category unit currentStock minimumStock costPrice updatedAt version")
    .lean();

  // 3. Today's usage via Aggregation
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

  // 4. Calculate KPIs dynamically
  let healthy = 0;
  let nearMinimum = 0;
  let lowStock = 0;
  let outOfStock = 0;

  for (const item of items) {
    if (item.currentStock === 0) outOfStock++;
    else if (item.currentStock <= item.minimumStock) lowStock++;
    else if (item.currentStock <= item.minimumStock * 1.25) nearMinimum++;
    else healthy++;
  }

  const kpis = {
    totalProducts: items.length,
    healthy,
    nearMinimum,
    lowStock,
    outOfStock,
    todaysConsumption
  };

  // Convert ObjectIds to strings for Client Components
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
