"use client";

import React, { useTransition } from 'react';
import { useForm, UseFormRegisterReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useTranslations } from 'next-intl';
import { Wallet, Save, Loader2, FileText, Banknote } from 'lucide-react';
import { addExpense, updateExpense } from '@/actions/expenses';

const formSchema = z.object({
  amount: z.number().min(0.01),
  category: z.enum(['feed', 'medication', 'transport', 'utilities', 'salaries', 'other']),
  description: z.string().optional(),
  batchId: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface ExpenseFormProps {
  batches: { id: string; name: string }[];
  onComplete?: () => void;
  editData?: any;
}

export function ExpenseForm({ batches, onComplete, editData }: ExpenseFormProps) {
  const t = useTranslations('Expenses');
  const [isPending, startTransition] = useTransition();

  const { register, handleSubmit, reset } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { 
      amount: editData?.amount || 0, 
      category: editData?.category || 'other',
      description: editData?.description || '',
      batchId: editData?.batchId || ''
    }
  });

  const onSubmit = (values: FormValues) => {
    startTransition(async () => {
      const data = {
        ...values,
        batchId: values.batchId || undefined,
      };

      const result = editData 
        ? await updateExpense(editData.id, data)
        : await addExpense(data);

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
          
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('category')}</label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 p-1 bg-slate-100 rounded-2xl">
              {(['feed', 'medication', 'transport', 'utilities', 'salaries', 'other'] as const).map((cat) => (
                <label key={cat} className="relative">
                   <input type="radio" {...register('category')} value={cat} className="peer sr-only" />
                   <div className="h-10 flex items-center justify-center rounded-xl font-bold text-sm peer-checked:bg-white peer-checked:text-red-500 peer-checked:shadow-sm transition-all cursor-pointer">
                     {t(`categories.${cat}`)}
                   </div>
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div className="space-y-2">
               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('batch')}</label>
               <select 
                  {...register('batchId')}
                  className="w-full h-14 px-6 rounded-2xl border-none bg-slate-100/50 text-lg font-bold text-slate-700 outline-none"
                >
                  <option value="">{t('generalExpense')}</option>
                  {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
             </div>
             
             <InputGroup label={t('amount')} icon={<Banknote className="w-5 h-5 text-red-500" />} register={register('amount', { valueAsNumber: true })} type="number" />
          </div>

          <InputGroup label={t('description')} icon={<FileText className="w-5 h-5 text-slate-400" />} register={register('description')} />

        </div>

        <button 
          disabled={isPending}
          className="w-full h-14 md:h-16 bg-slate-900 text-white text-base md:text-lg font-black rounded-3xl flex items-center justify-center gap-4 active:scale-95 transition-all shadow-2xl shadow-slate-200"
        >
          {isPending ? <Loader2 className="w-8 h-8 animate-spin" /> : <><Wallet className="w-7 h-7" /><span>{t('save')}</span></>}
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
      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{label}</label>
      <div className="relative">
        <div className="absolute left-5 top-1/2 -translate-y-1/2 pointer-events-none">{icon}</div>
        <input 
          type={type}
          step={type === 'number' ? 'any' : undefined}
          {...register}
          className="w-full h-14 pl-14 pr-6 rounded-2xl border-none bg-slate-100/50 text-lg font-bold text-slate-700 outline-none" 
        />
      </div>
    </div>
  );
}
