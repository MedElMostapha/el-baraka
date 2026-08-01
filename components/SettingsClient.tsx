"use client";

import React, { useTransition, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Globe, Check, Info, Scale, Save, Loader2 } from 'lucide-react';
import { setLocale } from '@/actions/locale';
import { setKgPerSac } from '@/actions/settings';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { PageHeader } from '@/components/PageHeader';

export default function SettingsClient({ kgPerSac: initialKgPerSac }: { kgPerSac: number }) {
  const t = useTranslations('Settings');
  const locale = useLocale();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [kgPerSac, setKgPerSacLocal] = useState(initialKgPerSac);
  const [saving, setSaving] = useState(false);

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
    <main className="page-container">
      <div className="page-stack">
        <PageHeader title={t('title')} subtitle={t('subtitle')} />

        {/* Language Selector */}
        <section className="space-y-4">
          <div className="section-heading mb-2 justify-start">
            <div className="metric-card__icon" style={{ background: 'var(--orange-soft)', color: 'var(--orange)' }}>
              <Globe className="h-4 w-4" />
            </div>
            <div>
              <h2>{t('language')}</h2>
              <p>{t('languageDesc')}</p>
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
                  className={`w-full rounded-xl border p-4 flex items-center justify-between transition-all active:scale-[0.98] disabled:opacity-70 ${
                    isActive
                    ? 'border-orange-300 bg-orange-50/80 shadow-sm'
                    : 'border-slate-100 bg-white hover:border-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <span className="text-2xl">{lang.flag}</span>
                     <span className={`text-base font-black tracking-tight ${
                      isActive ? 'text-orange-600' : 'text-slate-700'
                    }`}>
                      {lang.label}
                    </span>
                  </div>
                  {isActive && (
                     <div className="flex h-7 w-7 items-center justify-center rounded-full bg-orange-500">
                      <Check className="w-4 h-4 text-white" strokeWidth={3} />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        {/* Kg Per Sac Setting */}
        <section className="space-y-4">
          <div className="section-heading mb-2 justify-start">
            <div className="metric-card__icon" style={{ background: 'var(--orange-soft)', color: 'var(--orange)' }}>
              <Scale className="h-4 w-4" />
            </div>
            <div>
              <h2>{t('kgPerSac')}</h2>
              <p>{t('kgPerSacDesc')}</p>
            </div>
          </div>

           <div className="form-card">
             <div className="space-y-5">
               <div className="space-y-2">
                 <label className="field-label">kg / Sac</label>
                 <div className="field-with-icon">
                   <div>
                     <Scale className="w-5 h-5 text-orange-500" />
                  </div>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={kgPerSac}
                    onChange={(e) => setKgPerSacLocal(parseFloat(e.target.value) || 0)}
                     className="field-input h-12"
                    placeholder="0"
                  />
                </div>
              </div>
              <button
                onClick={async () => {
                  setSaving(true);
                  await setKgPerSac(kgPerSac);
                  setSaving(false);
                  router.refresh();
                }}
                disabled={saving}
                 className="button-primary w-full"
              >
                 {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Save className="h-4 w-4" /><span>{t('save')}</span></>}
              </button>
            </div>
          </div>
        </section>

        {/* App Info */}
        <section className="space-y-4">
          <div className="section-heading mb-2 justify-start">
            <div className="metric-card__icon" style={{ background: 'var(--pine-soft)', color: 'var(--pine)' }}>
              <Info className="h-4 w-4" />
            </div>
            <h2>{t('appInfo')}</h2>
          </div>

          <div className="record-card">
            <div className="flex items-center gap-5 mb-6">
              <Image
                src="/icons/icon-192x192.png"
                alt="El Baraka"
                width={64}
                height={64}
                 className="rounded-xl shadow-sm"
              />
              <div>
                 <h3 className="record-card__title text-lg">{t('appName')}</h3>
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
