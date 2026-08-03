"use client";

import React from 'react';
import { InventoryForm } from './InventoryForm';
import { Package, Layers, Trash2, Pencil, Loader2, Calendar, ChevronDown, ChevronUp } from "lucide-react";
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { deleteInventoryItem } from '@/actions/inventory';
import { ConfirmModal } from './ConfirmModal';
import { Modal } from './Modal';
import { Pagination } from './Pagination';
import { PageHeader } from '@/components/PageHeader';
import { mergeIntoList, usePendingRecords } from '@/lib/offline/merge';

const PAGE_SIZE = 8;

interface InventoryItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  lastUpdated: string | null;
  isPending?: boolean;
}

interface InventoryTranslations {
  title: string;
  subtitle: string;
  addNew: string;
  feed: string;
  medicine: string;
  packaging: string;
  other: string;
  bags: string;
  [key: string]: string;
}

export default function InventoryClient({ initialItems, t, kgPerSac = 0 }: { initialItems: InventoryItem[], t: InventoryTranslations, kgPerSac?: number }) {
  const router = useRouter();
  const to = useTranslations('Offline');
  const [page, setPage] = React.useState(1);

  const { records: items, pendingIds } = mergeIntoList(
    initialItems,
    usePendingRecords('inventory'),
    (r) => ({
      id: r.id,
      name: r.name as string,
      category: r.category as string,
      quantity: r.quantity as number,
      unit: r.unit as string,
      lastUpdated: (r.lastUpdated as string | null) ?? null,
    }),
  );

  const pageCount = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const visibleItems = items.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const handleComplete = () => {
    router.refresh();
  };

  return (
    <main className="page-container">
      <div className="page-stack">
        <PageHeader title={t.title} subtitle={t.subtitle} />

        <div className="workspace-grid">
          <section>
            <InventoryForm onComplete={handleComplete} kgPerSac={kgPerSac} />
          </section>

          <section className="space-y-3">
            {initialItems.length === 0 && (
              <div className="empty-state">{t.addNew}</div>
            )}
            {visibleItems.map((item) => (
              <InventoryItemCard key={item.id} item={item} t={t} router={router} kgPerSac={kgPerSac} pendingLabel={to('statusPending')} />
            ))}
            <Pagination page={currentPage} pageCount={pageCount} onPageChange={setPage} />
          </section>
        </div>
      </div>
    </main>
  );
}

function InventoryItemCard({ item, t, router, kgPerSac = 0, pendingLabel }: { item: InventoryItem, t: InventoryTranslations, router: ReturnType<typeof useRouter>, kgPerSac?: number, pendingLabel: string }) {
  const [expanded, setExpanded] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const [editItem, setEditItem] = React.useState(false);
  const feedKg = item.category === 'feed' ? toFeedKg(item.quantity, item.unit, kgPerSac) : null;
  const feedBags = feedKg !== null && kgPerSac > 0 ? feedKg / kgPerSac : null;

  return (
    <>
      <div
        className="record-card cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
             <div className="record-card__icon">
              <Package className="w-7 h-7" />
            </div>
            <div>
               <h3 className="record-card__title">{item.name}</h3>
               <div className="flex items-center gap-3 mt-1">
                 {item.isPending && (
                   <span className="rounded-md bg-orange-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-orange-600">
                     {pendingLabel}
                   </span>
                 )}
                 <span className="rounded-md bg-orange-50 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-orange-600">
                  {t[item.category] || item.category}
                </span>
                 <div className="record-card__meta">
                   <Layers className="w-3.5 h-3.5" />
                    {feedBags !== null && feedKg !== null ? (
                     <>
                       <span className="font-black text-orange-600">{formatQuantity(feedBags)} {t.bags}</span>
                       <span className="text-blue-500">({formatQuantity(feedKg)} kg)</span>
                     </>
                   ) : (
                     `${formatQuantity(item.quantity)} ${item.unit}`
                   )}
                 </div>
              </div>
            </div>
          </div>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
            expanded ? 'bg-slate-900 text-white shadow-lg' : 'bg-slate-50 text-slate-300'
          }`}>
            {expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </div>
        </div>

        {expanded && (
           <div className="record-card__footer">
            <div className="flex flex-col">
               <span className="field-label mb-1">{t.lastUpdated || 'Last Updated'}</span>
               <div className="record-card__meta">
                <Calendar className="w-3.5 h-3.5" />
                {item.lastUpdated ? new Date(item.lastUpdated).toLocaleDateString() : '--'}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {!item.isPending && (
                <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setEditItem(true);
                }}
                className="p-3 rounded-2xl bg-slate-50 text-slate-400 hover:bg-slate-900 hover:text-white transition-all shadow-sm"
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setConfirmDelete(true);
                }}
                disabled={loading}
                className="p-3 rounded-2xl bg-red-50 text-red-400 hover:bg-red-500 hover:text-white transition-all shadow-sm"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={async () => {
          setLoading(true);
          await deleteInventoryItem(item.id);
          setLoading(false);
          router.refresh();
        }}
        title={t.deleteTitle || "Delete Item"}
        message={t.deleteConfirm || `Are you sure you want to delete ${item.name}?`}
      />

      <Modal
        isOpen={editItem}
        onClose={() => setEditItem(false)}
        title={t.editTitle || "Edit Item"}
      >
        <InventoryForm
          onComplete={() => {
            setEditItem(false);
            router.refresh();
          }}
          editData={item}
        />
      </Modal>
    </>
  );
}

function toFeedKg(quantity: number, unit: string, kgPerSac: number) {
  if (kgPerSac <= 0) return null;
  if (unit === 'sac' || unit === 'bag') return quantity * kgPerSac;
  if (unit === 'g') return quantity / 1000;
  if (unit === 'kg') return quantity;
  return null;
}

function formatQuantity(quantity: number) {
  return quantity.toLocaleString(undefined, { maximumFractionDigits: 1 });
}
