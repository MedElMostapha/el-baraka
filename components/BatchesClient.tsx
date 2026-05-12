"use client";

import React, { useState, useTransition, useMemo } from 'react';
import { Bird, Calendar, Hash, Plus, Save, Loader2, CircleDollarSign, History, Filter } from "lucide-react";
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/PageHeader';
import { createBatch } from '@/actions/batch';
import { Modal } from './Modal';

interface BatchInfo {
  id: string;
  name: string;
  breed: string | null;
  arrivalDate: string;
  initialQuantity: number;
  remainingQuantity: number;
  costPerChick: number;
  status: string;
}

interface RestockEntry {
  id: string;
  batchId: string;
  quantity: number;
  costPerChick: number;
  date: string;
  batchName: string | null;
  batchBreed: string | null;
}

interface BatchTranslations {
  title: string;
  subtitle: string;
  addNew: string;
  empty: string;
  remaining: string;
  editTitle: string;
  deleteTitle: string;
  deleteConfirm: string;
  defaultName: string;
  quantity: string;
  cost: string;
  save: string;
  restockHistory: string;
  chicks: string;
  unit: string;
  breedBroiler: string;
  breedLayer: string;
  breedOther: string;
  filterAll: string;
  filterToday: string;
  filterWeek: string;
  filterMonth: string;
}

function formatBreed(breed: string | null, t: BatchTranslations): string {
  if (!breed) return '--';
  const map: Record<string, string> = {
    broiler: t.breedBroiler,
    layer: t.breedLayer,
    other: t.breedOther,
  };
  return map[breed] || breed;
}

export default function BatchesClient({
  initialBatches,
  activeBatch,
  restocks,
  t,
}: {
  initialBatches: BatchInfo[];
  activeBatch: BatchInfo | null;
  restocks: RestockEntry[];
  t: BatchTranslations;
}) {
  const router = useRouter();
  const [showCreate, setShowCreate] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [newQuantity, setNewQuantity] = useState(100);
  const [newUnitPrice, setNewUnitPrice] = useState(0);
  const [restockFilter, setRestockFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [customDate, setCustomDate] = useState('');

  const filteredRestocks = useMemo(() => {
    const now = new Date();
    return restocks.filter((r) => {
      const d = new Date(r.date);

      if (customDate) {
        const from = new Date(customDate);
        from.setHours(0, 0, 0, 0);
        return d >= from;
      }

      if (restockFilter === 'today') {
        return d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }
      if (restockFilter === 'week') {
        return d >= new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      }
      if (restockFilter === 'month') {
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }
      return true;
    });
  }, [restocks, restockFilter, customDate]);

  const restockFilters = [
    { id: 'all' as const, label: t.filterAll },
    { id: 'today' as const, label: t.filterToday },
    { id: 'week' as const, label: t.filterWeek },
    { id: 'month' as const, label: t.filterMonth },
  ] as const;

  const handleCreate = () => {
    startTransition(async () => {
      await createBatch({
        name: '',
        breed: 'broiler',
        arrivalDate: new Date(),
        initialQuantity: newQuantity,
        costPerChick: newUnitPrice,
        feedStock: 0,
      });
      setShowCreate(false);
      setNewQuantity(100);
      setNewUnitPrice(0);
      router.refresh();
    });
  };

  return (
    <main className="flex-1 p-6 md:p-12 max-w-lg mx-auto w-full pb-32">
      <div className="space-y-10">
        <div className="flex items-end justify-between">
          <PageHeader title={t.title} subtitle={t.subtitle} />
          <button
            onClick={() => setShowCreate(true)}
            className="h-12 px-5 bg-slate-900 text-white text-sm font-black rounded-2xl flex items-center gap-2 active:scale-95 transition-all shadow-xl shadow-slate-200"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">{t.addNew}</span>
          </button>
        </div>

        {activeBatch ? (
          <div
            onClick={() => router.push(`/batches/${activeBatch.id}`)}
            className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 group active:scale-[0.98] transition-all cursor-pointer hover:border-orange-200"
          >
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-orange-50 rounded-2xl flex items-center justify-center shadow-inner text-orange-600">
                  <Bird className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="font-black text-slate-800 text-lg tracking-tight">{t.defaultName}</h3>
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wide mt-1">
                    <Bird className="w-3.5 h-3.5 text-orange-400" />
                    {formatBreed(activeBatch.breed, t)}
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-0.5">{t.remaining}</span>
                <span className="text-sm font-black px-3 py-1 rounded-xl bg-orange-500 text-white shadow-orange-100 shadow-sm">
                  {activeBatch.remainingQuantity}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between border-t border-slate-50 pt-4">
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wide">
                  <Calendar className="w-3.5 h-3.5" />
                  {new Date(activeBatch.arrivalDate).toLocaleDateString()}
                </div>
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wide">
                  <Hash className="w-3.5 h-3.5" />
                  {activeBatch.initialQuantity}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 bg-white/50 rounded-[2.5rem] border border-dashed border-slate-300">
            <Bird className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-400 font-bold mb-4">{t.empty}</p>
            <button
              onClick={() => setShowCreate(true)}
              className="h-12 px-6 bg-slate-900 text-white text-sm font-black rounded-2xl flex items-center gap-2 mx-auto active:scale-95 transition-all shadow-xl shadow-slate-200"
            >
              <Plus className="w-4 h-4" />
              <span>{t.addNew}</span>
            </button>
          </div>
        )}

        {restocks.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                <History className="w-5 h-5 text-orange-600" />
              </div>
              <h2 className="font-black text-slate-800 tracking-tight text-lg">{t.restockHistory}</h2>
            </div>
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
                <div className="flex items-center gap-2 bg-white/60 p-1.5 rounded-2xl border border-slate-100">
                  <Filter className="w-4 h-4 text-slate-400 ml-2" />
                  {restockFilters.map((f) => (
                    <button
                      key={f.id}
                      onClick={() => { setRestockFilter(f.id); setCustomDate(''); }}
                      className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap ${
                        restockFilter === f.id && !customDate
                          ? 'bg-orange-500 text-white shadow-md shadow-orange-200'
                          : 'text-slate-500 hover:bg-slate-100'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                  <Calendar className="w-4 h-4 text-orange-500" />
                </div>
                <input
                  type="date"
                  value={customDate}
                  onChange={(e) => setCustomDate(e.target.value)}
                  className="w-full h-11 pl-11 pr-4 rounded-2xl border border-slate-200 bg-white text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-orange-500/20"
                />
                {customDate && (
                  <button
                    onClick={() => setCustomDate('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-lg font-black leading-none"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>
            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
              {filteredRestocks.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-slate-400 font-bold text-sm">{t.empty}</p>
                </div>
              ) : filteredRestocks.map((r, i) => (
                <div
                  key={r.id}
                  onClick={() => router.push(`/batches/${r.batchId}`)}
                  className={`flex items-center justify-between p-4 active:scale-[0.98] transition-all cursor-pointer hover:bg-slate-50 ${
                    i < restocks.length - 1 ? 'border-b border-slate-50' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400">
                      <Plus className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-800 text-sm">{t.defaultName}</p>
                      {r.batchBreed && <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{formatBreed(r.batchBreed, t)}</p>}
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                        {new Date(r.date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-slate-800">{r.quantity} <span className="text-[10px] font-bold text-slate-400">{t.chicks}</span></p>
                    <p className="text-[10px] font-bold text-slate-400">{r.costPerChick.toLocaleString()} MRU/{t.unit}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title={t.addNew}>
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t.quantity}</label>
            <div className="relative">
              <div className="absolute left-5 top-1/2 -translate-y-1/2 pointer-events-none">
                <Hash className="w-5 h-5 text-green-500" />
              </div>
              <input
                type="number"
                min="1"
                value={newQuantity}
                onChange={(e) => setNewQuantity(parseInt(e.target.value) || 0)}
                className="w-full h-14 pl-14 pr-6 rounded-2xl border-none bg-slate-100/50 text-lg font-bold text-slate-700 outline-none"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t.cost}</label>
            <div className="relative">
              <div className="absolute left-5 top-1/2 -translate-y-1/2 pointer-events-none">
                <CircleDollarSign className="w-5 h-5 text-yellow-500" />
              </div>
              <input
                type="number"
                step="0.01"
                min="0"
                value={newUnitPrice}
                onChange={(e) => setNewUnitPrice(parseFloat(e.target.value) || 0)}
                className="w-full h-14 pl-14 pr-6 rounded-2xl border-none bg-slate-100/50 text-lg font-bold text-slate-700 outline-none"
              />
            </div>
          </div>
          <button
            onClick={handleCreate}
            disabled={isPending || newQuantity < 1}
            className="w-full h-14 md:h-16 bg-slate-900 text-white text-base md:text-lg font-black rounded-2xl flex items-center justify-center gap-3 active:scale-95 transition-all shadow-xl shadow-slate-200 disabled:opacity-50"
          >
            {isPending ? <Loader2 className="w-6 h-6 animate-spin" /> : <><Save className="w-5 h-5" /><span>{t.save}</span></>}
          </button>
        </div>
      </Modal>
    </main>
  );
}