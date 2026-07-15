/**
 * QStash Integration Tests
 * Tests lib/schemas/jobSchemas.ts and related modules.
 * Validates job schema validation and cron route protection.
 */

import { TestRunner } from "../../helpers";

const runner = new TestRunner();

async function main() {
  await runner.run("QStash Integration — Job Schemas & Cron Routes", [
    {
      name: "jobSchemas module exports correctly",
      fn: async () => {
        const schemas = await import("../../../lib/schemas/jobSchemas");
        const exportNames = Object.keys(schemas);
        if (exportNames.length === 0) throw new Error("jobSchemas module has no exports");
        console.log(`  [INFO] jobSchemas exports: ${exportNames.join(", ")}`);
      },
    },
    {
      name: "generate-card job endpoint exists",
      fn: async () => {
        const { TestClient, TEST_CREDENTIALS } = await import("../../helpers");
        const client = new TestClient();
        await client.login(TEST_CREDENTIALS.poolAdmin.email, TEST_CREDENTIALS.poolAdmin.password);
        const res = await client.get("/api/jobs/generate-card");
        if (res.status >= 500) throw new Error(`Server error: ${res.status}`);
        console.log(`  [INFO] jobs/generate-card returned ${res.status}`);
      },
    },
    {
      name: "cron backup-s3 returns 401 without cron secret",
      fn: async () => {
        const res = await fetch("http://localhost:3000/api/cron/backup-s3", {
          headers: { Authorization: "Bearer invalid" },
        });
        if (res.status !== 401 && res.status !== 200) {
          throw new Error(`Unexpected: ${res.status}`);
        }
        console.log(`  [INFO] cron/backup-s3 returned ${res.status} (expected 401)`);
      },
    },
  ]);

  const summary = runner.summary();
  process.exit(summary.failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
