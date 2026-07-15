import { TestClient, assertStatus, assertJson, TEST_CREDENTIALS } from "../../helpers";

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

  // Get a plan ID for member mutation tests
  const plansRes = await client.get("/api/plans");
  const plansJson = await assertJson(plansRes);
  const plans = plansJson.data || plansJson;
  if (Array.isArray(plans) && plans.length > 0) planId = plans[0]._id;

  await runner.run("Edge Case Tests", [
    { name: "POST /api/members without body returns 400", fn: async () => {
      const res = await client.post("/api/members", {});
      if (res.status < 400) throw new Error(`Expected 4xx, got ${res.status}`);
    }},
    { name: "GET /api/members with negative pagination params", fn: async () => {
      const res = await client.get("/api/members?page=-1&limit=-1");
      await assertStatus(res, 200);
    }},
    { name: "GET /api/members with very large limit capped gracefully", fn: async () => {
      const res = await client.get("/api/members?page=1&limit=99999");
      await assertStatus(res, 200);
    }},
    { name: "POST /api/members with empty name returned 4xx", fn: async () => {
      const res = await client.post("/api/members", { name: "", phone: "9999999999", planId });
      if (res.status < 400) throw new Error(`Expected 4xx, got ${res.status}`);
    }},
    { name: "POST /api/members with empty phone returned 4xx", fn: async () => {
      const res = await client.post("/api/members", { name: "Test", phone: "", planId });
      if (res.status < 400) throw new Error(`Expected 4xx, got ${res.status}`);
    }},
    { name: "GET /api/members?status=invalid handled gracefully", fn: async () => {
      const res = await client.get("/api/members?status=invalid_status");
      await assertStatus(res, 200);
    }},
    { name: "POST /api/members with XSS in phone returns 4xx", fn: async () => {
      const res = await client.post("/api/members", { name: "XSS Test", phone: "<script>alert(1)</script>", planId });
      if (res.status < 400) throw new Error(`Expected 4xx, got ${res.status}`);
    }},
    { name: "GET /api/members with no auth returns 307 redirect", fn: async () => {
      const res = await fetch("http://localhost:3000/api/members", { redirect: "manual" });
      if (res.status !== 307 && res.status !== 302 && res.status !== 401) {
        throw new Error(`Expected 307/302/401, got ${res.status}`);
      }
    }},
    { name: "GET /api/health always returns 200 without auth", fn: async () => {
      const res = await fetch("http://localhost:3000/api/health");
      await assertStatus(res, 200);
    }},
  ]);

  const summary = runner.summary();
  process.exit(summary.failed > 0 ? 1 : 0);
}

main().catch((err) => { console.error("Fatal:", err); process.exit(1); });
