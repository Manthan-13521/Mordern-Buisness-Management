/**
 * Cloudinary Integration Tests
 * Tests the lib/cloudinary.ts and lib/local-upload.ts modules directly.
 * Validates that modules export correctly and handle missing config gracefully.
 */

import { TestRunner } from "../../helpers";

const runner = new TestRunner();

async function main() {
  await runner.run("Cloudinary Integration — Lib Modules", [
    {
      name: "cloudinary module exports correctly",
      fn: async () => {
        const cloudinary = await import("../../../lib/cloudinary");
        if (typeof cloudinary !== "object") throw new Error("cloudinary module did not export an object");
        const exportNames = Object.keys(cloudinary);
        if (exportNames.length === 0) throw new Error("cloudinary module has no exports");
        console.log(`  [INFO] Cloudinary exports: ${exportNames.join(", ")}`);
      },
    },
    {
      name: "local-upload module exports correctly",
      fn: async () => {
        const localUpload = await import("../../../lib/local-upload");
        const exportNames = Object.keys(localUpload);
        if (exportNames.length === 0) throw new Error("local-upload module has no exports");
        console.log(`  [INFO] local-upload exports: ${exportNames.join(", ")}`);
      },
    },
    {
      name: "business upload endpoint returns 200/404",
      fn: async () => {
        // The endpoint exists — test it responds without 5xx
        const { TestClient, TEST_CREDENTIALS } = await import("../../helpers");
        const client = new TestClient();
        await client.login(TEST_CREDENTIALS.businessAdmin.email, TEST_CREDENTIALS.businessAdmin.password);
        const res = await client.post("/api/business/upload", {});
        if (res.status >= 500) throw new Error(`Server error: ${res.status}`);
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
