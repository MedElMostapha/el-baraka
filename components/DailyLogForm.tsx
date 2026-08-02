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
  feedConsumedBags: z.number().min(0),
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
      batchId: batches.length > 0 ? batches[0].id : '',
      mortality: 0,
      feedConsumedBags: 0,
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
        const errorMessage = result.error === 'feedStockInsufficient'
          ? t('insufficientStock')
          : result.error === 'feedStockMissing'
            ? t('feedStockMissing')
            : result.error === 'kgPerSacMissing'
              ? t('kgPerSacMissing')
              : t('error');
        setMessage({ type: 'error', text: errorMessage });
      }
    });
  };

  return (
    <div className="w-full">
      <div className="form-card">
        <div className="section-heading">
          <div>
            <span className="section-kicker">Daily operations</span>
            <h2>{t('title')}</h2>
          </div>
          <div className="metric-card__icon" style={{ background: 'var(--orange-soft)', color: 'var(--orange)' }}>
            <ClipboardListIcon className="h-4 w-4" />
          </div>
        </div>

        {message && (
          <div className={`mb-6 rounded-xl border p-3 text-center text-sm font-bold ${
            message.type === 'success' ? 'border-emerald-100 bg-emerald-50 text-emerald-700' : 'border-red-100 bg-red-50 text-red-600'
          }`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          {/* Batch Selection */}
          <div className="space-y-2">
            <label className="field-label">{t('selectBatch')}</label>
            <div className="relative">
              <select
                {...register('batchId')}
                className="field-select h-12 appearance-none"
              >
                <option value="">{t('chooseBatch')}</option>
                {batches.map((batch) => (
                  <option key={batch.id} value={batch.id}>{batch.name}</option>
                ))}
              </select>
              <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2">
                <ChevronRight className="h-4 w-4 rotate-90 text-slate-400" />
              </div>
            </div>
            {errors.batchId && <p className="ml-1 text-[10px] font-bold uppercase tracking-tighter text-red-500">{errors.batchId.message}</p>}
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 gap-3">
            {/* Mortality */}
            <InputBox
              label={t('mortality')}
              icon={<Skull className="w-5 h-5 text-red-500" />}
              register={register('mortality', { valueAsNumber: true })}
            />

            {/* Feed */}
            <InputBox
              label={t('feedBags')}
              icon={<Utensils className="w-5 h-5 text-orange-500" />}
              register={register('feedConsumedBags', { valueAsNumber: true })}
              suffix={t('bagsUnit')}
              step="0.1"
            />

            {/* Water */}
            <InputBox
              label={t('water')}
              icon={<Droplets className="w-5 h-5 text-blue-500" />}
              register={register('waterConsumed', { valueAsNumber: true })}
              suffix="L"
            />

            {/* Medications */}
          <div className="col-span-2 space-y-2">
              <label className="field-label">{t('medications')}</label>
              <div className="relative">
                <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2">
                  <Pill className="h-4 w-4 text-emerald-600" />
                </div>
                <input
                  placeholder={t('medsPlaceholder')}
                  {...register('medications')}
                  className="field-input h-12 pl-11"
                />
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isPending}
            className="button-accent mt-4 w-full disabled:opacity-70"
          >
            {isPending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <Save className="h-5 w-5" />
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
  step?: string;
}

function InputBox({ label, icon, register, suffix, step }: InputBoxProps) {
  return (
    <div className="space-y-3">
      <label className="field-label">{label}</label>
      <div className="relative">
        <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
          {icon}
        </div>
        <input
          type="number"
          inputMode="decimal"
          min="0"
          step={step}
          {...register}
          className="field-input h-12 pl-10 pr-10 text-center text-lg font-black"
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black uppercase text-slate-400">
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
