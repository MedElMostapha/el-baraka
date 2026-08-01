"use client";

import React, { useState, useTransition } from 'react';
import { useForm, UseFormRegisterReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useTranslations } from 'next-intl';
import { Plus, Save, Loader2, Calendar, Hash, CircleDollarSign, Bird, Utensils } from 'lucide-react';
import { createBatch, updateBatch } from '@/actions/batch';

const formSchema = z.object({
  name: z.string().min(1, 'Required'),
  breed: z.string().optional(),
  arrivalDate: z.string().min(1, 'Required'),
  initialQuantity: z.number().min(1),
  costPerChick: z.number().min(0),
  feedStock: z.number().min(0),
});

type FormValues = z.infer<typeof formSchema>;

export function BatchForm({ onComplete, editData, showTitle = true, kgPerSac = 0 }: { onComplete: () => void, editData?: any, showTitle?: boolean, kgPerSac?: number }) {
  const t = useTranslations('Batches');
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: editData?.name || '',
      breed: editData?.breed || '',
      arrivalDate: editData?.arrivalDate ? new Date(editData.arrivalDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      initialQuantity: editData?.initialQuantity || 1,
      costPerChick: editData?.costPerChick || 0,
      feedStock: editData?.feedStock && kgPerSac > 0 ? editData.feedStock / kgPerSac : 0,
    },
  });

  const onSubmit = (values: FormValues) => {
    setError(null);
    startTransition(async () => {
      if (values.feedStock > 0 && kgPerSac <= 0) {
        setError(t('kgPerSacMissing'));
        return;
      }

      const normalizedValues = {
        ...values,
        feedStock: values.feedStock * kgPerSac,
      };

      const result = editData
        ? await updateBatch(editData.id, {
            ...normalizedValues,
            arrivalDate: new Date(normalizedValues.arrivalDate),
          })
        : await createBatch({
            ...normalizedValues,
            arrivalDate: new Date(normalizedValues.arrivalDate),
          });

      if (result.success) {
        onComplete();
      } else {
        setError(editData ? "Failed to update batch" : t('createError'));
      }
    });
  };

  return (
    <div className={`${editData ? '' : 'form-card'}`}>
      {!editData && showTitle && <h2 className="form-card__title">{t('addNew')}</h2>}

      {error && (
        <div className="mb-6 rounded-xl border border-red-100 bg-red-50 p-3 text-center text-sm font-bold text-red-600">
          {error}
        </div>
      )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="space-y-4">
          <InputGroup label={t('name')} icon={<Plus className="w-5 h-5 text-orange-500" />} register={register('name')} />
          <SelectGroup label={t('breed')} icon={<Bird className="w-5 h-5 text-blue-500" />} register={register('breed')} options={[{label: t('breeds.broiler'), value: 'broiler'}, {label: t('breeds.layer'), value: 'layer'}, {label: t('breeds.other'), value: 'other'}]} />
          <InputGroup label={t('arrivalDate')} icon={<Calendar className="w-5 h-5 text-purple-500" />} register={register('arrivalDate')} type="date" />

          <div className="grid grid-cols-2 gap-3">
            <InputGroup label={t('quantity')} icon={<Hash className="w-5 h-5 text-green-500" />} register={register('initialQuantity', { valueAsNumber: true })} type="number" />
            <InputGroup label={t('cost')} icon={<CircleDollarSign className="w-5 h-5 text-yellow-500" />} register={register('costPerChick', { valueAsNumber: true })} type="number" step="0.01" />
          </div>
          <InputGroup label={t('feedStock')} icon={<Utensils className="w-5 h-5 text-orange-400" />} register={register('feedStock', { valueAsNumber: true })} type="number" step="0.1" />
          <p className={`field-hint ${kgPerSac > 0 ? '' : 'field-hint--warning'}`}>
            {kgPerSac > 0 ? t('feedUnitHint', { kg: kgPerSac }) : t('kgPerSacMissing')}
          </p>
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="button-primary mt-4 w-full disabled:opacity-70"
        >
          {isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Save className="h-4 w-4" /><span>{editData ? t('update') : t('save')}</span></>}
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

interface SelectGroupProps {
  label: string;
  icon: React.ReactNode;
  register: UseFormRegisterReturn;
  options: { label: string; value: string }[];
}

function SelectGroup({ label, icon, register, options }: SelectGroupProps) {
  return (
    <div className="space-y-2">
      <label className="field-label">{label}</label>
      <div className="field-with-icon">
        <div>{icon}</div>
        <select
          {...register}
          className="field-select h-12 appearance-none"
        >
          <option value="">--</option>
          {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
        </select>
      </div>
    </div>
  );
}
