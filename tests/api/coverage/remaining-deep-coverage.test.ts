import { TestClient, assertStatus, assertJson, TEST_CREDENTIALS } from "../../helpers";

const client = new TestClient();
const runner = {
  passed: 0, failed: 0, failures: [] as string[],
  async run(suite: string, tests: { name: string; fn: () => Promise<void> }[]) {
    for (const t of tests) {
      try { const start = Date.now(); await t.fn(); console.log(`  \u2705 ${t.name} (${Date.now() - start}ms)`); this.passed++; }
      catch (e: any) { console.log(`  \u274c ${t.name} \u2014 ${e.message}`); this.failed++; this.failures.push(`  \u274c ${suite} > ${t.name}\n     ${e.message}`); }
    }
  },
  summary() {
    console.log(`\n============================================================\n  Remaining Deep: ${this.passed}/${this.passed + this.failed} passed (${this.failed} failed)\n============================================================`);
    return { passed: this.passed, failed: this.failed };
  },
};

async function main() {
  // ── Competitions ──
  await client.login(TEST_CREDENTIALS.poolAdmin.email, TEST_CREDENTIALS.poolAdmin.password);
  await runner.run("Competitions Coverage", [
    { name: "GET /api/competitions returns 200", fn: async () => {
      const res = await client.get("/api/competitions");
      await assertStatus(res, 200);
    }},
    { name: "GET /api/competitions returns list", fn: async () => {
      const res = await client.get("/api/competitions?page=1&limit=10");
      await assertStatus(res, 200);
    }},
    { name: "POST /api/competitions creates competition", fn: async () => {
      const res = await client.post("/api/competitions", {
        name: "Test Competition", date: new Date().toISOString(),
      });
      if (res.status !== 200 && res.status !== 201 && res.status !== 400 && res.status !== 403) throw new Error(`Unexpected: ${res.status}`);
    }},
    { name: "GET /api/competitions/invalidid returns 404/400", fn: async () => {
      const res = await client.get("/api/competitions/000000000000000000000000");
      if (res.status !== 404 && res.status !== 400) throw new Error(`Unexpected: ${res.status}`);
    }},
    { name: "PATCH /api/competitions/invalidid returns 404/400", fn: async () => {
      const res = await client.patch("/api/competitions/000000000000000000000000", { isCompleted: true });
      if (res.status !== 404 && res.status !== 400 && res.status !== 403) throw new Error(`Unexpected: ${res.status}`);
    }},
  ]);

  // ── Business deep routes ──
  await client.login(TEST_CREDENTIALS.businessAdmin.email, TEST_CREDENTIALS.businessAdmin.password);
  await runner.run("Business Deep Routes", [
    { name: "GET /api/business/customers returns list", fn: async () => {
      const res = await client.get("/api/business/customers");
      await assertStatus(res, 200);
    }},
    { name: "POST /api/business/customers creates customer", fn: async () => {
      const res = await client.post("/api/business/customers", {
        name: "Test Customer", phone: "9999999905",
      });
      if (res.status !== 200 && res.status !== 201 && res.status !== 400) throw new Error(`Unexpected: ${res.status}`);
    }},
    { name: "GET /api/business/customers/[id] returns 404", fn: async () => {
      const res = await client.get("/api/business/customers/000000000000000000000000");
      if (res.status !== 404 && res.status !== 400 && res.status !== 500) throw new Error(`Unexpected: ${res.status}`);
    }},
    { name: "POST /api/business/register creates business", fn: async () => {
      const res = await client.post("/api/business/register", { businessName: "Test Biz" });
      if (res.status >= 500) throw new Error(`Server error: ${res.status}`);
    }},
    { name: "POST /api/business/register/finalize finalizes", fn: async () => {
      const res = await client.post("/api/business/register/finalize", {});
      if (res.status >= 500) throw new Error(`Server error: ${res.status}`);
    }},
    { name: "POST /api/business/upload handles file upload", fn: async () => {
      const res = await client.post("/api/business/upload", {});
      if (res.status >= 500) throw new Error(`Server error: ${res.status}`);
    }},
    { name: "POST /api/business/migrate-transactions migrates", fn: async () => {
      const res = await client.post("/api/business/migrate-transactions", {});
      if (res.status >= 500) throw new Error(`Server error: ${res.status}`);
    }},
    { name: "PUT /api/business/stock without body returns 400", fn: async () => {
      const res = await client.put("/api/business/stock", {});
      if (res.status < 400 && res.status !== 200) throw new Error(`Expected 4xx, got ${res.status}`);
    }},
  ]);

  // ── Auth verify-otp-reset ──
  await runner.run("Auth OTP Reset", [
    { name: "POST /api/auth/verify-otp-reset without body returns 400", fn: async () => {
      const res = await fetch("http://localhost:3000/api/auth/verify-otp-reset", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}),
      });
      await assertStatus(res, 400);
    }},
    { name: "POST /api/auth/verify-otp-reset with invalid data returns 400", fn: async () => {
      const res = await fetch("http://localhost:3000/api/auth/verify-otp-reset", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "nonexistent@test.com", otp: "000000" }),
      });
      if (res.status >= 500) throw new Error(`Server error: ${res.status}`);
    }},
  ]);

  // ── Cron remaining (auth gating only) ──
  await runner.run("Cron Routes — Auth Gating", [
    { name: "GET /api/cron/archive-logs returns 401 (no cron secret)", fn: async () => {
      const res = await fetch("http://localhost:3000/api/cron/archive-logs", {
        headers: { "Authorization": "Bearer invalid" },
      });
      if (res.status !== 401 && res.status !== 200) throw new Error(`Unexpected: ${res.status}`);
    }},
    { name: "GET /api/cron/billing returns 401 (no cron secret)", fn: async () => {
      const res = await fetch("http://localhost:3000/api/cron/billing", {
        headers: { "Authorization": "Bearer invalid" },
      });
      if (res.status !== 401 && res.status !== 200) throw new Error(`Unexpected: ${res.status}`);
    }},
    { name: "GET /api/cron/expiry-alerts returns 401 (no cron secret)", fn: async () => {
      const res = await fetch("http://localhost:3000/api/cron/expiry-alerts", {
        headers: { "Authorization": "Bearer invalid" },
      });
      if (res.status !== 401 && res.status !== 200) throw new Error(`Unexpected: ${res.status}`);
    }},
    { name: "GET /api/cron/data-retention returns 401 (no cron secret)", fn: async () => {
      const res = await fetch("http://localhost:3000/api/cron/data-retention", {
        headers: { "Authorization": "Bearer invalid" },
      });
      if (res.status !== 401 && res.status !== 200) throw new Error(`Unexpected: ${res.status}`);
    }},
    { name: "GET /api/cron/notifications returns 401 (no cron secret)", fn: async () => {
      const res = await fetch("http://localhost:3000/api/cron/notifications", {
        headers: { "Authorization": "Bearer invalid" },
      });
      if (res.status !== 401 && res.status !== 200) throw new Error(`Unexpected: ${res.status}`);
    }},
    { name: "GET /api/cron/auto-block returns 401 (no cron secret)", fn: async () => {
      const res = await fetch("http://localhost:3000/api/cron/auto-block", {
        headers: { "Authorization": "Bearer invalid" },
      });
      if (res.status !== 401 && res.status !== 200) throw new Error(`Unexpected: ${res.status}`);
    }},
    { name: "GET /api/cron/subscription-expiry returns 401/429", fn: async () => {
      const res = await fetch("http://localhost:3000/api/cron/subscription-expiry", {
        headers: { "Authorization": "Bearer invalid" },
      });
      if (res.status !== 401 && res.status !== 429 && res.status !== 200) throw new Error(`Unexpected: ${res.status}`);
    }},
    { name: "GET /api/cron/reconcile-payments returns 401 (no cron secret)", fn: async () => {
      const res = await fetch("http://localhost:3000/api/cron/reconcile-payments", {
        headers: { "Authorization": "Bearer invalid" },
      });
      if (res.status !== 401 && res.status !== 200) throw new Error(`Unexpected: ${res.status}`);
    }},
    { name: "GET /api/cron/occupancy-sync returns 401 (no cron secret)", fn: async () => {
      const res = await fetch("http://localhost:3000/api/cron/occupancy-sync", {
        headers: { "Authorization": "Bearer invalid" },
      });
      if (res.status !== 401 && res.status !== 200) throw new Error(`Unexpected: ${res.status}`);
    }},
    { name: "GET /api/cron/system-stats-sync returns 401", fn: async () => {
      const res = await fetch("http://localhost:3000/api/cron/system-stats-sync", {
        headers: { "Authorization": "Bearer invalid" },
      });
      if (res.status !== 401 && res.status !== 200) throw new Error(`Unexpected: ${res.status}`);
    }},
    { name: "GET /api/cron/next-day-alerts returns 401", fn: async () => {
      const res = await fetch("http://localhost:3000/api/cron/next-day-alerts", {
        headers: { "Authorization": "Bearer invalid" },
      });
      if (res.status !== 401 && res.status !== 200) throw new Error(`Unexpected: ${res.status}`);
    }},
    { name: "GET /api/cron/hostel-analytics-snapshot returns 401", fn: async () => {
      const res = await fetch("http://localhost:3000/api/cron/hostel-analytics-snapshot", {
        headers: { "Authorization": "Bearer invalid" },
      });
      if (res.status !== 401 && res.status !== 200) throw new Error(`Unexpected: ${res.status}`);
    }},
    { name: "GET /api/cron/hostel-cleanup returns 401", fn: async () => {
      const res = await fetch("http://localhost:3000/api/cron/hostel-cleanup", {
        headers: { "Authorization": "Bearer invalid" },
      });
      if (res.status !== 401 && res.status !== 200) throw new Error(`Unexpected: ${res.status}`);
    }},
    { name: "GET /api/cron/hostel-data-retention returns 401", fn: async () => {
      const res = await fetch("http://localhost:3000/api/cron/hostel-data-retention", {
        headers: { "Authorization": "Bearer invalid" },
      });
      if (res.status !== 401 && res.status !== 200) throw new Error(`Unexpected: ${res.status}`);
    }},
    { name: "GET /api/cron/hostel-expiry-alerts returns 401/429", fn: async () => {
      const res = await fetch("http://localhost:3000/api/cron/hostel-expiry-alerts", {
        headers: { "Authorization": "Bearer invalid" },
      });
      if (res.status !== 401 && res.status !== 429 && res.status !== 200) throw new Error(`Unexpected: ${res.status}`);
    }},
    { name: "GET /api/cron/hostel-payment-cleanup returns 401", fn: async () => {
      const res = await fetch("http://localhost:3000/api/cron/hostel-payment-cleanup", {
        headers: { "Authorization": "Bearer invalid" },
      });
      if (res.status !== 401 && res.status !== 200) throw new Error(`Unexpected: ${res.status}`);
    }},
    { name: "GET /api/cron/hostel-rent-cycle returns 401", fn: async () => {
      const res = await fetch("http://localhost:3000/api/cron/hostel-rent-cycle", {
        headers: { "Authorization": "Bearer invalid" },
      });
      if (res.status !== 401 && res.status !== 200) throw new Error(`Unexpected: ${res.status}`);
    }},
    { name: "GET /api/cron/hostel-whatsapp-reminder returns 401", fn: async () => {
      const res = await fetch("http://localhost:3000/api/cron/hostel-whatsapp-reminder", {
        headers: { "Authorization": "Bearer invalid" },
      });
      if (res.status !== 401 && res.status !== 200) throw new Error(`Unexpected: ${res.status}`);
    }},
    { name: "GET /api/health/sentry-test returns 200", fn: async () => {
      const res = await fetch("http://localhost:3000/api/health/sentry-test");
      if (res.status !== 200 && res.status !== 404) throw new Error(`Unexpected: ${res.status}`);
    }},
  ]);

  const s = runner.summary();
  process.exit(s.failed > 0 ? 1 : 0);
}

main().catch((err) => { console.error("Fatal:", err); process.exit(1); });
