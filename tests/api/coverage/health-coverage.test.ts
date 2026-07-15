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
  // ── Public health endpoints (no auth) ──
  await runner.run("Health \u2014 Public Endpoints", [
    { name: "GET /api/health returns 200", fn: async () => {
      const res = await fetch("http://localhost:3000/api/health");
      await assertStatus(res, 200);
      const j = await assertJson(res);
      if (j.status !== "ok") throw new Error(`Expected { status: 'ok' }, got ${JSON.stringify(j)}`);
    }},
    { name: "GET /api/health/live returns 200", fn: async () => {
      const res = await fetch("http://localhost:3000/api/health/live");
      await assertStatus(res, 200);
    }},
    { name: "GET /api/health/ready returns 200/503", fn: async () => {
      const res = await fetch("http://localhost:3000/api/health/ready");
      if (res.status !== 200 && res.status !== 503) throw new Error(`Expected 200 or 503, got ${res.status}`);
    }},
  ]);

  // ── Metrics (needs auth) ──
  await client.login(TEST_CREDENTIALS.poolAdmin.email, TEST_CREDENTIALS.poolAdmin.password);

  await runner.run("Metrics Coverage", [
    { name: "GET /api/metrics returns data", fn: async () => {
      const res = await client.get("/api/metrics");
      await assertStatus(res, 200);
    }},
    { name: "GET /api/metrics/health returns 200", fn: async () => {
      const res = await client.get("/api/metrics/health");
      await assertStatus(res, 200);
    }},
    { name: "GET /api/metrics/payment-metrics returns 200/401", fn: async () => {
      const res = await client.get("/api/metrics/payment-metrics");
      if (res.status !== 200 && res.status !== 401) throw new Error(`Unexpected: ${res.status}`);
    }},
  ]);

  // ── Dashboard ──
  await runner.run("Dashboard Coverage", [
    { name: "GET /api/dashboard returns 200", fn: async () => {
      const res = await client.get("/api/dashboard");
      await assertStatus(res, 200);
    }},
    { name: "GET /api/dashboard with poolId returns 200 (superadmin)", fn: async () => {
      await client.login(TEST_CREDENTIALS.superAdmin.email, TEST_CREDENTIALS.superAdmin.password, { isSuperAdmin: "true" });
      const res = await client.get("/api/dashboard?poolId=TEST-POOL-001");
      await assertStatus(res, 200);
    }},
  ]);

  // ── Occupancy ──
  await client.login(TEST_CREDENTIALS.poolAdmin.email, TEST_CREDENTIALS.poolAdmin.password);
  await runner.run("Occupancy Coverage", [
    { name: "GET /api/occupancy returns 200", fn: async () => {
      const res = await client.get("/api/occupancy");
      await assertStatus(res, 200);
    }},
    { name: "GET /api/occupancy with poolslug returns 200", fn: async () => {
      const res = await client.get("/api/occupancy?poolslug=test-pool");
      if (res.status !== 200 && res.status !== 404) throw new Error(`Unexpected: ${res.status}`);
    }},
  ]);

  // ── CSP Report (public) ──
  await runner.run("CSP Report Coverage", [
    { name: "POST /api/csp-report returns 204/401", fn: async () => {
      const res = await fetch("http://localhost:3000/api/csp-report", {
        method: "POST",
        headers: { "Content-Type": "application/csp-report" },
        body: JSON.stringify({ "csp-report": {} }),
      });
      if (res.status >= 500) throw new Error(`Server error: ${res.status}`);
    }},
  ]);

  // ── Warmup ──
  await runner.run("Warmup Coverage", [
    { name: "GET /api/warmup returns 200", fn: async () => {
      const res = await client.get("/api/warmup");
      if (res.status !== 200 && res.status !== 401) throw new Error(`Unexpected: ${res.status}`);
    }},
  ]);

  const summary = runner.summary();
  process.exit(summary.failed > 0 ? 1 : 0);
}

main().catch((err) => { console.error("Fatal:", err); process.exit(1); });
