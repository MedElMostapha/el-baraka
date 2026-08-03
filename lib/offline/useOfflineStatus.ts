'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { getCachedData, subscribeLocalChange } from './repository';
import type { CachedData } from './types';

export interface OfflineStatusValue {
  ready: boolean;
  online: boolean;
  syncing: boolean;
  pendingCount: number;
  conflictCount: number;
  lastSyncAt: string | null;
  hasCache: boolean;
  syncNow: () => Promise<void>;
  clearLocalData: () => Promise<void>;
}

export const OfflineStatusContext = createContext<OfflineStatusValue>({
  ready: false,
  online: true,
  syncing: false,
  pendingCount: 0,
  conflictCount: 0,
  lastSyncAt: null,
  hasCache: false,
  syncNow: async () => {},
  clearLocalData: async () => {},
});

export function useOfflineStatus(): OfflineStatusValue {
  return useContext(OfflineStatusContext);
}

export function useOfflineSnapshot(): { data: CachedData | null; ready: boolean } {
  const [state, setState] = useState<{ data: CachedData | null; ready: boolean }>({
    data: null,
    ready: false,
  });

  useEffect(() => {
    let active = true;
    const load = async () => {
      const data = await getCachedData();
      if (active) setState({ data, ready: true });
    };
    load();
    const unsubscribe = subscribeLocalChange(load);
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  return state;
}
