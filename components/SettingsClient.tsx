"use client";

import React, { useState, useRef, useTransition } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import {
  ArrowUpRight,
  Bird,
  Building2,
  Check,
  CircleDollarSign,
  CloudOff,
  FileSignature,
  FileText,
  Globe,
  ImagePlus,
  Info,
  Loader2,
  MapPin,
  Phone,
  Receipt,
  Save,
  Scale,
  Settings as SettingsIcon,
  Trash2,
  Upload,
} from 'lucide-react';
import { ConfirmModal } from '@/components/ConfirmModal';
import { useOfflineStatus } from '@/lib/offline/useOfflineStatus';
import { setLocale } from '@/actions/locale';
import { setCostPerChick, setFeedPricePerSac, setInvoiceBusinessAddress, setInvoiceBusinessName, setInvoiceBusinessPhone, setInvoiceFooter, setInvoiceTaxNumber, setKgPerSac, setLogoImage } from '@/actions/settings';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { PageHeader } from '@/components/PageHeader';

type SaveState = 'saved' | 'dirty' | 'saving' | 'error';

interface SettingsClientProps {
  kgPerSac: number;
  feedPricePerSac: number;
  costPerChick: number;
  invoiceBusinessName: string;
  invoiceBusinessPhone: string;
  invoiceBusinessAddress: string;
  invoiceTaxNumber: string;
  invoiceFooter: string;
  logoImage: string;
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
  invoiceBusinessName: initialInvoiceBusinessName,
  invoiceBusinessPhone: initialInvoiceBusinessPhone,
  invoiceBusinessAddress: initialInvoiceBusinessAddress,
  invoiceTaxNumber: initialInvoiceTaxNumber,
  invoiceFooter: initialInvoiceFooter,
  logoImage: initialLogoImage,
}: SettingsClientProps) {
  const t = useTranslations('Settings');
  const locale = useLocale();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [kgPerSac, setKgPerSacLocal] = useState(initialKgPerSac);
  const [feedPricePerSac, setFeedPricePerSacLocal] = useState(initialFeedPricePerSac);
  const [costPerChick, setCostPerChickLocal] = useState(initialCostPerChick);
  const [invoiceBusinessName, setInvoiceBusinessNameLocal] = useState(initialInvoiceBusinessName);
  const [invoiceBusinessPhone, setInvoiceBusinessPhoneLocal] = useState(initialInvoiceBusinessPhone);
  const [invoiceBusinessAddress, setInvoiceBusinessAddressLocal] = useState(initialInvoiceBusinessAddress);
  const [invoiceTaxNumber, setInvoiceTaxNumberLocal] = useState(initialInvoiceTaxNumber);
  const [invoiceFooter, setInvoiceFooterLocal] = useState(initialInvoiceFooter);
  const [logoImage, setLogoImageLocal] = useState(initialLogoImage);
  const [logoError, setLogoError] = useState('');
  const [savedValues, setSavedValues] = useState({
    kgPerSac: initialKgPerSac,
    feedPricePerSac: initialFeedPricePerSac,
    costPerChick: initialCostPerChick,
    invoiceBusinessName: initialInvoiceBusinessName,
    invoiceBusinessPhone: initialInvoiceBusinessPhone,
    invoiceBusinessAddress: initialInvoiceBusinessAddress,
    invoiceTaxNumber: initialInvoiceTaxNumber,
    invoiceFooter: initialInvoiceFooter,
    logoImage: initialLogoImage,
  });
  const [saveState, setSaveState] = useState<SaveState>('saved');

  const hasChanges =
    kgPerSac !== savedValues.kgPerSac ||
    feedPricePerSac !== savedValues.feedPricePerSac ||
    costPerChick !== savedValues.costPerChick ||
    invoiceBusinessName !== savedValues.invoiceBusinessName ||
    invoiceBusinessPhone !== savedValues.invoiceBusinessPhone ||
    invoiceBusinessAddress !== savedValues.invoiceBusinessAddress ||
    invoiceTaxNumber !== savedValues.invoiceTaxNumber ||
    invoiceFooter !== savedValues.invoiceFooter ||
    logoImage !== savedValues.logoImage;

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
        setInvoiceBusinessName(invoiceBusinessName),
        setInvoiceBusinessPhone(invoiceBusinessPhone),
        setInvoiceBusinessAddress(invoiceBusinessAddress),
        setInvoiceTaxNumber(invoiceTaxNumber),
        setInvoiceFooter(invoiceFooter),
        setLogoImage(logoImage),
      ]);

      if (!results.every((result) => result.success)) {
        setSaveState('error');
        return;
      }

      setSavedValues({ kgPerSac, feedPricePerSac, costPerChick, invoiceBusinessName, invoiceBusinessPhone, invoiceBusinessAddress, invoiceTaxNumber, invoiceFooter, logoImage });
      setSaveState('saved');
      setLogoError('');
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

  const to = useTranslations('Offline');
  const { pendingCount, clearLocalData } = useOfflineStatus();
  const [isClearConfirmOpen, setClearConfirmOpen] = useState(false);
  const [isClearing, setClearing] = useState(false);
  const [clearError, setClearError] = useState(false);
  const [cleared, setCleared] = useState(false);

  const handleClearLocalData = async () => {
    setClearing(true);
    setClearError(false);
    setCleared(false);
    try {
      await clearLocalData();
      setCleared(true);
    } catch {
      setClearError(true);
    } finally {
      setClearing(false);
      setClearConfirmOpen(false);
    }
  };

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
              <a className="settings-index__link" href="#invoice">
                <Receipt className="h-4 w-4" />
                <span>{t('invoice')}</span>
                <ArrowUpRight className="settings-index__arrow h-3.5 w-3.5" />
              </a>
              <a className="settings-index__link" href="#offline">
                <CloudOff className="h-4 w-4" />
                <span>{to('offlineData')}</span>
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

            <section id="invoice" className="settings-card" aria-labelledby="invoice-title">
              <div className="settings-card__header">
                <div className="settings-card__heading">
                  <span className="settings-card__number">03</span>
                  <div>
                    <span className="settings-card__eyebrow">{t('settingsSection')}</span>
                    <h2 id="invoice-title">{t('invoice')}</h2>
                    <p>{t('invoiceDesc')}</p>
                  </div>
                </div>
                <span className={`settings-card__pill ${hasChanges ? 'settings-card__pill--warm' : ''}`}>
                  {hasChanges ? t('unsavedChanges') : t('allSaved')}
                </span>
              </div>

              <LogoSettingField
                label={t('logo')}
                hint={t('logoDesc')}
                value={logoImage}
                error={logoError}
                onFile={(dataUrl) => {
                  setLogoImageLocal(dataUrl);
                  setLogoError('');
                  setSaveState('dirty');
                }}
                onError={setLogoError}
                onRemove={() => {
                  setLogoImageLocal('');
                  setLogoError('');
                  setSaveState('dirty');
                }}
              />

              <div className="settings-values-grid">
                <TextSettingField
                  id="invoice-business-name"
                  label={t('invoiceBusinessName')}
                  hint={t('invoiceBusinessNameDesc')}
                  icon={<Building2 className="h-5 w-5" />}
                  value={invoiceBusinessName}
                  onChange={(value) => {
                    setInvoiceBusinessNameLocal(value);
                    setSaveState('dirty');
                  }}
                />
                <TextSettingField
                  id="invoice-business-phone"
                  label={t('invoiceBusinessPhone')}
                  hint={t('invoiceBusinessPhoneDesc')}
                  icon={<Phone className="h-5 w-5" />}
                  value={invoiceBusinessPhone}
                  onChange={(value) => {
                    setInvoiceBusinessPhoneLocal(value);
                    setSaveState('dirty');
                  }}
                />
                <TextSettingField
                  id="invoice-business-address"
                  label={t('invoiceBusinessAddress')}
                  hint={t('invoiceBusinessAddressDesc')}
                  icon={<MapPin className="h-5 w-5" />}
                  value={invoiceBusinessAddress}
                  onChange={(value) => {
                    setInvoiceBusinessAddressLocal(value);
                    setSaveState('dirty');
                  }}
                />
              </div>

              <div className="settings-values-grid">
                <TextSettingField
                  id="invoice-tax-number"
                  label={t('invoiceTaxNumber')}
                  hint={t('invoiceTaxNumberDesc')}
                  icon={<FileSignature className="h-5 w-5" />}
                  value={invoiceTaxNumber}
                  onChange={(value) => {
                    setInvoiceTaxNumberLocal(value);
                    setSaveState('dirty');
                  }}
                />
                <TextSettingField
                  id="invoice-footer"
                  label={t('invoiceFooter')}
                  hint={t('invoiceFooterDesc')}
                  icon={<FileText className="h-5 w-5" />}
                  value={invoiceFooter}
                  onChange={(value) => {
                    setInvoiceFooterLocal(value);
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

            <section id="offline" className="settings-card" aria-labelledby="offline-title">
              <div className="settings-card__header">
                <div className="settings-card__heading">
                  <span className="settings-card__number">04</span>
                  <div>
                    <span className="settings-card__eyebrow">{t('settingsSection')}</span>
                    <h2 id="offline-title">{to('offlineData')}</h2>
                    <p>{to('offlineDataDesc')}</p>
                  </div>
                </div>
                <span className="settings-card__pill">
                  {pendingCount > 0 ? to('statusPending') : to('statusUpToDate')}
                </span>
              </div>

              <div className="settings-offline-zone">
                <div className="settings-offline-zone__icon">
                  <CloudOff className="h-6 w-6" />
                </div>
                <div className="settings-offline-zone__copy">
                  <strong>{to('clearLocalData')}</strong>
                  <p>{to('clearLocalDataDesc')}</p>
                  {clearError && <p className="settings-offline-zone__error">{to('internalError')}</p>}
                  {cleared && <p className="settings-offline-zone__success">{to('cleared')}</p>}
                </div>
                <button
                  type="button"
                  onClick={() => setClearConfirmOpen(true)}
                  disabled={isClearing}
                  className="button-danger settings-offline-zone__button disabled:opacity-50"
                >
                  {isClearing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  <span>{isClearing ? t('saving') : to('clearLocalData')}</span>
                </button>
              </div>
            </section>

            <section id="about" className="settings-about-card" aria-labelledby="about-title">
              <div className="settings-about-card__brand">
                <div className="settings-about-card__logo">
                  {logoImage ? (
                    <img src={logoImage} alt="El Baraka" width={56} height={56} className="settings-about-card__logo-img" />
                  ) : (
                    <Image src="/icons/icon-192x192.png" alt="El Baraka" width={56} height={56} />
                  )}
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

      <ConfirmModal
        isOpen={isClearConfirmOpen}
        onClose={() => setClearConfirmOpen(false)}
        onConfirm={handleClearLocalData}
        title={to('confirmClearLocal')}
        message={to('clearLocalDataDesc')}
        confirmText={to('clearLocalData')}
      />
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

interface TextSettingFieldProps {
  id: string;
  label: string;
  hint: string;
  icon: React.ReactNode;
  value: string;
  onChange: (value: string) => void;
}

function TextSettingField({ id, label, hint, icon, value, onChange }: TextSettingFieldProps) {
  return (
    <div className="settings-field">
      <div className="settings-field__topline">
        <span className="settings-field__icon">{icon}</span>
      </div>
      <label className="settings-field__label" htmlFor={id}>{label}</label>
      <input
        id={id}
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="settings-field__input settings-field__input--text"
      />
      <p>{hint}</p>
    </div>
  );
}

const LOGO_MAX_DIMENSION = 256;
const LOGO_MAX_BYTES = 5 * 1024 * 1024;

class LogoFileError extends Error {}

async function processLogoFile(file: File): Promise<string> {
  const allowedTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];
  if (!allowedTypes.includes(file.type)) {
    throw new LogoFileError('logoInvalid');
  }
  if (file.size > LOGO_MAX_BYTES) {
    throw new LogoFileError('logoTooLarge');
  }

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new LogoFileError('logoUploadError'));
    reader.readAsDataURL(file);
  });

  const bitmap = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new window.Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new LogoFileError('logoUploadError'));
    image.src = dataUrl;
  });

  const scale = Math.min(1, LOGO_MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new LogoFileError('logoUploadError');
  ctx.drawImage(bitmap, 0, 0, width, height);
  return canvas.toDataURL('image/png');
}

interface LogoSettingFieldProps {
  label: string;
  hint: string;
  value: string;
  error: string;
  onFile: (dataUrl: string) => void;
  onError: (message: string) => void;
  onRemove: () => void;
}

function LogoSettingField({ label, hint, value, error, onFile, onError, onRemove }: LogoSettingFieldProps) {
  const t = useTranslations('Settings');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const dataUrl = await processLogoFile(file);
      onFile(dataUrl);
    } catch (err) {
      const key = err instanceof LogoFileError ? err.message : 'logoUploadError';
      onError(key === 'logoTooLarge' ? t('logoTooLarge') : key === 'logoInvalid' ? t('logoInvalid') : t('logoUploadError'));
    }
  };

  return (
    <div className="settings-field settings-field--logo">
      <div className="settings-field__topline">
        <span className="settings-field__icon">
          <ImagePlus className="h-5 w-5" />
        </span>
      </div>
      <label className="settings-field__label" htmlFor="logo-image">{label}</label>
      <div className="settings-logo">
        <div className="settings-logo__preview">
          {value ? (
            <img src={value} alt="" className="settings-logo__img" />
          ) : (
            <span className="settings-logo__placeholder">
              <ImagePlus className="h-6 w-6" />
            </span>
          )}
        </div>
        <div className="settings-logo__actions">
          <input
            id="logo-image"
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            className="settings-logo__input"
            onChange={handleChange}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="button-secondary settings-logo__choose"
          >
            <Upload className="h-4 w-4" />
            <span>{value ? t('logoChange') : t('logoChoose')}</span>
          </button>
          {value && (
            <button type="button" onClick={onRemove} className="settings-logo__remove">
              <Trash2 className="h-4 w-4" />
              <span>{t('logoRemove')}</span>
            </button>
          )}
        </div>
      </div>
      <p className={error ? 'settings-logo__error' : ''}>{error || hint}</p>
    </div>
  );
}
