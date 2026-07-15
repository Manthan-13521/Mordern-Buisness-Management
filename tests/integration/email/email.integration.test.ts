/**
 * Email Integration Tests
 * Tests lib/emailService.ts module directly.
 * Validates exports and graceful handling when SMTP credentials are not configured.
 */

import { TestRunner } from "../../helpers";

const runner = new TestRunner();

async function main() {
  await runner.run("Email Integration — Lib Module", [
    {
      name: "emailService module exports correctly",
      fn: async () => {
        const emailService = await import("../../../lib/emailService");
        const exportNames = Object.keys(emailService);
        if (exportNames.length === 0) throw new Error("emailService module has no exports");
        console.log(`  [INFO] emailService exports: ${exportNames.join(", ")}`);
      },
    },
    {
      name: "forgot-password endpoint does not 500",
      fn: async () => {
        const { TestClient } = await import("../../helpers");
        const client = new TestClient();
        const res = await client.post("/api/auth/forgot-password", {
          email: "nonexistent@test.com",
        });
        if (res.status === 500) throw new Error("forgot-password returned 500");
        console.log(`  [INFO] forgot-password returned ${res.status}`);
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
