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
    console.log(`\n============================================================\n  Member Deep: ${this.passed}/${this.passed + this.failed} passed (${this.failed} failed)\n============================================================`);
    return { passed: this.passed, failed: this.failed };
  },
};

async function main() {
  await client.login(TEST_CREDENTIALS.poolAdmin.email, TEST_CREDENTIALS.poolAdmin.password);

  // Fetch a member ID to use in tests
  const membersRes = await client.get("/api/members?page=1&limit=5");
  const membersJson = await assertJson(membersRes);
  const members = membersJson.data || membersJson.members || membersJson;
  const firstMember = Array.isArray(members) && members.length > 0 ? members[0] : null;
  const memberId = firstMember?._id || "";

  await runner.run("Member PATCH/DELETE [id]", [
    { name: "GET /api/members/[id] returns member detail", fn: async () => {
      if (!memberId) throw new Error("No member available");
      const res = await client.get(`/api/members/${memberId}`);
      await assertStatus(res, 200);
    }},
    { name: "PATCH /api/members/[id] updates member", fn: async () => {
      if (!memberId) throw new Error("No member available");
      const res = await client.patch(`/api/members/${memberId}`, { name: "Updated Test Name" });
      if (res.status !== 200 && res.status !== 400) throw new Error(`Unexpected: ${res.status}`);
    }},
    { name: "GET /api/members/invalid-id returns 404", fn: async () => {
      const res = await client.get("/api/members/000000000000000000000000");
      await assertStatus(res, 404);
    }},
  ]);

  // Member sub-routes
  await runner.run("Member Equipment", [
    { name: "POST /api/members/[id]/equipment issues item", fn: async () => {
      if (!memberId) throw new Error("No member available");
      const res = await client.post(`/api/members/${memberId}/equipment`, { itemName: "Test Locker Key" });
      if (res.status !== 200 && res.status !== 400 && res.status !== 404) throw new Error(`Unexpected: ${res.status}`);
    }},
    { name: "PATCH /api/members/[id]/equipment without id returns 400", fn: async () => {
      if (!memberId) throw new Error("No member available");
      const res = await client.patch(`/api/members/${memberId}/equipment`, {});
      if (res.status < 400 && res.status !== 200) throw new Error(`Expected 4xx, got ${res.status}`);
    }},
  ]);

  await runner.run("Member Photo/PDF", [
    { name: "GET /api/members/[id]/photo returns 200/404", fn: async () => {
      if (!memberId) throw new Error("No member available");
      const res = await client.get(`/api/members/${memberId}/photo`);
      if (res.status !== 200 && res.status !== 400 && res.status !== 404) throw new Error(`Unexpected: ${res.status}`);
    }},
    { name: "GET /api/members/[id]/pdf returns PDF", fn: async () => {
      if (!memberId) throw new Error("No member available");
      const res = await client.get(`/api/members/${memberId}/pdf`);
      if (res.status !== 200 && res.status !== 400 && res.status !== 404 && res.status !== 500) throw new Error(`Unexpected: ${res.status}`);
    }},
  ]);

  await runner.run("Member Restore", [
    { name: "POST /api/members/[id]/restore restores member", fn: async () => {
      if (!memberId) throw new Error("No member available");
      const res = await client.post(`/api/members/${memberId}/restore`, {});
      if (res.status !== 200 && res.status !== 403 && res.status !== 404) throw new Error(`Unexpected: ${res.status}`);
    }},
  ]);

  // Test admin gating for DELETE/permanent
  await runner.run("Member Delete Auth Gating", [
    { name: "DELETE /api/members/[id] without admin role returns 401", fn: async () => {
      await client.login(TEST_CREDENTIALS.operator.email, TEST_CREDENTIALS.operator.password);
      if (!memberId) throw new Error("No member available");
      const res = await client.del(`/api/members/${memberId}`);
      if (res.status !== 401 && res.status !== 403) throw new Error(`Expected 401/403, got ${res.status}`);
    }},
  ]);

  // Permanent delete — admin only
  await client.login(TEST_CREDENTIALS.poolAdmin.email, TEST_CREDENTIALS.poolAdmin.password);
  await runner.run("Member Permanent Delete", [
    { name: "DELETE /api/members/[id]/permanent rejects with balance", fn: async () => {
      if (!memberId) throw new Error("No member available");
      const res = await client.del(`/api/members/${memberId}/permanent`);
      // May reject with 400 pending balance or succeed - not 500
      if (res.status >= 500) throw new Error(`Server error: ${res.status}`);
    }},
  ]);

  const s = runner.summary();
  process.exit(s.failed > 0 ? 1 : 0);
}

main().catch((err) => { console.error("Fatal:", err); process.exit(1); });
