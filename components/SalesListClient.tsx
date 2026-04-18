"use client";

import React, { useState } from 'react';
import { Wallet, Bird, Calendar, Filter, Trash2, CheckCircle, Loader2, Pencil } from "lucide-react";
import { deleteSale, markSalePaid, updateSale } from '@/actions/sales';
import { ConfirmModal } from './ConfirmModal';
import { SalesForm } from './SalesForm';
import { Modal } from './Modal';

interface Sale {
  id: string;
  date: Date;
  batchId: string;
  clientId: string | null;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  amountPaid: number;
  type: 'wholesale' | 'retail';
  batchName: string | null;
  clientName: string | null;
}

interface Translations {
  currency: string;
  cashClient: string;
  paidFull: string;
  filterAll: string;
  filterToday: string;
  filterWeek: string;
  filterMonth: string;
  filterUnpaid: string;
  empty: string;
  editTitle: string;
  deleteTitle: string;
  deleteConfirm: string;
}

export function SalesListClient({ sales, batches, clients, t }: { sales: Sale[]; batches: any[]; clients: any[]; t: Translations }) {
  const [filter, setFilter] = useState<'all' | 'today' | 'week' | 'month' | 'unpaid'>('all');
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [editSale, setEditSale] = useState<Sale | null>(null);

  const filteredSales = sales.filter((sale) => {
    const saleDate = new Date(sale.date);
    const now = new Date();
    
    if (filter === 'today') {
      return saleDate.getDate() === now.getDate() && 
             saleDate.getMonth() === now.getMonth() && 
             saleDate.getFullYear() === now.getFullYear();
    }
    
    if (filter === 'week') {
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return saleDate >= sevenDaysAgo;
    }
    
    if (filter === 'month') {
      return saleDate.getMonth() === now.getMonth() && 
             saleDate.getFullYear() === now.getFullYear();
    }

    if (filter === 'unpaid') {
      return sale.totalPrice > sale.amountPaid;
    }
    
    return true; // 'all'
  });

  const filters = [
    { id: 'all', label: t.filterAll },
    { id: 'today', label: t.filterToday },
    { id: 'week', label: t.filterWeek },
    { id: 'month', label: t.filterMonth },
    { id: 'unpaid', label: t.filterUnpaid },
  ] as const;

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-6 px-6 md:mx-0 md:px-0">
        <div className="flex items-center gap-2 bg-white/60 p-1.5 rounded-2xl border border-slate-100">
          <Filter className="w-4 h-4 text-slate-400 ml-2" />
          {filters.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap ${
                filter === f.id
                  ? 'bg-orange-500 text-white shadow-md shadow-orange-200'
                  : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {filteredSales.length === 0 ? (
          <div className="text-center py-12 bg-white/50 rounded-[2.5rem] border border-dashed border-slate-300">
             <p className="text-slate-400 font-bold">{t.empty}</p>
          </div>
        ) : (
          filteredSales.map((sale) => {
            const debt = sale.totalPrice - sale.amountPaid;
            return (
              <div 
                key={sale.id} 
                className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 group hover:shadow-md transition-all"
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 shadow-inner group-hover:bg-green-500 group-hover:text-white transition-all duration-300">
                      <Wallet className="w-7 h-7" />
                    </div>
                    <div>
                      <h3 className="font-black text-slate-800 text-xl tracking-tight">
                        {sale.totalPrice.toLocaleString()} <span className="text-xs text-slate-400 ml-1 font-bold uppercase">{t.currency}</span>
                      </h3>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="text-[10px] font-black text-slate-500 bg-slate-50 px-2.5 py-1 rounded-lg uppercase tracking-wider">
                          {sale.clientName || t.cashClient}
                        </span>
                        <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-wider ${
                          debt > 0 ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-500'
                        }`}>
                          {debt > 0 ? `-${debt} ${t.currency}` : t.paidFull}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-2xl border border-slate-100/50 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                    <button 
                      onClick={() => {
                        setEditSale(sale);
                      }}
                      className="p-2.5 rounded-xl hover:bg-white hover:shadow-sm text-slate-400 hover:text-slate-600 transition-all"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    {debt > 0 && (
                      <button 
                        onClick={async () => {
                          setLoadingId(sale.id);
                          await markSalePaid(sale.id, sale.totalPrice, null);
                          setLoadingId(null);
                        }}
                        disabled={loadingId === sale.id}
                        className="p-2.5 rounded-xl hover:bg-white hover:shadow-sm text-green-500 transition-all"
                      >
                        {loadingId === sale.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                      </button>
                    )}
                    <button 
                      onClick={() => {
                        setConfirmDeleteId(sale.id);
                      }}
                      disabled={loadingId === sale.id}
                      className="p-2.5 rounded-xl hover:bg-red-50 text-slate-400 hover:text-red-500 transition-all"
                    >
                      {loadingId === sale.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-slate-50 pt-4">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wide">
                      <Bird className="w-3.5 h-3.5 text-orange-400" />
                      {sale.batchName}
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wide">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(sale.date).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <ConfirmModal 
        isOpen={!!confirmDeleteId}
        onClose={() => setConfirmDeleteId(null)}
        onConfirm={async () => {
          if (confirmDeleteId) {
            setLoadingId(confirmDeleteId);
            await deleteSale(confirmDeleteId);
            setLoadingId(null);
            setConfirmDeleteId(null);
          }
        }}
        title={t.deleteTitle}
        message={t.deleteConfirm}
      />
      <Modal 
        isOpen={!!editSale}
        onClose={() => setEditSale(null)}
        title={t.editTitle}
      >
        <SalesForm 
          batches={batches}
          clients={clients}
          onComplete={() => {
            setEditSale(null);
          }}
          editData={editSale}
        />
      </Modal>
    </section>
  );
}
