"use client";

import { useTranslations } from 'next-intl';
import { AlertTriangle, RotateCcw } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations('Errors');

  return (
    <main className="flex-1 flex items-center justify-center p-6 min-h-[60vh]">
      <div className="text-center max-w-sm mx-auto space-y-6">
        <div className="w-20 h-20 bg-red-50 rounded-[1.5rem] flex items-center justify-center mx-auto">
          <AlertTriangle className="w-10 h-10 text-red-500" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">{t('title')}</h2>
          <p className="text-slate-400 font-bold text-sm leading-relaxed">{t('message')}</p>
        </div>
        <button
          onClick={reset}
          className="w-full h-14 bg-slate-900 text-white font-black rounded-2xl flex items-center justify-center gap-3 active:scale-95 transition-all"
        >
          <RotateCcw className="w-5 h-5" />
          <span>{t('retry')}</span>
        </button>
      </div>
    </main>
  );
}
