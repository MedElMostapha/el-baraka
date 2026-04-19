"use client";

import React, { useState } from 'react';
import { Wallet, Bird, Calendar, Filter, FileText, Trash2, Loader2, Pencil } from "lucide-react";
import { deleteExpense, updateExpense } from "@/actions/expenses";
import { ConfirmModal } from './ConfirmModal';
import { ExpenseForm } from './ExpenseForm';
import { Modal } from './Modal';

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
  editTitle: string;
  deleteTitle: string;
  deleteConfirm: string;
}

export function ExpensesListClient({ expenses, batches, t }: { expenses: Expense[]; batches: any[]; t: Translations }) {
  const [filter, setFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [editExpense, setEditExpense] = useState<Expense | null>(null);

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
                className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 group hover:shadow-md transition-all"
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center text-red-500 shadow-inner group-hover:bg-red-500 group-hover:text-white transition-all duration-300">
                      <Wallet className="w-7 h-7" />
                    </div>
                    <div>
                      <h3 className="font-black text-slate-800 text-xl tracking-tight">
                        {expense.amount.toLocaleString()} <span className="text-xs text-slate-400 ml-1 font-bold uppercase">{t.currency}</span>
                      </h3>
                      <div className="mt-1">
                        <span className="text-[10px] font-black text-red-500 bg-red-50 px-2.5 py-1 rounded-lg uppercase tracking-wider group-hover:bg-red-100 transition-colors">
                          {t.categories[expense.category] || expense.category}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="hidden md:flex items-center gap-1 bg-slate-50 p-1 rounded-2xl border border-slate-100/50 md:opacity-0 md:group-hover:opacity-100 transition-all transform md:translate-x-2 md:group-hover:translate-x-0">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditExpense(expense);
                      }}
                      className="p-2.5 rounded-xl hover:bg-white hover:shadow-sm text-slate-400 hover:text-slate-600 transition-all"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => {
                        setConfirmDeleteId(expense.id);
                      }}
                      disabled={loadingId === expense.id}
                      className="p-2.5 rounded-xl hover:bg-red-50 text-slate-400 hover:text-red-500 transition-all"
                    >
                      {loadingId === expense.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {expense.description && (
                  <div className="text-[13px] font-medium text-slate-500 bg-slate-50/50 p-4 rounded-2xl flex items-start gap-3 border border-slate-100/50 group-hover:bg-white transition-colors">
                    <FileText className="w-4 h-4 mt-0.5 text-slate-300 shrink-0" />
                    <span>{expense.description}</span>
                  </div>
                )}

                <div className="flex items-center justify-between border-t border-slate-50 pt-4">
                  <div className="flex items-center gap-4">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wide">
                        <Bird className="w-3.5 h-3.5 text-orange-400" />
                        {expense.batchName || t.generalExpense}
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wide">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(expense.date).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  <div className="md:hidden flex items-center gap-1 bg-slate-50 p-1 rounded-2xl border border-slate-100/50">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditExpense(expense);
                      }}
                      className="p-2.5 rounded-xl bg-white shadow-sm text-slate-400"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => {
                        setConfirmDeleteId(expense.id);
                      }}
                      disabled={loadingId === expense.id}
                      className="p-2.5 rounded-xl hover:bg-red-50 text-slate-400"
                    >
                      {loadingId === expense.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    </button>
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
            await deleteExpense(confirmDeleteId);
            setLoadingId(null);
          }
        }}
        title={t.deleteTitle}
        message={t.deleteConfirm}
      />

      <Modal 
        isOpen={!!editExpense}
        onClose={() => setEditExpense(null)}
        title={t.editTitle}
      >
        <ExpenseForm 
          batches={batches}
          onComplete={() => {
            setEditExpense(null);
          }}
          editData={editExpense}
        />
      </Modal>
    </section>
  );
}
