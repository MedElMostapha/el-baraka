"use client";

import React, { useState, useTransition, useEffect } from 'react';
import { useForm, UseFormRegisterReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useTranslations } from 'next-intl';
import { Wallet, Plus, Save, Loader2, User, Hash, Banknote } from 'lucide-react';
import { recordSale, createClient } from '@/actions/sales';

const formSchema = z.object({
  batchId: z.string().min(1),
  clientId: z.string().optional(),
  newClientName: z.string().optional(),
  quantity: z.number().min(1),
  unitPrice: z.number().min(0),
  amountPaid: z.number().min(0),
  type: z.enum(['wholesale', 'retail']),
});

type FormValues = z.infer<typeof formSchema>;

interface SalesFormProps {
  batches: { id: string; name: string; remainingQuantity: number }[];
  clients: { id: string; name: string }[];
}

export function SalesForm({ batches, clients: initialClients }: SalesFormProps) {
  const t = useTranslations('Sales');
  const tc = useTranslations('Clients');
  const [isPending, startTransition] = useTransition();
  const [showNewClient, setShowNewClient] = useState(false);

  const { register, handleSubmit, watch, reset, setValue } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { quantity: 1, unitPrice: 0, amountPaid: 0, type: 'wholesale' }
  });

  const batchId = watch('batchId');

  useEffect(() => {
    if (batchId) {
      const selectedBatch = batches.find(b => b.id === batchId);
      if (selectedBatch) {
        setValue('quantity', selectedBatch.remainingQuantity);
      }
    }
  }, [batchId, batches, setValue]);

  const quantity = watch('quantity') || 0;
  const unitPrice = watch('unitPrice') || 0;
  const total = quantity * unitPrice;

  useEffect(() => {
    setValue('amountPaid', total);
  }, [total, setValue]);

  const onSubmit = (values: FormValues) => {
    startTransition(async () => {
      let clientId = values.clientId;
      
      if (showNewClient && values.newClientName) {
        const clientResult = await createClient({ name: values.newClientName });
        if (clientResult.success) clientId = clientResult.id;
      }

      const result = await recordSale({
        batchId: values.batchId,
        clientId: clientId || undefined,
        quantity: values.quantity,
        unitPrice: values.unitPrice,
        amountPaid: values.amountPaid,
        type: values.type,
      });

      if (result.success) {
        reset();
        setShowNewClient(false);
      }
    });
  };

  return (
    <div className="bg-white/70 backdrop-blur-xl p-8 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-white/40">
      <h2 className="text-2xl font-black text-slate-800 tracking-tight mb-8">{t('addNew')}</h2>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-4">
          
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('type')}</label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-2xl">
              {(['wholesale', 'retail'] as const).map((type) => (
                <label key={type} className="relative">
                   <input type="radio" {...register('type')} value={type} className="peer sr-only" />
                   <div className="h-10 flex items-center justify-center rounded-xl font-bold text-sm peer-checked:bg-white peer-checked:text-orange-600 peer-checked:shadow-sm transition-all cursor-pointer">
                     {t(type)}
                   </div>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('client')}</label>
            <div className="flex gap-2">
              {!showNewClient ? (
                <select 
                  {...register('clientId')}
                  className="flex-1 h-14 px-6 rounded-2xl border-none bg-slate-100/50 text-lg font-bold text-slate-700 outline-none"
                >
                  <option value="">{t('cashClient')}</option>
                  {initialClients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              ) : (
                <input 
                  placeholder={tc('name')}
                  {...register('newClientName')}
                  className="flex-1 h-14 px-6 rounded-2xl border-none bg-slate-100/50 text-lg font-bold text-slate-700 outline-none"
                />
              )}
              <button 
                type="button"
                onClick={() => setShowNewClient(!showNewClient)}
                className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 active:scale-90 transition-all"
              >
                {showNewClient ? <User className="w-6 h-6 text-orange-500" /> : <Plus className="w-6 h-6" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('batch')}</label>
             <select 
                {...register('batchId')}
                className="w-full h-14 px-6 rounded-2xl border-none bg-slate-100/50 text-lg font-bold text-slate-700 outline-none"
              >
                <option value="">{t('selectBatch')}</option>
                {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <InputGroup label={t('quantity')} icon={<Hash className="w-5 h-5 text-blue-500" />} register={register('quantity', { valueAsNumber: true })} type="number" />
            <InputGroup label={t('unitPrice')} icon={<Banknote className="w-5 h-5 text-green-500" />} register={register('unitPrice', { valueAsNumber: true })} type="number" />
          </div>

          <div className="p-6 bg-orange-50 rounded-[2rem] space-y-2 border border-orange-100/50">
             <div className="flex justify-between items-center">
                <span className="text-xs font-black text-orange-400 uppercase tracking-widest">{t('total')}</span>
                <span className="text-2xl font-[1000] text-orange-600 tracking-tighter">{total.toLocaleString()} {t('currency')}</span>
             </div>
             <div className="pt-4 space-y-2">
                <label className="text-[10px] font-black text-orange-400 uppercase tracking-widest ml-1">{t('paid')}</label>
                <input 
                  type="number"
                  {...register('amountPaid', { valueAsNumber: true })}
                  className="w-full h-14 px-6 rounded-2xl border-none bg-white text-xl font-black text-slate-800 outline-none focus:ring-2 focus:ring-orange-200"
                />
             </div>
          </div>
        </div>

        <button 
          disabled={isPending}
          className="w-full h-20 bg-slate-900 text-white text-xl font-black rounded-3xl flex items-center justify-center gap-4 active:scale-95 transition-all shadow-2xl shadow-slate-200"
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
          {...register}
          className="w-full h-14 pl-14 pr-6 rounded-2xl border-none bg-slate-100/50 text-lg font-bold text-slate-700 outline-none" 
        />
      </div>
    </div>
  );
}
