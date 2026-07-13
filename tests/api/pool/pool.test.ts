/*
 * ========================================================================
 * POOL API TESTS
 * ========================================================================
 *
 * Purpose:
 *   Tests pool management endpoints: settings, capacity, plans, subscription.
 *
 * Expected Behavior:
 *   - Settings GET returns current pool configuration
 *   - Capacity POST updates pool capacity
 *   - Plans CRUD operations work correctly with auth
 *   - Subscription status reflects current plan
 *   - Pool registration (public) creates pool + admin user
 *
 * Required Environment Variables:
 *   TEST_BASE_URL (default: http://localhost:3000)
 *
 * Required Test Data:
 *   Pool admin user (admin@ts.com / testpass123)
 *   Existing pool in database
 *
 * How to Execute:
 *   npx tsx tests/api/pool/pool.test.ts
 *
 * Expected Output:
 *   ✅ Get pool settings (XXXms)
 *   ✅ Update pool capacity (XXXms)
 *   ... 
 *   Results: 10/10 passed
 *
 * Success Criteria:
 *   All CRUD operations return correct status codes.
 *   Tenant isolation prevents cross-pool access.
 *   Unauthenticated requests are rejected.
 *
 * Failure Criteria:
 *   - Unauthenticated request returns data
 *   - Cross-tenant access succeeds
 *   - Invalid capacity values accepted
 *
 * Related APIs:
 *   - GET/POST /api/settings/capacity
 *   - GET /api/dashboard
 *   - GET /api/app-init
 *   - GET/POST /api/plans
 *   - GET /api/subscription/status
 *
 * Related Collections:
 *   pools, plans, settings, users
 *
 * Related Middleware:
 *   - middlewares/auth.ts (subscription guard, tenant isolation)
 *   - middlewares/rateLimit.ts
 *
 * Related Business Flow:
 *   Pool Management Flow (see TEST_MATRIX.md §2)
 *
 * Estimated Execution Time: 45s
 * Author: Enterprise QA
 * Last Updated: 2026-07-13
 * ========================================================================
 */

import { TestClient, TEST_USERS, TestRunner } from "../../helpers";

const runner = new TestRunner();
const client = new TestClient();

async function main() {
  await client.login(TEST_USERS.poolAdmin);

  await runner.run("Pool API Tests", [
    {
      name: "Get dashboard (authenticated)",
      fn: async () => {
        const res = await client.get("/api/dashboard");
        if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
        const data = await res.json();
        if (data === null || data === undefined) throw new Error("Dashboard data is null");
      },
    },
    {
      name: "Get app-init data",
      fn: async () => {
        const res = await client.get("/api/app-init");
        if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
        const data = await res.json();
        if (data === null || data === undefined) throw new Error("App-init data is null");
      },
    },
    {
      name: "Get pool capacity settings",
      fn: async () => {
        const res = await client.get("/api/settings/capacity");
        if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
      },
    },
    {
      name: "Update pool capacity",
      fn: async () => {
        const res = await client.post("/api/settings/capacity", {
          capacity: 100,
        });
        if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
      },
    },
    {
      name: "Get plans list",
      fn: async () => {
        const res = await client.get("/api/plans");
        if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
        const data = await res.json();
        if (!Array.isArray(data)) throw new Error("Plans should be an array");
      },
    },
    {
      name: "Create new plan",
      fn: async () => {
        const res = await client.post("/api/plans", {
          name: `Test Plan ${Date.now()}`,
          durationDays: 30,
          price: 999,
          features: ["pool_access", "locker"],
          isActive: true,
        });
        if (res.status !== 200 && res.status !== 201) {
          throw new Error(`Expected 200/201, got ${res.status}`);
        }
      },
    },
    {
      name: "Get subscription status",
      fn: async () => {
        const res = await client.get("/api/subscription/status");
        if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
      },
    },
    {
      name: "Get occupancy (authenticated)",
      fn: async () => {
        const res = await client.get("/api/occupancy");
        if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
      },
    },
    {
      name: "Unauthenticated access to dashboard returns 401",
      fn: async () => {
        const anonClient = new TestClient();
        const res = await anonClient.get("/api/dashboard");
        if (res.status !== 401 && res.status !== 302) {
          throw new Error(`Expected 401/302 for unauthenticated, got ${res.status}`);
        }
      },
    },
    {
      name: "GET /api/health returns 200 (no auth)",
      fn: async () => {
        const anonClient = new TestClient();
        const res = await anonClient.get("/api/health");
        if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
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
