import "./env";
import { dbConnect } from "../../lib/mongodb";
import { User } from "../../models/User";
import { Pool } from "../../models/Pool";
import { Hostel } from "../../models/Hostel";
import { Business } from "../../models/Business";
import { Member } from "../../models/Member";
import { Payment } from "../../models/Payment";
import { Plan } from "../../models/Plan";
import { HostelMember } from "../../models/HostelMember";
import { HostelPayment } from "../../models/HostelPayment";
import { EntryLog } from "../../models/EntryLog";
import { PoolSession } from "../../models/PoolSession";

type CollectionName =
  | "users"
  | "pools"
  | "hostels"
  | "businesses"
  | "members"
  | "payments"
  | "plans"
  | "hostel_members"
  | "hostel_payments"
  | "entry_logs"
  | "pool_sessions"
  | "audit_logs";

const MODEL_MAP: Record<CollectionName, any> = {
  users: User,
  pools: Pool,
  hostels: Hostel,
  businesses: Business,
  members: Member,
  payments: Payment,
  plans: Plan,
  hostel_members: HostelMember,
  hostel_payments: HostelPayment,
  entry_logs: EntryLog,
  pool_sessions: PoolSession,
  audit_logs: null,
};

export async function connectTestDB(): Promise<void> {
  await dbConnect();
}

export async function clearCollection(name: CollectionName): Promise<void> {
  const Model = MODEL_MAP[name];
  if (Model) {
    await Model.deleteMany({});
  }
}

export async function countDocuments(name: CollectionName, filter: any = {}): Promise<number> {
  const Model = MODEL_MAP[name];
  if (Model) {
    return Model.countDocuments(filter);
  }
  return 0;
}

export async function findOne(name: CollectionName, filter: any = {}): Promise<any> {
  const Model = MODEL_MAP[name];
  if (Model) {
    return Model.findOne(filter).lean();
  }
  return null;
}

export function generateUniqueEmail(prefix: string = "test"): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}@test.com`;
}

export function generateTestId(): string {
  return `TEST_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}
