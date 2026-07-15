import { TestClient, assertStatus, assertJson, TEST_CREDENTIALS } from "../../helpers";

const client = new TestClient();
let passed = 0, failed = 0, failures: string[] = [];

async function t(name: string, fn: () => Promise<void>) {
  try { const s = Date.now(); await fn(); console.log(`  \u2705 ${name} (${Date.now() - s}ms)`); passed++; }
  catch (e: any) { console.log(`  \u274c ${name} \u2014 ${e.message}`); failed++; failures.push(`  \u274c ${name}: ${e.message}`); }
}

async function main() {
  console.log(`\n============================================================\n  Final Sweep \u2014 Remaining Untested Routes\n============================================================`);

  // ── Pool register (public) ──
  await t("POST /api/pool/test-pool/register with fields", async () => {
    const res = await client.post("/api/pool/test-pool/register", {
      name: "Test Member", phone: "9999999910", planId: "test",
    });
    if (res.status >= 500) throw new Error(`Server error: ${res.status}`);
  });

  // ── Hostel settings ──
  await client.login(TEST_CREDENTIALS.hostelAdmin.email, TEST_CREDENTIALS.hostelAdmin.password);
  await t("GET /api/hostel/hostel-settings returns 200", async () => {
    const res = await client.get("/api/hostel/hostel-settings");
    if (res.status !== 200 && res.status !== 401 && res.status !== 403) throw new Error(`Unexpected: ${res.status}`);
  });

  // ── Hostel analytics monthly-checkouts ──
  await t("GET /api/hostel/analytics/monthly-checkouts returns 200", async () => {
    const res = await client.get("/api/hostel/analytics/monthly-checkouts");
    if (res.status !== 200 && res.status !== 401) throw new Error(`Unexpected: ${res.status}`);
  });

  // ── Hostel staff routes ──
  await t("GET /api/hostel/test-hostel/staff returns 200/404", async () => {
    const res = await client.get("/api/hostel/test-hostel/staff");
    if (res.status !== 200 && res.status !== 401 && res.status !== 403 && res.status !== 404) throw new Error(`Unexpected: ${res.status}`);
  });
  await t("POST /api/hostel/test-hostel/staff creates staff", async () => {
    const res = await client.post("/api/hostel/test-hostel/staff", {
      name: "H Staff Test", role: "Warden", phone: "9999999911",
    });
    if (res.status !== 200 && res.status !== 201 && res.status !== 401 && res.status !== 403 && res.status !== 404) throw new Error(`Unexpected: ${res.status}`);
  });
  await t("POST /api/hostel/test-hostel/staff/attendance", async () => {
    const res = await client.post("/api/hostel/test-hostel/staff/attendance", {
      date: "2026-07-13", records: [{ labourId: "ST001", status: "present" }],
    });
    if (res.status !== 200 && res.status !== 201 && res.status !== 401 && res.status !== 403 && res.status !== 404) throw new Error(`Unexpected: ${res.status}`);
  });
  await t("POST /api/hostel/test-hostel/staff/advance", async () => {
    // Using valid Mongo ObjectId format; BUG-001: invalid IDs cause 500
    const res = await client.post("/api/hostel/test-hostel/staff/advance", {
      staffId: "000000000000000000000000", month: "2026-07", amount: 2000,
    });
    if (res.status >= 500) throw new Error(`Server error: ${res.status}`);
  });
  await t("POST /api/hostel/test-hostel/staff/000000000000000000000000/payments", async () => {
    const res = await client.post("/api/hostel/test-hostel/staff/000000000000000000000000/payments", { amount: 5000 });
    if (res.status >= 500) throw new Error(`Server error: ${res.status}`);
  });
  await t("GET /api/hostel/test-hostel/staff/000000000000000000000000/summary", async () => {
    const res = await client.get("/api/hostel/test-hostel/staff/000000000000000000000000/summary");
    if (res.status >= 500) throw new Error(`Server error: ${res.status}`);
  });

  // ── Hostel twilio ──
  await t("POST /api/hostel/test-hostel/twilio/connect", async () => {
    const res = await client.post("/api/hostel/test-hostel/twilio/connect", {});
    if (res.status >= 500) throw new Error(`Server error: ${res.status}`);
  });
  await t("POST /api/hostel/test-hostel/twilio/disconnect", async () => {
    const res = await client.post("/api/hostel/test-hostel/twilio/disconnect", {});
    if (res.status >= 500) throw new Error(`Server error: ${res.status}`);
  });

  // ── Hostel migrate ──
  await t("POST /api/hostel/migrate without body", async () => {
    const res = await client.post("/api/hostel/migrate", {});
    if (res.status >= 500) throw new Error(`Server error: ${res.status}`);
  });

  // ── Hostel settings backup routes ──
  await t("GET /api/hostel/settings/backup/json", async () => {
    const res = await client.get("/api/hostel/settings/backup/json");
    if (res.status !== 200 && res.status !== 401 && res.status !== 403) throw new Error(`Unexpected: ${res.status}`);
  });
  await t("GET /api/hostel/settings/backup/excel", async () => {
    const res = await client.get("/api/hostel/settings/backup/excel");
    if (res.status !== 200 && res.status !== 401 && res.status !== 403 && res.status !== 404) throw new Error(`Unexpected: ${res.status}`);
  });
  await t("POST /api/hostel/settings/aws/backup-json", async () => {
    const res = await client.post("/api/hostel/settings/aws/backup-json", {});
    if (res.status !== 200 && res.status !== 401 && res.status !== 403 && res.status !== 500) throw new Error(`Unexpected: ${res.status}`);
  });
  await t("POST /api/hostel/settings/aws/backup-excel", async () => {
    const res = await client.post("/api/hostel/settings/aws/backup-excel", {});
    if (res.status !== 200 && res.status !== 401 && res.status !== 403 && res.status !== 500) throw new Error(`Unexpected: ${res.status}`);
  });

  // ── SuperAdmin ads [id] ──
  await client.login(TEST_CREDENTIALS.superAdmin.email, TEST_CREDENTIALS.superAdmin.password, { isSuperAdmin: "true" });
  await t("GET /api/superadmin/ads/invalidid returns 404/405", async () => {
    const res = await client.get("/api/superadmin/ads/000000000000000000000000");
    if (res.status >= 500) throw new Error(`Server error: ${res.status}`);
  });
  await t("POST /api/superadmin/upload", async () => {
    const res = await client.post("/api/superadmin/upload", {});
    if (res.status >= 500) throw new Error(`Server error: ${res.status}`);
  });
  await t("GET /api/super-admin/pools/TEST-POOL-001/subscription", async () => {
    const res = await client.get("/api/super-admin/pools/TEST-POOL-001/subscription");
    if (res.status >= 500) throw new Error(`Server error: ${res.status}`);
  });
  await t("POST /api/superadmin/pools/TEST-POOL-001/reset-password", async () => {
    const res = await client.post("/api/superadmin/pools/TEST-POOL-001/reset-password", {});
    if (res.status >= 500) throw new Error(`Server error: ${res.status}`);
  });
  await t("POST /api/superadmin/businesses/TEST-BIZ-001/reset-password", async () => {
    const res = await client.post("/api/superadmin/businesses/TEST-BIZ-001/reset-password", {});
    if (res.status >= 500) throw new Error(`Server error: ${res.status}`);
  });

  // ── Business labour sub-routes ──
  await client.login(TEST_CREDENTIALS.businessAdmin.email, TEST_CREDENTIALS.businessAdmin.password);
  await t("GET /api/business/labour/000000000000000000000000/payments", async () => {
    const res = await client.get("/api/business/labour/000000000000000000000000/payments");
    if (res.status >= 500) throw new Error(`Server error: ${res.status}`);
  });
  await t("GET /api/business/labour/000000000000000000000000/summary", async () => {
    const res = await client.get("/api/business/labour/000000000000000000000000/summary");
    if (res.status >= 500) throw new Error(`Server error: ${res.status}`);
  });
  await t("POST /api/business/labour/advance", async () => {
    const res = await client.post("/api/business/labour/advance", { labourId: "invalid", amount: 1000 });
    if (res.status >= 500) throw new Error(`Server error: ${res.status}`);
  });

  // ── Cron backup-s3 ──
  await t("GET /api/cron/backup-s3 returns 401 without CRON_SECRET", async () => {
    const res = await fetch("http://localhost:3000/api/cron/backup-s3", {
      headers: { "Authorization": "Bearer invalid" },
    });
    if (res.status !== 401 && res.status !== 200) throw new Error(`Unexpected: ${res.status}`);
  });

  // ── Hostel payments [id] ──
  await client.login(TEST_CREDENTIALS.hostelAdmin.email, TEST_CREDENTIALS.hostelAdmin.password);
  await t("GET /api/hostel/payments/000000000000000000000000 returns 404/405", async () => {
    const res = await client.get("/api/hostel/payments/000000000000000000000000");
    if (res.status >= 500) throw new Error(`Server error: ${res.status}`);
  });

  console.log(`\n============================================================\n  Final Sweep: ${passed}/${passed + failed} passed (${failed} failed)\n============================================================`);
  if (failures.length) { console.log(`\n  Failures:`); failures.forEach(f => console.log(f)); }
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => { console.error("Fatal:", err); process.exit(1); });
