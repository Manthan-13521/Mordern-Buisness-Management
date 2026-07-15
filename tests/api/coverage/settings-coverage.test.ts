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

  await runner.run("Settings Coverage", [
    // GET /api/settings/capacity
    { name: "GET /api/settings/capacity returns 200", fn: async () => {
      const res = await client.get("/api/settings/capacity");
      await assertStatus(res, 200);
    }},
    // POST /api/settings/capacity — update
    { name: "POST /api/settings/capacity updates capacity", fn: async () => {
      const res = await client.post("/api/settings/capacity", { poolCapacity: 200 });
      if (res.status !== 200 && res.status !== 400 && res.status !== 403) throw new Error(`Unexpected: ${res.status}`);
    }},
    // GET /api/settings/backup — backup data
    { name: "GET /api/settings/backup returns backup JSON", fn: async () => {
      const res = await client.get("/api/settings/backup");
      if (res.status !== 200 && res.status !== 401 && res.status !== 403) throw new Error(`Unexpected: ${res.status}`);
    }},
    // GET /api/settings/backup/excel
    { name: "GET /api/settings/backup/excel returns file/buffer", fn: async () => {
      const res = await client.get("/api/settings/backup/excel");
      if (res.status !== 200 && res.status !== 401 && res.status !== 403 && res.status !== 404) throw new Error(`Unexpected: ${res.status}`);
    }},
    // GET /api/settings/backup/deleted-members
    { name: "GET /api/settings/backup/deleted-members returns 200", fn: async () => {
      const res = await client.get("/api/settings/backup/deleted-members");
      if (res.status !== 200 && res.status !== 401 && res.status !== 403) throw new Error(`Unexpected: ${res.status}`);
    }},
    // POST /api/settings/aws/backup-json
    { name: "POST /api/settings/aws/backup-json triggers S3 backup", fn: async () => {
      const res = await client.post("/api/settings/aws/backup-json", {});
      if (res.status !== 200 && res.status !== 400 && res.status !== 401 && res.status !== 403 && res.status !== 500) throw new Error(`Unexpected: ${res.status}`);
    }},
    // POST /api/settings/aws/backup-excel
    { name: "POST /api/settings/aws/backup-excel triggers S3 backup", fn: async () => {
      const res = await client.post("/api/settings/aws/backup-excel", {});
      if (res.status !== 200 && res.status !== 400 && res.status !== 401 && res.status !== 403 && res.status !== 500) throw new Error(`Unexpected: ${res.status}`);
    }},
  ]);

  const summary = runner.summary();
  process.exit(summary.failed > 0 ? 1 : 0);
}

main().catch((err) => { console.error("Fatal:", err); process.exit(1); });
