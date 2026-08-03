import { openDB, type IDBPDatabase } from 'idb';
import { OFFLINE_DB_NAME, OFFLINE_SCHEMA_VERSION, STORE_NAMES, type StoreName } from './types';

const ENTITY_STORES: StoreName[] = [
  STORE_NAMES.batches,
  STORE_NAMES.dailyLogs,
  STORE_NAMES.inventory,
  STORE_NAMES.clients,
  STORE_NAMES.sales,
  STORE_NAMES.payments,
  STORE_NAMES.expenses,
  STORE_NAMES.debts,
  STORE_NAMES.restocks,
];

const KEY_STORES: StoreName[] = [STORE_NAMES.settings, STORE_NAMES.metadata];

const OUTBOX_STORES: StoreName[] = [STORE_NAMES.outbox, STORE_NAMES.syncConflicts];

function createStore(db: IDBPDatabase, name: StoreName) {
  if (db.objectStoreNames.contains(name)) return;
  if (ENTITY_STORES.includes(name)) {
    db.createObjectStore(name, { keyPath: 'id' });
  } else if (KEY_STORES.includes(name)) {
    db.createObjectStore(name, { keyPath: 'key' });
  } else if (OUTBOX_STORES.includes(name)) {
    db.createObjectStore(name, { keyPath: 'operationId' });
  }
}

export async function openOfflineDb(): Promise<IDBPDatabase> {
  return openDB(OFFLINE_DB_NAME, OFFLINE_SCHEMA_VERSION, {
    upgrade(db) {
      ENTITY_STORES.forEach((name) => createStore(db, name));
      KEY_STORES.forEach((name) => createStore(db, name));
      OUTBOX_STORES.forEach((name) => createStore(db, name));
    },
  });
}

export type { StoreName };
export { ENTITY_STORES };
