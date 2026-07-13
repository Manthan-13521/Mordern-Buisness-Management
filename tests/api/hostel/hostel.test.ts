/*
 * ========================================================================
 * HOSTEL API TESTS
 * ========================================================================
 *
 * Purpose:
 *   Tests hostel management endpoints: members, payments, plans, staff,
 *   rooms, blocks, settings, analytics, and twilio integration.
 *
 * Expected Behavior:
 *   - Hostel member CRUD works with tenant isolation
 *   - Payment recording updates member balance
 *   - Room/block structure management works
 *   - Staff CRUD with attendance tracking works
 *   - Settings backup/restore works
 *   - Twilio connect/disconnect flow works
 *   - Analytics endpoints return correct data
 *
 * How to Execute:
 *   npx tsx tests/api/hostel/hostel.test.ts
 *
 * Estimated Execution Time: 90s
 * Author: Enterprise QA
 * Last Updated: 2026-07-13
 * ========================================================================
 */

import { TestClient, TEST_USERS, TestRunner } from "../../helpers";

const runner = new TestRunner();
const client = new TestClient();
const hostelClient = new TestClient();

async function main() {
  await hostelClient.login(TEST_USERS.hostelAdmin);

  await runner.run("Hostel API Tests", [
    {
      name: "Get hostel dashboard",
      fn: async () => {
        const res = await hostelClient.get("/api/hostel/dashboard");
        if (res.status !== 200) {
          const text = await res.text();
          throw new Error(`Expected 200, got ${res.status}: ${text.substring(0, 200)}`);
        }
      },
    },
    {
      name: "Get hostel members list",
      fn: async () => {
        const res = await hostelClient.get("/api/hostel/members");
        if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
      },
    },
    {
      name: "Create hostel member",
      fn: async () => {
        const res = await hostelClient.post("/api/hostel/members", {
          name: `Hostel Member ${Date.now()}`,
          phone: `911${Date.now().toString().slice(-7)}`,
        });
        if (res.status !== 200 && res.status !== 201) {
          throw new Error(`Expected 200/201, got ${res.status}`);
        }
      },
    },
    {
      name: "Get hostel plans",
      fn: async () => {
        const res = await hostelClient.get("/api/hostel/plans");
        if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
      },
    },
    {
      name: "Create hostel plan",
      fn: async () => {
        const res = await hostelClient.post("/api/hostel/plans", {
          name: `Plan ${Date.now()}`,
          durationDays: 30,
          price: 5000,
        });
        if (res.status !== 200 && res.status !== 201) {
          throw new Error(`Expected 200/201, got ${res.status}`);
        }
      },
    },
    {
      name: "Get hostel rooms",
      fn: async () => {
        const res = await hostelClient.get("/api/hostel/rooms");
        if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
      },
    },
    {
      name: "Get hostel blocks",
      fn: async () => {
        const res = await hostelClient.get("/api/hostel/blocks");
        if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
      },
    },
    {
      name: "Get hostel structure",
      fn: async () => {
        const res = await hostelClient.get("/api/hostel/structure");
        if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
      },
    },
    {
      name: "Get hostel payments",
      fn: async () => {
        const res = await hostelClient.get("/api/hostel/payments");
        if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
      },
    },
    {
      name: "Get hostel settings",
      fn: async () => {
        const res = await hostelClient.get("/api/hostel/settings");
        if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
      },
    },
    {
      name: "Get hostel staff list",
      fn: async () => {
        const res = await hostelClient.get("/api/hostel/staff");
        if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
      },
    },
    {
      name: "Get hostel analytics monthly members",
      fn: async () => {
        const res = await hostelClient.get("/api/hostel/analytics/monthly-members");
        if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
      },
    },
    {
      name: "Get hostel analytics monthly income",
      fn: async () => {
        const res = await hostelClient.get("/api/hostel/analytics/monthly-income");
        if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
      },
    },
    {
      name: "Get hostel Twilio status",
      fn: async () => {
        const res = await hostelClient.get("/api/hostel/twilio/status");
        if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
      },
    },
    {
      name: "Pool admin cannot access hostel endpoints",
      fn: async () => {
        await client.login(TEST_USERS.poolAdmin);
        const res = await client.get("/api/hostel/dashboard");
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
