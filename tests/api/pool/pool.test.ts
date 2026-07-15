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

async function main() {
  await client.login(TEST_CREDENTIALS.poolAdmin.email, TEST_CREDENTIALS.poolAdmin.password);

  await runner.run("Pool API Tests", [
    {
      name: "GET /api/dashboard returns 200 with pool data",
      fn: async () => {
        const res = await client.get("/api/dashboard");
        await assertStatus(res, 200);
        const data = await assertJson(res);
        if (!data || typeof data !== "object") throw new Error("Dashboard returned non-object");
      },
    },
    {
      name: "GET /api/app-init returns pool configuration",
      fn: async () => {
        const res = await client.get("/api/app-init");
        await assertStatus(res, 200);
        const data = await assertJson(res);
        if (!data || typeof data !== "object") throw new Error("App-init returned non-object");
      },
    },
    {
      name: "GET /api/plans returns array of plans for this pool",
      fn: async () => {
        const res = await client.get("/api/plans");
        await assertStatus(res, 200);
        const json = await assertJson(res);
        const plans = json.data || json;
        if (!Array.isArray(plans)) throw new Error("Plans response is not an array");
        if (plans.length === 0) throw new Error("No plans found — seed may have failed");
        const plan = plans[0];
        if (!plan.name || !plan.price || !plan.durationDays) {
          throw new Error(`Plan missing required fields: ${JSON.stringify(plan)}`);
        }
      },
    },
    {
      name: "POST /api/plans creates a new plan",
      fn: async () => {
        const res = await client.post("/api/plans", {
          name: `Test Plan ${Date.now()}`,
          durationDays: 30,
          price: 999,
          features: ["pool_access", "locker"],
          isActive: true,
        });
        if (res.status !== 200 && res.status !== 201) {
          const body = await res.text();
          throw new Error(`Create plan failed: ${res.status} ${body.substring(0, 200)}`);
        }
        const data = await assertJson(res);
        if (!data._id && !data.id) throw new Error("Created plan has no _id");
      },
    },
    {
      name: "GET /api/settings/capacity returns pool capacity config",
      fn: async () => {
        const res = await client.get("/api/settings/capacity");
        await assertStatus(res, 200);
      },
    },
    {
      name: "POST /api/settings/capacity updates pool capacity",
      fn: async () => {
        const res = await client.post("/api/settings/capacity", { capacity: 150 });
        await assertStatus(res, 200);
      },
    },
    {
      name: "GET /api/occupancy returns current pool occupancy",
      fn: async () => {
        const res = await client.get("/api/occupancy");
        await assertStatus(res, 200);
      },
    },
    {
      name: "POST /api/members creates a pool member",
      fn: async () => {
        const plansRes = await client.get("/api/plans");
        const plansJson = await assertJson(plansRes);
        const plans = plansJson.data || plansJson;
        if (!Array.isArray(plans) || plans.length === 0) throw new Error("No plans available");
        const planId = plans[0]._id;
        const phone = `97777${Date.now().toString().slice(-6)}`;
        const res = await client.post("/api/members", {
          name: `Pool Member ${Date.now()}`,
          phone,
          planId,
        });
        if (res.status !== 200 && res.status !== 201) {
          const body = await res.text();
          throw new Error(`Create member failed: ${res.status} ${body.substring(0, 200)}`);
        }
        const data = await assertJson(res);
        if (!data._id && !data.memberId && !data.id) throw new Error("Created member has no ID");
      },
    },
    {
      name: "GET /api/members returns paginated member list",
      fn: async () => {
        const res = await client.get("/api/members?page=1&limit=10");
        await assertStatus(res, 200);
        const data = await assertJson(res);
        const members = data.data || data.members || data;
        if (Array.isArray(members) && members.length > 0) {
          const m = members[0];
          if (!m.name || !m.phone) throw new Error(`Member missing fields: ${JSON.stringify(m)}`);
        }
      },
    },
    {
      name: "GET /api/dashboard without auth returns 307 redirect to signin",
      fn: async () => {
        const res = await fetch("http://localhost:3000/api/dashboard", { redirect: "manual" });
        if (res.status !== 307 && res.status !== 302 && res.status !== 401) {
          throw new Error(`Expected 307/302/401 for unauthenticated, got ${res.status}`);
        }
      },
    },
  ]);

  const summary = runner.summary();
  process.exit(summary.failed > 0 ? 1 : 0);
}

main().catch((err) => { console.error("Fatal:", err); process.exit(1); });
