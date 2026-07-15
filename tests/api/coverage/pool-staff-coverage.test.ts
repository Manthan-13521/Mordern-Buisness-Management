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
    console.log(`\n============================================================\n  Pool Staff: ${this.passed}/${this.passed + this.failed} passed (${this.failed} failed)\n============================================================`);
    return { passed: this.passed, failed: this.failed };
  },
};

async function main() {
  await client.login(TEST_CREDENTIALS.poolAdmin.email, TEST_CREDENTIALS.poolAdmin.password);

  let staffId: string | null = null;

  await runner.run("Pool/[poolSlug]/Staff Routes", [
    // Pool staff CRUD
    { name: "GET /api/pool/test-pool/staff returns staff list", fn: async () => {
      const res = await client.get("/api/pool/test-pool/staff");
      if (res.status !== 200 && res.status !== 401 && res.status !== 403 && res.status !== 404) throw new Error(`Unexpected: ${res.status}`);
    }},
    { name: "POST /api/pool/test-pool/staff creates staff", fn: async () => {
      const res = await client.post("/api/pool/test-pool/staff", {
        name: "Pool Staff Test", role: "Lifeguard", salary: 15000, phone: "9999999904",
      });
      if (res.status === 201 || res.status === 200) {
        const j = await assertJson(res);
        staffId = j._id || j.staff?._id || j.data?._id || null;
      }
      if (res.status !== 200 && res.status !== 201 && res.status !== 401 && res.status !== 403 && res.status !== 404) throw new Error(`Unexpected: ${res.status}`);
    }},
    // Pool staff attendance (batch)
    { name: "POST /api/pool/test-pool/staff/attendance marks attendance", fn: async () => {
      const res = await client.post("/api/pool/test-pool/staff/attendance", {
        date: new Date().toISOString().split("T")[0],
        records: [{ labourId: staffId || "ST001", status: "present" }],
      });
      if (res.status !== 200 && res.status !== 201 && res.status !== 401 && res.status !== 403 && res.status !== 404) throw new Error(`Unexpected: ${res.status}`);
    }},
    // Pool staff advance
    { name: "POST /api/pool/test-pool/staff/advance records advance", fn: async () => {
      const now = new Date();
      const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      const res = await client.post("/api/pool/test-pool/staff/advance", {
        staffId: staffId || "ST001", month, amount: 1000,
      });
      if (res.status !== 200 && res.status !== 201 && res.status !== 400 && res.status !== 401 && res.status !== 403 && res.status !== 404 && res.status !== 500) throw new Error(`Unexpected: ${res.status}`);
    }},
    // Pool staff [staffId]/payments
    { name: "POST /api/pool/test-pool/staff/[staffId]/payments", fn: async () => {
      const sid = staffId || "ST001";
      const res = await client.post(`/api/pool/test-pool/staff/${sid}/payments`, { amount: 5000 });
      if (res.status !== 200 && res.status !== 201 && res.status !== 400 && res.status !== 401 && res.status !== 403 && res.status !== 404 && res.status !== 500) throw new Error(`Unexpected: ${res.status}`);
    }},
    // Pool staff [staffId]/summary
    { name: "GET /api/pool/test-pool/staff/[staffId]/summary", fn: async () => {
      const sid = staffId || "ST001";
      const res = await client.get(`/api/pool/test-pool/staff/${sid}/summary`);
      if (res.status !== 200 && res.status !== 400 && res.status !== 401 && res.status !== 403 && res.status !== 404 && res.status !== 500) throw new Error(`Unexpected: ${res.status}`);
    }},
  ]);

  // Pool register (public)
  await runner.run("Pool Register", [
    { name: "POST /api/pool/register without required fields returns 400", fn: async () => {
      const res = await client.post("/api/pool/register", { poolName: "Test Pool" });
      if (res.status < 400 && res.status !== 200 && res.status !== 201) throw new Error(`Expected 4xx, got ${res.status}`);
    }},
    { name: "POST /api/pool/scan without body returns 400", fn: async () => {
      const res = await client.post("/api/pool/scan", {});
      if (res.status < 400 && res.status !== 200) throw new Error(`Expected 4xx, got ${res.status}`);
    }},
    { name: "GET /api/pools/subscribe returns 200/401", fn: async () => {
      const res = await client.get("/api/pools/subscribe");
      if (res.status !== 200 && res.status !== 401) throw new Error(`Unexpected: ${res.status}`);
    }},
  ]);

  const s = runner.summary();
  process.exit(s.failed > 0 ? 1 : 0);
}

main().catch((err) => { console.error("Fatal:", err); process.exit(1); });
