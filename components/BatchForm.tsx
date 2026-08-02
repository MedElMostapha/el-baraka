"use client";

import React, { useEffect, useRef, useState, useTransition } from 'react';
import { Controller, Control, useForm, UseFormRegisterReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useTranslations } from 'next-intl';
import { Check, ChevronDown, Plus, Save, Loader2, Calendar, Hash, CircleDollarSign, Bird, Utensils } from 'lucide-react';
import { createBatch, updateBatch } from '@/actions/batch';

const formSchema = z.object({
  name: z.string().optional(),
  breed: z.string().optional(),
  arrivalDate: z.string().min(1, 'Required'),
  initialQuantity: z.number().min(1),
  costPerChick: z.number().min(0),
  feedStock: z.number().min(0),
});

type FormValues = z.infer<typeof formSchema>;

interface BatchFormEditData {
  id: string;
  name: string;
  breed: string | null;
  arrivalDate: Date;
  initialQuantity: number;
  costPerChick: number;
  feedStock: number;
}

export function BatchForm({ onComplete, editData, showTitle = true, kgPerSac = 0, defaultCostPerChick = 0 }: { onComplete: () => void, editData?: BatchFormEditData, showTitle?: boolean, kgPerSac?: number, defaultCostPerChick?: number }) {
  const t = useTranslations('Batches');
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const { control, register, handleSubmit } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: editData?.name || '',
      breed: editData?.breed || 'broiler',
      arrivalDate: editData?.arrivalDate ? new Date(editData.arrivalDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      initialQuantity: editData?.initialQuantity || 1,
      costPerChick: editData?.costPerChick ?? defaultCostPerChick,
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
        name: values.name?.trim() || 'lot',
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
          <SelectGroup
            label={t('breed')}
            icon={<Bird className="w-5 h-5 text-blue-500" />}
            control={control}
            name="breed"
            options={[{label: t('breeds.broiler'), value: 'broiler'}, {label: t('breeds.layer'), value: 'layer'}, {label: t('breeds.other'), value: 'other'}]}
          />
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
  control: Control<FormValues>;
  name: 'breed';
  options: { label: string; value: string }[];
}

function SelectGroup({ label, icon, control, name, options }: SelectGroupProps) {
  const [isOpen, setIsOpen] = useState(false);
  const selectRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!selectRef.current?.contains(event.target as Node)) setIsOpen(false);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [isOpen]);

  return (
    <div className="space-y-2">
      <label className="field-label" htmlFor={`${name}-select`}>{label}</label>
      <Controller
        control={control}
        name={name}
        render={({ field }) => {
          const selectedOption = options.find((option) => option.value === field.value) || options[0];
          const selectedIndex = Math.max(0, options.findIndex((option) => option.value === field.value));

          const moveSelection = (direction: 1 | -1) => {
            const nextIndex = Math.min(options.length - 1, Math.max(0, selectedIndex + direction));
            field.onChange(options[nextIndex].value);
          };

          return (
            <div ref={selectRef} className="custom-select">
              <span className="custom-select__icon">{icon}</span>
              <button
                id={`${name}-select`}
                type="button"
                className="field-select custom-select__trigger h-12"
                aria-label={label}
                aria-controls={`${name}-options`}
                aria-expanded={isOpen}
                aria-haspopup="listbox"
                ref={field.ref}
                onClick={() => setIsOpen((open) => !open)}
                onBlur={field.onBlur}
                onKeyDown={(event) => {
                  if (event.key === 'Escape') {
                    setIsOpen(false);
                  } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                    event.preventDefault();
                    if (!isOpen) {
                      setIsOpen(true);
                    } else {
                      moveSelection(event.key === 'ArrowDown' ? 1 : -1);
                    }
                  } else if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    setIsOpen((open) => !open);
                  }
                }}
              >
                <span>{selectedOption.label}</span>
                <ChevronDown className={`custom-select__chevron h-4 w-4 ${isOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
              </button>
              {isOpen && (
                <div id={`${name}-options`} className="custom-select__menu" role="listbox" aria-label={label}>
                  {options.map((option) => {
                    const isSelected = option.value === field.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        role="option"
                        aria-selected={isSelected}
                        className="custom-select__option"
                        onClick={() => {
                          field.onChange(option.value);
                          setIsOpen(false);
                        }}
                      >
                        <span>{option.label}</span>
                        {isSelected && <Check className="h-4 w-4" aria-hidden="true" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        }}
      />
    </div>
  );
}
