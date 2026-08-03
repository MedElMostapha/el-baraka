import 'fake-indexeddb/auto';
import { beforeEach } from 'vitest';

export async function clearOfflineDb(): Promise<void> {
  const { openOfflineDb } = await import('./lib/offline/db');
  const db = await openOfflineDb();
  for (const store of Array.from(db.objectStoreNames)) {
    await db.clear(store);
  }
  db.close();
}

beforeEach(async () => {
  await clearOfflineDb();
});
