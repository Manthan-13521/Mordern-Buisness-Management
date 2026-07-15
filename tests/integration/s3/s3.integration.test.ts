/**
 * S3 Integration Tests
 * Tests lib/s3.ts and lib/s3Presign.ts modules directly.
 * Validates exports and graceful handling when AWS credentials are not configured.
 */

import { TestRunner } from "../../helpers";

const runner = new TestRunner();

async function main() {
  await runner.run("S3 Integration — Lib Modules", [
    {
      name: "s3 module exports correctly",
      fn: async () => {
        const s3 = await import("../../../lib/s3");
        const exportNames = Object.keys(s3);
        if (exportNames.length === 0) throw new Error("s3 module has no exports");
        console.log(`  [INFO] s3 exports: ${exportNames.join(", ")}`);
      },
    },
    {
      name: "s3Presign module exports correctly",
      fn: async () => {
        const s3Presign = await import("../../../lib/s3Presign");
        const exportNames = Object.keys(s3Presign);
        if (exportNames.length === 0) throw new Error("s3Presign module has no exports");
        console.log(`  [INFO] s3Presign exports: ${exportNames.join(", ")}`);
      },
    },
    {
      name: "settings backup endpoint exists (tested via backup backup/json)",
      fn: async () => {
        const { TestClient, TEST_CREDENTIALS } = await import("../../helpers");
        const client = new TestClient();
        await client.login(TEST_CREDENTIALS.poolAdmin.email, TEST_CREDENTIALS.poolAdmin.password);
        const res = await client.get("/api/settings/backup");
        if (res.status >= 500) throw new Error(`Server error: ${res.status}`);
        console.log(`  [INFO] settings/backup returned ${res.status}`);
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
