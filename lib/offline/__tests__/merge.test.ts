import { describe, it, expect } from 'vitest';
import { mergeIntoList } from '../merge';
import type { PendingRecord } from '../merge';

const toDisplay = (r: PendingRecord) => ({ id: r.id, name: String(r.name ?? '') });

describe('mergeIntoList', () => {
  it('returns only server records when there are no pending records', () => {
    const server = [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }];
    const { records, pendingIds } = mergeIntoList(server, [], toDisplay);
    expect(records).toEqual(server);
    expect(records.every((r) => !r.isPending)).toBe(true);
    expect(pendingIds.size).toBe(0);
  });

  it('prepends pending records that do not exist on the server', () => {
    const server = [{ id: 'a', name: 'A' }];
    const pending: PendingRecord[] = [{ id: 'p1', name: 'Pending', _syncState: 'pending' }];
    const { records, pendingIds } = mergeIntoList(server, pending, toDisplay);
    expect(records).toHaveLength(2);
    expect(records[0]).toMatchObject({ id: 'p1', name: 'Pending', isPending: true });
    expect(records[1]).toEqual({ id: 'a', name: 'A' });
    expect(pendingIds.has('p1')).toBe(true);
  });

  it('does not duplicate pending records that already exist on the server', () => {
    const server = [{ id: 'a', name: 'Server A' }];
    const pending: PendingRecord[] = [{ id: 'a', name: 'Local A', _syncState: 'pending' }];
    const { records } = mergeIntoList(server, pending, toDisplay);
    expect(records.map((r) => r.id)).toEqual(['a']);
    expect(records[0]).toEqual({ id: 'a', name: 'Server A' });
  });

  it('reports pending ids for conflict records too', () => {
    const pending: PendingRecord[] = [
      { id: 'c1', name: 'Conflict', _syncState: 'conflict' },
      { id: 'c2', name: 'Pending', _syncState: 'pending' },
    ];
    const { pendingIds } = mergeIntoList([], pending, toDisplay);
    expect(pendingIds.has('c1')).toBe(true);
    expect(pendingIds.has('c2')).toBe(true);
  });
});
