/**
 * fixtures.ts
 * Purpose: Load and manage test fixtures (test data factories).
 * Generates realistic test data without modifying production code.
 */

export interface MemberFixture {
  name: string;
  phone: string;
  planId?: string;
  poolId?: string;
  status?: string;
  balanceAmount?: number;
}

export interface PaymentFixture {
  memberId: string;
  planId: string;
  amount: number;
  paymentMethod: string;
  poolId?: string;
}

export interface HostelMemberFixture {
  name: string;
  phone: string;
  planId?: string;
  blockNo?: string;
  floorNo?: number;
  roomNo?: number;
  paidAmount?: number;
}

export interface StaffFixture {
  name: string;
  phone: string;
  role: string;
  salary?: number;
  poolId?: string;
}

export function createMemberFixture(overrides: Partial<MemberFixture> = {}): MemberFixture {
  const ts = Date.now();
  return {
    name: `Test Member ${ts}`,
    phone: `999${String(ts).slice(-8)}`,
    poolId: 'TEST-POOL-001',
    status: 'active',
    balanceAmount: 0,
    ...overrides,
  };
}

export function createPaymentFixture(memberId: string, planId: string, overrides: Partial<PaymentFixture> = {}): PaymentFixture {
  return {
    memberId,
    planId,
    amount: 999,
    paymentMethod: 'cash',
    poolId: 'TEST-POOL-001',
    ...overrides,
  };
}

export function createHostelMemberFixture(planId: string, overrides: Partial<HostelMemberFixture> = {}): HostelMemberFixture {
  const ts = Date.now();
  return {
    name: `Test Hostel Member ${ts}`,
    phone: `988${String(ts).slice(-8)}`,
    planId,
    blockNo: 'A',
    floorNo: 1,
    roomNo: 101,
    paidAmount: 5000,
    ...overrides,
  };
}

export function createStaffFixture(overrides: Partial<StaffFixture> = {}): StaffFixture {
  const ts = Date.now();
  return {
    name: `Test Staff ${ts}`,
    phone: `977${String(ts).slice(-8)}`,
    role: 'Trainer',
    salary: 15000,
    poolId: 'TEST-POOL-001',
    ...overrides,
  };
}

export function generateUniquePhone(): string {
  const ts = Date.now();
  const rand = Math.random().toString(36).substring(2, 6);
  return `99${rand}${String(ts).slice(-4)}`;
}

export function generateUniqueEmail(prefix: string = 'test'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}@test.com`;
}
