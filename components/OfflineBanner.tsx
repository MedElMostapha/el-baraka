'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { WifiOff } from 'lucide-react';
import { useOfflineStatus } from '@/lib/offline/useOfflineStatus';

export function OfflineBanner() {
  const t = useTranslations('Offline');
  const { online, ready, hasCache, pendingCount } = useOfflineStatus();

  if (!ready) return null;

  return (
    <div className="space-y-2">
      {!online && (
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-bold text-slate-600">
          <WifiOff className="h-4 w-4 shrink-0 text-slate-400" />
          <span>{t('offlineBanner')}</span>
        </div>
      )}
      {online && !hasCache && (
        <div className="flex items-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-4 py-2.5 text-sm font-bold text-blue-700">
          <span>{t('noOfflineData')}</span>
        </div>
      )}
      {pendingCount > 0 && (
        <div className="flex items-center gap-2 rounded-xl border border-orange-100 bg-orange-50 px-4 py-2.5 text-sm font-bold text-orange-700">
          <span>{t('pendingSyncBanner', { count: pendingCount })}</span>
        </div>
      )}
    </div>
  );
}
