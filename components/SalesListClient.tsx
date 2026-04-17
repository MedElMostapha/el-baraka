"use client";

import React, { useState } from 'react';
import { Wallet, Bird, Calendar, Filter } from "lucide-react";

interface Sale {
  id: string;
  date: Date;
  quantity: number;
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
  empty: string;
}

export function SalesListClient({ sales, t }: { sales: Sale[]; t: Translations }) {
  const [filter, setFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');

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
    
    return true; // 'all'
  });

  const filters = [
    { id: 'all', label: t.filterAll },
    { id: 'today', label: t.filterToday },
    { id: 'week', label: t.filterWeek },
    { id: 'month', label: t.filterMonth },
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
                className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500"
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400">
                      <Wallet className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-black text-slate-800 tracking-tight">
                        {sale.totalPrice.toLocaleString()} {t.currency}
                      </h3>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                        {sale.clientName || t.cashClient}
                      </p>
                    </div>
                  </div>
                  <span className={`text-[10px] font-black px-2 py-1 rounded-lg uppercase ${
                    debt > 0 ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-500'
                  }`}>
                    {debt > 0 ? `-${debt} ${t.currency}` : t.paidFull}
                  </span>
                </div>

                <div className="flex items-center gap-4 border-t border-slate-50 pt-4">
                  <div className="flex items-center gap-1 text-[10px] font-black text-slate-400 uppercase">
                    <Bird className="w-3 h-3 text-orange-400" />
                    {sale.batchName}
                  </div>
                  <div className="flex items-center gap-1 text-[10px] font-black text-slate-400 uppercase">
                    <Calendar className="w-3 h-3" />
                    {new Date(sale.date).toLocaleDateString()}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
