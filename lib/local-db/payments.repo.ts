import { db, LocalPayment } from "./db";

// Replace temp ID safely using transaction to prevent flicker
export async function replaceTempPaymentLocal(tempId: string, serverData: any) {
  return await db.transaction('rw', db.payments, async () => {
    await db.payments.delete(tempId);
    await db.payments.put({ ...serverData, id: serverData._id || serverData.id, synced: true });
  });
}

export async function addPaymentLocal(payment: LocalPayment) {
  try {
    const existing = await db.payments.get(payment.id);
    if (!existing) {
      await db.payments.add(payment);
    } else {
      await db.payments.put(payment);
    }
  } catch (error) {
    console.error("Failed to add local payment:", error);
  }
}

export async function getPaymentsByPoolLocal(poolId: string) {
  try {
    return await db.payments.where('poolId').equals(poolId).toArray();
  } catch (e) {
    console.error("Local DB read payments error:", e);
    return [];
  }
}

export async function getUnsyncedPaymentsLocal() {
  try {
    return await db.payments.filter(p => p.synced === false && p.syncing !== true).toArray();
  } catch (e) {
    console.error("Local DB read unsynced payments error:", e);
    return [];
  }
}

let isSyncingPayments = false;

// Exponential backoff helper: wait 2^retryCount seconds (capped at 60s)
const getBackoffDelay = (retryCount: number) => Math.min(1000 * Math.pow(2, retryCount), 60000);
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function syncUnsyncedPayments() {
  if (isSyncingPayments) return;
  isSyncingPayments = true;

  try {
    const unsynced = await getUnsyncedPaymentsLocal();
    if (unsynced.length === 0) return;

    for (const payment of unsynced) {
      // Skip permanently failed items (max 5 retries)
      if ((payment.retryCount || 0) > 5) continue;

      // Skip items retried too recently (exponential backoff)
      const backoffDelay = getBackoffDelay(payment.retryCount || 0);
      if (payment.lastTriedAt && (Date.now() - payment.lastTriedAt) < backoffDelay) continue;
      
      try {
        await db.payments.update(payment.id, { syncing: true, lastTriedAt: Date.now() });

        const payload = {
          memberId: payment.memberId,
          amount: payment.amount,
          paymentMethod: payment.method,
          transactionId: payment.transactionId, 
          clientId: payment.clientId,
          poolId: payment.poolId, 
          ...(payment.planId ? { planId: payment.planId } : {})
        };

        const res = await fetch("/api/payments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });

        if (res.ok) {
          let result = null;
          try {
            result = await res.json();
          } catch (e) {
            console.error("Invalid JSON response from server tracking offline payment", e);
            await db.payments.update(payment.id, { syncing: false, retryCount: (payment.retryCount || 0) + 1 });
            continue;
          }

          await replaceTempPaymentLocal(payment.id, {
             ...result,
             poolId: payment.poolId,
             updatedAt: result.updatedAt || result.createdAt || Date.now(),
             syncing: false,
             retryCount: 0
          });
        } else {
          await db.payments.update(payment.id, { syncing: false, retryCount: (payment.retryCount || 0) + 1 });
        }
      } catch (err) {
        console.error("Failed to sync offline payment:", payment.id, err);
        await db.payments.update(payment.id, { syncing: false, retryCount: (payment.retryCount || 0) + 1 });
      }

      // Small delay between items to avoid API hammering
      await sleep(200);
    }
  } finally {
    isSyncingPayments = false;
  }
}

