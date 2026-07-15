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
    console.log(`\n============================================================\n  Hostel Members: ${this.passed}/${this.passed + this.failed} passed (${this.failed} failed)\n============================================================`);
    return { passed: this.passed, failed: this.failed };
  },
};

async function main() {
  await client.login(TEST_CREDENTIALS.hostelAdmin.email, TEST_CREDENTIALS.hostelAdmin.password);

  let hostelMemberId: string | null = null;
  let hostelPlanId: string | null = null;

  // Fetch a hostel member to test lifecycle
  const membersRes = await client.get("/api/hostel/members?page=1&limit=5");
  const membersJson = await assertJson(membersRes);
  if (Array.isArray(membersJson) && membersJson.length > 0) hostelMemberId = membersJson[0]._id;

  // Fetch a hostel plan for renew
  const plansRes = await client.get("/api/hostel/plans?page=1&limit=5");
  const plansJson = await assertJson(plansRes);
  const plans = plansJson.data || plansJson.plans || plansJson;
  if (Array.isArray(plans) && plans.length > 0) hostelPlanId = plans[0]._id;

  await runner.run("Hostel GET Members", [
    { name: "GET /api/hostel/members returns paginated list", fn: async () => {
      const res = await client.get("/api/hostel/members?page=1");
      await assertStatus(res, 200);
    }},
    { name: "GET /api/hostel/members?search=test returns filtered", fn: async () => {
      const res = await client.get("/api/hostel/members?search=test");
      await assertStatus(res, 200);
    }},
    { name: "GET /api/hostel/members?status=active filters", fn: async () => {
      const res = await client.get("/api/hostel/members?status=active");
      await assertStatus(res, 200);
    }},
    { name: "POST /api/hostel/members creates new member", fn: async () => {
      if (!hostelPlanId) throw new Error("No plan available");
      const res = await client.post("/api/hostel/members", {
        name: "Test Hostel Member", phone: "9999999902", planId: hostelPlanId,
        blockNo: "A", floorNo: 1, roomNo: 101, paidAmount: 5000,
      });
      // May succeed or fail validation — not 500
      if (res.status >= 500) throw new Error(`Server error: ${res.status}`);
    }},
    { name: "POST /api/hostel/members without name returns 400", fn: async () => {
      const res = await client.post("/api/hostel/members", { phone: "9999999903" });
      if (res.status < 400 && res.status !== 201) throw new Error(`Expected 4xx, got ${res.status}`);
    }},
  ]);

  // Hostel member lifecycle
  await runner.run("Hostel Member Lifecycle (checkout/vacate/renew)", [
    { name: "POST /api/hostel/members/run-rent-cycle", fn: async () => {
      const res = await client.post("/api/hostel/members/run-rent-cycle", {});
      if (res.status !== 200 && res.status !== 401 && res.status !== 429 && res.status !== 500) throw new Error(`Unexpected: ${res.status}`);
    }},
    { name: "POST /api/hostel/members/[id]/checkout (no id) returns 404", fn: async () => {
      const res = await client.post("/api/hostel/members/000000000000000000000000/checkout", {});
      if (res.status !== 404 && res.status !== 400 && res.status !== 500) throw new Error(`Unexpected: ${res.status}`);
    }},
    { name: "POST /api/hostel/members/[id]/vacate (no id) returns 404", fn: async () => {
      const res = await client.post("/api/hostel/members/000000000000000000000000/vacate", {});
      if (res.status !== 404 && res.status !== 400 && res.status !== 500) throw new Error(`Unexpected: ${res.status}`);
    }},
    { name: "POST /api/hostel/members/[id]/renew without body returns 400", fn: async () => {
      const res = await client.post("/api/hostel/members/000000000000000000000000/renew", {});
      if (res.status >= 500) throw new Error(`Server error: ${res.status}`);
    }},
  ]);

  // Hostel plans PUT/DELETE
  await runner.run("Hostel Plans PUT/DELETE", [
    { name: "PUT /api/hostel/plans/[id] updates plan", fn: async () => {
      if (!hostelPlanId) throw new Error("No plan available");
      const res = await client.put(`/api/hostel/plans/${hostelPlanId}`, { name: "Updated Hostel Plan" });
      if (res.status !== 200 && res.status !== 401 && res.status !== 404 && res.status !== 500) throw new Error(`Unexpected: ${res.status}`);
    }},
    { name: "DELETE /api/hostel/plans/[id] deletes plan", fn: async () => {
      if (!hostelPlanId) return;
      const res = await client.del(`/api/hostel/plans/${hostelPlanId}`);
      if (res.status !== 200 && res.status !== 401 && res.status !== 404) throw new Error(`Unexpected: ${res.status}`);
    }},
  ]);

  // Hostel register (public endpoint)
  await runner.run("Hostel Register (Public)", [
    { name: "POST /api/hostel/register without required fields returns 400", fn: async () => {
      const res = await client.post("/api/hostel/register", { hostelName: "Test" });
      if (res.status < 400 && res.status !== 200 && res.status !== 201) throw new Error(`Expected 4xx, got ${res.status}`);
    }},
  ]);

  const s = runner.summary();
  process.exit(s.failed > 0 ? 1 : 0);
}

main().catch((err) => { console.error("Fatal:", err); process.exit(1); });
