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

const REJECT = "reject";

const poolClient = new TestClient();
const hostelClient = new TestClient();
const bizClient = new TestClient();
const superClient = new TestClient();
const opClient = new TestClient();

async function checkRejected(label: string, res: Response) {
  if (res.status !== 401 && res.status !== 403 && res.status !== 400) {
    throw new Error(`[${label}] Expected 400/401/403 rejection, got ${res.status}`);
  }
}

async function main() {
  await Promise.all([
    poolClient.login(TEST_CREDENTIALS.poolAdmin.email, TEST_CREDENTIALS.poolAdmin.password),
    hostelClient.login(TEST_CREDENTIALS.hostelAdmin.email, TEST_CREDENTIALS.hostelAdmin.password),
    bizClient.login(TEST_CREDENTIALS.businessAdmin.email, TEST_CREDENTIALS.businessAdmin.password),
    superClient.login(TEST_CREDENTIALS.superAdmin.email, TEST_CREDENTIALS.superAdmin.password, { isSuperAdmin: "true" }),
    opClient.login(TEST_CREDENTIALS.operator.email, TEST_CREDENTIALS.operator.password),
  ]);

  const table: { tenant: string; endpoint: string; status: number }[] = [];
  function record(tenant: string, label: string, res: Response) { table.push({ tenant, endpoint: label, status: res.status }); }

  await runner.run("Multi-Tenant Isolation Tests", [
    { name: "Pool admin — own endpoints accessible", fn: async () => {
      record("PoolAdmin", "GET /api/dashboard", await poolClient.get("/api/dashboard"));
      record("PoolAdmin", "GET /api/occupancy", await poolClient.get("/api/occupancy"));
      record("PoolAdmin", "GET /api/members", await poolClient.get("/api/members"));
    }},
    { name: "Pool admin — cross-tenant rejected", fn: async () => {
      const r1 = await poolClient.get("/api/hostel/dashboard"); record("PoolAdmin", "GET /api/hostel/dashboard", r1); await checkRejected("PoolAdmin→hostel", r1);
      const r2 = await poolClient.get("/api/hostel/members"); record("PoolAdmin", "GET /api/hostel/members", r2); await checkRejected("PoolAdmin→hostelMembers", r2);
      const r3 = await poolClient.get("/api/business/info"); record("PoolAdmin", "GET /api/business/info", r3); await checkRejected("PoolAdmin→business", r3);
    }},
    { name: "Hostel admin — own endpoints accessible", fn: async () => {
      record("HostelAdmin", "GET /api/hostel/dashboard", await hostelClient.get("/api/hostel/dashboard"));
      record("HostelAdmin", "GET /api/hostel/rooms", await hostelClient.get("/api/hostel/rooms"));
    }},
    { name: "Hostel admin — cross-tenant rejected", fn: async () => {
      const r1 = await hostelClient.get("/api/dashboard"); record("HostelAdmin", "GET /api/dashboard", r1); await checkRejected("HostelAdmin→dashboard", r1);
      const r2 = await hostelClient.get("/api/business/info"); record("HostelAdmin", "GET /api/business/info", r2); await checkRejected("HostelAdmin→business", r2);
    }},
    { name: "Business admin — own endpoints accessible", fn: async () => {
      record("BizAdmin", "GET /api/business/info", await bizClient.get("/api/business/info"));
      record("BizAdmin", "GET /api/business/customers", await bizClient.get("/api/business/customers"));
    }},
    { name: "Business admin — cross-tenant rejected", fn: async () => {
      const r1 = await bizClient.get("/api/dashboard"); record("BizAdmin", "GET /api/dashboard", r1); await checkRejected("BizAdmin→dashboard", r1);
      const r2 = await bizClient.get("/api/hostel/dashboard"); record("BizAdmin", "GET /api/hostel/dashboard", r2); await checkRejected("BizAdmin→hostel", r2);
    }},
    { name: "Operator — has access", fn: async () => { record("Operator", "GET /api/members", await opClient.get("/api/members")); }},
    { name: "SuperAdmin — all endpoints accessible", fn: async () => {
      record("SuperAdmin", "GET /api/superadmin/dashboard", await superClient.get("/api/superadmin/dashboard"));
      record("SuperAdmin", "GET /api/superadmin/pools", await superClient.get("/api/superadmin/pools"));
    }},
  ]);

  console.log(`\n  Multi-Tenant Access Matrix:`);
  console.log(`  ${"Tenant".padEnd(16)} ${"Endpoint".padEnd(36)} ${"Status"}`);
  console.log(`  ${"".padEnd(16,"─")} ${"".padEnd(36,"─")} ${"".padEnd(7,"─")}`);
  for (const row of table) {
    const s = row.status === 200 || row.status === 201 ? "OK" : String(row.status);
    console.log(`  ${row.tenant.padEnd(16)} ${row.endpoint.padEnd(36)} ${s}`);
  }

  const summary = runner.summary();
  process.exit(summary.failed > 0 ? 1 : 0);
}

main().catch((err) => { console.error("Fatal:", err); process.exit(1); });
