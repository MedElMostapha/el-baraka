import { describe, it, expect } from 'vitest';
import { enqueueLocalOperation, isNetworkError } from '../queue';
import { ensureDeviceId, getRecord } from '../repository';
import { countPendingOperations } from '../outbox';
import { STORE_NAMES } from '../types';

describe('queue', () => {
  it('enqueues an operation and stores a pending local record linked to it', async () => {
    const deviceId = await ensureDeviceId();
    const operationId = await enqueueLocalOperation({
      store: STORE_NAMES.clients,
      type: 'createClient',
      entityId: 'c1',
      payload: { id: 'c1', name: 'Ahmed', phone: null, address: null },
      record: { id: 'c1', name: 'Ahmed', phone: null, address: null },
    });

    expect(operationId).toMatch(/^[0-9a-f-]{36}$/);
    expect(await countPendingOperations()).toBe(1);

    const record = await getRecord<{ _syncState?: string; _operationId?: string }>(STORE_NAMES.clients, 'c1');
    expect(record?._syncState).toBe('pending');
    expect(record?._operationId).toBe(operationId);

    const { listPendingOperations } = await import('../outbox');
    const ops = await listPendingOperations();
    expect(ops[0].deviceId).toBe(deviceId);
    expect(ops[0].dependsOn).toEqual([]);
  });

  it('classifies network errors from fetch failures', () => {
    expect(isNetworkError(new TypeError('Failed to fetch'))).toBe(true);
    expect(isNetworkError(new Error('fetch failed'))).toBe(true);
    expect(isNetworkError(new Error('load failed'))).toBe(true);
    expect(isNetworkError(new Error('500 server error'))).toBe(false);
    expect(isNetworkError(null)).toBe(false);
    expect(isNetworkError('string')).toBe(false);
  });
});
