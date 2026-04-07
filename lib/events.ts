import { EventEmitter } from "events";

class SystemEventDispatcher extends EventEmitter {}

export const DomainEvents = new SystemEventDispatcher();

// ── Strict Typings for Standard EDA ──
export type SystemEventType = 
  | "user.created"
  | "payment.received"
  | "subscription.updated"
  | "member.blocked"
  | "entry.logged";

// Global Dispatcher Interface
export function dispatchEvent(eventName: SystemEventType, payload: any) {
    // 1. Dispatch intra-process natively
    DomainEvents.emit(eventName, payload);
    
    // 2. Audit/Log the transaction to standard stdout for container tracking
    console.log(`[Event Dispatched] ${eventName}`, {
        timestamp: new Date().toISOString(),
        hasPayload: !!payload
    });

    // 3. Option to securely bridge to Upstash Queue/SNS dynamically inside handlers
}

// ── Native Subscriptions (Safe Parallel Processors) ──

DomainEvents.on("user.created", async (payload: { userId: string, type: string }) => {
    // Analytics/Marketing triggers could reside here
});

DomainEvents.on("payment.received", async (payload: { paymentId: string, amount: number }) => {
    // Receipts, Invoice generation handlers 
});

DomainEvents.on("member.blocked", async (payload: { memberId: string, reason: string }) => {
    // Notify gateways, firewalls
});

DomainEvents.on("entry.logged", async (payload: { poolId: string, count: number }) => {
    // E.g. Webhook push to specific dashboards / smart locks
});
