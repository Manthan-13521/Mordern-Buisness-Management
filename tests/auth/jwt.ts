import { SignJWT } from "jose";
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(__dirname, "../../.env.local") });
config({ path: resolve(__dirname, "../../.env") });

const JWT_SECRET = process.env.JWT_SECRET || "manthan_super_secret_key";

export interface TestTokenPayload {
  id: string;
  role: "admin" | "superadmin" | "hostel_admin" | "business_admin" | "operator";
  email?: string;
  name?: string;
  poolId?: string;
  poolSlug?: string;
  hostelId?: string;
  hostelSlug?: string;
  businessId?: string;
  businessSlug?: string;
  subscriptionStatus?: string;
  subscriptionExpiryDate?: string | null;
}

export async function generateTestToken(payload: TestTokenPayload): Promise<string> {
  const secret = new TextEncoder().encode(JWT_SECRET);
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(secret);
}

export const TEST_USERS: Record<string, TestTokenPayload> = {
  poolAdmin: {
    id: "test-pool-admin-id",
    email: "pool-admin@test.com",
    name: "Pool Admin",
    role: "admin",
    poolId: "TEST-POOL-001",
    poolSlug: "test-pool",
    subscriptionStatus: "active",
    subscriptionExpiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
  },
  hostelAdmin: {
    id: "test-hostel-admin-id",
    email: "hostel-admin@test.com",
    name: "Hostel Admin",
    role: "hostel_admin",
    hostelId: "TEST-HOSTEL-001",
    hostelSlug: "test-hostel",
    subscriptionStatus: "active",
    subscriptionExpiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
  },
  businessAdmin: {
    id: "test-business-admin-id",
    email: "business-admin@test.com",
    name: "Business Admin",
    role: "business_admin",
    businessId: "TEST-BIZ-001",
    businessSlug: "test-business",
    subscriptionStatus: "active",
    subscriptionExpiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
  },
  superAdmin: {
    id: "test-super-admin-id",
    email: "super-admin@test.com",
    name: "Super Admin",
    role: "superadmin",
    subscriptionStatus: "active",
    subscriptionExpiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
  },
  operator: {
    id: "test-operator-id",
    email: "operator@test.com",
    name: "Operator",
    role: "operator",
    poolId: "TEST-POOL-001",
    poolSlug: "test-pool",
    subscriptionStatus: "active",
    subscriptionExpiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
  },
};
