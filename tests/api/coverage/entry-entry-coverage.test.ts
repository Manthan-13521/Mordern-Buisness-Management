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
    console.log(`\n============================================================\n  Entry POST: ${this.passed}/${this.passed + this.failed} passed (${this.failed} failed)\n============================================================`);
    return { passed: this.passed, failed: this.failed };
  },
};

async function main() {
  await client.login(TEST_CREDENTIALS.poolAdmin.email, TEST_CREDENTIALS.poolAdmin.password);

  await runner.run("POST /api/entry", [
    { name: "POST /api/entry without body returns 400", fn: async () => {
      const res = await client.post("/api/entry", {});
      await assertStatus(res, 400);
    }},
    { name: "POST /api/entry with invalid QR returns 404", fn: async () => {
      const res = await client.post("/api/entry", { qrPayload: "nonexistent_member_id" });
      if (res.status !== 404 && res.status !== 400 && res.status !== 403) throw new Error(`Unexpected: ${res.status}`);
    }},
    { name: "POST /api/entry with empty payload returns 400", fn: async () => {
      const res = await client.post("/api/entry", { qrPayload: "" });
      await assertStatus(res, 400);
    }},
    { name: "POST /api/entry with JWT format returns 404/lower", fn: async () => {
      const res = await client.post("/api/entry", { qrPayload: "eyJhbGciOiJIUzI1NiJ9.dGVzdA.test" });
      if (res.status >= 500) throw new Error(`Server error: ${res.status}`);
    }},
    { name: "POST /api/entry with memberId:token format", fn: async () => {
      const res = await client.post("/api/entry", { qrPayload: "test_member_id:test_token" });
      if (res.status >= 500) throw new Error(`Server error: ${res.status}`);
    }},
  ]);

  // Auth gating
  await runner.run("POST /api/entry — Auth Gating", [
    { name: "POST /api/entry without auth returns 401/307", fn: async () => {
      const anonClient = new TestClient();
      const res = await anonClient.post("/api/entry", { qrPayload: "test" });
      if (res.status !== 401 && res.status !== 307) throw new Error(`Expected 401/307, got ${res.status}`);
    }},
  ]);

  const s = runner.summary();
  process.exit(s.failed > 0 ? 1 : 0);
}

main().catch((err) => { console.error("Fatal:", err); process.exit(1); });
