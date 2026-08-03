'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { OfflineStatusContext } from '@/lib/offline/useOfflineStatus';
import { bootstrap, syncPendingOperations, refreshOfflineStatusCounts, RETRY_DELAYS_MS } from '@/lib/offline/sync';
import {
  ensureDeviceId,
  getCachedData,
  getLastSyncAt,
  clearAllLocalData,
  subscribeLocalChange,
} from '@/lib/offline/repository';

export function OfflineProvider({ children }: { children: React.ReactNode }) {
  const [online, setOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [syncing, setSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [conflictCount, setConflictCount] = useState(0);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [hasCache, setHasCache] = useState(false);

  const syncingRef = useRef(false);
  const retryDelayRef = useRef(0);
  const retryTimerRef = useRef<number | null>(null);
  const runSyncRef = useRef<() => Promise<void>>(async () => {});

  const refresh = useCallback(async () => {
    const counts = await refreshOfflineStatusCounts();
    setPendingCount(counts.pending);
    setConflictCount(counts.conflicts);
    setLastSyncAt(await getLastSyncAt());
    setHasCache((await getCachedData()) !== null);
  }, []);

  const scheduleRetry = useCallback(() => {
    if (retryTimerRef.current != null) return;
    const delay = RETRY_DELAYS_MS[Math.min(retryDelayRef.current, RETRY_DELAYS_MS.length - 1)];
    retryDelayRef.current += 1;
    retryTimerRef.current = window.setTimeout(() => {
      retryTimerRef.current = null;
      runSyncRef.current();
    }, delay);
  }, []);

  const runSync = useCallback(async () => {
    if (syncingRef.current) return;
    syncingRef.current = true;
    setSyncing(true);
    try {
      await syncPendingOperations();
      retryDelayRef.current = 0;
      await refresh();
    } catch {
      scheduleRetry();
    } finally {
      syncingRef.current = false;
      setSyncing(false);
    }
  }, [refresh, scheduleRetry]);

  useEffect(() => {
    runSyncRef.current = runSync;
  }, [runSync]);

  useEffect(() => {
    let active = true;
    (async () => {
      await ensureDeviceId();
      if (active) setReady(true);
      await refresh();
    })();

    const unsubscribe = subscribeLocalChange(refresh);

    return () => {
      active = false;
      unsubscribe();
    };
  }, [refresh]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const onOnline = () => {
      retryDelayRef.current = 0;
      setOnline(true);
      runSync();
    };
    const onOffline = () => setOnline(false);
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible' && navigator.onLine) {
        retryDelayRef.current = 0;
        setOnline(true);
        runSync();
      }
    };

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    document.addEventListener('visibilitychange', onVisibilityChange);

    bootstrap().then(() => refresh()).then(() => runSync()).catch(() => {});

    const timer = window.setInterval(() => {
      if (navigator.onLine) runSync();
    }, 60_000);

    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.clearInterval(timer);
    };
  }, [refresh, runSync]);

  const syncNow = useCallback(async () => {
    retryDelayRef.current = 0;
    await bootstrap();
    await runSync();
  }, [runSync]);

  const clearLocal = useCallback(async () => {
    await clearAllLocalData();
    await refresh();
  }, [refresh]);

  return (
    <OfflineStatusContext.Provider
      value={{
        ready,
        online,
        syncing,
        pendingCount,
        conflictCount,
        lastSyncAt,
        hasCache,
        syncNow,
        clearLocalData: clearLocal,
      }}
    >
      {children}
    </OfflineStatusContext.Provider>
  );
}
