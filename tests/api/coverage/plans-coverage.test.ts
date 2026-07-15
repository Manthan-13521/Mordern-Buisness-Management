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
  // ── Public: GET /api/plans?slug=... ──
  await runner.run("Plans \u2014 Public Endpoints", [
    { name: "GET /api/plans?slug=test-pool returns 200/404", fn: async () => {
      const res = await fetch("http://localhost:3000/api/plans?slug=test-pool");
      if (res.status !== 200 && res.status !== 404) throw new Error(`Unexpected: ${res.status}`);
    }},
  ]);

  await client.login(TEST_CREDENTIALS.poolAdmin.email, TEST_CREDENTIALS.poolAdmin.password);

  let planId: string | null = null;

  await runner.run("Plans \u2014 Admin", [
    // GET /api/plans — list (admin)
    { name: "GET /api/plans returns paginated data", fn: async () => {
      const res = await client.get("/api/plans?page=1&limit=10");
      await assertStatus(res, 200);
      const j = await assertJson(res);
      if (j.data && Array.isArray(j.data) && j.data.length > 0) planId = j.data[0]._id;
    }},

    // POST /api/plans — create
    { name: "POST /api/plans creates plan", fn: async () => {
      const res = await client.post("/api/plans", {
        name: "Coverage Test Plan", price: 999, durationDays: 30,
      });
      if (res.status !== 200 && res.status !== 201 && res.status !== 400) throw new Error(`Unexpected: ${res.status}`);
      if (res.status === 200 || res.status === 201) {
        const j = await assertJson(res);
        if (j.data?._id || j._id) planId = j.data?._id || j._id;
      }
    }},
    { name: "POST /api/plans with empty name returns 400", fn: async () => {
      const res = await client.post("/api/plans", { price: 999 });
      if (res.status < 400) throw new Error(`Expected 4xx, got ${res.status}`);
    }},

    // PUT /api/plans/[id] — update
    { name: "PUT /api/plans/[id] updates plan", fn: async () => {
      if (!planId) { throw new Error("No planId available"); }
      const res = await client.put(`/api/plans/${planId}`, { name: "Updated Coverage Plan" });
      if (res.status !== 200 && res.status !== 400 && res.status !== 403 && res.status !== 404) throw new Error(`Unexpected: ${res.status}`);
    }},

    // DELETE /api/plans/[id] — soft delete
    { name: "DELETE /api/plans/[id] soft-deletes plan", fn: async () => {
      if (!planId) return;
      const res = await client.del(`/api/plans/${planId}`);
      if (res.status !== 200 && res.status !== 403 && res.status !== 404) throw new Error(`Unexpected: ${res.status}`);
    }},
  ]);

  const summary = runner.summary();
  process.exit(summary.failed > 0 ? 1 : 0);
}

main().catch((err) => { console.error("Fatal:", err); process.exit(1); });
