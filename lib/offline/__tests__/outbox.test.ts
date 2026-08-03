import { describe, it, expect } from 'vitest';
import {
  enqueueOperation,
  listPendingOperations,
  markSending,
  resetToPending,
  markOperationApplied,
  markOperationConflict,
  listConflicts,
  retryOperation,
  discardOperation,
  countPendingOperations,
  countConflicts,
  dependenciesApplied,
} from '../outbox';
import type { OfflineOperation } from '../types';

function makeOp(overrides: Partial<OfflineOperation>): OfflineOperation {
  return {
    operationId: 'op-1',
    deviceId: 'device-1',
    type: 'createClient',
    entityId: 'c1',
    payload: { id: 'c1', name: 'Ahmed' },
    createdAt: '2026-08-03T08:00:00.000Z',
    dependsOn: [],
    attempts: 0,
    status: 'pending',
    ...overrides,
  };
}

describe('outbox', () => {
  it('enqueues and lists pending operations sorted by createdAt', async () => {
    await enqueueOperation(makeOp({ operationId: 'op-2', createdAt: '2026-08-03T09:00:00.000Z' }));
    await enqueueOperation(makeOp({ operationId: 'op-1', createdAt: '2026-08-03T08:00:00.000Z' }));
    const ops = await listPendingOperations();
    expect(ops.map((o) => o.operationId)).toEqual(['op-1', 'op-2']);
  });

  it('marks operations as sending and increments attempts', async () => {
    await enqueueOperation(makeOp({}));
    await markSending(['op-1']);
    const ops = await listPendingOperations();
    expect(ops[0].status).toBe('sending');
    expect(ops[0].attempts).toBe(1);
  });

  it('resets sending operations back to pending with a network error code', async () => {
    await enqueueOperation(makeOp({}));
    await markSending(['op-1']);
    await resetToPending(['op-1']);
    const ops = await listPendingOperations();
    expect(ops[0].status).toBe('pending');
    expect(ops[0].lastErrorCode).toBe('network_error');
  });

  it('removes an operation from the outbox once applied', async () => {
    await enqueueOperation(makeOp({}));
    await markOperationApplied('op-1');
    expect(await listPendingOperations()).toEqual([]);
    expect(await countPendingOperations()).toBe(0);
  });

  it('moves a conflicted operation to the conflicts store', async () => {
    await enqueueOperation(makeOp({}));
    await markOperationConflict('op-1', 'batch_closed', 'batch is closed');
    expect(await listPendingOperations()).toEqual([]);
    expect(await countPendingOperations()).toBe(0);
    expect(await countConflicts()).toBe(1);
    const conflicts = await listConflicts();
    expect(conflicts[0].lastErrorCode).toBe('batch_closed');
    expect(conflicts[0].lastErrorMessage).toBe('batch is closed');
  });

  it('retries a conflicted operation by moving it back to the outbox', async () => {
    await enqueueOperation(makeOp({}));
    await markOperationConflict('op-1', 'batch_closed', 'batch is closed');
    await retryOperation('op-1');
    expect(await countConflicts()).toBe(0);
    expect(await countPendingOperations()).toBe(1);
    const ops = await listPendingOperations();
    expect(ops[0].status).toBe('pending');
  });

  it('discards a conflicted operation entirely', async () => {
    await enqueueOperation(makeOp({}));
    await markOperationConflict('op-1', 'batch_closed', 'batch is closed');
    await discardOperation('op-1');
    expect(await countConflicts()).toBe(0);
    expect(await countPendingOperations()).toBe(0);
  });

  it('counts only pending and sending operations', async () => {
    await enqueueOperation(makeOp({ operationId: 'op-1' }));
    await enqueueOperation(makeOp({ operationId: 'op-2', status: 'sending' }));
    await markOperationConflict('op-2', 'x', 'y');
    expect(await countPendingOperations()).toBe(1);
    expect(await countConflicts()).toBe(1);
  });

  it('evaluates dependency resolution against a set of pending ids', () => {
    const pending = new Set(['dep-1', 'dep-2']);
    expect(dependenciesApplied(makeOp({ dependsOn: [] }), pending)).toBe(true);
    expect(dependenciesApplied(makeOp({ dependsOn: ['dep-1'] }), pending)).toBe(false);
    expect(dependenciesApplied(makeOp({ dependsOn: ['dep-1', 'dep-3'] }), pending)).toBe(false);
    expect(dependenciesApplied(makeOp({ dependsOn: ['dep-3'] }), pending)).toBe(true);
  });
});
