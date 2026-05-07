import Dexie, { type Table } from 'dexie';

export interface LocalMember {
  id: string; // primary key
  poolId: string;
  clientId?: string; // Offline temp Deduplication ID
  name: string;
  phone: string;
  type: string;
  status: string;
  updatedAt: number;
  synced: boolean;
  isDefaulter?: boolean;
  defaulterStatus?: string;
}

export interface LocalPayment {
  id: string;
  clientId: string;
  poolId: string;
  memberId: string;
  planId?: string;
  amount: number;
  method: string;
  transactionId?: string;
  status: string;
  createdAt: number;
  updatedAt: number;
  synced: boolean;
  syncing?: boolean; // In-flight network lock
  retryCount?: number; // Backoff limiting
  lastTriedAt?: number;
}

export interface SyncMeta {
  key: string;
  value: any;
}

export interface SyncQueueItem {
  id?: number;
  entityType: "member" | "payment" | "entry";
  entityId: string;
  operation: "create" | "update" | "delete";
  payload: any;
  createdAt: number;
  retryCount: number;
  lastTriedAt?: number;
  status: "pending" | "processing" | "failed_permanent";
}

export class AppLocalDB extends Dexie {
  // We specify the table and its schema type here
  members!: Table<LocalMember, string>;
  syncMeta!: Table<SyncMeta, string>;
  payments!: Table<LocalPayment, string>;
  syncQueue!: Table<SyncQueueItem, number>;

  constructor() {
    super('appLocalDB');
    this.version(1).stores({
      members: 'id, poolId, name, phone, type, status, updatedAt, synced'
    });
    
    // V2: Add explicit meta table for configuration resilience
    this.version(2).stores({
      members: 'id, poolId, name, phone, type, status, updatedAt, synced',
      syncMeta: 'key'
    });

    // V3: Offline-First Payment System Schema
    this.version(3).stores({
      members: 'id, poolId, name, phone, type, status, updatedAt, synced',
      syncMeta: 'key',
      payments: 'id, poolId, memberId, updatedAt, synced, clientId, [poolId+synced]' // Compound index for rapid unsynced queries
    });

    // V4: Defaulter Badge Offline Tracking Upgrade
    this.version(4).stores({
      members: 'id, poolId, name, phone, type, status, updatedAt, synced, isDefaulter, defaulterStatus',
      syncMeta: 'key',
      payments: 'id, poolId, memberId, updatedAt, synced, clientId, [poolId+synced]'
    });

    // V5: Sync Queue for structured offline operation queuing
    this.version(5).stores({
      members: 'id, poolId, name, phone, type, status, updatedAt, synced, isDefaulter, defaulterStatus',
      syncMeta: 'key',
      payments: 'id, poolId, memberId, updatedAt, synced, clientId, [poolId+synced]',
      syncQueue: '++id, entityId, entityType, status, createdAt'
    });
  }
}

export const db = new AppLocalDB();

