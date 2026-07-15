import { config } from "dotenv";
import { resolve } from "path";

// Load env BEFORE any module with env-dependent side effects
config({ path: resolve(__dirname, "../../.env.local") });
config({ path: resolve(__dirname, "../../.env") });

async function main() {
  const bcrypt = await import("bcryptjs");
  const { dbConnect } = await import("../../lib/mongodb");
  const { User } = await import("../../models/User");
  const { Pool } = await import("../../models/Pool");
  const { Hostel } = await import("../../models/Hostel");
  const { Business } = await import("../../models/Business");
  const { PlatformAdmin } = await import("../../models/PlatformAdmin");
  const { Plan } = await import("../../models/Plan");

  const PASSWORD_HASH = bcrypt.hashSync("testpass123", 10);

  await dbConnect();

  await Promise.all([
    Pool.deleteMany({ poolId: "TEST-POOL-001" }),
    Hostel.deleteMany({ hostelId: "TEST-HOSTEL-001" }),
    Business.deleteMany({ businessId: "TEST-BIZ-001" }),
    User.deleteMany({ email: /@test\.com$/ }),
    PlatformAdmin.deleteMany({ email: "super-admin@test.com" }),
    Plan.deleteMany({ poolId: "TEST-POOL-001" }),
  ]);

  await Pool.create({
    poolId: "TEST-POOL-001",
    poolName: "Test Swimming Pool",
    slug: "test-pool",
    adminEmail: "pool-admin@test.com",
    capacity: 200,
    status: "ACTIVE",
    plan: "pro",
    subscriptionStatus: "active",
    maxMembers: 500,
    maxStaff: 10,
    featuresEnabled: ["face_scan", "whatsapp", "entertainment"],
    memberCounter: 0,
    entertainmentMemberCounter: 0,
  });

  await Hostel.create({
    hostelId: "TEST-HOSTEL-001",
    hostelName: "Test Hostel",
    slug: "test-hostel",
    city: "Test City",
    adminEmail: "hostel-admin@test.com",
    numberOfBlocks: 2,
    status: "ACTIVE",
    plan: "pro",
    subscriptionStatus: "active",
    memberCounter: 0,
  });

  await Business.create({
    businessId: "TEST-BIZ-001",
    name: "Test Business",
    slug: "test-business",
    phone: "9999999999",
    address: "123 Test St",
    isActive: true,
  });

  const users = [
    {
      name: "Pool Admin",
      email: "pool-admin@test.com",
      passwordHash: PASSWORD_HASH,
      role: "admin" as const,
      poolId: "TEST-POOL-001",
      phone: "9111111111",
      subscription: { module: "pool" as const, planType: "yearly" as const, pricePaid: 9999, startDate: new Date(), expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), status: "active" as const },
    },
    {
      name: "Hostel Admin",
      email: "hostel-admin@test.com",
      passwordHash: PASSWORD_HASH,
      role: "hostel_admin" as const,
      hostelId: "TEST-HOSTEL-001",
      phone: "9222222222",
      subscription: { module: "hostel" as const, planType: "yearly" as const, pricePaid: 5999, startDate: new Date(), expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), status: "active" as const },
    },
    {
      name: "Business Admin",
      email: "business-admin@test.com",
      passwordHash: PASSWORD_HASH,
      role: "business_admin" as const,
      businessId: "TEST-BIZ-001",
      businessSlug: "test-business",
      phone: "9333333333",
      subscription: { module: "business" as const, planType: "yearly" as const, pricePaid: 7999, startDate: new Date(), expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), status: "active" as const },
    },
    {
      name: "Operator",
      email: "operator@test.com",
      passwordHash: PASSWORD_HASH,
      role: "operator" as const,
      poolId: "TEST-POOL-001",
      phone: "9444444444",
      subscription: { module: "pool" as const, planType: "yearly" as const, pricePaid: 9999, startDate: new Date(), expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), status: "active" as const },
    },
  ];

  for (const u of users) {
    await User.create(u);
  }

  await PlatformAdmin.create({
    email: "super-admin@test.com",
    passwordHash: PASSWORD_HASH,
    role: "superadmin",
  });

  const plans = [
    { name: "Monthly Pass", poolId: "TEST-POOL-001", durationDays: 30, price: 999, features: ["pool_access", "locker"], isActive: true, memberCounter: 0, entertainmentMemberCounter: 0 },
    { name: "Quarterly Pass", poolId: "TEST-POOL-001", durationDays: 90, price: 2499, features: ["pool_access", "locker", "gym"], isActive: true, memberCounter: 0, entertainmentMemberCounter: 0 },
    { name: "Yearly Pass", poolId: "TEST-POOL-001", durationDays: 365, price: 7999, features: ["pool_access", "locker", "gym", "sauna"], isActive: true, memberCounter: 0, entertainmentMemberCounter: 0 },
  ];

  for (const p of plans) {
    await Plan.create(p);
  }

  console.log("[Seed] Test data seeded successfully");
  console.log("  Pool:    TEST-POOL-001 (slug: test-pool)");
  console.log("  Hostel:  TEST-HOSTEL-001 (slug: test-hostel)");
  console.log("  Busines: TEST-BIZ-001 (slug: test-business)");
  console.log("  Users:   pool-admin, hostel-admin, business-admin, operator, super-admin");
  console.log("  Plans:   Monthly(999), Quarterly(2499), Yearly(7999)");
}

main().catch((err) => {
  console.error("[Seed] Failed:", err);
  process.exit(1);
});
