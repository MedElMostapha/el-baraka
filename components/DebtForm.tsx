"use client";

import React, { useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useTranslations } from 'next-intl';
import { Save, Loader2, FileText, DollarSign, User, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { addDebt, updateDebt } from '@/actions/debts';

const formSchema = z.object({
  personName: z.string().min(1),
  amount: z.number().min(0.01),
  type: z.enum(['borrowing', 'lending']),
  description: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface DebtFormProps {
  onComplete?: () => void;
  editData?: any;
}

export function DebtForm({ onComplete, editData }: DebtFormProps) {
  const t = useTranslations('Debts');
  const [isPending, startTransition] = useTransition();

  const { register, handleSubmit, reset, watch } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      personName: editData?.personName || '',
      amount: editData?.amount || 0,
      type: editData?.type || 'borrowing',
      description: editData?.description || '',
    }
  });

  const selectedType = watch('type');

  const onSubmit = (values: FormValues) => {
    startTransition(async () => {
      const result = editData
        ? await updateDebt(editData.id, values)
        : await addDebt(values);

      if (result.success) {
        if (!editData) reset();
        if (onComplete) onComplete();
      }
    });
  };

  return (
    <div className={`${editData ? '' : 'form-card'}`}>
      {!editData && <h2 className="form-card__title">{t('addNew')}</h2>}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="space-y-4">

          {/* Type Selection */}
          <div className="space-y-2">
            <label className="field-label">{t('type')}</label>
            <div className="grid grid-cols-2 gap-3">
              <label className="relative cursor-pointer">
                <input type="radio" {...register('type')} value="borrowing" className="peer sr-only" />
                <div className={`flex items-center justify-center gap-2 rounded-xl border p-3 transition-all duration-300 ${
                  selectedType === 'borrowing'
                    ? 'border-red-200 bg-red-50 text-red-600'
                    : 'border-slate-100 bg-slate-50 text-slate-400 hover:border-slate-200'
                }`}>
                  <ArrowDownLeft className="w-5 h-5" />
                  <span className="font-black text-sm">{t('borrowing')}</span>
                </div>
              </label>
              <label className="relative cursor-pointer">
                <input type="radio" {...register('type')} value="lending" className="peer sr-only" />
                <div className={`flex items-center justify-center gap-2 rounded-xl border p-3 transition-all duration-300 ${
                  selectedType === 'lending'
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-600'
                    : 'border-slate-100 bg-slate-50 text-slate-400 hover:border-slate-200'
                }`}>
                  <ArrowUpRight className="w-5 h-5" />
                  <span className="font-black text-sm">{t('lending')}</span>
                </div>
              </label>
            </div>
          </div>

          {/* Person Name */}
          <div className="space-y-2">
            <label className="field-label">{t('personName')}</label>
            <div className="field-with-icon">
              <div>
                <User className="w-5 h-5 text-slate-400" />
              </div>
              <input
                type="text"
                {...register('personName')}
                className="field-input h-12"
                placeholder={t('personName')}
              />
            </div>
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <label className="field-label">{t('amount')}</label>
            <div className="field-with-icon">
              <div>
                <DollarSign className={`w-5 h-5 ${selectedType === 'borrowing' ? 'text-red-500' : 'text-emerald-500'}`} />
              </div>
              <input
                type="number"
                step="any"
                {...register('amount', { valueAsNumber: true })}
                className="field-input h-12"
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="field-label">{t('description')}</label>
            <div className="field-with-icon">
              <div>
                <FileText className="w-5 h-5 text-slate-400" />
              </div>
              <input
                type="text"
                {...register('description')}
                className="field-input h-12"
              />
            </div>
          </div>

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
