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
    <div className={`${editData ? '' : 'bg-white/70 backdrop-blur-xl p-8 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-white/40'}`}>
      {!editData && <h2 className="text-2xl font-black text-slate-800 tracking-tight mb-8">{t('addNew')}</h2>}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-4">

          {/* Type Selection */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('type')}</label>
            <div className="grid grid-cols-2 gap-3">
              <label className="relative cursor-pointer">
                <input type="radio" {...register('type')} value="borrowing" className="peer sr-only" />
                <div className={`flex items-center justify-center gap-2 p-4 rounded-2xl border-2 transition-all duration-300 ${
                  selectedType === 'borrowing' 
                    ? 'border-red-400 bg-red-50 text-red-600 shadow-lg shadow-red-100' 
                    : 'border-slate-100 bg-white text-slate-400 hover:border-slate-200'
                }`}>
                  <ArrowDownLeft className="w-5 h-5" />
                  <span className="font-black text-sm">{t('borrowing')}</span>
                </div>
              </label>
              <label className="relative cursor-pointer">
                <input type="radio" {...register('type')} value="lending" className="peer sr-only" />
                <div className={`flex items-center justify-center gap-2 p-4 rounded-2xl border-2 transition-all duration-300 ${
                  selectedType === 'lending' 
                    ? 'border-emerald-400 bg-emerald-50 text-emerald-600 shadow-lg shadow-emerald-100' 
                    : 'border-slate-100 bg-white text-slate-400 hover:border-slate-200'
                }`}>
                  <ArrowUpRight className="w-5 h-5" />
                  <span className="font-black text-sm">{t('lending')}</span>
                </div>
              </label>
            </div>
          </div>

          {/* Person Name */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('personName')}</label>
            <div className="relative">
              <div className="absolute left-5 top-1/2 -translate-y-1/2 pointer-events-none">
                <User className="w-5 h-5 text-slate-400" />
              </div>
              <input
                type="text"
                {...register('personName')}
                className="w-full h-14 pl-14 pr-6 rounded-2xl border-none bg-slate-100/50 text-lg font-bold text-slate-700 outline-none"
                placeholder={t('personName')}
              />
            </div>
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('amount')}</label>
            <div className="relative">
              <div className="absolute left-5 top-1/2 -translate-y-1/2 pointer-events-none">
                <DollarSign className={`w-5 h-5 ${selectedType === 'borrowing' ? 'text-red-500' : 'text-emerald-500'}`} />
              </div>
              <input
                type="number"
                step="any"
                {...register('amount', { valueAsNumber: true })}
                className="w-full h-14 pl-14 pr-6 rounded-2xl border-none bg-slate-100/50 text-lg font-bold text-slate-700 outline-none"
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('description')}</label>
            <div className="relative">
              <div className="absolute left-5 top-1/2 -translate-y-1/2 pointer-events-none">
                <FileText className="w-5 h-5 text-slate-400" />
              </div>
              <input
                type="text"
                {...register('description')}
                className="w-full h-14 pl-14 pr-6 rounded-2xl border-none bg-slate-100/50 text-lg font-bold text-slate-700 outline-none"
              />
            </div>
          </div>

        </div>

        <button
          disabled={isPending}
          className="w-full h-14 md:h-16 bg-slate-900 text-white text-base md:text-lg font-black rounded-3xl flex items-center justify-center gap-4 active:scale-95 transition-all shadow-2xl shadow-slate-200"
        >
          {isPending ? <Loader2 className="w-8 h-8 animate-spin" /> : <><Save className="w-7 h-7" /><span>{t('save')}</span></>}
        </button>
      </form>
    </div>
  );
}
