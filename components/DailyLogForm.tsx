"use client";

import React, { useState, useTransition } from 'react';
import { useForm, UseFormRegisterReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useTranslations } from 'next-intl';
import { Skull, Utensils, Droplets, Pill, Save, Loader2, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { createDailyLog } from '@/actions/daily-log';

const formSchema = z.object({
  batchId: z.string().min(1, 'Required'),
  mortality: z.number().min(0),
  feedConsumed: z.number().min(0),
  waterConsumed: z.number().min(0),
  medications: z.string().optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface DailyLogFormProps {
  batches: { id: string; name: string }[];
}

export function DailyLogForm({ batches }: DailyLogFormProps) {
  const t = useTranslations('DailyTracking');
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  
  const { register, handleSubmit, formState: { errors }, reset } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      batchId: '',
      mortality: 0,
      feedConsumed: 0,
      waterConsumed: 0,
      medications: '',
      notes: '',
    },
  });

  const onSubmit = (values: FormValues) => {
    setMessage(null);
    startTransition(async () => {
      const result = await createDailyLog(values);
      if (result.success) {
        setMessage({ type: 'success', text: t('success') });
        reset();
        router.refresh();
      } else {
        setMessage({ type: 'error', text: t('error') });
      }
    });
  };

  return (
    <div className="w-full max-w-lg mx-auto pb-10">
      <div className="bg-white/70 backdrop-blur-xl p-8 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-white/40">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">{t('title')}</h2>
          <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
            <ClipboardListIcon className="w-5 h-5 text-orange-600" />
          </div>
        </div>
        
        {message && (
          <div className={`p-4 mb-6 rounded-2xl text-center font-bold text-sm animate-in fade-in slide-in-from-top-2 ${
            message.type === 'success' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
          }`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          {/* Batch Selection */}
          <div className="space-y-3">
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">{t('selectBatch')}</label>
            <div className="relative">
              <select 
                {...register('batchId')}
                className="w-full h-16 px-6 rounded-2xl border-none bg-slate-100/50 text-lg font-bold text-slate-700 appearance-none focus:ring-2 focus:ring-orange-500/20 transition-all outline-none"
              >
                <option value="">{t('chooseBatch')}</option>
                {batches.map((batch) => (
                  <option key={batch.id} value={batch.id}>{batch.name}</option>
                ))}
              </select>
              <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none">
                <ChevronRight className="w-5 h-5 text-slate-400 rotate-90" />
              </div>
            </div>
            {errors.batchId && <p className="text-red-500 text-[10px] font-bold uppercase tracking-tighter ml-1">{errors.batchId.message}</p>}
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 gap-4">
            {/* Mortality */}
            <InputBox 
              label={t('mortality')} 
              icon={<Skull className="w-5 h-5 text-red-500" />}
              register={register('mortality', { valueAsNumber: true })}
            />

            {/* Feed */}
            <InputBox 
              label={t('feed')} 
              icon={<Utensils className="w-5 h-5 text-orange-500" />}
              register={register('feedConsumed', { valueAsNumber: true })}
              suffix="kg"
            />

            {/* Water */}
            <InputBox 
              label={t('water')} 
              icon={<Droplets className="w-5 h-5 text-blue-500" />}
              register={register('waterConsumed', { valueAsNumber: true })}
              suffix="L"
            />

            {/* Medications */}
            <div className="col-span-2 space-y-3">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">{t('medications')}</label>
              <div className="relative">
                <div className="absolute left-6 top-1/2 -translate-y-1/2">
                  <Pill className="w-5 h-5 text-green-500" />
                </div>
                <input 
                  placeholder={t('medsPlaceholder')}
                  {...register('medications')}
                  className="w-full h-16 pl-14 pr-6 rounded-2xl border-none bg-slate-100/50 text-lg font-bold text-slate-700 focus:ring-2 focus:ring-orange-500/20 transition-all outline-none" 
                />
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <button 
            type="submit" 
            disabled={isPending}
            className="w-full h-14 md:h-16 bg-gradient-to-br from-orange-400 to-orange-600 hover:from-orange-500 hover:to-orange-700 active:scale-95 text-white text-base md:text-lg font-black rounded-3xl shadow-[0_20px_40px_rgba(249,115,22,0.3)] transition-all flex items-center justify-center gap-4 disabled:opacity-70 mt-4"
          >
            {isPending ? (
              <Loader2 className="w-8 h-8 animate-spin" />
            ) : (
              <>
                <Save className="w-7 h-7" />
                <span>{t('save')}</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

interface InputBoxProps {
  label: string;
  icon: React.ReactNode;
  register: UseFormRegisterReturn;
  suffix?: string;
}

function InputBox({ label, icon, register, suffix }: InputBoxProps) {
  return (
    <div className="space-y-3">
      <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">{label}</label>
      <div className="relative">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
          {icon}
        </div>
        <input 
          type="number" 
          inputMode="decimal"
          {...register}
          className="w-full h-16 pl-12 pr-4 rounded-2xl border-none bg-slate-100/50 text-xl font-black text-slate-800 focus:ring-2 focus:ring-orange-500/20 transition-all outline-none text-center" 
        />
        {suffix && (
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-300 uppercase">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

function ClipboardListIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 11h4"/><path d="M12 16h4"/><path d="M8 11h.01"/><path d="M8 16h.01"/></svg>
  );
}
