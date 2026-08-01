"use client";

import React, { useTransition } from 'react';
import { useForm, UseFormRegisterReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useTranslations } from 'next-intl';
import { Package, Plus, Save, Loader2, Tag } from 'lucide-react';
import { addInventoryItem, updateInventoryItem } from '@/actions/inventory';

const formSchema = z.object({
  name: z.string().optional(),
  category: z.enum(['feed', 'medicine', 'packaging', 'other']),
  quantity: z.number().min(0),
  unit: z.string().min(1),
});

type FormValues = z.infer<typeof formSchema>;

export function InventoryForm({ onComplete, editData, kgPerSac = 0 }: { onComplete: () => void, editData?: any, kgPerSac?: number }) {
  const t = useTranslations('Inventory');
  const [isPending, startTransition] = useTransition();

  const { register, handleSubmit, reset, watch } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: editData?.name || '',
      category: editData?.category || 'feed',
      quantity: editData?.quantity || 0,
      unit: editData?.unit || 'kg'
    }
  });

  const unit = watch('unit');
  const quantity = watch('quantity');
  const kgEquivalent = unit === 'sac' && kgPerSac > 0 ? (quantity || 0) * kgPerSac : null;

  const onSubmit = (values: FormValues) => {
    startTransition(async () => {
      const finalName = values.name && values.name.trim() !== '' ? values.name : (t(values.category) || values.category);
      const finalValues = { ...values, name: finalName };
      const result = editData
        ? await updateInventoryItem(editData.id, finalValues)
        : await addInventoryItem(finalValues as any);
      if (result.success) {
        if (!editData) reset();
        onComplete();
      }
    });
  };

  return (
    <div className={`${editData ? '' : 'form-card'}`}>
      {!editData && <h2 className="form-card__title">{t('addNew')}</h2>}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="space-y-4">
          <InputGroup label={t('name')} icon={<Package className="w-5 h-5 text-orange-500" />} register={register('name')} />

          <SelectGroup
            label={t('category')}
            icon={<Tag className="w-5 h-5 text-orange-500" />}
            register={register('category')}
            options={[
              { label: t('feed'), value: 'feed' },
              { label: t('medicine'), value: 'medicine' },
              { label: t('packaging'), value: 'packaging' },
              { label: t('other'), value: 'other' }
            ]}
          />

          <div className="grid grid-cols-2 gap-4">
            <InputGroup label={t('quantity')} icon={<Package className="w-5 h-5 text-green-500" />} register={register('quantity', { valueAsNumber: true })} type="number" />
            <SelectGroup
              label={t('unit')}
              icon={<Plus className="w-5 h-5 text-blue-500" />}
              register={register('unit')}
              options={[
                { label: 'kg', value: 'kg' },
                { label: 'g', value: 'g' },
                { label: 'L', value: 'L' },
                { label: 'ml', value: 'ml' },
                { label: 'Sac', value: 'sac' },
                { label: 'Unité', value: 'unit' },
                { label: 'Boîte', value: 'box' }
              ]}
            />
          </div>
          {kgEquivalent !== null && (
            <div className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-center">
              <span className="text-sm font-black text-blue-600">
                = {kgEquivalent.toFixed(1)} kg
              </span>
            </div>
          )}
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
          {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
        </select>
      </div>
    </div>
  );
}
