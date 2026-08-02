"use client";

import React, { useState, useTransition } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import {
  ArrowUpRight,
  Bird,
  Check,
  CircleDollarSign,
  Globe,
  Info,
  Loader2,
  Save,
  Scale,
  Settings as SettingsIcon,
} from 'lucide-react';
import { setLocale } from '@/actions/locale';
import { setCostPerChick, setFeedPricePerSac, setKgPerSac } from '@/actions/settings';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { PageHeader } from '@/components/PageHeader';

type SaveState = 'saved' | 'dirty' | 'saving' | 'error';

interface SettingsClientProps {
  kgPerSac: number;
  feedPricePerSac: number;
  costPerChick: number;
}

interface NumberSettingFieldProps {
  id: string;
  label: string;
  unit: string;
  hint: string;
  icon: React.ReactNode;
  value: number;
  step: string;
  onChange: (value: number) => void;
}

export default function SettingsClient({
  kgPerSac: initialKgPerSac,
  feedPricePerSac: initialFeedPricePerSac,
  costPerChick: initialCostPerChick,
}: SettingsClientProps) {
  const t = useTranslations('Settings');
  const locale = useLocale();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [kgPerSac, setKgPerSacLocal] = useState(initialKgPerSac);
  const [feedPricePerSac, setFeedPricePerSacLocal] = useState(initialFeedPricePerSac);
  const [costPerChick, setCostPerChickLocal] = useState(initialCostPerChick);
  const [savedValues, setSavedValues] = useState({
    kgPerSac: initialKgPerSac,
    feedPricePerSac: initialFeedPricePerSac,
    costPerChick: initialCostPerChick,
  });
  const [saveState, setSaveState] = useState<SaveState>('saved');

  const hasChanges =
    kgPerSac !== savedValues.kgPerSac ||
    feedPricePerSac !== savedValues.feedPricePerSac ||
    costPerChick !== savedValues.costPerChick;

  const languages = [
    { code: 'fr', label: t('french'), flag: '🇫🇷', note: 'FR' },
    { code: 'ar', label: t('arabic'), flag: '🇲🇷', note: 'AR' },
  ];

  const handleLocaleChange = (newLocale: string) => {
    if (newLocale === locale) return;
    startTransition(async () => {
      await setLocale(newLocale);
      router.refresh();
    });
  };

  const handleSave = async () => {
    setSaveState('saving');

    try {
      const results = await Promise.all([
        setKgPerSac(kgPerSac),
        setFeedPricePerSac(feedPricePerSac),
        setCostPerChick(costPerChick),
      ]);

      if (!results.every((result) => result.success)) {
        setSaveState('error');
        return;
      }

      setSavedValues({ kgPerSac, feedPricePerSac, costPerChick });
      setSaveState('saved');
      router.refresh();
    } catch {
      setSaveState('error');
    }
  };

  const saveStatus = saveState === 'saving'
    ? t('saving')
    : saveState === 'error'
      ? t('saveError')
      : hasChanges
        ? t('unsavedChanges')
        : t('allSaved');
  const saveTone = saveState === 'error'
    ? 'error'
    : saveState === 'saving'
      ? 'saving'
      : hasChanges
        ? 'dirty'
        : 'saved';

  return (
    <main className="page-container settings-page">
      <div className="page-stack">
        <PageHeader title={t('title')} subtitle={t('subtitle')} />

        <section className="settings-hero" aria-labelledby="settings-hero-title">
          <div className="settings-hero__copy">
            <span className="settings-hero__eyebrow">{t('settingsEyebrow')}</span>
            <h2 id="settings-hero-title">{t('settingsLead')}</h2>
            <p>{t('settingsIntro')}</p>
          </div>
          <div className="settings-hero__signal">
            <div className="settings-hero__signal-icon">
              <SettingsIcon className="h-5 w-5" />
            </div>
            <div>
              <span>{t('settingsReady')}</span>
              <strong>{t('settingsReadyValue')}</strong>
            </div>
          </div>
        </section>

        <div className="settings-layout">
          <aside className="settings-index">
            <span className="settings-index__label">{t('settingsMap')}</span>
            <nav className="settings-index__nav" aria-label={t('settingsMap')}>
              <a className="settings-index__link settings-index__link--active" href="#language">
                <Globe className="h-4 w-4" />
                <span>{t('language')}</span>
                <ArrowUpRight className="settings-index__arrow h-3.5 w-3.5" />
              </a>
              <a className="settings-index__link" href="#defaults">
                <Scale className="h-4 w-4" />
                <span>{t('defaults')}</span>
                <ArrowUpRight className="settings-index__arrow h-3.5 w-3.5" />
              </a>
              <a className="settings-index__link" href="#about">
                <Info className="h-4 w-4" />
                <span>{t('appInfo')}</span>
                <ArrowUpRight className="settings-index__arrow h-3.5 w-3.5" />
              </a>
            </nav>
            <div className="settings-index__current">
              <span>{t('currentLanguage')}</span>
              <strong>{locale === 'fr' ? t('french') : t('arabic')}</strong>
            </div>
          </aside>

          <div className="settings-content">
            <section id="language" className="settings-card" aria-labelledby="language-title">
              <div className="settings-card__header">
                <div className="settings-card__heading">
                  <span className="settings-card__number">01</span>
                  <div>
                    <span className="settings-card__eyebrow">{t('settingsSection')}</span>
                    <h2 id="language-title">{t('language')}</h2>
                    <p>{t('languageDesc')}</p>
                  </div>
                </div>
                <span className="settings-card__pill">{locale.toUpperCase()}</span>
              </div>

              <div className="settings-language-grid">
                {languages.map((language) => {
                  const isActive = locale === language.code;
                  return (
                    <button
                      key={language.code}
                      type="button"
                      onClick={() => handleLocaleChange(language.code)}
                      disabled={isPending}
                      aria-pressed={isActive}
                      className={`settings-language-option ${isActive ? 'settings-language-option--active' : ''}`}
                    >
                      <span className="settings-language-option__flag">{language.flag}</span>
                      <span className="settings-language-option__copy">
                        <strong>{language.label}</strong>
                        <small>{language.note}</small>
                      </span>
                      <span className="settings-language-option__check">
                        {isActive && <Check className="h-4 w-4" strokeWidth={3} />}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>

            <section id="defaults" className="settings-card" aria-labelledby="defaults-title">
              <div className="settings-card__header">
                <div className="settings-card__heading">
                  <span className="settings-card__number">02</span>
                  <div>
                    <span className="settings-card__eyebrow">{t('settingsSection')}</span>
                    <h2 id="defaults-title">{t('defaults')}</h2>
                    <p>{t('defaultsDesc')}</p>
                  </div>
                </div>
                <span className={`settings-card__pill ${hasChanges ? 'settings-card__pill--warm' : ''}`}>
                  {hasChanges ? t('unsavedChanges') : t('allSaved')}
                </span>
              </div>

              <div className="settings-values-grid">
                <NumberSettingField
                  id="kg-per-sac"
                  label={t('kgPerSac')}
                  unit={t('kgPerSacUnit')}
                  hint={t('kgPerSacDesc')}
                  icon={<Scale className="h-5 w-5" />}
                  value={kgPerSac}
                  step="0.1"
                  onChange={(value) => {
                    setKgPerSacLocal(value);
                    setSaveState('dirty');
                  }}
                />
                <NumberSettingField
                  id="feed-price-per-sac"
                  label={t('feedPricePerSac')}
                  unit={t('feedPricePerSacUnit')}
                  hint={t('feedPricePerSacDesc')}
                  icon={<CircleDollarSign className="h-5 w-5" />}
                  value={feedPricePerSac}
                  step="1"
                  onChange={(value) => {
                    setFeedPricePerSacLocal(value);
                    setSaveState('dirty');
                  }}
                />
                <NumberSettingField
                  id="chick-price"
                  label={t('chickPrice')}
                  unit={t('chickPriceUnit')}
                  hint={t('chickPriceDesc')}
                  icon={<Bird className="h-5 w-5" />}
                  value={costPerChick}
                  step="0.01"
                  onChange={(value) => {
                    setCostPerChickLocal(value);
                    setSaveState('dirty');
                  }}
                />
              </div>

              <div className="settings-savebar">
                <div className={`settings-savebar__status settings-savebar__status--${saveTone}`}>
                  <span />
                  <div>
                    <strong>{saveState === 'error' ? t('saveError') : t('settingsReady')}</strong>
                    <small>{saveStatus}</small>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saveState === 'saving' || !hasChanges}
                  className="button-primary settings-savebar__button disabled:opacity-50"
                >
                  {saveState === 'saving' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  <span>{saveState === 'saving' ? t('saving') : t('save')}</span>
                </button>
              </div>
            </section>

            <section id="about" className="settings-about-card" aria-labelledby="about-title">
              <div className="settings-about-card__brand">
                <div className="settings-about-card__logo">
                  <Image src="/icons/icon-192x192.png" alt="El Baraka" width={56} height={56} />
                </div>
                <div>
                  <span className="settings-card__eyebrow">{t('appInfo')}</span>
                  <h2 id="about-title">{t('appName')}</h2>
                  <p>{t('appDescription')}</p>
                </div>
              </div>
              <div className="settings-about-card__version">
                <span>{t('version')}</span>
                <strong>0.1.0</strong>
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}

function NumberSettingField({ id, label, unit, hint, icon, value, step, onChange }: NumberSettingFieldProps) {
  return (
    <div className="settings-field">
      <div className="settings-field__topline">
        <span className="settings-field__icon">{icon}</span>
        <span className="settings-field__unit">{unit}</span>
      </div>
      <label className="settings-field__label" htmlFor={id}>{label}</label>
      <input
        id={id}
        type="number"
        min="0"
        step={step}
        value={value}
        onChange={(event) => onChange(parseFloat(event.target.value) || 0)}
        className="settings-field__input"
      />
      <p>{hint}</p>
    </div>
  );
}
