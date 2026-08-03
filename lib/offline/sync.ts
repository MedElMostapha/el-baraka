import {
  ensureDeviceId,
  getCachedData,
  replaceSnapshot,
  markRecordSynced,
  markRecordConflict,
  setLastSyncAt,
  notifyLocalChange,
} from './repository';
import {
  listPendingOperations,
  markSending,
  resetToPending,
  markOperationApplied,
  markOperationConflict,
  countPendingOperations,
  countConflicts,
  dependenciesApplied,
} from './outbox';
import {
  MAX_OPERATIONS_PER_REQUEST,
  OFFLINE_INVOICE_PLACEHOLDER,
  STORE_NAMES,
  type StoreName,
  type SyncResult,
  type SyncSnapshot,
} from './types';

export const RETRY_DELAYS_MS = [5_000, 30_000, 120_000, 600_000];

let syncing = false;

function entityStoreForType(type: string): StoreName {
  switch (type) {
    case 'createClient':
      return STORE_NAMES.clients;
    case 'createDailyLog':
      return STORE_NAMES.dailyLogs;
    case 'recordSale':
      return STORE_NAMES.sales;
    case 'addExpense':
      return STORE_NAMES.expenses;
    case 'addInventoryItem':
      return STORE_NAMES.inventory;
    case 'addDebt':
      return STORE_NAMES.debts;
    default:
      return STORE_NAMES.metadata;
  }
}

export async function fetchBootstrap(): Promise<SyncSnapshot | null> {
  let response: Response;
  try {
    response = await fetch('/api/sync/bootstrap', { cache: 'no-store' });
  } catch {
    return null;
  }
  if (!response.ok) return null;
  try {
    const snapshot = (await response.json()) as SyncSnapshot;
    return snapshot;
  } catch {
    return null;
  }
}

export async function bootstrap(): Promise<boolean> {
  const snapshot = await fetchBootstrap();
  if (!snapshot) return false;
  await ensureDeviceId();
  await replaceSnapshot(snapshot);
  setLastSyncAt(snapshot.serverTime);
  notifyLocalChange();
  return true;
}

function isNetworkError(error: unknown): boolean {
  if (error instanceof TypeError) return true;
  if (error instanceof Error) {
    return /fetch failed|Failed to fetch|NetworkError|load failed/i.test(error.message);
  }
  return false;
}

export async function syncPendingOperations(): Promise<void> {
  if (syncing) return;
  if (typeof navigator !== 'undefined' && !navigator.onLine) return;

  syncing = true;
  try {
    const deviceId = await ensureDeviceId();
    const pending = await listPendingOperations();
    if (pending.length === 0) {
      setLastSyncAt(new Date().toISOString());
      notifyLocalChange();
      return;
    }

    const pendingIds = new Set(pending.map((op) => op.operationId));
    const ready = pending.filter((op) => dependenciesApplied(op, pendingIds));
    const batch = ready.slice(0, MAX_OPERATIONS_PER_REQUEST);
    if (batch.length === 0) return;

    await markSending(batch.map((op) => op.operationId));

    let response: Response;
    try {
      response = await fetch('/api/sync/mutations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId, operations: batch }),
      });
    } catch (error) {
      await resetToPending(batch.map((op) => op.operationId));
      throw new Error(isNetworkError(error) ? 'network_error' : 'sync_failed');
    }

    let results: SyncResult[];
    try {
      const body = await response.json();
      results = body.results;
    } catch {
      await resetToPending(batch.map((op) => op.operationId));
      throw new Error('sync_failed');
    }

    let anySuccess = false;
    for (const result of results) {
      const op = batch.find((candidate) => candidate.operationId === result.operationId);
      const store = op ? entityStoreForType(op.type) : '';
      if (result.status === 'applied' || result.status === 'duplicate') {
        anySuccess = true;
        await markOperationApplied(result.operationId);
        if (store && op) {
          const patch = result.invoiceNumber ? { invoiceNumber: result.invoiceNumber } : undefined;
          await markRecordSynced(store, op.entityId, patch);
        }
      } else if (result.status === 'conflict' || result.status === 'rejected') {
        await markOperationConflict(result.operationId, result.errorCode ?? 'unknown', result.errorMessage ?? '');
        if (store && op) {
          await markRecordConflict(store, op.entityId);
        }
      }
    }

    setLastSyncAt(new Date().toISOString());

    if (anySuccess) {
      await bootstrap();
    }
  } finally {
    syncing = false;
    notifyLocalChange();
  }
}

export function getRetryDelayMs(attempt: number): number {
  return RETRY_DELAYS_MS[Math.min(attempt, RETRY_DELAYS_MS.length - 1)];
}

export function refreshOfflineStatusCounts(): Promise<{ pending: number; conflicts: number }> {
  return Promise.all([countPendingOperations(), countConflicts()]).then(([pending, conflicts]) => ({
    pending,
    conflicts,
  }));
}

export function offlineInvoicePlaceholder(): string {
  return OFFLINE_INVOICE_PLACEHOLDER;
}

export function placeholderForInvoice(invoiceNumber: string | null): boolean {
  return invoiceNumber === OFFLINE_INVOICE_PLACEHOLDER;
}

export { getCachedData };
