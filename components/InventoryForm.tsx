"use client";

import React, { useTransition } from 'react';
import { useForm, UseFormRegisterReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useTranslations } from 'next-intl';
import { Package, Plus, Save, Loader2, Tag } from 'lucide-react';
import { addInventoryItem } from '@/actions/inventory';

const formSchema = z.object({
  name: z.string().min(1),
  category: z.enum(['feed', 'medicine', 'packaging', 'other']),
  quantity: z.number().min(0),
  unit: z.string().min(1),
});

type FormValues = z.infer<typeof formSchema>;

export function InventoryForm({ onComplete }: { onComplete: () => void }) {
  const t = useTranslations('Inventory');
  const [isPending, startTransition] = useTransition();

  const { register, handleSubmit, reset } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: '', category: 'feed', quantity: 0, unit: 'kg' }
  });

  const onSubmit = (values: FormValues) => {
    startTransition(async () => {
      const result = await addInventoryItem(values);
      if (result.success) {
        reset();
        onComplete();
      }
    });
  };

  return (
    <div className="bg-white/70 backdrop-blur-xl p-8 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-white/40">
      <h2 className="text-2xl font-black text-slate-800 tracking-tight mb-8">{t('addNew')}</h2>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-4">
          <InputGroup label={t('name')} icon={<Package className="w-5 h-5 text-orange-500" />} register={register('name')} />
          
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('category')}</label>
            <select 
              {...register('category')}
              className="w-full h-14 px-6 rounded-2xl border-none bg-slate-100/50 text-lg font-bold text-slate-700 outline-none focus:ring-2 focus:ring-orange-500/20"
            >
              <option value="feed">{t('feed')}</option>
              <option value="medicine">{t('medicine')}</option>
              <option value="packaging">{t('packaging')}</option>
              <option value="other">{t('other')}</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <InputGroup label={t('quantity')} icon={<Tag className="w-5 h-5 text-green-500" />} register={register('quantity', { valueAsNumber: true })} type="number" />
            <InputGroup label={t('unit')} icon={<Plus className="w-5 h-5 text-blue-500" />} register={register('unit')} />
          </div>
        </div>

        <button 
          disabled={isPending}
          className="w-full h-16 bg-slate-900 text-white font-black rounded-2xl flex items-center justify-center gap-3 active:scale-95 transition-all"
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
