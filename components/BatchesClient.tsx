"use client";

import React, { useState, useTransition } from 'react';
import { Bird, Calendar, Hash, ArrowRight, Trash2, Pencil, Loader2, Plus, Save, CircleDollarSign } from "lucide-react";
import { useRouter, useParams } from 'next/navigation';
import { PageHeader } from '@/components/PageHeader';
import { BatchForm } from './BatchForm';
import { deleteBatch, createBatch } from '@/actions/batch';
import { ConfirmModal } from './ConfirmModal';
import { Modal } from './Modal';

interface Batch {
  id: string;
  name: string;
  breed: string | null;
  arrivalDate: Date;
  initialQuantity: number;
  remainingQuantity: number;
  costPerChick: number;
  status: string;
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
}

export default function BatchesClient({ initialBatches, t }: { initialBatches: Batch[], t: BatchTranslations }) {
  const router = useRouter();
  const params = useParams();
  const locale = params.locale;
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [editBatch, setEditBatch] = useState<Batch | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [quantity, setQuantity] = useState(100);
  const [unitPrice, setUnitPrice] = useState(0);

  const handleComplete = () => {
    router.refresh();
  };

  const handleCreate = () => {
    startTransition(async () => {
      await createBatch({
        name: t.defaultName,
        breed: 'broiler',
        arrivalDate: new Date(),
        initialQuantity: quantity,
        costPerChick: unitPrice,
        feedStock: 0,
      });
      setShowCreate(false);
      setQuantity(100);
      setUnitPrice(0);
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

        <section className="space-y-4">
          {initialBatches.length === 0 ? (
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
          ) : (
            initialBatches.map((batch) => (
              <div 
                key={batch.id} 
                onClick={() => router.push(`/batches/${batch.id}`)}
                className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 group active:scale-[0.98] transition-all cursor-pointer hover:border-orange-200"
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner ${
                      batch.status === 'active' ? 'bg-orange-50 text-orange-600' : 'bg-slate-50 text-slate-400'
                    }`}>
                      <Bird className="w-7 h-7" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-black text-slate-800 text-lg tracking-tight truncate">{batch.name}</h3>
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wide mt-1">
                        <Bird className="w-3.5 h-3.5 text-orange-400" />
                        {batch.breed || '--'}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end">
                    <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-0.5">{t.remaining}</span>
                    <span className={`text-sm font-black px-3 py-1 rounded-xl shadow-sm ${
                      batch.remainingQuantity > 0 ? 'bg-orange-500 text-white shadow-orange-100' : 'bg-slate-100 text-slate-400'
                    }`}>
                      {batch.remainingQuantity}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-slate-50 pt-4">
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wide">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(batch.arrivalDate).toLocaleDateString()}
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wide">
                      <Hash className="w-3.5 h-3.5" />
                      {batch.initialQuantity}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-2xl border border-slate-100/50">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditBatch(batch);
                      }}
                      className="p-2.5 rounded-xl bg-white shadow-sm text-slate-400 hover:text-slate-600 transition-all"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmDeleteId(batch.id);
                      }}
                      disabled={loadingId === batch.id}
                      className="p-2.5 rounded-xl hover:bg-red-50 text-slate-400 hover:text-red-500 transition-all"
                    >
                      {loadingId === batch.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    </button>
                    <div className="hidden md:flex w-10 h-10 rounded-xl bg-slate-900 text-white items-center justify-center ml-1">
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </section>
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
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
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
                value={unitPrice}
                onChange={(e) => setUnitPrice(parseFloat(e.target.value) || 0)}
                className="w-full h-14 pl-14 pr-6 rounded-2xl border-none bg-slate-100/50 text-lg font-bold text-slate-700 outline-none"
              />
            </div>
          </div>
          <button
            onClick={handleCreate}
            disabled={isPending || quantity < 1}
            className="w-full h-14 md:h-16 bg-slate-900 text-white text-base md:text-lg font-black rounded-2xl flex items-center justify-center gap-3 active:scale-95 transition-all shadow-xl shadow-slate-200 disabled:opacity-50"
          >
            {isPending ? <Loader2 className="w-6 h-6 animate-spin" /> : <><Save className="w-5 h-5" /><span>{t.save}</span></>}
          </button>
        </div>
      </Modal>

      <ConfirmModal 
        isOpen={!!confirmDeleteId}
        onClose={() => setConfirmDeleteId(null)}
        onConfirm={async () => {
          if (confirmDeleteId) {
            setLoadingId(confirmDeleteId);
            await deleteBatch(confirmDeleteId);
            setLoadingId(null);
            router.refresh();
          }
        }}
        title={t.deleteTitle}
        message={t.deleteConfirm}
      />

      <Modal 
        isOpen={!!editBatch}
        onClose={() => setEditBatch(null)}
        title={t.editTitle}
      >
        <BatchForm 
          onComplete={() => {
            setEditBatch(null);
            router.refresh();
          }}
          editData={editBatch}
        />
      </Modal>
    </main>
  );
}