"use client";

import React, { useState, useTransition } from 'react';
import { useForm, UseFormRegisterReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useTranslations } from 'next-intl';
import { Plus, Save, Loader2, Calendar, Hash, CircleDollarSign, Bird } from 'lucide-react';
import { createBatch } from '@/actions/batch';

const formSchema = z.object({
  name: z.string().min(1, 'Required'),
  breed: z.string().optional(),
  arrivalDate: z.string().min(1, 'Required'),
  initialQuantity: z.number().min(1),
  costPerChick: z.number().min(0),
});

type FormValues = z.infer<typeof formSchema>;

export function BatchForm({ onComplete }: { onComplete: () => void }) {
  const t = useTranslations('Batches');
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  
  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      breed: '',
      arrivalDate: new Date().toISOString().split('T')[0],
      initialQuantity: 1,
      costPerChick: 0,
    },
  });

  const onSubmit = (values: FormValues) => {
    setError(null);
    startTransition(async () => {
      const result = await createBatch({
        ...values,
        arrivalDate: new Date(values.arrivalDate),
      });
      if (result.success) {
        onComplete();
      } else {
        setError(t('createError'));
      }
    });
  };

  return (
    <div className="bg-white/70 backdrop-blur-xl p-8 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-white/40 animate-in fade-in zoom-in-95 duration-300">
      <h2 className="text-2xl font-black text-slate-800 tracking-tight mb-8">{t('addNew')}</h2>
      
      {error && (
        <div className="p-4 mb-6 rounded-2xl bg-red-50 text-red-600 text-center font-bold text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-4">
          <InputGroup label={t('name')} icon={<Plus className="w-5 h-5 text-orange-500" />} register={register('name')} />
          <InputGroup label={t('breed')} icon={<Bird className="w-5 h-5 text-blue-500" />} register={register('breed')} />
          <InputGroup label={t('arrivalDate')} icon={<Calendar className="w-5 h-5 text-purple-500" />} register={register('arrivalDate')} type="date" />
          
          <div className="grid grid-cols-2 gap-4">
            <InputGroup label={t('quantity')} icon={<Hash className="w-5 h-5 text-green-500" />} register={register('initialQuantity', { valueAsNumber: true })} type="number" />
            <InputGroup label={t('cost')} icon={<CircleDollarSign className="w-5 h-5 text-yellow-500" />} register={register('costPerChick', { valueAsNumber: true })} type="number" step="0.01" />
          </div>
        </div>

        <button 
          type="submit" 
          disabled={isPending}
          className="w-full h-16 bg-slate-900 hover:bg-black text-white text-lg font-black rounded-2xl shadow-xl transition-all flex items-center justify-center gap-3 disabled:opacity-70 mt-4"
        >
          {isPending ? <Loader2 className="w-6 h-6 animate-spin" /> : <><Save className="w-6 h-6" /><span>{t('save')}</span></>}
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
    <div className="space-y-2">
      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{label}</label>
      <div className="relative">
        <div className="absolute left-5 top-1/2 -translate-y-1/2 pointer-events-none">{icon}</div>
        <input 
          type={type}
          step={step}
          {...register}
          className="w-full h-14 pl-14 pr-6 rounded-2xl border-none bg-slate-100/50 text-lg font-bold text-slate-700 focus:ring-2 focus:ring-orange-500/20 transition-all outline-none" 
        />
      </div>
    </div>
  );
}
