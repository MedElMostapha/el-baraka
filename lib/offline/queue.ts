'use client';

import { enqueueOperation } from './outbox';
import { ensureDeviceId, putLocalRecord } from './repository';
import type { LocalRecordMeta, OfflineOperation, OfflineOperationType, StoreName } from './types';

export function newId(): string {
  return crypto.randomUUID();
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function isNetworkError(error: unknown): boolean {
  if (error instanceof TypeError) return true;
  if (error instanceof Error) {
    return /fetch failed|Failed to fetch|NetworkError|load failed|network error/i.test(error.message);
  }
  return false;
}

export interface EnqueueLocalOperationOptions {
  store: StoreName;
  type: OfflineOperationType;
  entityId: string;
  payload: Record<string, unknown>;
  record: LocalRecordMeta & { id: string } & Record<string, unknown>;
  dependsOn?: string[];
}

export async function enqueueLocalOperation({
  store,
  type,
  entityId,
  payload,
  record,
  dependsOn = [],
}: EnqueueLocalOperationOptions): Promise<string> {
  const operationId = newId();
  const deviceId = await ensureDeviceId();
  const operation: OfflineOperation = {
    operationId,
    deviceId,
    type,
    entityId,
    payload,
    createdAt: nowIso(),
    dependsOn,
    attempts: 0,
    status: 'pending',
  };
  await enqueueOperation(operation);
  await putLocalRecord(store, { ...record, _syncState: 'pending', _operationId: operationId });
  return operationId;
}
