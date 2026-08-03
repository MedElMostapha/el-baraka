'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { WifiOff, RefreshCw, Cloud, TriangleAlert, Loader2, X, RotateCcw, Trash2 } from 'lucide-react';
import { useOfflineStatus } from '@/lib/offline/useOfflineStatus';
import { listConflicts, retryOperation, discardOperation } from '@/lib/offline/outbox';
import { translateSyncError } from '@/lib/offline/errors';
import type { OfflineOperation } from '@/lib/offline/types';

type StatusKind = 'offline' | 'syncing' | 'pending' | 'upToDate' | 'attention';

function resolveStatus(status: {
  online: boolean;
  syncing: boolean;
  pendingCount: number;
  conflictCount: number;
}): StatusKind {
  if (status.conflictCount > 0) return 'attention';
  if (!status.online) return 'offline';
  if (status.syncing) return 'syncing';
  if (status.pendingCount > 0) return 'pending';
  return 'upToDate';
}

const STATUS_STYLES: Record<StatusKind, { label: string; icon: React.ReactNode }> = {
  offline: { label: 'statusOffline', icon: <WifiOff className="h-3.5 w-3.5" /> },
  syncing: { label: 'statusSyncing', icon: <Loader2 className="h-3.5 w-3.5 animate-spin" /> },
  pending: { label: 'statusPending', icon: <RefreshCw className="h-3.5 w-3.5" /> },
  upToDate: { label: 'statusUpToDate', icon: <Cloud className="h-3.5 w-3.5" /> },
  attention: { label: 'statusNeedsAttention', icon: <TriangleAlert className="h-3.5 w-3.5" /> },
};

export function OfflineStatus() {
  const t = useTranslations('Offline');
  const locale = useLocale();
  const status = useOfflineStatus();
  const [conflicts, setConflicts] = useState<OfflineOperation[]>([]);
  const [showConflicts, setShowConflicts] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const kind = resolveStatus(status);
  const config = STATUS_STYLES[kind];

  const loadConflicts = useCallback(async () => {
    listConflicts().then(setConflicts);
  }, []);

  useEffect(() => {
    if (showConflicts) loadConflicts();
  }, [showConflicts, status.conflictCount, loadConflicts]);

  const pillColor =
    kind === 'attention'
      ? 'bg-amber-50 text-amber-700 border-amber-200'
      : kind === 'offline'
        ? 'bg-slate-100 text-slate-600 border-slate-200'
        : kind === 'syncing'
          ? 'bg-blue-50 text-blue-700 border-blue-200'
          : kind === 'pending'
            ? 'bg-orange-50 text-orange-700 border-orange-200'
            : 'bg-emerald-50 text-emerald-700 border-emerald-200';

  const lastSyncLabel = status.lastSyncAt
    ? `${t('lastSyncAt', { time: new Date(status.lastSyncAt).toLocaleString(locale) })}`
    : null;

  return (
    <>
      <div className="flex items-center gap-2">
        <div className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-black ${pillColor}`}>
          {config.icon}
          <span>{t(config.label)}</span>
          {status.pendingCount > 0 && (
            <span className="rounded-full bg-current px-1.5 text-[10px] font-black text-white opacity-90">
              {status.pendingCount}
            </span>
          )}
          {kind === 'attention' && (
            <span className="rounded-full bg-current px-1.5 text-[10px] font-black text-white opacity-90">
              {status.conflictCount}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={() => status.syncNow()}
          disabled={status.syncing || !status.online}
          className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-black text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-900 disabled:opacity-50"
        >
          {status.syncing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          {t('syncNow')}
        </button>

        {kind === 'attention' && (
          <button
            type="button"
            onClick={() => setShowConflicts(true)}
            className="flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-black text-amber-700 transition-colors hover:bg-amber-100"
          >
            <TriangleAlert className="h-3.5 w-3.5" />
            {status.conflictCount}
          </button>
        )}
      </div>

      {lastSyncLabel && (
        <p className="text-[11px] font-semibold text-slate-400">{lastSyncLabel}</p>
      )}

      {showConflicts && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowConflicts(false)}>
          <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-black text-slate-800">{t('syncConflict')}</h3>
              <button type="button" onClick={() => setShowConflicts(false)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100" aria-label="Close">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              {conflicts.length === 0 && (
                <p className="text-sm font-semibold text-slate-500">{t('noConflicts')}</p>
              )}
              {conflicts.map((conflict) => (
                <div key={conflict.operationId} className="space-y-2 rounded-xl border border-amber-100 bg-amber-50/50 p-3">
                  <p className="text-xs font-black uppercase tracking-wide text-slate-500">{conflict.type}</p>
                  <p className="text-sm font-semibold text-amber-700">
                    {translateSyncError(t, conflict.lastErrorCode)}
                  </p>
                  {conflict.lastErrorMessage && (
                    <p className="text-xs text-slate-500">{conflict.lastErrorMessage}</p>
                  )}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={busyId === conflict.operationId}
                      onClick={async () => {
                        setBusyId(conflict.operationId);
                        await retryOperation(conflict.operationId);
                        setBusyId(null);
                        await status.syncNow();
                        await loadConflicts();
                      }}
                      className="flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-black text-white transition-colors hover:bg-amber-700 disabled:opacity-50"
                    >
                      {busyId === conflict.operationId ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
                      {t('retry')}
                    </button>
                    <button
                      type="button"
                      disabled={busyId === conflict.operationId}
                      onClick={async () => {
                        setBusyId(conflict.operationId);
                        await discardOperation(conflict.operationId);
                        setBusyId(null);
                        await loadConflicts();
                      }}
                      className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-black text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      {t('discardLocalOperation')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
