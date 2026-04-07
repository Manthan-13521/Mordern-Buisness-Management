/**
 * scripts/backfill-hostel-analytics.ts
 * 
 * Idempotent backfill script: populates HostelAnalytics from existing
 * HostelMember and HostelPayment records.
 * 
 * Usage:
 *   npm run backfill:dry     (Dry run without modifying DB)
 *   npm run backfill:run     (Actual run)
 * 
 * Or via TSX directly:
 *   npx tsx scripts/backfill-hostel-analytics.ts
 * 
 * Flags:
 *   --dry-run   Print what would be written without touching DB
 *   --reset     Wipe existing HostelAnalytics before backfilling  ⚠️ DESTRUCTIVE
 *   --hostelId  Only backfill for a specific hostelId
 * 
 * Safety: Uses $set with pre-computed aggregated values (NOT $inc)
 * so it is safe to re-run without double-counting.
 */

import mongoose from "mongoose";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) throw new Error("MONGODB_URI is not defined in .env.local");

const args = process.argv.slice(2);
const DRY_RUN   = args.includes("--dry-run");
const RESET     = args.includes("--reset");
const hostelArg = args.find(a => a.startsWith("--hostelId="));
const HOSTEL_FILTER = hostelArg ? hostelArg.split("=")[1] : null;

// ─── Lightweight schemas (strict: false for flexibility) ────────────────────
const MemberSchema = new mongoose.Schema({
    hostelId:  String,
    createdAt: Date,
    status:    String,
}, { strict: false });

const PaymentSchema = new mongoose.Schema({
    hostelId:    String,
    amount:      Number,
    paymentType: String,
    status:      String,
    createdAt:   Date,
}, { strict: false });

const AnalyticsSchema = new mongoose.Schema({
    hostelId:    { type: String, required: true, index: true },
    yearMonth:   { type: String, required: true, index: true },
    totalIncome: { type: Number, default: 0 },
    newMembers:  { type: Number, default: 0 },
}, { timestamps: true });
AnalyticsSchema.index({ hostelId: 1, yearMonth: 1 }, { unique: true });

// ─── Helper ─────────────────────────────────────────────────────────────────
function toYearMonth(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

// ─── Main ────────────────────────────────────────────────────────────────────
async function backfill() {
    await mongoose.connect(MONGODB_URI as string);
    console.log("✅ Connected to MongoDB");

    const Member   = mongoose.models.HostelMember   || mongoose.model("HostelMember",   MemberSchema);
    const Payment  = mongoose.models.HostelPayment  || mongoose.model("HostelPayment",  PaymentSchema);
    const Analytics = mongoose.models.HostelAnalytics || mongoose.model("HostelAnalytics", AnalyticsSchema);

    // ── Optional reset ────────────────────────────────────────────────────────
    if (RESET && !DRY_RUN) {
        const resetQuery = HOSTEL_FILTER ? { hostelId: HOSTEL_FILTER } : {};
        const deleted = await Analytics.deleteMany(resetQuery);
        console.log(`🗑️  Wiped ${deleted.deletedCount} existing HostelAnalytics docs`);
    }

    // ── Step 1: Aggregate newMembers from HostelMember.createdAt ─────────────
    console.log("\n📦 Step 1: Aggregating newMembers from HostelMember...");

    const memberPipeline: any[] = [
        // Only count members that were actually onboarded (not manually bulk-inserted)
        { $match: { ...(HOSTEL_FILTER ? { hostelId: HOSTEL_FILTER } : {}), isDeleted: { $ne: true } } },
        {
            $group: {
                _id: {
                    hostelId:  "$hostelId",
                    // Group by the month they joined (createdAt = join_date for new registrations)
                    yearMonth: {
                        $dateToString: { format: "%Y-%m", date: "$createdAt" }
                    }
                },
                newMembers: { $sum: 1 },
            }
        }
    ];

    const memberAgg: any[] = await Member.aggregate(memberPipeline);
    console.log(`   Found ${memberAgg.length} member-month buckets`);

    // ── Step 1.5: Aggregate checkedOutMembers from HostelMember.vacated_at ─────
    console.log("\n📦 Step 1.5: Aggregating checkedOutMembers from HostelMember...");
    const checkoutPipeline: any[] = [
        { $match: { 
            ...(HOSTEL_FILTER ? { hostelId: HOSTEL_FILTER } : {}), 
            status: "vacated", 
            vacated_at: { $exists: true, $ne: null } 
        } },
        {
            $group: {
                _id: {
                    hostelId:  "$hostelId",
                    yearMonth: {
                        $dateToString: { format: "%Y-%m", date: "$vacated_at" }
                    }
                },
                checkedOutMembers: { $sum: 1 },
            }
        }
    ];
    const checkoutAgg: any[] = await Member.aggregate(checkoutPipeline);
    console.log(`   Found ${checkoutAgg.length} checkout-month buckets`);

    // ── Step 2: Aggregate totalIncome from HostelPayment ─────────────────────
    console.log("\n💰 Step 2: Aggregating totalIncome from HostelPayment...");

    const paymentPipeline: any[] = [
        {
            $match: {
                ...(HOSTEL_FILTER ? { hostelId: HOSTEL_FILTER } : {}),
                status: "success",
                // Only count income-generating payment types
                paymentType: { $in: ["initial", "renewal", "balance", "refund"] },
            }
        },
        {
            $group: {
                _id: {
                    hostelId:  "$hostelId",
                    yearMonth: {
                        $dateToString: { format: "%Y-%m", date: "$createdAt" }
                    },
                    paymentType: "$paymentType",
                },
                subtotal: { $sum: "$amount" },
            }
        }
    ];

    const paymentAgg: any[] = await Payment.aggregate(paymentPipeline);
    console.log(`   Found ${paymentAgg.length} payment-type-month buckets`);

    // ── Step 3: Merge into a single map ──────────────────────────────────────
    // Map key: "hostelId::yearMonth"
    const analyticsMap = new Map<string, { hostelId: string; yearMonth: string; newMembers: number; checkedOutMembers: number; totalIncome: number }>();

    // Seed from member aggregation
    for (const row of memberAgg) {
        const key = `${row._id.hostelId}::${row._id.yearMonth}`;
        if (!analyticsMap.has(key)) {
            analyticsMap.set(key, {
                hostelId:    row._id.hostelId,
                yearMonth:   row._id.yearMonth,
                newMembers:  0,
                checkedOutMembers: 0,
                totalIncome: 0,
            });
        }
        analyticsMap.get(key)!.newMembers += row.newMembers;
    }

    // Merge from checkout aggregation
    for (const row of checkoutAgg) {
        const key = `${row._id.hostelId}::${row._id.yearMonth}`;
        if (!analyticsMap.has(key)) {
            analyticsMap.set(key, {
                hostelId:    row._id.hostelId,
                yearMonth:   row._id.yearMonth,
                newMembers:  0,
                checkedOutMembers: 0,
                totalIncome: 0,
            });
        }
        analyticsMap.get(key)!.checkedOutMembers += row.checkedOutMembers;
    }

    // Merge payment aggregation (income += for inbound, income -= for refunds)
    for (const row of paymentAgg) {
        const key = `${row._id.hostelId}::${row._id.yearMonth}`;
        if (!analyticsMap.has(key)) {
            analyticsMap.set(key, {
                hostelId:    row._id.hostelId,
                yearMonth:   row._id.yearMonth,
                newMembers:  0,
                checkedOutMembers: 0,
                totalIncome: 0,
            });
        }
        const isRefund = row._id.paymentType === "refund";
        analyticsMap.get(key)!.totalIncome += isRefund ? -row.subtotal : row.subtotal;
    }

    console.log(`\n📊 Total unique hostel-month snapshots to write: ${analyticsMap.size}`);

    if (DRY_RUN) {
        console.log("\n🔍 DRY RUN — would write:");
        for (const [key, data] of analyticsMap) {
            console.log(`   ${key} | newMembers: ${data.newMembers} | checkedOutMembers: ${data.checkedOutMembers} | totalIncome: ₹${data.totalIncome.toFixed(2)}`);
        }
        console.log("\n✅ Dry run complete. No data was written.");
        process.exit(0);
    }

    // ── Step 4: Upsert all snapshots using $set (idempotent) ─────────────────
    console.log("\n💾 Step 4: Writing analytics snapshots to DB...");

    let written = 0;
    const bulkOps = Array.from(analyticsMap.values()).map(data => ({
        updateOne: {
            filter: { hostelId: data.hostelId, yearMonth: data.yearMonth },
            update: {
                $set: {
                    totalIncome: Math.max(0, data.totalIncome), // floor at 0 — can't have negative total
                    newMembers:  data.newMembers,
                    checkedOutMembers: data.checkedOutMembers,
                }
            },
            upsert: true,
        }
    }));

    if (bulkOps.length > 0) {
        const result = await Analytics.bulkWrite(bulkOps, { ordered: false });
        written = (result.upsertedCount || 0) + (result.modifiedCount || 0);
        console.log(`   ✅ Upserted: ${result.upsertedCount} | Modified: ${result.modifiedCount}`);
    }

    console.log(`\n🎉 Backfill complete! ${written} HostelAnalytics records written.`);
    console.log("   Graphs will now show accurate historical data.\n");
    process.exit(0);
}

backfill().catch((err) => {
    console.error("❌ Backfill failed:", err);
    process.exit(1);
});
