import { TestClient, assertStatus, assertJson } from "./testClient";
import { connectTestDB, clearCollection, countDocuments, findOne } from "./db";
import { TestRunner } from "./runner";
import { retry } from "./retry";
import { assertResponseSchema, assertSecurityHeaders, assertNoCacheHeaders, assertCacheHeaders } from "./validators";
import { createMemberFixture, createPaymentFixture, createHostelMemberFixture, createStaffFixture, generateUniquePhone, generateUniqueEmail } from "./fixtures";

export {
  TestClient, assertStatus, assertJson,
  connectTestDB, clearCollection, countDocuments, findOne,
  TestRunner, retry,
  assertResponseSchema, assertSecurityHeaders, assertNoCacheHeaders, assertCacheHeaders,
  createMemberFixture, createPaymentFixture, createHostelMemberFixture, createStaffFixture,
  generateUniquePhone, generateUniqueEmail,
};

export const TEST_CREDENTIALS = {
  poolAdmin: { email: "pool-admin@test.com", password: "testpass123" },
  hostelAdmin: { email: "hostel-admin@test.com", password: "testpass123" },
  businessAdmin: { email: "business-admin@test.com", password: "testpass123" },
  superAdmin: { email: "super-admin@test.com", password: "testpass123" },
  operator: { email: "operator@test.com", password: "testpass123" },
} as const;

export type TestRole = keyof typeof TEST_CREDENTIALS;
