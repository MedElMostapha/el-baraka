"use client";

import React, { useTransition } from 'react';
import { useForm, UseFormRegisterReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useTranslations } from 'next-intl';
import { Package, Plus, Save, Loader2, Tag } from 'lucide-react';
import { addInventoryItem, updateInventoryItem } from '@/actions/inventory';

const formSchema = z.object({
  name: z.string().min(1),
  category: z.enum(['feed', 'medicine', 'packaging', 'other']),
  quantity: z.number().min(0),
  unit: z.string().min(1),
});

type FormValues = z.infer<typeof formSchema>;

export function InventoryForm({ onComplete, editData }: { onComplete: () => void, editData?: any }) {
  const t = useTranslations('Inventory');
  const [isPending, startTransition] = useTransition();

  const { register, handleSubmit, reset } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { 
      name: editData?.name || '', 
      category: editData?.category || 'feed', 
      quantity: editData?.quantity || 0, 
      unit: editData?.unit || 'kg' 
    }
  });

  const onSubmit = (values: FormValues) => {
    startTransition(async () => {
      const result = editData 
        ? await updateInventoryItem(editData.id, values)
        : await addInventoryItem(values);
      if (result.success) {
        if (!editData) reset();
        onComplete();
      }
    });
  };

  return (
    <div className={`${editData ? '' : 'bg-white/70 backdrop-blur-xl p-8 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-white/40'}`}>
      {!editData && <h2 className="text-2xl font-black text-slate-800 tracking-tight mb-8">{t('addNew')}</h2>}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
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
        </div>

        <button 
          disabled={isPending}
          className="w-full h-14 md:h-16 bg-slate-900 text-white text-base md:text-lg font-black rounded-2xl flex items-center justify-center gap-3 active:scale-95 transition-all"
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
}

function InputGroup({ label, icon, register, type = "text" }: InputGroupProps) {
  return (
    <div className="space-y-2">
      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{label}</label>
      <div className="relative">
        <div className="absolute left-5 top-1/2 -translate-y-1/2 pointer-events-none">{icon}</div>
        <input 
          type={type}
          {...register}
          className="w-full h-14 pl-14 pr-6 rounded-2xl border-none bg-slate-100/50 text-lg font-bold text-slate-700 outline-none" 
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
      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{label}</label>
      <div className="relative">
        <div className="absolute left-5 top-1/2 -translate-y-1/2 pointer-events-none">{icon}</div>
        <select 
          {...register}
          className="w-full h-14 pl-14 pr-6 rounded-2xl border-none bg-slate-100/50 text-lg font-bold text-slate-700 focus:ring-2 focus:ring-orange-500/20 transition-all outline-none appearance-none" 
        >
          {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
        </select>
      </div>
    </div>
  );
}
