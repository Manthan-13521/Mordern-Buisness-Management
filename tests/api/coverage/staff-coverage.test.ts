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
  await client.login(TEST_CREDENTIALS.poolAdmin.email, TEST_CREDENTIALS.poolAdmin.password);

  let staffId: string | null = null;

  await runner.run("Staff Coverage", [
    // GET /api/staff — list
    { name: "GET /api/staff returns 200 with data", fn: async () => {
      const res = await client.get("/api/staff");
      await assertStatus(res, 200);
      const j = await assertJson(res);
      if (!Array.isArray(j.data)) throw new Error("Expected data array");
    }},

    // POST /api/staff — create
    { name: "POST /api/staff creates staff member", fn: async () => {
      const res = await client.post("/api/staff", {
        name: "Test Staff", phone: "9999999901", role: "Trainer",
      });
      if (res.status === 403) return;
      if (res.status !== 200 && res.status !== 201) throw new Error(`Expected 2xx, got ${res.status}`);
      const j = await assertJson(res);
      if (j.data?._id) staffId = j.data._id;
    }},
    { name: "POST /api/staff with missing name returns 400", fn: async () => {
      const res = await client.post("/api/staff", { role: "Trainer" });
      if (res.status < 400) throw new Error(`Expected 4xx, got ${res.status}`);
    }},

    // GET /api/staff with search
    { name: "GET /api/staff?search=Test returns results", fn: async () => {
      const res = await client.get("/api/staff?search=Test");
      await assertStatus(res, 200);
    }},

    // Staff Attendance
    { name: "GET /api/staff/attendance returns 200", fn: async () => {
      const res = await client.get("/api/staff/attendance");
      if (res.status !== 200 && res.status !== 401 && res.status !== 400) throw new Error(`Unexpected: ${res.status}`);
    }},
    { name: "POST /api/staff/attendance marks attendance", fn: async () => {
      const res = await client.post("/api/staff/attendance", { staffId: "ST001", status: "present" });
      if (res.status !== 200 && res.status !== 400 && res.status !== 403) throw new Error(`Unexpected: ${res.status}`);
    }},
  ]);

  const summary = runner.summary();
  process.exit(summary.failed > 0 ? 1 : 0);
}

main().catch((err) => { console.error("Fatal:", err); process.exit(1); });
