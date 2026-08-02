"use client";

import React, { useState, useMemo } from 'react';
import { Bird, Calendar, Hash, Plus, CircleDollarSign, History, Filter, Trash2 } from "lucide-react";
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/PageHeader';
import { BatchForm } from './BatchForm';
import { Pagination } from './Pagination';
import { ConfirmModal } from './ConfirmModal';
import { deleteBatch } from '@/actions/batch';

const PAGE_SIZE = 8;

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
  createLead: string;
  createHint: string;
  activeBatches: string;
  totalBatches: string;
  remainingFormula: string;
  active: string;
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
  kgPerSac,
  defaultCostPerChick,
  t,
}: {
  initialBatches: BatchInfo[];
  activeBatch: BatchInfo | null;
  restocks: RestockEntry[];
  kgPerSac: number;
  defaultCostPerChick: number;
  t: BatchTranslations;
}) {
  const router = useRouter();
  const [restockFilter, setRestockFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [customDate, setCustomDate] = useState('');
  const [restockPage, setRestockPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<BatchInfo | null>(null);

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

  const restockPageCount = Math.max(1, Math.ceil(filteredRestocks.length / PAGE_SIZE));
  const currentRestockPage = Math.min(restockPage, restockPageCount);
  const visibleRestocks = filteredRestocks.slice(
    (currentRestockPage - 1) * PAGE_SIZE,
    currentRestockPage * PAGE_SIZE,
  );

  const restockFilters = [
    { id: 'all' as const, label: t.filterAll },
    { id: 'today' as const, label: t.filterToday },
    { id: 'week' as const, label: t.filterWeek },
    { id: 'month' as const, label: t.filterMonth },
  ] as const;

  return (
    <main className="page-container">
      <div className="page-stack">
        <PageHeader title={t.title} subtitle={t.subtitle} />

        <div className="batches-workspace">
          <section className="batches-create-panel">
            <div className="batches-create-panel__intro">
              <span className="section-kicker">{t.addNew}</span>
              <h2>{t.createLead}</h2>
              <p>{t.createHint}</p>
            </div>
            <BatchForm showTitle={false} kgPerSac={kgPerSac} defaultCostPerChick={defaultCostPerChick} onComplete={() => router.refresh()} />
          </section>

          <div className="batches-main-column">
            <section className="batches-overview">
              <div className="section-heading">
                <div>
                  <span className="section-kicker">{t.activeBatches}</span>
                  <h2>{t.title}</h2>
                </div>
              </div>

              {activeBatch ? (
                <div className="active-flock-card">
                  <button
                    type="button"
                    onClick={() => router.push(`/batches/${activeBatch.id}`)}
                    className="active-flock-card__open"
                  >
                    <div className="active-flock-card__top">
                      <div className="active-flock-card__identity">
                        <div className="active-flock-card__icon"><Bird className="h-6 w-6" /></div>
                        <div>
                          <span className="active-flock-card__status"><span />{t.active}</span>
                          <h3>{activeBatch.name === 'lot' ? t.defaultName : activeBatch.name}</h3>
                          <p>{formatBreed(activeBatch.breed, t)}</p>
                        </div>
                      </div>
                      <div className="active-flock-card__remaining">
                        <span>{t.remaining}</span>
                        <strong>{activeBatch.remainingQuantity}</strong>
                        <small>{t.chicks}</small>
                      </div>
                    </div>
                  <div className="active-flock-card__meta">
                      <span><Calendar className="h-4 w-4" />{new Date(activeBatch.arrivalDate).toLocaleDateString()}</span>
                      <span><Hash className="h-4 w-4" />{activeBatch.initialQuantity} {t.chicks}</span>
                    <span><CircleDollarSign className="h-4 w-4" />{activeBatch.costPerChick.toLocaleString()} MRU/{t.unit}</span>
                  </div>
                  <p className="active-flock-card__formula">{t.remainingFormula}</p>
                  </button>
                  <div className="active-flock-card__actions">
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(activeBatch)}
                      className="active-flock-card__delete"
                    >
                      <Trash2 className="h-4 w-4" />
                      {t.deleteTitle}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="empty-state batches-empty-state">
                  <Bird className="mx-auto mb-4 h-10 w-10 text-slate-300" />
                  <p className="font-bold text-slate-500">{t.empty}</p>
                  <p className="mt-2 text-sm text-slate-400">{t.createHint}</p>
                </div>
              )}
            </section>

            {restocks.length > 0 && (
              <section className="batches-history space-y-4">
                <div className="section-heading">
                  <div className="flex items-center gap-3">
                    <div className="metric-card__icon" style={{ background: 'var(--orange-soft)', color: 'var(--orange)' }}>
                      <History className="h-5 w-5" />
                    </div>
                    <div>
                      <span className="section-kicker">{t.subtitle}</span>
                      <h2>{t.restockHistory}</h2>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
                    <div className="filter-bar">
                      <Filter className="ml-2 h-4 w-4 text-slate-400" />
                      {restockFilters.map((f) => (
                        <button
                          key={f.id}
                          onClick={() => { setRestockFilter(f.id); setCustomDate(''); setRestockPage(1); }}
                          className={`${restockFilter === f.id && !customDate ? 'is-active' : ''} whitespace-nowrap`}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                      <Calendar className="h-4 w-4 text-orange-500" />
                    </div>
                    <input
                      type="date"
                      value={customDate}
                      onChange={(e) => { setCustomDate(e.target.value); setRestockPage(1); }}
                      className="field-input h-11 pl-11"
                    />
                    {customDate && (
                      <button
                        type="button"
                        onClick={() => { setCustomDate(''); setRestockPage(1); }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-lg font-black leading-none text-slate-400 hover:text-slate-600"
                        aria-label="Clear date"
                      >
                        ×
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex justify-end">
                  <span className="section-heading__badge">{initialBatches.length} {t.totalBatches}</span>
                </div>
                <div className="panel overflow-hidden">
                  {filteredRestocks.length === 0 ? (
                    <div className="py-8 text-center">
                      <p className="text-sm font-bold text-slate-400">{t.empty}</p>
                    </div>
                  ) : visibleRestocks.map((r, i) => (
                    <button
                      type="button"
                      key={r.id}
                      onClick={() => router.push(`/batches/${r.batchId}`)}
                      className={`flex w-full cursor-pointer items-center justify-between p-4 text-start transition-all hover:bg-slate-50 ${
                        i < visibleRestocks.length - 1 ? 'border-b border-slate-50' : ''
                      }`}
                    >
                      <span className="flex items-center gap-3">
                        <span className="record-card__icon h-10 w-10 shrink-0"><Plus className="h-4 w-4" /></span>
                        <span>
                          <span className="record-card__title block text-sm">{r.batchName === 'lot' || !r.batchName ? t.defaultName : r.batchName}</span>
                          {r.batchBreed && <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">{formatBreed(r.batchBreed, t)}</span>}
                          <span className="mt-0.5 block text-[10px] font-bold uppercase tracking-wider text-slate-400">{new Date(r.date).toLocaleDateString()}</span>
                        </span>
                      </span>
                      <span className="text-end">
                        <span className="block font-black text-slate-800">{r.quantity} <span className="text-[10px] font-bold text-slate-400">{t.chicks}</span></span>
                        <span className="text-[10px] font-bold text-slate-400">{r.costPerChick.toLocaleString()} MRU/{t.unit}</span>
                      </span>
                    </button>
                  ))}
                </div>
                <Pagination page={currentRestockPage} pageCount={restockPageCount} onPageChange={setRestockPage} />
              </section>
            )}
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (!deleteTarget) return;
          const result = await deleteBatch(deleteTarget.id);
          if (result.success) {
            setDeleteTarget(null);
            router.refresh();
          }
        }}
        title={t.deleteTitle}
        message={t.deleteConfirm}
      />
    </main>
  );
}
