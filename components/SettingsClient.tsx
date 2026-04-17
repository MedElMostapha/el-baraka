"use client";

import React, { useTransition } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Globe, Check, Info } from 'lucide-react';
import { setLocale } from '@/actions/locale';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { PageHeader } from '@/components/PageHeader';

export default function SettingsClient() {
  const t = useTranslations('Settings');
  const locale = useLocale();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleLocaleChange = (newLocale: string) => {
    if (newLocale === locale) return;
    startTransition(async () => {
      await setLocale(newLocale);
      router.refresh();
    });
  };

  const languages = [
    { code: 'fr', label: t('french'), flag: '🇫🇷' },
    { code: 'ar', label: t('arabic'), flag: '🇲🇷' },
  ];

  return (
    <main className="flex-1 p-6 md:p-12 max-w-lg mx-auto w-full pb-32">
      <div className="space-y-10">
        <PageHeader title={t('title')} subtitle={t('subtitle')} />

        {/* Language Selector */}
        <section className="space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
              <Globe className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <h2 className="font-black text-slate-800 tracking-tight">{t('language')}</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('languageDesc')}</p>
            </div>
          </div>

          <div className="space-y-3">
            {languages.map((lang) => {
              const isActive = locale === lang.code;
              return (
                <button
                  key={lang.code}
                  onClick={() => handleLocaleChange(lang.code)}
                  disabled={isPending}
                  className={`w-full p-5 rounded-[2rem] border-2 flex items-center justify-between transition-all active:scale-[0.98] disabled:opacity-70 ${
                    isActive
                      ? 'border-orange-500 bg-orange-50/80 shadow-lg shadow-orange-100'
                      : 'border-slate-100 bg-white hover:border-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <span className="text-2xl">{lang.flag}</span>
                    <span className={`text-lg font-black tracking-tight ${
                      isActive ? 'text-orange-600' : 'text-slate-700'
                    }`}>
                      {lang.label}
                    </span>
                  </div>
                  {isActive && (
                    <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
                      <Check className="w-4 h-4 text-white" strokeWidth={3} />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        {/* App Info */}
        <section className="space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center">
              <Info className="w-5 h-5 text-slate-500" />
            </div>
            <h2 className="font-black text-slate-800 tracking-tight">{t('appInfo')}</h2>
          </div>

          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
            <div className="flex items-center gap-5 mb-6">
              <Image
                src="/icons/icon-192x192.png"
                alt="El Baraka"
                width={64}
                height={64}
                className="rounded-[1.25rem] shadow-lg shadow-orange-200"
              />
              <div>
                <h3 className="text-xl font-black text-slate-800 tracking-tight">{t('appName')}</h3>
                <p className="text-sm font-bold text-slate-400 mt-1">{t('appDescription')}</p>
              </div>
            </div>
            <div className="border-t border-slate-100 pt-4">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('version')}</span>
                <span className="text-sm font-black text-slate-600">0.1.0</span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
