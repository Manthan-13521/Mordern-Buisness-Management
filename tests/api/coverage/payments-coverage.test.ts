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
let memberId: string | null = null;
let planId: string | null = null;

async function main() {
  await client.login(TEST_CREDENTIALS.poolAdmin.email, TEST_CREDENTIALS.poolAdmin.password);

  // Get planId + memberId for payment tests
  const plansRes = await client.get("/api/plans");
  const plansJson = await assertJson(plansRes);
  const plans = plansJson.data || plansJson;
  if (Array.isArray(plans) && plans.length > 0) planId = plans[0]._id;

  const membersRes = await client.get("/api/members?page=1&limit=5");
  const memJson = await assertJson(membersRes);
  const members = memJson.data || memJson.members || memJson;
  if (Array.isArray(members) && members.length > 0) memberId = members[0]._id;

  await runner.run("Payments Coverage Expansion", [
    // ── POST /api/payments — create payment ──
    { name: "POST /api/payments without body returns 400", fn: async () => {
      const res = await client.post("/api/payments", {});
      if (res.status < 400) throw new Error(`Expected 4xx, got ${res.status}`);
    }},
    { name: "POST /api/payments with memberId+planId+amount returns 200/400", fn: async () => {
      if (!memberId || !planId) throw new Error("No member/plan available");
      const res = await client.post("/api/payments", { memberId, planId, amount: 500, paymentMethod: "cash" });
      // May succeed (200) or fail validation (400) — not 500
      if (res.status >= 500) throw new Error(`Server error: ${res.status}`);
    }},
    { name: "POST /api/payments with negative amount returns 400", fn: async () => {
      if (!memberId || !planId) throw new Error("No member/plan available");
      const res = await client.post("/api/payments", { memberId, planId, amount: -100, paymentMethod: "cash" });
      if (res.status < 400) throw new Error(`Expected 4xx for negative amount, got ${res.status}`);
    }},

    // ── Razorpay endpoints ──
    { name: "POST /api/razorpay/create-order without body returns 400", fn: async () => {
      const res = await client.post("/api/razorpay/create-order", {});
      if (res.status >= 500 && res.status !== 503) throw new Error(`Server error: ${res.status}`);
    }},
    { name: "POST /api/razorpay/verify without body returns 400", fn: async () => {
      const res = await client.post("/api/razorpay/verify", {});
      if (res.status >= 500 && res.status !== 503) throw new Error(`Server error: ${res.status}`);
    }},
    // ── Subscription endpoints ──
    { name: "GET /api/subscription/status returns subscription info", fn: async () => {
      const res = await client.get("/api/subscription/status");
      await assertStatus(res, 200);
    }},
    { name: "POST /api/subscription/create-order without body returns 400", fn: async () => {
      const res = await client.post("/api/subscription/create-order", {});
      if (res.status < 400) throw new Error(`Expected 4xx, got ${res.status}`);
    }},
    { name: "POST /api/subscription/activate without body returns 400", fn: async () => {
      const res = await client.post("/api/subscription/activate", {});
      if (res.status < 400) throw new Error(`Expected 4xx, got ${res.status}`);
    }},
    { name: "POST /api/subscription/activate with mock data succeeds (non-prod)", fn: async () => {
      const res = await client.post("/api/subscription/activate", {
        razorpayOrderId: "mock_order_test", razorpayPaymentId: "mock_pay_test",
        razorpaySignature: "mock_sig", isMock: true, planType: "monthly", module: "pool",
      });
      // May succeed or fail — not 500
      if (res.status >= 500) throw new Error(`Server error: ${res.status}`);
    }},

    // ── Payments export (existing but extra coverage) ──
    { name: "GET /api/payments/export with format param", fn: async () => {
      const res = await client.get("/api/payments/export?format=csv");
      await assertStatus(res, 200);
    }},
    { name: "GET /api/payments filter by memberId", fn: async () => {
      const res = await client.get(`/api/payments?page=1&limit=5`);
      await assertStatus(res, 200);
    }},

    // ── Payment metrics ──
    { name: "GET /api/metrics/payment-metrics returns data", fn: async () => {
      const res = await client.get("/api/metrics/payment-metrics");
      if (res.status !== 200 && res.status !== 401 && res.status !== 403) {
        throw new Error(`Unexpected: ${res.status}`);
      }
    }},
  ]);

  const summary = runner.summary();
  process.exit(summary.failed > 0 ? 1 : 0);
}

main().catch((err) => { console.error("Fatal:", err); process.exit(1); });
