"use client";

import React from 'react';
import { InventoryForm } from './InventoryForm';
import { Package, Layers, Trash2, Pencil, Loader2, Calendar, ChevronDown, ChevronUp } from "lucide-react";
import { useRouter } from 'next/navigation';
import { deleteInventoryItem, updateInventoryItem } from '@/actions/inventory';
import { ConfirmModal } from './ConfirmModal';
import { Modal } from './Modal';
import { PageHeader } from '@/components/PageHeader';

interface InventoryItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  lastUpdated: string | null;
}

interface InventoryTranslations {
  title: string;
  subtitle: string;
  addNew: string;
  feed: string;
  medicine: string;
  packaging: string;
  other: string;
  [key: string]: string;
}

export default function InventoryClient({ initialItems, t }: { initialItems: InventoryItem[], t: InventoryTranslations }) {
  const router = useRouter();

  const handleComplete = () => {
    router.refresh();
  };

  return (
    <main className="flex-1 p-6 md:p-12 max-w-lg mx-auto w-full pb-32">
      <div className="space-y-10">
        <PageHeader title={t.title} subtitle={t.subtitle} />

        <section>
          <InventoryForm onComplete={handleComplete} />
        </section>

        <section className="space-y-4">
          {initialItems.map((item) => (
            <InventoryItemCard key={item.id} item={item} t={t} router={router} />
          ))}
        </section>
      </div>
    </main>
  );
}

function InventoryItemCard({ item, t, router }: { item: InventoryItem, t: InventoryTranslations, router: any }) {
  const [expanded, setExpanded] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const [editItem, setEditItem] = React.useState(false);

  return (
    <>
      <div 
        className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm transition-all cursor-pointer group hover:shadow-md active:scale-[0.98]" 
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 shadow-inner group-hover:bg-orange-50 group-hover:text-orange-500 transition-colors">
              <Package className="w-7 h-7" />
            </div>
            <div>
              <h3 className="font-black text-slate-800 text-lg tracking-tight">{item.name}</h3>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-[10px] font-black text-orange-500 bg-orange-50 px-2 py-0.5 rounded-lg uppercase tracking-wider">
                  {t[item.category] || item.category}
                </span>
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wide">
                  <Layers className="w-3.5 h-3.5" />
                  {item.quantity} {item.unit}
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
          <div className="mt-6 pt-6 border-t border-slate-50 flex items-center justify-between animate-in slide-in-from-top-2 duration-300">
            <div className="flex flex-col">
              <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-1">{t.lastUpdated || 'Last Updated'}</span>
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                <Calendar className="w-3.5 h-3.5" />
                {item.lastUpdated ? new Date(item.lastUpdated).toLocaleDateString() : '--'}
              </div>
            </div>
            <div className="flex items-center gap-2">
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
