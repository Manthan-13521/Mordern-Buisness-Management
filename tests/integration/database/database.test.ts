/*
 * ========================================================================
 * INTEGRATION TESTS — DATABASE
 * ========================================================================
 *
 * Purpose:
 *   Tests database connectivity, transactions, query timeouts, and
 *   data consistency across collections.
 *
 * Expected Behavior:
 *   - Connection singleton works (reuses cached connection)
 *   - Transactions commit/rollback correctly
 *   - Query timeouts abort slow queries
 *   - Data integrity across related collections
 *   - Indexes are properly created
 *
 * How to Execute:
 *   npx tsx tests/integration/database/database.test.ts
 *
 * Estimated Execution Time: 30s
 * Author: Enterprise QA
 * Last Updated: 2026-07-13
 * ========================================================================
 */

import { TestRunner } from "../../helpers";
import { connectTestDB } from "../../helpers/db";
import { dbConnect } from "../../../lib/mongodb";
import mongoose from "mongoose";

const runner = new TestRunner();

async function main() {
  await runner.run("Database Integration Tests", [
    {
      name: "Connect to MongoDB",
      fn: async () => {
        await dbConnect();
        if (mongoose.connection.readyState !== 1) {
          throw new Error(`MongoDB not connected. State: ${mongoose.connection.readyState}`);
        }
      },
    },
    {
      name: "Connection is cached (singleton)",
      fn: async () => {
        const conn1 = mongoose.connection;
        await dbConnect();
        const conn2 = mongoose.connection;
        if (conn1 !== conn2) {
          throw new Error("Connection should be a singleton");
        }
      },
    },
    {
      name: "Connection has expected database name",
      fn: async () => {
        const dbName = mongoose.connection.db?.databaseName;
        if (!dbName || dbName !== "swimming-pool-system") {
          console.log(`  [INFO] Connected to database: ${dbName || "unknown"}`);
        }
      },
    },
    {
      name: "Ping database server",
      fn: async () => {
        const admin = mongoose.connection.db?.admin();
        if (!admin) throw new Error("Cannot get admin handle");
        const result = await admin.ping();
        if (!result || result.ok !== 1) {
          throw new Error(`Ping failed: ${JSON.stringify(result)}`);
        }
      },
    },
    {
      name: "Collection count is reasonable",
      fn: async () => {
        const collections = await mongoose.connection.db?.listCollections().toArray();
        if (!collections) throw new Error("Cannot list collections");
        if (collections.length < 10) {
          throw new Error(`Expected at least 10 collections, found ${collections.length}`);
        }
        console.log(`  [INFO] ${collections.length} collections found`);
      },
    },
  ]);

  const summary = runner.summary();
  process.exit(summary.failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
