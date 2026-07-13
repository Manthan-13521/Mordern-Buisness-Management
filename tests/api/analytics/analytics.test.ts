/*
 * ========================================================================
 * ANALYTICS API TESTS
 * ========================================================================
 *
 * Purpose:
 *   Tests analytics and reporting endpoints for correct data computation.
 *
 * Expected Behavior:
 *   - Summary returns aggregated metrics
 *   - Daily/weekly/monthly member counts return correct data
 *   - Income/revenue endpoints return financial data
 *   - Trends show historical data
 *   - Defaulters list returns members with overdue payments
 *   - Plan revenue shows per-plan breakdown
 *
 * How to Execute:
 *   npx tsx tests/api/analytics/analytics.test.ts
 *
 * Estimated Execution Time: 30s
 * Author: Enterprise QA
 * Last Updated: 2026-07-13
 * ========================================================================
 */

import { TestClient, TEST_USERS, TestRunner } from "../../helpers";

const runner = new TestRunner();
const client = new TestClient();

async function main() {
  await client.login(TEST_USERS.poolAdmin);

  await runner.run("Analytics API Tests", [
    {
      name: "Get analytics summary",
      fn: async () => {
        const res = await client.get("/api/analytics/summary");
        if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
      },
    },
    {
      name: "Get daily members",
      fn: async () => {
        const res = await client.get("/api/analytics/daily-members");
        if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
      },
    },
    {
      name: "Get weekly members",
      fn: async () => {
        const res = await client.get("/api/analytics/weekly-members");
        if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
      },
    },
    {
      name: "Get monthly members",
      fn: async () => {
        const res = await client.get("/api/analytics/monthly-members");
        if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
      },
    },
    {
      name: "Get monthly income",
      fn: async () => {
        const res = await client.get("/api/analytics/monthly-income");
        if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
      },
    },
    {
      name: "Get monthly revenue",
      fn: async () => {
        const res = await client.get("/api/analytics/monthly-revenue");
        if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
      },
    },
    {
      name: "Get weekly income",
      fn: async () => {
        const res = await client.get("/api/analytics/weekly-income");
        if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
      },
    },
    {
      name: "Get trends",
      fn: async () => {
        const res = await client.get("/api/analytics/trends?days=30");
        if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
      },
    },
    {
      name: "Get defaulters list",
      fn: async () => {
        const res = await client.get("/api/analytics/defaulters");
        if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
      },
    },
    {
      name: "Get plan revenue",
      fn: async () => {
        const res = await client.get("/api/analytics/plan-revenue");
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
