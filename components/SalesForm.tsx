"use client";

import React, { useState, useTransition, useEffect } from 'react';
import { Controller, useForm, UseFormRegisterReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useTranslations } from 'next-intl';
import { Wallet, Plus, Loader2, User, Hash, Banknote, Utensils, Bird } from 'lucide-react';
import { recordSale, updateSale, createClient } from '@/actions/sales';
import { shareInvoice, normalizePhone } from '@/lib/invoices/shareInvoice';
import { CustomSelect } from './CustomSelect';

const formSchema = z.object({
  batchId: z.string().min(1),
  clientId: z.string().optional(),
  newClientName: z.string().optional(),
  newClientPhone: z.string().optional(),
  quantity: z.number().min(1),
  unitPrice: z.number().min(0),
  feedConsumedBags: z.number().min(0),
  amountPaid: z.number().min(0),
  type: z.enum(['wholesale', 'retail']),
});

interface FormValues {
  batchId: string;
  clientId?: string;
  newClientName?: string;
  newClientPhone?: string;
  quantity: number;
  unitPrice: number;
  feedConsumedBags: number;
  amountPaid: number;
  type: 'wholesale' | 'retail';
}

interface SaleEditData {
  id: string;
  batchId: string;
  clientId: string | null;
  quantity: number;
  unitPrice: number;
  feedConsumedBags: number;
  amountPaid: number;
  type: 'wholesale' | 'retail';
}

interface SalesFormProps {
  batches: { id: string; name: string; remainingQuantity: number }[];
  clients: { id: string; name: string; phone: string | null }[];
  onComplete?: () => void;
  editData?: SaleEditData | null;
}

export function SalesForm({ batches, clients: initialClients, onComplete, editData }: SalesFormProps) {
  const t = useTranslations('Sales');
  const ti = useTranslations('Invoice');
  const tc = useTranslations('Clients');
  const [isPending, startTransition] = useTransition();
  const [showNewClient, setShowNewClient] = useState(false);
  const [isDebt, setIsDebt] = useState(editData ? editData.amountPaid === 0 : false);
  const [error, setError] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState(false);
  const [sendViaWhatsApp, setSendViaWhatsApp] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);

  const triggerInvoiceDownload = (saleId: string) => {
    try {
      const link = document.createElement('a');
      link.href = `/sales/${saleId}/invoice`;
      link.setAttribute('download', '');
      document.body.appendChild(link);
      link.click();
      link.remove();
      setDownloadError(false);
    } catch {
      setDownloadError(true);
    }
  };

  const { register, handleSubmit, watch, reset, setValue, control } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      batchId: editData?.batchId || batches[0]?.id || '',
      clientId: editData?.clientId || '',
      quantity: editData?.quantity || 1,
      unitPrice: editData?.unitPrice || 0,
      feedConsumedBags: editData?.feedConsumedBags || 0,
      amountPaid: editData?.amountPaid || 0,
      type: editData?.type || 'wholesale'
    }
  });

  const batchId = watch('batchId');

  useEffect(() => {
    if (batchId && !editData) {
      const selectedBatch = batches.find(b => b.id === batchId);
      if (selectedBatch) {
        setValue('quantity', selectedBatch.remainingQuantity);
      }
    }
  }, [batchId, batches, setValue, editData]);

  const quantity = watch('quantity') || 0;
  const unitPrice = watch('unitPrice') || 0;
  const total = quantity * unitPrice;

  // Auto-fill amountPaid only for NEW sales and only once when total changes,
  // but allow user to override it.
  useEffect(() => {
    if (!editData && !isDebt) {
      setValue('amountPaid', total);
    } else if (isDebt) {
      setValue('amountPaid', 0);
    }
  }, [total, setValue, editData, isDebt]);

  const onSubmit = (values: FormValues) => {
    setError(null);
    setShareError(null);

    const selectedPhone = showNewClient && values.newClientName
      ? values.newClientPhone?.trim() || null
      : values.clientId
        ? initialClients.find((c) => c.id === values.clientId)?.phone || null
        : null;

    if (sendViaWhatsApp && !editData) {
      if (!selectedPhone) {
        setError(ti('whatsappPhoneRequired'));
        return;
      }
      if (!normalizePhone(selectedPhone)) {
        setError(ti('whatsappPhoneInvalid'));
        return;
      }
    }

    startTransition(async () => {
      let clientId = values.clientId;

      if (showNewClient && values.newClientName) {
        const clientResult = await createClient({ name: values.newClientName, phone: values.newClientPhone?.trim() || undefined });
        if (clientResult.success) clientId = clientResult.id;
      }

      let result: Awaited<ReturnType<typeof updateSale>> | Awaited<ReturnType<typeof recordSale>>;
      if (editData) {
        result = await updateSale(editData.id, {
          batchId: values.batchId,
          clientId: clientId || undefined,
          quantity: values.quantity,
          unitPrice: values.unitPrice,
          feedConsumedBags: values.feedConsumedBags,
          amountPaid: values.amountPaid,
          type: values.type,
        });
      } else {
        result = await recordSale({
          batchId: values.batchId,
          clientId: clientId || undefined,
          quantity: values.quantity,
          unitPrice: values.unitPrice,
          feedConsumedBags: values.feedConsumedBags,
          amountPaid: values.amountPaid,
          type: values.type,
        });
      }

      if (result.success) {
        if (!editData && 'saleId' in result && result.saleId) {
          triggerInvoiceDownload(result.saleId);
        }
        if (!editData && sendViaWhatsApp && 'saleId' in result && result.saleId) {
          try {
            const shareResult = await shareInvoice({
              saleId: result.saleId,
              invoiceNumber: result.invoiceNumber,
              phone: selectedPhone,
              message: ti('whatsappShareMessage', { invoiceNumber: result.invoiceNumber }),
              title: ti('title'),
            });
            if (shareResult.status === 'unsupported') {
              setShareError(ti('whatsappShareUnsupported'));
            }
          } catch {
            setShareError(ti('whatsappShareError'));
          }
        }
        if (!editData) {
          reset();
          setSendViaWhatsApp(false);
        }
        setShowNewClient(false);
        if (onComplete) onComplete();
      } else {
        const errorMessage = result.error === 'feedStockInsufficient'
          ? t('feedStockInsufficient')
          : result.error === 'feedStockMissing'
            ? t('feedStockMissing')
            : result.error === 'kgPerSacMissing'
              ? t('kgPerSacMissing')
              : t('error');
        setError(errorMessage);
      }
    });
  };

  return (
    <div className={`${editData ? '' : 'form-card'}`}>
      {!editData && <h2 className="form-card__title">{t('addNew')}</h2>}
      {error && <div className="mb-5 rounded-xl border border-red-100 bg-red-50 p-3 text-center text-sm font-bold text-red-600">{error}</div>}
      {downloadError && <div className="mb-5 rounded-xl border border-red-100 bg-red-50 p-3 text-center text-sm font-bold text-red-600">{ti('downloadError')}</div>}
      {shareError && <div className="mb-5 rounded-xl border border-red-100 bg-red-50 p-3 text-center text-sm font-bold text-red-600">{shareError}</div>}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="space-y-3">

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="field-label">{t('type')}</label>
              <div className="segmented-control segmented-control--two">
                {(['wholesale', 'retail'] as const).map((type) => (
                  <label key={type} className="segmented-control__option relative">
                     <input type="radio" {...register('type')} value={type} className="peer sr-only" />
                     <div className="transition-all">
                       {t(type)}
                     </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
               <label className="field-label">{t('batch')}</label>
               <Controller
                 control={control}
                 name="batchId"
                 render={({ field }) => (
                   <CustomSelect
                     label={t('batch')}
                     icon={<Bird className="w-5 h-5 text-orange-500" />}
                     options={batches.map(b => ({ label: b.name, value: b.id }))}
                     placeholder={t('selectBatch')}
                     value={field.value}
                     onChange={field.onChange}
                     onBlur={field.onBlur}
                     ref={field.ref}
                   />
                 )}
               />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="field-label">{t('client')}</label>
            <div className="flex gap-2">
              {!showNewClient ? (
                <Controller
                  control={control}
                  name="clientId"
                  render={({ field }) => (
                    <CustomSelect
                      className="flex-1"
                      label={t('client')}
                      icon={<User className="w-5 h-5 text-orange-500" />}
                      options={initialClients.map(c => ({ label: c.name, value: c.id }))}
                      placeholder={t('cashClient')}
                      value={field.value}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      ref={field.ref}
                    />
                  )}
                />
              ) : (
                <div className="flex flex-col gap-2 self-start">
                  <input
                    placeholder={tc('name')}
                    {...register('newClientName')}
                    className="field-input h-12"
                  />
                  <input
                    placeholder={tc('phone')}
                    {...register('newClientPhone')}
                    className="field-input h-12"
                    inputMode="tel"
                    autoComplete="tel"
                  />
                </div>
              )}
              <button
                type="button"
                onClick={() => setShowNewClient(!showNewClient)}
                className="button-secondary h-12 w-12 shrink-0 self-start p-0"
              >
                {showNewClient ? <User className="w-5 h-5 text-orange-500" /> : <Plus className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <InputGroup label={t('quantity')} icon={<Hash className="w-4 h-4 text-blue-500" />} register={register('quantity', { valueAsNumber: true })} type="number" />
            <InputGroup label={t('unitPrice')} icon={<Banknote className="w-4 h-4 text-green-500" />} register={register('unitPrice', { valueAsNumber: true })} type="number" />
          </div>

          <InputGroup
            label={t('feedConsumedBags')}
            icon={<Utensils className="w-4 h-4 text-orange-500" />}
            register={register('feedConsumedBags', { valueAsNumber: true })}
            type="number"
            step="0.1"
          />
          <p className="formula-caption">{t('feedConsumptionHint')}</p>

           <div className="flex items-center justify-between px-1 pt-1">
              <label className="field-label">{t('debt')}</label>
              <button
                 type="button"
                 onClick={() => setIsDebt(!isDebt)}
                 aria-pressed={isDebt}
                 className={`relative h-6 w-12 rounded-full transition-all duration-300 ${isDebt ? 'bg-red-500' : 'bg-slate-300'}`}
              >
                 <div className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-all duration-300 ${isDebt ? 'left-7 shadow-sm' : 'left-1'}`} />
              </button>
           </div>

           <div className="summary-strip">
              <div className="flex flex-col">
                 <span className="summary-strip__label">{t('total')}</span>
                 <span className="summary-strip__value">{total.toLocaleString()} {t('currency')}</span>
              </div>
              <div className="flex flex-col items-end">
                 <label className="summary-strip__label mb-1">{t('paid')}</label>
                 <input
                  type="number"
                  disabled={isDebt}
                  {...register('amountPaid', { valueAsNumber: true })}
                   className="field-input h-10 w-32 text-right"
                  placeholder="0"
                />
              </div>
           </div>
           <p className="formula-caption">{t('totalFormula')}</p>
         </div>

        {!editData && (
          <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 transition-colors hover:border-slate-300">
            <input
              type="checkbox"
              checked={sendViaWhatsApp}
              onChange={(e) => setSendViaWhatsApp(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-green-600"
            />
            <span className="flex flex-col gap-0.5">
              <span className="text-sm font-bold text-slate-700">{ti('sendViaWhatsApp')}</span>
              <span className="text-xs text-slate-500">{ti('shareWhatsAppHint')}</span>
            </span>
          </label>
        )}

        <button
          disabled={isPending}
           className="button-primary mt-2 w-full"
        >
           {isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Wallet className="h-4 w-4" /><span>{t('save')}</span></>}
        </button>
      </form>
    </div>
  );
}

interface InputGroupProps {
  label: string;
  icon: React.ReactNode;
  register: UseFormRegisterReturn;
  type?: string;
  step?: string;
}

function InputGroup({ label, icon, register, type = "text", step }: InputGroupProps) {
  return (
    <div className="space-y-1.5">
      <label className="field-label">{label}</label>
      <div className="field-with-icon">
        <div>{icon}</div>
        <input
          type={type}
          step={step}
          {...register}
           className="field-input h-12"
        />
      </div>
    </div>
  );
}
