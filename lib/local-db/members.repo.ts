import { db, type LocalMember } from './db';

// Create a new member or update an existing one
export async function addMemberLocal(member: LocalMember) {
  // .put() will add or overwrite if the primary key (id) already exists
  return await db.members.put(member);
}

// Retrieve all members from the local database
export async function getAllMembersLocal() {
  try {
    return await db.members.toArray();
  } catch (e) {
    console.error("Local DB read error:", e);
    return [];
  }
}

// Retrieve members for a specific pool
export async function getMembersByPoolLocal(poolId: string) {
  try {
    return await db.members.where('poolId').equals(poolId).toArray();
  } catch (e) {
    console.error("Local DB read error by pool:", e);
    return [];
  }
}

// Clear all members from the local database
export async function clearMembersLocal() {
  return await db.members.clear();
}

// Persist Last Synced Timestamp safely into IDB Meta tables
export async function getLastSyncedAtLocal(poolId: string): Promise<string> {
  const meta = await db.syncMeta.get(`lastSyncedAt_${poolId}`);
  return meta ? meta.value : "0";
}

export async function setLastSyncedAtLocal(poolId: string, timestamp: string) {
  await db.syncMeta.put({ key: `lastSyncedAt_${poolId}`, value: timestamp });
}

// Offload local storage space footprint
export async function cleanupLocalDB() {
  try {
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    const deletedMembers = await db.members.filter(m => m.status === "DELETED" && m.updatedAt < thirtyDaysAgo).toArray();
    for (const m of deletedMembers) {
      if (m.synced !== false) {
          await db.members.delete(m.id);
      }
    }
  } catch (e) {
    console.warn("Cleanup failed", e);
  }
}


// Get all unsynced members
export async function getUnsyncedMembersLocal() {
  try {
    return await db.members.filter(m => m.synced === false).toArray();
  } catch (e) {
    console.error("Local DB read unsynced error:", e);
    return [];
  }
}

// Replace temp ID safely using transaction to prevent flicker
export async function replaceTempMemberLocal(tempId: string, serverData: any) {
  return await db.transaction('rw', db.members, async () => {
    await db.members.delete(tempId);
    await db.members.put({ ...serverData, id: serverData._id, synced: true });
  });
}

// Offline to Server Synchronization Engine
let isSyncing = false;

export async function syncUnsyncedMembers() {
  if (isSyncing) return;
  isSyncing = true;

  try {
    const unsynced = await getUnsyncedMembersLocal();
    if (unsynced.length === 0) return;

    for (const member of unsynced) {
      try {
        const payload = {
          name: member.name,
          phone: member.phone,
          planId: (member as any).planId || (member as any).plan?.id,
          planQuantity: (member as any).planQuantity || 1,
          paidAmount: (member as any).paidAmount || 0,
          balanceAmount: (member as any).balanceAmount || 0,
          paymentMode: (member as any).paymentMode || "cash",
          equipmentTaken: (member as any).equipmentTaken,
          photoBase64: (member as any).photoBase64,
          clientId: (member as any).clientId // Send clientId for deduplication
        };

        const res = await fetch("/api/members", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });

        if (res.ok) {
          const result = await res.json();
          // Replace using atomic transaction to avoid changing PK errors
          await replaceTempMemberLocal(member.id, {
             ...result,
             poolId: member.poolId,
             type: result._source || "member",
             status: result.verdict || "ACTIVE",
             updatedAt: result.updatedAt || Date.now(),
          });
        }
      } catch (err) {
        console.error("Failed to sync offline member:", member.name, err);
      }
    }
  } finally {
    isSyncing = false;
  }
}

// Step 5: Conflict-safe write
export async function syncMemberConflictSafe(serverMember: any, poolId: string) {
  const local = await db.members.get(serverMember._id);
  
  const parsedServerData = {
    ...serverMember,
    id: serverMember._id,
    poolId,
    type: serverMember._source || "member",
    status: serverMember.verdict || "ACTIVE",
    updatedAt: serverMember.updatedAt || Date.now(),
    synced: true,
  };

  if (!local) {
    await db.members.put(parsedServerData);
  } else {
    // 1. Skip overwrite for unsynced local changes
    if (local.synced === false) return;
    
    // 2. Last-write-wins comparison
    if (parsedServerData.updatedAt > (local.updatedAt || 0)) {
      await db.members.put(parsedServerData);
    }
  }
}

export async function deleteMemberLocal(id: string) {
    await db.members.delete(id);
}

