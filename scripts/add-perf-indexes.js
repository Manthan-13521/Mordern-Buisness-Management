/**
 * scripts/add-perf-indexes.js
 * ═══════════════════════════════════════════════════════════════════
 * Performance-critical indexes for 500-user concurrency target.
 * Run ONCE before load testing.
 *
 * Usage:
 *   node scripts/add-perf-indexes.js
 *
 * These indexes target the exact query patterns used by:
 *   - /api/members (GET)
 *   - /api/dashboard (GET)
 *   - /api/payments (GET)
 *   - /api/app-init (GET)
 * ═══════════════════════════════════════════════════════════════════
 */

const mongoose = require("mongoose");
const dotenv = require("dotenv");
dotenv.config({ path: ".env.local" });

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
    console.error("❌ MONGODB_URI not found in .env.local");
    process.exit(1);
}

async function createPerformanceIndexes() {
    console.log("🔌 Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected.\n");

    const db = mongoose.connection.db;

    const indexOps = [
        // ══════════════════════════════════════════════════════════════
        // MEMBERS collection — hot path indexes
        // ══════════════════════════════════════════════════════════════
        {
            collection: "members",
            index: { poolId: 1, isDeleted: 1, createdAt: -1 },
            name: "perf_members_list",
            reason: "Members GET: base filter + sort",
        },
        {
            collection: "members",
            index: { poolId: 1, isDeleted: 1, isExpired: 1, createdAt: -1 },
            name: "perf_members_status_list",
            reason: "Members GET with status filter",
        },
        {
            collection: "members",
            index: { poolId: 1, planEndDate: 1, expiryDate: 1 },
            name: "perf_members_active_check",
            reason: "Dashboard: active member count",
        },
        {
            collection: "members",
            index: { poolId: 1, createdAt: 1 },
            name: "perf_members_year_count",
            reason: "Dashboard: total members this year",
        },

        // ══════════════════════════════════════════════════════════════
        // ENTERTAINMENT_MEMBERS collection — mirror indexes
        // ══════════════════════════════════════════════════════════════
        {
            collection: "entertainment_members",
            index: { poolId: 1, isDeleted: 1, createdAt: -1 },
            name: "perf_ent_members_list",
            reason: "Members GET: entertainment filter",
        },
        {
            collection: "entertainment_members",
            index: { poolId: 1, planEndDate: 1, expiryDate: 1 },
            name: "perf_ent_active_check",
            reason: "Dashboard: active entertainment count",
        },
        {
            collection: "entertainment_members",
            index: { poolId: 1, createdAt: 1 },
            name: "perf_ent_year_count",
            reason: "Dashboard: total entertainment this year",
        },

        // ══════════════════════════════════════════════════════════════
        // PAYMENTS collection — hot path indexes
        // ══════════════════════════════════════════════════════════════
        {
            collection: "payments",
            index: { poolId: 1, status: 1, createdAt: -1 },
            name: "perf_payments_revenue",
            reason: "Dashboard: revenue aggregation",
        },
        {
            collection: "payments",
            index: { poolId: 1, isArchived: 1, isDeleted: 1, createdAt: -1 },
            name: "perf_payments_list",
            reason: "Payments GET: list query",
        },

        // ══════════════════════════════════════════════════════════════
        // ENTRY_LOGS collection — dashboard entries count
        // ══════════════════════════════════════════════════════════════
        {
            collection: "entrylogs",
            index: { poolId: 1, status: 1, scanTime: 1 },
            name: "perf_entries_today",
            reason: "Dashboard: today's entries aggregation",
        },

        // ══════════════════════════════════════════════════════════════
        // SUBSCRIPTIONS collection — defaulter check
        // ══════════════════════════════════════════════════════════════
        {
            collection: "subscriptions",
            index: { poolId: 1, memberId: 1, status: 1 },
            name: "perf_sub_defaulter",
            reason: "Members GET: batch defaulter resolution",
        },

        // ══════════════════════════════════════════════════════════════
        // LEDGERS collection — defaulter check
        // ══════════════════════════════════════════════════════════════
        {
            collection: "ledgers",
            index: { poolId: 1, memberId: 1 },
            name: "perf_ledger_defaulter",
            reason: "Members GET: batch ledger lookup",
        },

        // ══════════════════════════════════════════════════════════════
        // DELETED_MEMBERS collection — dashboard total count
        // ══════════════════════════════════════════════════════════════
        {
            collection: "deletedmembers",
            index: { poolId: 1, "fullData.createdAt": 1 },
            name: "perf_deleted_year_count",
            reason: "Dashboard: immutable total members count",
        },

        // ══════════════════════════════════════════════════════════════
        // BUSINESS MODULE — transactions, attendance
        // ══════════════════════════════════════════════════════════════
        {
            collection: "businesstransactions",
            index: { businessId: 1, category: 1, date: -1 },
            name: "perf_biz_tx_list",
            reason: "Business sales/payments GET: list + filter by category",
        },
        {
            collection: "businesstransactions",
            index: { businessId: 1, category: 1, transactionType: 1, date: -1 },
            name: "perf_biz_analytics",
            reason: "Business analytics: revenue aggregation",
        },
        {
            collection: "businesstransactions",
            index: { businessId: 1, customerId: 1, date: -1 },
            name: "perf_biz_customer_tx",
            reason: "Business: customer-specific transaction lookup",
        },
        {
            collection: "businessattendances",
            index: { businessId: 1, date: -1 },
            name: "perf_biz_attendance",
            reason: "Business attendance GET: date-sorted list",
        },
        {
            collection: "businessattendances",
            index: { businessId: 1, labourId: 1, date: 1 },
            name: "perf_biz_attendance_upsert",
            reason: "Business attendance POST: upsert by labour+date",
        },

        // ══════════════════════════════════════════════════════════════
        // HOSTEL MODULE — members, payments, analytics
        // ══════════════════════════════════════════════════════════════
        {
            collection: "hostelmembers",
            index: { hostelId: 1, isDeleted: 1, status: 1, createdAt: -1 },
            name: "perf_hostel_members_list",
            reason: "Hostel members GET: filtered + sorted list",
        },
        {
            collection: "hostelmembers",
            index: { hostelId: 1, blockId: 1, isDeleted: 1 },
            name: "perf_hostel_block_members",
            reason: "Hostel dashboard: block-scoped member queries",
        },
        {
            collection: "hostelmembers",
            index: { hostelId: 1, status: 1, due_date: 1 },
            name: "perf_hostel_expiring",
            reason: "Hostel dashboard: expiring members count",
        },
        {
            collection: "hostelpayments",
            index: { hostelId: 1, isDeleted: 1, createdAt: -1 },
            name: "perf_hostel_payments_list",
            reason: "Hostel payments GET: paginated list",
        },
        {
            collection: "hostelanalytics",
            index: { hostelId: 1, yearMonth: 1 },
            name: "perf_hostel_analytics",
            reason: "Hostel dashboard: income snapshots",
        },

        // ══════════════════════════════════════════════════════════════
        // NOTIFICATION_LOGS — notification list
        // ══════════════════════════════════════════════════════════════
        {
            collection: "notificationlogs",
            index: { poolId: 1, date: -1 },
            name: "perf_notif_list",
            reason: "Notifications GET: paginated list",
        },
    ];

    let created = 0;
    let skipped = 0;
    let failed = 0;

    for (const op of indexOps) {
        try {
            const collection = db.collection(op.collection);
            await collection.createIndex(op.index, {
                name: op.name,
                background: true,
            });
            console.log(`  ✅ ${op.collection}.${op.name}`);
            console.log(`     → ${op.reason}`);
            created++;
        } catch (err) {
            if (err.codeName === "IndexOptionsConflict" || err.code === 85) {
                console.log(`  ⏭️  ${op.collection}.${op.name} (already exists, skipped)`);
                skipped++;
            } else {
                console.error(`  ❌ ${op.collection}.${op.name}: ${err.message}`);
                failed++;
            }
        }
    }

    console.log(`\n══════════════════════════════════════════`);
    console.log(`  Created: ${created}  |  Skipped: ${skipped}  |  Failed: ${failed}`);
    console.log(`══════════════════════════════════════════`);

    // Verify with explain on key queries
    console.log("\n🔍 Verifying index usage...");
    try {
        const membersCol = db.collection("members");
        const explain = await membersCol.find(
            { poolId: "test", isDeleted: false },
            { explain: true }
        ).toArray();
        console.log("  Members query plan available — check Atlas for IXSCAN confirmation");
    } catch {
        console.log("  (Explain check skipped — run against Atlas directly)");
    }

    await mongoose.disconnect();
    console.log("\n✅ Done. Disconnected.");
}

createPerformanceIndexes().catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
});
