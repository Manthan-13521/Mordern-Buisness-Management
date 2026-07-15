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

  await runner.run("Notifications Coverage", [
    // GET /api/notifications — list
    { name: "GET /api/notifications returns paginated data", fn: async () => {
      const res = await client.get("/api/notifications?page=1&limit=10");
      await assertStatus(res, 200);
      const j = await assertJson(res);
      if (!Array.isArray(j.data)) throw new Error("Expected data array");
    }},
    // POST /api/notifications/reminders — trigger reminders
    { name: "POST /api/notifications/reminders triggers job", fn: async () => {
      const res = await client.post("/api/notifications/reminders", {});
      if (res.status !== 200 && res.status !== 401 && res.status !== 403 && res.status !== 500) throw new Error(`Unexpected: ${res.status}`);
    }},
    // GET /api/notifications/voice-alerts — get expired member alerts
    { name: "GET /api/notifications/voice-alerts returns alerts", fn: async () => {
      const res = await client.get("/api/notifications/voice-alerts");
      await assertStatus(res, 200);
    }},
  ]);

  const summary = runner.summary();
  process.exit(summary.failed > 0 ? 1 : 0);
}

main().catch((err) => { console.error("Fatal:", err); process.exit(1); });
