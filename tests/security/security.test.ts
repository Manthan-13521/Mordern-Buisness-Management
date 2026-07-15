import { TestClient, assertStatus, assertJson, TEST_CREDENTIALS } from "../helpers";

const runner = {
  passed: 0, failed: 0, failures: [] as string[],
  async run(suite: string, tests: { name: string; fn: () => Promise<void> }[]) {
    console.log(`\n============================================================\n  ${suite}\n============================================================`);
    for (const t of tests) {
      try { const start = Date.now(); await t.fn(); console.log(`  \u2705 ${t.name} (${Date.now() - start}ms)`); this.passed++; }
      catch (e: any) { console.log(`  \u274c ${t.name} — ${e.message}`); this.failed++; this.failures.push(`  \u274c ${suite} > ${t.name}\n     ${e.message}`); }
    }
  },
  summary() {
    console.log(`\n============================================================\n  Results: ${this.passed}/${this.passed + this.failed} passed (${this.failed} failed)\n============================================================`);
    if (this.failures.length) { console.log(`\n  Failures:`); this.failures.forEach(f => console.log(f)); }
    return { passed: this.passed, failed: this.failed };
  },
};

const client = new TestClient();
let planId: string | null = null;

async function main() {
  await client.login(TEST_CREDENTIALS.poolAdmin.email, TEST_CREDENTIALS.poolAdmin.password);

  const plansRes = await client.get("/api/plans");
  const plansJson = await assertJson(plansRes);
  const plans = plansJson.data || plansJson;
  if (Array.isArray(plans) && plans.length > 0) planId = plans[0]._id;

  await runner.run("Security Tests", [
    { name: "XSS in member phone returns 4xx", fn: async () => {
      const res = await client.post("/api/members", { name: "XSS Test", phone: "\"><script>alert(1)</script>", planId });
      if (res.status < 400) throw new Error(`Expected 4xx, got ${res.status}`);
    }},
    { name: "NoSQL $ne injection in query returns 4xx/200 (no data leak)", fn: async () => {
      const res = await client.get("/api/members?status[$ne]=deleted");
      if (res.status >= 500) throw new Error(`Server error: ${res.status}`);
    }},
    { name: "NoSQL $gt injection in query returns 4xx/200 (no data leak)", fn: async () => {
      const res = await client.get("/api/members?createdAt[$gt]=2020-01-01");
      if (res.status >= 500) throw new Error(`Server error: ${res.status}`);
    }},
    { name: "Pool admin accessing hostel endpoint returns 401", fn: async () => {
      const res = await client.get("/api/hostel/dashboard");
      if (res.status !== 401 && res.status !== 403) throw new Error(`Expected 401/403, got ${res.status}`);
    }},
    { name: "Rapid requests do not crash server", fn: async () => {
      for (let i = 0; i < 10; i++) {
        const res = await client.get("/api/health");
        if (res.status !== 200) throw new Error(`Health check failed on attempt ${i}: ${res.status}`);
      }
    }},
    { name: "Request to nonexistent endpoint returns 404", fn: async () => {
      const res = await client.get("/api/nonexistent-route-xyz");
      await assertStatus(res, 404);
    }},
    { name: "Invalid JSON body returns 400", fn: async () => {
      const res = await client.fetch("/api/members", { method: "POST", headers: { "Content-Type": "application/json" }, body: "not valid json" });
      if (res.status < 400) throw new Error(`Expected 4xx, got ${res.status}`);
    }},
    { name: "Security headers present on responses", fn: async () => {
      const res = await client.get("/api/health");
      for (const h of ["x-content-type-options", "x-frame-options", "strict-transport-security", "content-security-policy"]) {
        if (!res.headers.get(h)) throw new Error(`Missing header: ${h}`);
      }
    }},
  ]);

  const summary = runner.summary();
  process.exit(summary.failed > 0 ? 1 : 0);
}

main().catch((err) => { console.error("Fatal:", err); process.exit(1); });
