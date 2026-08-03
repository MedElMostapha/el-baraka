"use client";

import React, { useTransition, useEffect, useState } from 'react';
import { Controller, useForm, UseFormRegisterReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useTranslations } from 'next-intl';
import { Wallet, Save, Loader2, FileText, Banknote, Hash, DollarSign, Bird } from 'lucide-react';
import { addExpense, updateExpense } from '@/actions/expenses';
import { useOfflineStatus } from '@/lib/offline/useOfflineStatus';
import { enqueueLocalOperation, newId, nowIso, isNetworkError } from '@/lib/offline/queue';
import { CustomSelect } from './CustomSelect';

const formSchema = z.object({
  amount: z.number().min(0.01),
  unitPrice: z.number().min(0).optional(),
  quantity: z.number().min(0).optional(),
  category: z.enum(['feed', 'medication', 'transport', 'utilities', 'salaries', 'other']),
  description: z.string().optional(),
  batchId: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface ExpenseFormProps {
  batches: { id: string; name: string }[];
  onComplete?: () => void;
  editData?: any;
  feedPricePerSac?: number;
}

export function ExpenseForm({ batches, onComplete, editData, feedPricePerSac = 0 }: ExpenseFormProps) {
  const t = useTranslations('Expenses');
  const to = useTranslations('Offline');
  const { online } = useOfflineStatus();
  const [isPending, startTransition] = useTransition();
  const [notice, setNotice] = useState<string | null>(null);

  const { register, handleSubmit, reset, watch, setValue, control } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      amount: editData?.amount || 0,
      unitPrice: editData?.unitPrice || 0,
      quantity: editData?.quantity || 0,
      category: editData?.category || 'other',
      description: editData?.description || '',
      batchId: editData?.batchId || ''
    }
  });

  const watchUnitPrice = watch('unitPrice');
  const watchQuantity = watch('quantity');
  const watchCategory = watch('category');

  useEffect(() => {
    if (!editData && watchCategory === 'feed' && feedPricePerSac > 0) {
      setValue('unitPrice', feedPricePerSac);
    }
  }, [editData, feedPricePerSac, setValue, watchCategory]);

  // Automatically calculate total amount
  useEffect(() => {
    if (watchUnitPrice && watchQuantity) {
      const total = Number(watchUnitPrice) * Number(watchQuantity);
      if (!isNaN(total)) {
        setValue('amount', total);
      }
    }
  }, [watchUnitPrice, watchQuantity, setValue]);

  const queueOffline = async (values: FormValues) => {
    const id = newId();
    const amount =
      values.unitPrice !== undefined && values.quantity !== undefined && values.unitPrice > 0
        ? values.unitPrice * values.quantity
        : values.amount;
    await enqueueLocalOperation({
      store: 'expenses',
      type: 'addExpense',
      entityId: id,
      payload: {
        id,
        date: nowIso(),
        amount,
        unitPrice: values.unitPrice ?? null,
        quantity: values.quantity ?? null,
        category: values.category,
        description: values.description || null,
        batchId: values.batchId || null,
      },
      record: {
        id,
        date: nowIso(),
        amount,
        unitPrice: values.unitPrice ?? null,
        quantity: values.quantity ?? null,
        category: values.category,
        description: values.description || null,
        batchId: values.batchId || null,
        batchName: batches.find((b) => b.id === values.batchId)?.name ?? null,
        saleId: null,
      },
    });
    setNotice(to('savedLocally'));
    reset();
    if (onComplete) onComplete();
  };

  const onSubmit = (values: FormValues) => {
    setNotice(null);
    startTransition(async () => {
      const data = {
        ...values,
        batchId: values.batchId || undefined,
      };

      if (!editData && (!online || (typeof navigator !== 'undefined' && !navigator.onLine))) {
        await queueOffline(values);
        return;
      }

      try {
        const result = editData
          ? await updateExpense(editData.id, data)
          : await addExpense(data);

        if (result.success) {
          if (!editData) reset();
          if (onComplete) onComplete();
        }
      } catch (e) {
        if (!editData && isNetworkError(e)) {
          await queueOffline(values);
        }
      }
    });
  };

  return (
    <div className={`${editData ? '' : 'form-card'}`}>
      {!editData && <h2 className="form-card__title">{t('addNew')}</h2>}
      {notice && <div className="mb-5 rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-center text-sm font-bold text-emerald-700">{notice}</div>}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="space-y-4">

          <div className="space-y-2">
            <label className="field-label">{t('category')}</label>
            <div className="grid grid-cols-2 gap-1 rounded-xl border border-slate-100 bg-slate-50 p-1 md:grid-cols-3">
              {(['feed', 'medication', 'transport', 'utilities', 'salaries', 'other'] as const).map((cat) => (
                <label key={cat} className="relative cursor-pointer">
                   <input type="radio" {...register('category')} value={cat} className="peer sr-only" />
                   <div className="flex h-9 items-center justify-center rounded-lg px-1 text-center text-xs font-bold text-slate-500 transition-all peer-checked:bg-white peer-checked:text-orange-600 peer-checked:shadow-sm">
                     {t(`categories.${cat}`)}
                   </div>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="field-label">{t('batch')}</label>
            <Controller
              control={control}
              name="batchId"
              render={({ field }) => (
                <CustomSelect
                  label={t('batch')}
                  icon={<Bird className="w-5 h-5 text-orange-500" />}
                  options={batches.map(b => ({ label: b.name, value: b.id }))}
                  placeholder={t('generalExpense')}
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  ref={field.ref}
                />
              )}
            />
          </div>

           <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
             <InputGroup
               label={t('unitPrice')}
               icon={<Banknote className="w-5 h-5 text-emerald-500" />}
               register={register('unitPrice', { valueAsNumber: true })}
               type="number"
             />
             <InputGroup
               label={t('quantity')}
               icon={<Hash className="w-5 h-5 text-blue-500" />}
               register={register('quantity', { valueAsNumber: true })}
               type="number"
             />
             <InputGroup
               label={t('amount')}
               icon={<DollarSign className="w-5 h-5 text-red-500" />}
               register={register('amount', { valueAsNumber: true })}
               type="number"
             />
          </div>

           <InputGroup label={t('description')} icon={<FileText className="w-5 h-5 text-slate-400" />} register={register('description')} />
           <p className="formula-caption">{t('amountFormula')}</p>

         </div>

        <button
          disabled={isPending}
           className="button-primary w-full"
        >
           {isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Save className="h-4 w-4" /><span>{t('save')}</span></>}
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
}

function InputGroup({ label, icon, register, type = "text" }: InputGroupProps) {
  return (
    <div className="space-y-2">
      <label className="field-label">{label}</label>
      <div className="field-with-icon">
        <div>{icon}</div>
        <input
          type={type}
          step={type === 'number' ? 'any' : undefined}
          {...register}
          className="field-input h-12"
        />
      </div>
    </div>
  );
}
