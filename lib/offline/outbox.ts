import { openOfflineDb } from './db';
import { STORE_NAMES, type OfflineOperation } from './types';
import { notifyLocalChange } from './repository';

export async function enqueueOperation(operation: OfflineOperation): Promise<void> {
  const db = await openOfflineDb();
  await db.put(STORE_NAMES.outbox, operation);
  notifyLocalChange();
}

export async function listPendingOperations(): Promise<OfflineOperation[]> {
  const db = await openOfflineDb();
  const all = (await db.getAll(STORE_NAMES.outbox)) as OfflineOperation[];
  return all
    .filter((op) => op.status === 'pending' || op.status === 'sending')
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function markSending(operationIds: string[]): Promise<void> {
  if (operationIds.length === 0) return;
  const db = await openOfflineDb();
  const tx = db.transaction(STORE_NAMES.outbox, 'readwrite');
  for (const id of operationIds) {
    const op = (await tx.store.get(id)) as OfflineOperation | undefined;
    if (op) {
      await tx.store.put({ ...op, status: 'sending', attempts: op.attempts + 1 });
    }
  }
  await tx.done;
  notifyLocalChange();
}

export async function resetToPending(operationIds: string[]): Promise<void> {
  if (operationIds.length === 0) return;
  const db = await openOfflineDb();
  const tx = db.transaction(STORE_NAMES.outbox, 'readwrite');
  for (const id of operationIds) {
    const op = (await tx.store.get(id)) as OfflineOperation | undefined;
    if (op) {
      await tx.store.put({ ...op, status: 'pending', lastErrorCode: 'network_error' });
    }
  }
  await tx.done;
  notifyLocalChange();
}

export async function markOperationApplied(operationId: string): Promise<void> {
  const db = await openOfflineDb();
  const op = (await db.get(STORE_NAMES.outbox, operationId)) as OfflineOperation | undefined;
  if (op) {
    await db.delete(STORE_NAMES.outbox, operationId);
  }
  notifyLocalChange();
}

export async function markOperationConflict(operationId: string, errorCode: string, errorMessage: string): Promise<void> {
  const db = await openOfflineDb();
  const op = (await db.get(STORE_NAMES.outbox, operationId)) as OfflineOperation | undefined;
  if (op) {
    await db.delete(STORE_NAMES.outbox, operationId);
    await db.put(STORE_NAMES.syncConflicts, { ...op, status: 'conflict', lastErrorCode: errorCode, lastErrorMessage: errorMessage });
  }
  notifyLocalChange();
}

export async function listConflicts(): Promise<OfflineOperation[]> {
  const db = await openOfflineDb();
  return (await db.getAll(STORE_NAMES.syncConflicts)) as OfflineOperation[];
}

export async function retryOperation(operationId: string): Promise<void> {
  const db = await openOfflineDb();
  const conflict = (await db.get(STORE_NAMES.syncConflicts, operationId)) as OfflineOperation | undefined;
  if (conflict) {
    await db.delete(STORE_NAMES.syncConflicts, operationId);
    await db.put(STORE_NAMES.outbox, { ...conflict, status: 'pending' });
  }
  notifyLocalChange();
}

export async function discardOperation(operationId: string): Promise<void> {
  const db = await openOfflineDb();
  const conflict = (await db.get(STORE_NAMES.syncConflicts, operationId)) as OfflineOperation | undefined;
  if (conflict) {
    await db.delete(STORE_NAMES.syncConflicts, operationId);
  }
  notifyLocalChange();
}

export async function countPendingOperations(): Promise<number> {
  const db = await openOfflineDb();
  const all = (await db.getAll(STORE_NAMES.outbox)) as OfflineOperation[];
  return all.filter((op) => op.status === 'pending' || op.status === 'sending').length;
}

export async function countConflicts(): Promise<number> {
  const db = await openOfflineDb();
  return db.count(STORE_NAMES.syncConflicts);
}

export function dependenciesApplied(operation: OfflineOperation, pendingIds: Set<string>): boolean {
  return operation.dependsOn.every((id) => !pendingIds.has(id));
}
