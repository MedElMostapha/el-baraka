"use client";

import React, { useState, useTransition, useEffect } from 'react';
import { useForm, UseFormRegisterReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useTranslations } from 'next-intl';
import { Wallet, Plus, Save, Loader2, User, Hash, Banknote } from 'lucide-react';
import { recordSale, updateSale, createClient } from '@/actions/sales';

const formSchema = z.object({
  batchId: z.string().min(1),
  clientId: z.string().optional(),
  newClientName: z.string().optional(),
  quantity: z.number().min(1),
  unitPrice: z.number().min(0),
  amountPaid: z.number().min(0),
  type: z.enum(['wholesale', 'retail']),
});

interface FormValues {
  batchId: string;
  clientId?: string;
  newClientName?: string;
  quantity: number;
  unitPrice: number;
  amountPaid: number;
  type: 'wholesale' | 'retail';
}

interface SalesFormProps {
  batches: { id: string; name: string; remainingQuantity: number }[];
  clients: { id: string; name: string }[];
  onComplete?: () => void;
  editData?: any;
}

export function SalesForm({ batches, clients: initialClients, onComplete, editData }: SalesFormProps) {
  const t = useTranslations('Sales');
  const tc = useTranslations('Clients');
  const [isPending, startTransition] = useTransition();
  const [showNewClient, setShowNewClient] = useState(false);
  const [isDebt, setIsDebt] = useState(editData ? editData.amountPaid === 0 : false);

  const { register, handleSubmit, watch, reset, setValue } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { 
      batchId: editData?.batchId || '',
      clientId: editData?.clientId || '',
      quantity: editData?.quantity || 1, 
      unitPrice: editData?.unitPrice || 0, 
      amountPaid: editData?.amountPaid || 0, 
      type: editData?.type || 'wholesale' 
    }
  });

  const batchId = watch('batchId');

  useEffect(() => {
    if (batchId && !editData) {
      const selectedBatch = batches.find(b => b.id === batchId);
      if (selectedBatch) {
        setValue('quantity', selectedBatch.remainingQuantity);
      }
    }
  }, [batchId, batches, setValue, editData]);

  const quantity = watch('quantity') || 0;
  const unitPrice = watch('unitPrice') || 0;
  const total = quantity * unitPrice;

  // Auto-fill amountPaid only for NEW sales and only once when total changes, 
  // but allow user to override it.
  useEffect(() => {
    if (!editData && !isDebt) {
      setValue('amountPaid', total);
    } else if (isDebt) {
      setValue('amountPaid', 0);
    }
  }, [total, setValue, editData, isDebt]);

  const onSubmit = (values: FormValues) => {
    startTransition(async () => {
      let clientId = values.clientId;
      
      if (showNewClient && values.newClientName) {
        const clientResult = await createClient({ name: values.newClientName });
        if (clientResult.success) clientId = clientResult.id;
      }

      const result = editData 
        ? await updateSale(editData.id, {
            batchId: values.batchId,
            clientId: clientId || undefined,
            quantity: values.quantity,
            unitPrice: values.unitPrice,
            amountPaid: values.amountPaid,
            type: values.type,
          })
        : await recordSale({
            batchId: values.batchId,
            clientId: clientId || undefined,
            quantity: values.quantity,
            unitPrice: values.unitPrice,
            amountPaid: values.amountPaid,
            type: values.type,
          });

      if (result.success) {
        if (!editData) reset();
        setShowNewClient(false);
        if (onComplete) onComplete();
      }
    });
  };

  return (
    <div className={`${editData ? '' : 'bg-white/70 backdrop-blur-xl p-6 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-white/40'}`}>
      {!editData && <h2 className="text-xl font-black text-slate-800 tracking-tight mb-6">{t('addNew')}</h2>}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-3">
          
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('type')}</label>
              <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-xl">
                {(['wholesale', 'retail'] as const).map((type) => (
                  <label key={type} className="relative">
                     <input type="radio" {...register('type')} value={type} className="peer sr-only" />
                     <div className="h-8 flex items-center justify-center rounded-lg font-bold text-[11px] peer-checked:bg-white peer-checked:text-orange-600 peer-checked:shadow-sm transition-all cursor-pointer">
                       {t(type)}
                     </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
               <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('batch')}</label>
               <select 
                  {...register('batchId')}
                  className="w-full h-10 px-4 rounded-xl border-none bg-slate-100/50 text-sm font-bold text-slate-700 outline-none"
                >
                  <option value="">{t('selectBatch')}</option>
                  {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('client')}</label>
            <div className="flex gap-2">
              {!showNewClient ? (
                <select 
                  {...register('clientId')}
                  className="flex-1 h-12 px-4 rounded-2xl border-none bg-slate-100/50 text-base font-bold text-slate-700 outline-none"
                >
                  <option value="">{t('cashClient')}</option>
                  {initialClients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              ) : (
                <input 
                  placeholder={tc('name')}
                  {...register('newClientName')}
                  className="flex-1 h-12 px-4 rounded-2xl border-none bg-slate-100/50 text-base font-bold text-slate-700 outline-none"
                />
              )}
              <button 
                type="button"
                onClick={() => setShowNewClient(!showNewClient)}
                className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 active:scale-90 transition-all"
              >
                {showNewClient ? <User className="w-5 h-5 text-orange-500" /> : <Plus className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <InputGroup label={t('quantity')} icon={<Hash className="w-4 h-4 text-blue-500" />} register={register('quantity', { valueAsNumber: true })} type="number" />
            <InputGroup label={t('unitPrice')} icon={<Banknote className="w-4 h-4 text-green-500" />} register={register('unitPrice', { valueAsNumber: true })} type="number" />
          </div>

          <div className="flex items-center justify-between px-2 pt-2">
             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('debt')}</label>
             <button 
                type="button"
                onClick={() => setIsDebt(!isDebt)}
                className={`relative w-12 h-6 rounded-full transition-all duration-300 ${isDebt ? 'bg-red-500' : 'bg-slate-200'}`}
             >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 ${isDebt ? 'left-7 shadow-sm' : 'left-1'}`} />
             </button>
          </div>

          <div className="p-4 bg-orange-50 rounded-[1.5rem] flex items-center justify-between border border-orange-100/50">
             <div className="flex flex-col">
                <span className="text-[9px] font-black text-orange-400 uppercase tracking-widest">{t('total')}</span>
                <span className="text-xl font-[1000] text-orange-600 tracking-tighter leading-none mt-1">{total.toLocaleString()} {t('currency')}</span>
             </div>
             <div className="flex flex-col items-end">
                <label className="text-[9px] font-black text-orange-400 uppercase tracking-widest mr-1 mb-1">{t('paid')}</label>
                <input 
                  type="number"
                  disabled={isDebt}
                  {...register('amountPaid', { valueAsNumber: true })}
                  className={`w-32 h-10 px-4 rounded-xl border-none text-base font-black outline-none focus:ring-2 focus:ring-orange-200 text-right transition-all ${isDebt ? 'bg-slate-100/50 text-slate-300 cursor-not-allowed' : 'bg-white text-slate-800'}`}
                  placeholder="0"
                />
             </div>
          </div>
        </div>

        <button 
          disabled={isPending}
          className="w-full h-14 bg-slate-900 text-white text-lg font-black rounded-2xl flex items-center justify-center gap-3 active:scale-95 transition-all shadow-xl shadow-slate-200 mt-2"
        >
          {isPending ? <Loader2 className="w-6 h-6 animate-spin" /> : <><Wallet className="w-5 h-5" /><span>{t('save')}</span></>}
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
    <div className="space-y-1.5">
      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">{label}</label>
      <div className="relative">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">{icon}</div>
        <input 
          type={type}
          {...register}
          className="w-full h-12 pl-12 pr-4 rounded-2xl border-none bg-slate-100/50 text-base font-bold text-slate-700 outline-none" 
        />
      </div>
    </div>
  );
}
