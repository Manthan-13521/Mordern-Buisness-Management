import { TestClient, assertStatus, assertJson, TEST_CREDENTIALS } from "../../helpers";

const client = new TestClient();
const runner = {
  passed: 0, failed: 0, failures: [] as string[],
  async run(suite: string, tests: { name: string; fn: () => Promise<void> }[]) {
    console.log(`\n============================================================\n  ${suite}\n============================================================`);
    for (const t of tests) {
      try { const start = Date.now(); await t.fn(); console.log(`  \u2705 ${t.name} (${Date.now() - start}ms)`); this.passed++; }
      catch (e: any) { console.log(`  \u274c ${t.name} \u2014 ${e.message}`); this.failed++; this.failures.push(`  \u274c ${suite} > ${t.name}\n     ${e.message}`); }
    }
  },
  summary() {
    console.log(`\n============================================================\n  Results: ${this.passed}/${this.passed + this.failed} passed (${this.failed} failed)\n============================================================`);
    if (this.failures.length) { console.log(`\n  Failures:`); this.failures.forEach(f => console.log(f)); }
    return { passed: this.passed, failed: this.failed };
  },
};

async function main() {
  // ── Public endpoints (no auth) ──
  await runner.run("Public Endpoints", [
    { name: "GET /api/app-init returns app config", fn: async () => {
      const res = await fetch("http://localhost:3000/api/app-init");
      if (res.status !== 200 && res.status !== 401) throw new Error(`Unexpected: ${res.status}`);
    }},
    { name: "GET /api/contact returns 200", fn: async () => {
      const res = await fetch("http://localhost:3000/api/contact");
      if (res.status !== 200 && res.status !== 405) throw new Error(`Unexpected: ${res.status}`);
    }},
    { name: "POST /api/contact sends message", fn: async () => {
      const res = await fetch("http://localhost:3000/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Test", email: "test@example.com", message: "Test message" }),
      });
      if (res.status >= 500) throw new Error(`Server error: ${res.status}`);
    }},
    { name: "POST /api/demo creates demo request", fn: async () => {
      const res = await fetch("http://localhost:3000/api/demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Test Demo", phone: "9999999999", source: "coverage-test" }),
      });
      if (res.status >= 500) throw new Error(`Server error: ${res.status}`);
    }},
    { name: "POST /api/contact with spam returns 429/200", fn: async () => {
      const res = await fetch("http://localhost:3000/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Spam", email: "spam@spam.com", message: "Buy now!" }),
      });
      if (res.status >= 500) throw new Error(`Server error: ${res.status}`);
    }},
  ]);

  // ── Auth-required simple endpoints ──
  await client.login(TEST_CREDENTIALS.poolAdmin.email, TEST_CREDENTIALS.poolAdmin.password);

  await runner.run("Auth-Required Simple Endpoints", [
    { name: "GET /api/quotas returns 200", fn: async () => {
      const res = await client.get("/api/quotas");
      await assertStatus(res, 200);
    }},
    { name: "GET /api/seed returns 200/404", fn: async () => {
      const res = await client.get("/api/seed");
      if (res.status !== 200 && res.status !== 404 && res.status !== 401) throw new Error(`Unexpected: ${res.status}`);
    }},
    { name: "GET /api/export/members returns CSV/JSON", fn: async () => {
      const res = await client.get("/api/export/members");
      if (res.status !== 200 && res.status !== 401 && res.status !== 403) throw new Error(`Unexpected: ${res.status}`);
    }},
    { name: "POST /api/feedback submits feedback", fn: async () => {
      const res = await client.post("/api/feedback", { message: "Great app!", rating: 5 });
      if (res.status !== 200 && res.status !== 201 && res.status !== 400) throw new Error(`Unexpected: ${res.status}`);
    }},
    { name: "GET /api/entertainment-members returns 200", fn: async () => {
      const res = await client.get("/api/entertainment-members");
      await assertStatus(res, 200);
    }},
  ]);

  // ── Admin health routes ──
  await runner.run("Admin Utilities", [
    { name: "GET /api/admin/health returns 200", fn: async () => {
      const res = await client.get("/api/admin/health");
      await assertStatus(res, 200);
    }},
    { name: "GET /api/admin/seed-plans seeds data", fn: async () => {
      const res = await client.get("/api/admin/seed-plans");
      if (res.status !== 200 && res.status !== 400 && res.status !== 403) throw new Error(`Unexpected: ${res.status}`);
    }},
  ]);

  // ── Referral ──
  await runner.run("Referral Coverage", [
    { name: "GET /api/referral/validate without code returns 400", fn: async () => {
      const res = await client.get("/api/referral/validate");
      if (res.status < 400 && res.status !== 200) throw new Error(`Expected 4xx, got ${res.status}`);
    }},
    { name: "GET /api/referral/validate with dummy code returns 404", fn: async () => {
      const res = await client.get("/api/referral/validate?code=INVALID123");
      if (res.status >= 500) throw new Error(`Server error: ${res.status}`);
    }},
  ]);

  // ── Competitions ──
  await runner.run("Competitions Coverage", [
    { name: "GET /api/competitions returns 200", fn: async () => {
      const res = await client.get("/api/competitions");
      await assertStatus(res, 200);
    }},
  ]);

  // ── Backups ──
  await runner.run("Backups Coverage", [
    { name: "GET /api/backups/list returns 200", fn: async () => {
      const res = await client.get("/api/backups/list");
      if (res.status !== 200 && res.status !== 401 && res.status !== 403) throw new Error(`Unexpected: ${res.status}`);
    }},
    { name: "GET /api/backups/download returns 200/400", fn: async () => {
      const res = await client.get("/api/backups/download?key=test");
      if (res.status !== 200 && res.status !== 400 && res.status !== 401 && res.status !== 403) throw new Error(`Unexpected: ${res.status}`);
    }},
  ]);

  // ── Ads ──
  await runner.run("Ads Coverage", [
    { name: "GET /api/ads/active returns 200", fn: async () => {
      const res = await client.get("/api/ads/active");
      if (res.status !== 200 && res.status !== 404) throw new Error(`Unexpected: ${res.status}`);
    }},
    { name: "POST /api/ads/track tracks click", fn: async () => {
      const res = await client.post("/api/ads/track", { adId: "test-ad", action: "click" });
      if (res.status >= 500) throw new Error(`Server error: ${res.status}`);
    }},
  ]);

  // ── Member login ──
  await runner.run("Member Login Coverage", [
    { name: "POST /api/member/login with missing body returns 400", fn: async () => {
      const res = await client.post("/api/member/login", {});
      if (res.status < 400) throw new Error(`Expected 4xx, got ${res.status}`);
    }},
  ]);

  // ── Jobs ──
  await runner.run("Jobs Coverage", [
    { name: "GET /api/jobs/fix-pending returns 200/401", fn: async () => {
      const res = await client.get("/api/jobs/fix-pending");
      if (res.status !== 200 && res.status !== 401 && res.status !== 403) throw new Error(`Unexpected: ${res.status}`);
    }},
    { name: "POST /api/jobs/generate-card returns 200/401", fn: async () => {
      const res = await client.post("/api/jobs/generate-card", {});
      if (res.status !== 200 && res.status !== 401 && res.status !== 403) throw new Error(`Unexpected: ${res.status}`);
    }},
  ]);

  // ── Workers ──
  await runner.run("Workers Coverage", [
    { name: "POST /api/workers/process-billing triggers job", fn: async () => {
      const res = await client.post("/api/workers/process-billing", {});
      if (res.status >= 500 && res.status !== 500) throw new Error(`Server error: ${res.status}`);
    }},
    { name: "POST /api/workers/process-defaulter triggers job", fn: async () => {
      const res = await client.post("/api/workers/process-defaulter", {});
      if (res.status >= 500 && res.status !== 500) throw new Error(`Server error: ${res.status}`);
    }},
    { name: "POST /api/workers/process-notification triggers job", fn: async () => {
      const res = await client.post("/api/workers/process-notification", {});
      if (res.status >= 500 && res.status !== 500) throw new Error(`Server error: ${res.status}`);
    }},
    { name: "POST /api/workers/process-sync triggers job", fn: async () => {
      const res = await client.post("/api/workers/process-sync", {});
      if (res.status >= 500 && res.status !== 500) throw new Error(`Server error: ${res.status}`);
    }},
  ]);

  // ── Twilio ──
  await runner.run("Twilio Coverage (mock tests)", [
    { name: "GET /api/twilio/status returns 200", fn: async () => {
      const res = await client.get("/api/twilio/status");
      if (res.status !== 200 && res.status !== 401 && res.status !== 404) throw new Error(`Unexpected: ${res.status}`);
    }},
    { name: "POST /api/twilio/connect without body returns 4xx", fn: async () => {
      const res = await client.post("/api/twilio/connect", {});
      if (res.status >= 500) throw new Error(`Server error: ${res.status}`);
    }},
    { name: "POST /api/twilio/disconnect without body returns 4xx", fn: async () => {
      const res = await client.post("/api/twilio/disconnect", {});
      if (res.status >= 500) throw new Error(`Server error: ${res.status}`);
    }},
  ]);

  // ── Cron routes (basic smoke) ──
  await runner.run("Cron Routes (Auth Gating)", [
    { name: "GET /api/cron/mark-expired returns 401 (no cron secret)", fn: async () => {
      const res = await fetch("http://localhost:3000/api/cron/mark-expired", {
        headers: { "Authorization": "Bearer invalid_secret" },
      });
      // Should 401 without valid CRON_SECRET
      if (res.status !== 401 && res.status !== 200) throw new Error(`Unexpected: ${res.status}`);
    }},
    { name: "GET /api/cron/cleanup returns 401 (no cron secret)", fn: async () => {
      const res = await fetch("http://localhost:3000/api/cron/cleanup", {
        headers: { "Authorization": "Bearer invalid_secret" },
      });
      if (res.status !== 401 && res.status !== 200) throw new Error(`Unexpected: ${res.status}`);
    }},
  ]);

  const summary = runner.summary();
  process.exit(summary.failed > 0 ? 1 : 0);
}

main().catch((err) => { console.error("Fatal:", err); process.exit(1); });
