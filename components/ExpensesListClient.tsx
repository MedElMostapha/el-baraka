"use client";

import React, { useState } from 'react';
import { Wallet, Bird, Calendar, Filter, FileText } from "lucide-react";

interface Expense {
  id: string;
  date: Date;
  amount: number;
  category: string;
  description: string | null;
  batchName: string | null;
}

interface Translations {
  currency: string;
  filterAll: string;
  filterToday: string;
  filterWeek: string;
  filterMonth: string;
  empty: string;
  categories: Record<string, string>;
  generalExpense: string;
}

export function ExpensesListClient({ expenses, t }: { expenses: Expense[]; t: Translations }) {
  const [filter, setFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');

  const filteredExpenses = expenses.filter((expense) => {
    const expenseDate = new Date(expense.date);
    const now = new Date();
    
    if (filter === 'today') {
      return expenseDate.getDate() === now.getDate() && 
             expenseDate.getMonth() === now.getMonth() && 
             expenseDate.getFullYear() === now.getFullYear();
    }
    
    if (filter === 'week') {
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return expenseDate >= sevenDaysAgo;
    }
    
    if (filter === 'month') {
      return expenseDate.getMonth() === now.getMonth() && 
             expenseDate.getFullYear() === now.getFullYear();
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
                  ? 'bg-red-500 text-white shadow-md shadow-red-200'
                  : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {filteredExpenses.length === 0 ? (
          <div className="text-center py-12 bg-white/50 rounded-[2.5rem] border border-dashed border-slate-300">
             <p className="text-slate-400 font-bold">{t.empty}</p>
          </div>
        ) : (
          filteredExpenses.map((expense) => {
            return (
              <div 
                key={expense.id} 
                className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500"
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center text-red-400">
                      <Wallet className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-black text-slate-800 tracking-tight">
                        {expense.amount.toLocaleString()} {t.currency}
                      </h3>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                        {t.categories[expense.category] || expense.category}
                      </p>
                    </div>
                  </div>
                </div>

                {expense.description && (
                  <div className="text-sm text-slate-500 bg-slate-50 p-3 rounded-xl flex items-start gap-2">
                    <FileText className="w-4 h-4 mt-0.5 text-slate-400 shrink-0" />
                    <span>{expense.description}</span>
                  </div>
                )}

                <div className="flex items-center gap-4 border-t border-slate-50 pt-4">
                  <div className="flex items-center gap-1 text-[10px] font-black text-slate-400 uppercase">
                    <Bird className="w-3 h-3 text-orange-400" />
                    {expense.batchName || t.generalExpense}
                  </div>
                  <div className="flex items-center gap-1 text-[10px] font-black text-slate-400 uppercase">
                    <Calendar className="w-3 h-3" />
                    {new Date(expense.date).toLocaleDateString()}
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
