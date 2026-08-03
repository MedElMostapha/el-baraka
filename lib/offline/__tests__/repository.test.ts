import { describe, it, expect } from 'vitest';
import {
  ensureDeviceId,
  getDeviceId,
  setLastSyncAt,
  getLastSyncAt,
  putLocalRecord,
  getRecord,
  markRecordSynced,
  markRecordConflict,
  replaceSnapshot,
  getCachedData,
  clearAllLocalData,
  countPendingRecords,
  getAllFromStore,
} from '../repository';
import { STORE_NAMES, type SyncSnapshot } from '../types';

function makeSnapshot(overrides?: Partial<SyncSnapshot>): SyncSnapshot {
  return {
    schemaVersion: 1,
    serverTime: '2026-08-03T10:00:00.000Z',
    data: {
      batches: [
        {
          id: 'batch-1',
          name: 'Lot A',
          breed: 'broiler',
          arrivalDate: '2026-07-01',
          initialQuantity: 100,
          costPerChick: 100,
          feedStock: 50,
          status: 'active',
        },
      ],
      dailyLogs: [],
      inventory: [],
      clients: [],
      sales: [],
      payments: [],
      expenses: [],
      debts: [],
      restocks: [],
      settings: { kg_per_sac: '25' },
    },
    ...overrides,
  };
}

describe('repository', () => {
  it('creates and persists a stable device id', async () => {
    const first = await ensureDeviceId();
    const second = await ensureDeviceId();
    expect(first).toMatch(/^[0-9a-f-]{36}$/);
    expect(second).toBe(first);
    expect(await getDeviceId()).toBe(first);
  });

  it('stores and reads metadata', async () => {
    await setLastSyncAt('2026-08-03T09:00:00.000Z');
    expect(await getLastSyncAt()).toBe('2026-08-03T09:00:00.000Z');
  });

  it('puts a local record flagged as pending with metadata', async () => {
    await putLocalRecord(STORE_NAMES.clients, { id: 'c1', name: 'Ahmed', phone: null, address: null });
    const record = await getRecord<{ id: string; name: string; _syncState?: string; _localUpdatedAt?: string }>(STORE_NAMES.clients, 'c1');
    expect(record?.name).toBe('Ahmed');
    expect(record?._syncState).toBe('pending');
    expect(record?._localUpdatedAt).toBeTruthy();
  });

  it('marks a pending record as synced and strips pending metadata', async () => {
    await putLocalRecord(STORE_NAMES.clients, { id: 'c1', name: 'Ahmed', phone: null, address: null });
    await markRecordSynced(STORE_NAMES.clients, 'c1');
    const record = await getRecord<{ _syncState?: string; _operationId?: string; _localUpdatedAt?: string }>(STORE_NAMES.clients, 'c1');
    expect(record?._syncState).toBe('synced');
    expect(record?._operationId).toBeUndefined();
  });

  it('marks a record as conflicted', async () => {
    await putLocalRecord(STORE_NAMES.clients, { id: 'c1', name: 'Ahmed', phone: null, address: null });
    await markRecordConflict(STORE_NAMES.clients, 'c1');
    const record = await getRecord<{ _syncState?: string }>(STORE_NAMES.clients, 'c1');
    expect(record?._syncState).toBe('conflict');
  });

  it('counts pending records across stores', async () => {
    await putLocalRecord(STORE_NAMES.clients, { id: 'c1', name: 'A', phone: null, address: null });
    await putLocalRecord(STORE_NAMES.sales, {
      id: 's1', batchId: 'b1', clientId: null, date: '2026-08-01', quantity: 5,
      unitPrice: 100, totalPrice: 500, amountPaid: 0, feedConsumedBags: 0, type: 'retail', invoiceNumber: null,
    });
    expect(await countPendingRecords()).toBe(2);
  });

  it('replaces the snapshot with server data and preserves local pending records', async () => {
    await putLocalRecord(STORE_NAMES.clients, { id: 'c-local', name: 'Local', phone: null, address: null });
    await putRecordTypeSafe(STORE_NAMES.batches, { id: 'b-server', name: 'Old', breed: null, arrivalDate: '2026-01-01', initialQuantity: 1, costPerChick: 1, feedStock: 0, status: 'active', _syncState: 'synced' });

    const snapshot = makeSnapshot();
    snapshot.data.clients.push({ id: 'c-server', name: 'Server', phone: null, address: null });
    await replaceSnapshot(snapshot);

    const clients = await getAllFromStore<{ id: string }>(STORE_NAMES.clients);
    expect(clients.map((c) => c.id).sort()).toEqual(['c-local', 'c-server']);

    const batches = await getAllFromStore<{ id: string }>(STORE_NAMES.batches);
    expect(batches.map((b) => b.id)).toEqual(['batch-1']);

    expect(await getCachedData()).not.toBeNull();
  });

  it('returns null from getCachedData when no batch data exists', async () => {
    const snapshot = makeSnapshot({ data: { batches: [], dailyLogs: [], inventory: [], clients: [], sales: [], payments: [], expenses: [], debts: [], restocks: [], settings: {} } });
    await replaceSnapshot(snapshot);
    expect(await getCachedData()).toBeNull();
  });

  it('clears all local data including pending records', async () => {
    await putLocalRecord(STORE_NAMES.clients, { id: 'c1', name: 'A', phone: null, address: null });
    await clearAllLocalData();
    expect(await getAllFromStore(STORE_NAMES.clients)).toEqual([]);
  });
});

async function putRecordTypeSafe<T>(store: string, record: T & { _syncState?: string }): Promise<void> {
  const { openOfflineDb } = await import('../db');
  const db = await openOfflineDb();
  await db.put(store, record);
}
