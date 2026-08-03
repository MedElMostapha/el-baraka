'use client';

import { useMemo } from 'react';
import { useOfflineSnapshot } from './useOfflineStatus';
import type { CachedData, LocalRecordMeta } from './types';

export type EntityStore =
  | 'batches'
  | 'dailyLogs'
  | 'inventory'
  | 'clients'
  | 'sales'
  | 'payments'
  | 'expenses'
  | 'debts'
  | 'restocks';

export interface PendingRecord extends LocalRecordMeta, Record<string, unknown> {
  id: string;
}

export function usePendingRecords(store: EntityStore): PendingRecord[] {
  const { data } = useOfflineSnapshot();
  return useMemo(() => {
    if (!data) return [];
    const rows = (data[store] as CachedData[EntityStore] | undefined) ?? [];
    return (rows as unknown as PendingRecord[]).filter(
      (r) => r._syncState === 'pending' || r._syncState === 'conflict'
    );
  }, [data, store]);
}

export function mergeIntoList<T extends { id: string }>(
  serverRecords: T[],
  pendingRecords: PendingRecord[],
  toDisplay: (record: PendingRecord) => T
): { records: Array<T & { isPending?: boolean }>; pendingIds: Set<string> } {
  const serverIds = new Set(serverRecords.map((r) => r.id));
  const pendingIds = new Set(pendingRecords.map((r) => r.id));
  const added = pendingRecords
    .filter((r) => !serverIds.has(r.id))
    .map((r) => ({ ...toDisplay(r), isPending: true }));
  return { records: [...added, ...serverRecords], pendingIds };
}
