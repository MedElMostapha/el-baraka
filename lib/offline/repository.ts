import { openOfflineDb, ENTITY_STORES } from './db';
import { STORE_NAMES, type CachedData, type LocalRecordMeta, type StoreName, type SyncSnapshot } from './types';

const DEVICE_ID_KEY = 'deviceId';
const LAST_BOOTSTRAP_KEY = 'lastBootstrapAt';
const LAST_SYNC_KEY = 'lastSyncAt';
const SCHEMA_VERSION_KEY = 'schemaVersion';
const HAS_BOOTSTRAPPED_KEY = 'hasBootstrapped';

const CHANGE_EVENT = 'elbaraka:offline-changed';

export function notifyLocalChange() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
  }
}

export function subscribeLocalChange(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const handler = () => callback();
  window.addEventListener(CHANGE_EVENT, handler);
  return () => window.removeEventListener(CHANGE_EVENT, handler);
}

export async function getDeviceId(): Promise<string | null> {
  const db = await openOfflineDb();
  const row = await db.get(STORE_NAMES.metadata, DEVICE_ID_KEY);
  return row ? (row.value as string) : null;
}

export async function ensureDeviceId(): Promise<string> {
  const existing = await getDeviceId();
  if (existing) return existing;
  const deviceId = crypto.randomUUID();
  const db = await openOfflineDb();
  await db.put(STORE_NAMES.metadata, { key: DEVICE_ID_KEY, value: deviceId });
  return deviceId;
}

export async function setMetadata(key: string, value: string): Promise<void> {
  const db = await openOfflineDb();
  await db.put(STORE_NAMES.metadata, { key, value });
}

export async function getMetadata(key: string): Promise<string | null> {
  const db = await openOfflineDb();
  const row = await db.get(STORE_NAMES.metadata, key);
  return row ? (row.value as string) : null;
}

export async function getLastSyncAt(): Promise<string | null> {
  return getMetadata(LAST_SYNC_KEY);
}

export async function getLastBootstrapAt(): Promise<string | null> {
  return getMetadata(LAST_BOOTSTRAP_KEY);
}

export async function setLastSyncAt(value: string): Promise<void> {
  await setMetadata(LAST_SYNC_KEY, value);
}

export async function setLastBootstrapAt(value: string): Promise<void> {
  await setMetadata(LAST_BOOTSTRAP_KEY, value);
}

export async function getSchemaVersion(): Promise<number | null> {
  const raw = await getMetadata(SCHEMA_VERSION_KEY);
  return raw ? parseInt(raw, 10) : null;
}

export async function hasBootstrapped(): Promise<boolean> {
  const raw = await getMetadata(HAS_BOOTSTRAPPED_KEY);
  return raw === 'true';
}

export async function getAllFromStore<T>(store: StoreName): Promise<T[]> {
  const db = await openOfflineDb();
  return (await db.getAll(store)) as T[];
}

export async function getRecord<T>(store: StoreName, id: string): Promise<T | undefined> {
  const db = await openOfflineDb();
  return (await db.get(store, id)) as T | undefined;
}

export async function putRecord<T>(store: StoreName, record: T): Promise<void> {
  const db = await openOfflineDb();
  await db.put(store, record);
  notifyLocalChange();
}

export async function updateRecord(store: StoreName, id: string, patch: Partial<Record<string, unknown>>): Promise<void> {
  const db = await openOfflineDb();
  const tx = db.transaction(store, 'readwrite');
  const existing = await tx.store.get(id);
  if (existing) {
    await tx.store.put({ ...existing, ...patch });
  }
  await tx.done;
  notifyLocalChange();
}

export async function deleteRecord(store: StoreName, id: string): Promise<void> {
  const db = await openOfflineDb();
  await db.delete(store, id);
  notifyLocalChange();
}

export async function putLocalRecord<T extends LocalRecordMeta>(store: StoreName, record: T): Promise<void> {
  const now = new Date().toISOString();
  const withMeta: T = {
    ...record,
    _syncState: 'pending',
    _localUpdatedAt: now,
  };
  await putRecord(store, withMeta);
}

export async function markRecordSynced(store: StoreName, id: string, patch?: Record<string, unknown>): Promise<void> {
  const db = await openOfflineDb();
  const tx = db.transaction(store, 'readwrite');
  const existing = await tx.store.get(id);
  if (existing) {
    const serverRecord = { ...(existing as object) };
    delete (serverRecord as Record<string, unknown>)._syncState;
    delete (serverRecord as Record<string, unknown>)._operationId;
    delete (serverRecord as Record<string, unknown>)._localUpdatedAt;
    await tx.store.put({ ...serverRecord, ...patch, _syncState: 'synced', _operationId: undefined, _localUpdatedAt: new Date().toISOString() });
  }
  await tx.done;
  notifyLocalChange();
}

export async function markRecordConflict(store: StoreName, id: string): Promise<void> {
  await updateRecord(store, id, { _syncState: 'conflict' });
}

export async function countPendingRecords(): Promise<number> {
  const db = await openOfflineDb();
  let count = 0;
  for (const store of ENTITY_STORES) {
    const all = (await db.getAll(store)) as LocalRecordMeta[];
    count += all.filter((r) => r._syncState === 'pending').length;
  }
  return count;
}

export async function clearAllLocalData(): Promise<void> {
  const db = await openOfflineDb();
  const tx = db.transaction(ENTITY_STORES.concat([STORE_NAMES.outbox, STORE_NAMES.syncConflicts]), 'readwrite');
  for (const store of ENTITY_STORES.concat([STORE_NAMES.outbox, STORE_NAMES.syncConflicts])) {
    await tx.objectStore(store).clear();
  }
  await tx.done;
  notifyLocalChange();
}

export async function getCachedData(): Promise<CachedData | null> {
  const db = await openOfflineDb();
  const hasAny = (await db.count(STORE_NAMES.batches)) > 0;
  if (!hasAny) return null;
  return {
    batches: (await db.getAll(STORE_NAMES.batches)) as CachedData['batches'],
    dailyLogs: (await db.getAll(STORE_NAMES.dailyLogs)) as CachedData['dailyLogs'],
    inventory: (await db.getAll(STORE_NAMES.inventory)) as CachedData['inventory'],
    clients: (await db.getAll(STORE_NAMES.clients)) as CachedData['clients'],
    sales: (await db.getAll(STORE_NAMES.sales)) as CachedData['sales'],
    payments: (await db.getAll(STORE_NAMES.payments)) as CachedData['payments'],
    expenses: (await db.getAll(STORE_NAMES.expenses)) as CachedData['expenses'],
    debts: (await db.getAll(STORE_NAMES.debts)) as CachedData['debts'],
    restocks: (await db.getAll(STORE_NAMES.restocks)) as CachedData['restocks'],
    settings: {},
  };
}

export async function getCachedSettings(): Promise<Record<string, string>> {
  const db = await openOfflineDb();
  const rows = (await db.getAll(STORE_NAMES.settings)) as Array<{ key: string; value: string }>;
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}

export async function replaceSnapshot(snapshot: SyncSnapshot): Promise<void> {
  const db = await openOfflineDb();
  const data = snapshot.data;

  const preserved: Partial<Record<StoreName, LocalRecordMeta[]>> = {};
  const tx = db.transaction(ENTITY_STORES, 'readonly');
  for (const store of ENTITY_STORES) {
    const records = (await tx.objectStore(store).getAll()) as LocalRecordMeta[];
    const local = records.filter((r) => r._syncState === 'pending' || r._syncState === 'conflict');
    if (local.length > 0) preserved[store] = local;
  }
  await tx.done;

  const writeTx = db.transaction(ENTITY_STORES, 'readwrite');
  for (const store of ENTITY_STORES) {
    await writeTx.objectStore(store).clear();
  }
  await writeTx.done;

  const serverRecords: Record<string, unknown[]> = {
    [STORE_NAMES.batches]: data.batches,
    [STORE_NAMES.dailyLogs]: data.dailyLogs,
    [STORE_NAMES.inventory]: data.inventory,
    [STORE_NAMES.clients]: data.clients,
    [STORE_NAMES.sales]: data.sales,
    [STORE_NAMES.payments]: data.payments,
    [STORE_NAMES.expenses]: data.expenses,
    [STORE_NAMES.debts]: data.debts,
    [STORE_NAMES.restocks]: data.restocks,
  };

  const putTx = db.transaction(ENTITY_STORES, 'readwrite');
  for (const store of ENTITY_STORES) {
    for (const record of serverRecords[store]) {
      await putTx.objectStore(store).put(record);
    }
    for (const localRecord of preserved[store] ?? []) {
      await putTx.objectStore(store).put(localRecord);
    }
  }
  await putTx.done;

  const settingsTx = db.transaction(STORE_NAMES.settings, 'readwrite');
  await settingsTx.objectStore(STORE_NAMES.settings).clear();
  for (const [key, value] of Object.entries(data.settings ?? {})) {
    await settingsTx.objectStore(STORE_NAMES.settings).put({ key, value });
  }
  await settingsTx.done;

  await setMetadata(SCHEMA_VERSION_KEY, String(snapshot.schemaVersion));
  await setMetadata(HAS_BOOTSTRAPPED_KEY, 'true');
  await setLastBootstrapAt(snapshot.serverTime);
  notifyLocalChange();
}

export function isPendingRecord(record: LocalRecordMeta): boolean {
  return record._syncState === 'pending';
}

export function isConflictRecord(record: LocalRecordMeta): boolean {
  return record._syncState === 'conflict';
}
