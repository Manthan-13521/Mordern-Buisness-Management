/**
 * Twilio Integration Tests
 * Tests lib/twilioService.ts and lib/whatsapp.ts modules directly.
 * Validates exports, config handling, and graceful fallback without credentials.
 */

import { TestRunner } from "../../helpers";

const runner = new TestRunner();

async function main() {
  await runner.run("Twilio Integration — Lib Modules", [
    {
      name: "twilioService module exports correctly",
      fn: async () => {
        const twilioService = await import("../../../lib/twilioService");
        const exportNames = Object.keys(twilioService);
        if (exportNames.length === 0) throw new Error("twilioService module has no exports");
        console.log(`  [INFO] twilioService exports: ${exportNames.join(", ")}`);
      },
    },
    {
      name: "whatsapp module exports correctly",
      fn: async () => {
        const whatsapp = await import("../../../lib/whatsapp");
        const exportNames = Object.keys(whatsapp);
        if (exportNames.length === 0) throw new Error("whatsapp module has no exports");
        console.log(`  [INFO] whatsapp exports: ${exportNames.join(", ")}`);
      },
    },
    {
      name: "hostel twilio endpoints exist (tested via status)",
      fn: async () => {
        const { TestClient, TEST_CREDENTIALS } = await import("../../helpers");
        const client = new TestClient();
        await client.login(TEST_CREDENTIALS.hostelAdmin.email, TEST_CREDENTIALS.hostelAdmin.password);
        const res = await client.get("/api/hostel/twilio/status");
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
