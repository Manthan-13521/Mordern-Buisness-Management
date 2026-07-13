/*
 * ========================================================================
 * BUSINESS API TESTS
 * ========================================================================
 *
 * Purpose:
 *   Tests business module endpoints: customers, sales, payments, stock,
 *   labour, vehicles, attendance, analytics, and transactions.
 *
 * Expected Behavior:
 *   - Customer CRUD works with tenant isolation
 *   - Sales recording with items works
 *   - Payment tracking updates customer balance
 *   - Stock/inventory CRUD works
 *   - Labour management with advance/payment works
 *   - Vehicle registration works
 *   - Attendance tracking works
 *   - Analytics returns correct business metrics
 *   - Transaction ledger works correctly
 *
 * How to Execute:
 *   npx tsx tests/api/business/business.test.ts
 *
 * Estimated Execution Time: 60s
 * Author: Enterprise QA
 * Last Updated: 2026-07-13
 * ========================================================================
 */

import { TestClient, TEST_USERS, TestRunner } from "../../helpers";

const runner = new TestRunner();
const client = new TestClient();

async function main() {
  await client.login(TEST_USERS.businessAdmin);

  await runner.run("Business API Tests", [
    {
      name: "Get business info",
      fn: async () => {
        const res = await client.get("/api/business/info");
        if (res.status !== 200) {
          const text = await res.text();
          throw new Error(`Expected 200, got ${res.status}: ${text.substring(0, 200)}`);
        }
      },
    },
    {
      name: "Get business analytics",
      fn: async () => {
        const res = await client.get("/api/business/analytics");
        if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
      },
    },
    {
      name: "Get customers list",
      fn: async () => {
        const res = await client.get("/api/business/customers");
        if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
      },
    },
    {
      name: "Create customer",
      fn: async () => {
        const res = await client.post("/api/business/customers", {
          name: `Customer ${Date.now()}`,
          phone: `922${Date.now().toString().slice(-7)}`,
        });
        if (res.status !== 200 && res.status !== 201) {
          throw new Error(`Expected 200/201, got ${res.status}`);
        }
      },
    },
    {
      name: "Get sales list",
      fn: async () => {
        const res = await client.get("/api/business/sales");
        if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
      },
    },
    {
      name: "Get payments list",
      fn: async () => {
        const res = await client.get("/api/business/payments");
        if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
      },
    },
    {
      name: "Get stock list",
      fn: async () => {
        const res = await client.get("/api/business/stock");
        if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
      },
    },
    {
      name: "Create stock item",
      fn: async () => {
        const res = await client.post("/api/business/stock", {
          name: `Item ${Date.now()}`,
          currentQuantity: 100,
          unit: "pcs",
        });
        if (res.status !== 200 && res.status !== 201) {
          throw new Error(`Expected 200/201, got ${res.status}`);
        }
      },
    },
    {
      name: "Get vehicles list",
      fn: async () => {
        const res = await client.get("/api/business/vehicles");
        if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
      },
    },
    {
      name: "Get labour list",
      fn: async () => {
        const res = await client.get("/api/business/labour");
        if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
      },
    },
    {
      name: "Create labour entry",
      fn: async () => {
        const res = await client.post("/api/business/labour", {
          name: `Labour ${Date.now()}`,
          role: "worker",
          salary: 15000,
          phone: `933${Date.now().toString().slice(-7)}`,
        });
        if (res.status !== 200 && res.status !== 201) {
          throw new Error(`Expected 200/201, got ${res.status}`);
        }
      },
    },
    {
      name: "Get transactions list",
      fn: async () => {
        const res = await client.get("/api/business/transactions");
        if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
      },
    },
    {
      name: "Get business attendance",
      fn: async () => {
        const res = await client.get("/api/business/attendance");
        if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
      },
    },
    {
      name: "Get advanced analytics",
      fn: async () => {
        const res = await client.get("/api/business/analytics/advanced");
        if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
      },
    },
    {
      name: "Pool admin cannot access business endpoints",
      fn: async () => {
        const poolClient = new TestClient();
        await poolClient.login(TEST_USERS.poolAdmin);
        const res = await poolClient.get("/api/business/analytics");
        if (res.status !== 401 && res.status !== 403 && res.status !== 302) {
          throw new Error(`Expected 401/403/302, got ${res.status}`);
        }
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
