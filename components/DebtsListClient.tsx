"use client";

import React, { useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, Calendar, Filter, FileText, Trash2, Loader2, Pencil, CheckCircle2, Undo2, User } from "lucide-react";
import { deleteDebt, markDebtPaid, markDebtUnpaid } from "@/actions/debts";
import { ConfirmModal } from './ConfirmModal';
import { DebtForm } from './DebtForm';
import { Modal } from './Modal';

interface Debt {
  id: string;
  personName: string;
  amount: number;
  type: string;
  description: string | null;
  date: Date;
  isPaid: boolean;
  paidDate: Date | null;
}

interface Translations {
  currency: string;
  filterAll: string;
  filterBorrowing: string;
  filterLending: string;
  filterPending: string;
  filterPaid: string;
  empty: string;
  editTitle: string;
  deleteTitle: string;
  deleteConfirm: string;
  markPaid: string;
  statusPending: string;
  statusPaid: string;
  iOwe: string;
  owesMe: string;
  totalBorrowed: string;
  totalLent: string;
}

export function DebtsListClient({ debts, t }: { debts: Debt[]; t: Translations }) {
  const [filter, setFilter] = useState<'all' | 'borrowing' | 'lending' | 'pending' | 'paid'>('all');
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [editDebt, setEditDebt] = useState<Debt | null>(null);

  const filteredDebts = debts.filter((debt) => {
    if (filter === 'borrowing') return debt.type === 'borrowing';
    if (filter === 'lending') return debt.type === 'lending';
    if (filter === 'pending') return !debt.isPaid;
    if (filter === 'paid') return debt.isPaid;
    return true;
  });

  // Calculate summary totals (only pending debts)
  const totalBorrowed = debts.filter(d => d.type === 'borrowing' && !d.isPaid).reduce((sum, d) => sum + d.amount, 0);
  const totalLent = debts.filter(d => d.type === 'lending' && !d.isPaid).reduce((sum, d) => sum + d.amount, 0);

  const filters = [
    { id: 'all', label: t.filterAll },
    { id: 'pending', label: t.filterPending },
    { id: 'borrowing', label: t.filterBorrowing },
    { id: 'lending', label: t.filterLending },
    { id: 'paid', label: t.filterPaid },
  ] as const;

  const handleTogglePaid = async (debt: Debt) => {
    setLoadingId(debt.id);
    if (debt.isPaid) {
      await markDebtUnpaid(debt.id);
    } else {
      await markDebtPaid(debt.id);
    }
    setLoadingId(null);
  };

  return (
    <section className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-red-50 p-5 rounded-[2rem] border border-red-100 relative overflow-hidden">
          <div className="absolute -right-3 -top-3 w-16 h-16 bg-red-100/50 rounded-full blur-xl"></div>
          <div className="flex items-center gap-2 mb-2">
            <ArrowDownLeft className="w-4 h-4 text-red-500" />
            <span className="text-[9px] font-black text-red-400 uppercase tracking-widest">{t.totalBorrowed}</span>
          </div>
          <p className="text-2xl font-[1000] text-red-600 tracking-tighter">
            {totalBorrowed.toLocaleString()} <span className="text-xs opacity-60">{t.currency}</span>
          </p>
        </div>
        <div className="bg-emerald-50 p-5 rounded-[2rem] border border-emerald-100 relative overflow-hidden">
          <div className="absolute -right-3 -top-3 w-16 h-16 bg-emerald-100/50 rounded-full blur-xl"></div>
          <div className="flex items-center gap-2 mb-2">
            <ArrowUpRight className="w-4 h-4 text-emerald-500" />
            <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">{t.totalLent}</span>
          </div>
          <p className="text-2xl font-[1000] text-emerald-600 tracking-tighter">
            {totalLent.toLocaleString()} <span className="text-xs opacity-60">{t.currency}</span>
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-6 px-6 md:mx-0 md:px-0">
        <div className="flex items-center gap-2 bg-white/60 p-1.5 rounded-2xl border border-slate-100">
          <Filter className="w-4 h-4 text-slate-400 ml-2" />
          {filters.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap ${
                filter === f.id
                  ? 'bg-slate-900 text-white shadow-md shadow-slate-200'
                  : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Debt List */}
      <div className="space-y-4">
        {filteredDebts.length === 0 ? (
          <div className="text-center py-12 bg-white/50 rounded-[2.5rem] border border-dashed border-slate-300">
            <p className="text-slate-400 font-bold">{t.empty}</p>
          </div>
        ) : (
          filteredDebts.map((debt) => {
            const isBorrowing = debt.type === 'borrowing';
            const accentColor = isBorrowing ? 'red' : 'emerald';

            return (
              <div
                key={debt.id}
                className={`bg-white p-6 rounded-[2rem] border shadow-sm space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 group hover:shadow-md transition-all ${
                  debt.isPaid ? 'border-slate-100 opacity-60' : `border-${accentColor}-50`
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner transition-all duration-300 ${
                      debt.isPaid 
                        ? 'bg-slate-100 text-slate-400' 
                        : isBorrowing 
                          ? 'bg-red-50 text-red-500 group-hover:bg-red-500 group-hover:text-white' 
                          : 'bg-emerald-50 text-emerald-500 group-hover:bg-emerald-500 group-hover:text-white'
                    }`}>
                      {isBorrowing ? <ArrowDownLeft className="w-7 h-7" /> : <ArrowUpRight className="w-7 h-7" />}
                    </div>
                    <div>
                      <h3 className="font-black text-slate-800 text-xl tracking-tight">
                        {debt.amount.toLocaleString()} <span className="text-xs text-slate-400 ml-1 font-bold uppercase">{t.currency}</span>
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-wider ${
                          debt.isPaid 
                            ? 'text-slate-400 bg-slate-100' 
                            : isBorrowing 
                              ? 'text-red-500 bg-red-50' 
                              : 'text-emerald-500 bg-emerald-50'
                        }`}>
                          {isBorrowing ? t.iOwe : t.owesMe}
                        </span>
                        {debt.isPaid && (
                          <span className="text-[10px] font-black text-emerald-500 bg-emerald-50 px-2.5 py-1 rounded-lg uppercase tracking-wider">
                            {t.statusPaid}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Desktop actions */}
                  <div className="hidden md:flex items-center gap-1 bg-slate-50 p-1 rounded-2xl border border-slate-100/50 md:opacity-0 md:group-hover:opacity-100 transition-all transform md:translate-x-2 md:group-hover:translate-x-0">
                    <button
                      onClick={() => handleTogglePaid(debt)}
                      disabled={loadingId === debt.id}
                      className={`p-2.5 rounded-xl transition-all ${
                        debt.isPaid 
                          ? 'hover:bg-amber-50 text-amber-500' 
                          : 'hover:bg-emerald-50 text-emerald-500'
                      }`}
                      title={debt.isPaid ? '' : t.markPaid}
                    >
                      {loadingId === debt.id ? <Loader2 className="w-4 h-4 animate-spin" /> : debt.isPaid ? <Undo2 className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditDebt(debt);
                      }}
                      className="p-2.5 rounded-xl hover:bg-white hover:shadow-sm text-slate-400 hover:text-slate-600 transition-all"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setConfirmDeleteId(debt.id)}
                      disabled={loadingId === debt.id}
                      className="p-2.5 rounded-xl hover:bg-red-50 text-slate-400 hover:text-red-500 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Description */}
                {debt.description && (
                  <div className="text-[13px] font-medium text-slate-500 bg-slate-50/50 p-4 rounded-2xl flex items-start gap-3 border border-slate-100/50 group-hover:bg-white transition-colors">
                    <FileText className="w-4 h-4 mt-0.5 text-slate-300 shrink-0" />
                    <span>{debt.description}</span>
                  </div>
                )}

                <div className="flex items-center justify-between border-t border-slate-50 pt-4">
                  <div className="flex items-center gap-4">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wide">
                        <User className="w-3.5 h-3.5 text-orange-400" />
                        {debt.personName}
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wide">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(debt.date).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  {/* Mobile actions */}
                  <div className="md:hidden flex items-center gap-1 bg-slate-50 p-1 rounded-2xl border border-slate-100/50">
                    <button
                      onClick={() => handleTogglePaid(debt)}
                      disabled={loadingId === debt.id}
                      className={`p-2.5 rounded-xl transition-all ${
                        debt.isPaid 
                          ? 'bg-amber-50 text-amber-500' 
                          : 'bg-emerald-50 text-emerald-500'
                      }`}
                    >
                      {loadingId === debt.id ? <Loader2 className="w-4 h-4 animate-spin" /> : debt.isPaid ? <Undo2 className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditDebt(debt);
                      }}
                      className="p-2.5 rounded-xl bg-white shadow-sm text-slate-400"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setConfirmDeleteId(debt.id)}
                      disabled={loadingId === debt.id}
                      className="p-2.5 rounded-xl hover:bg-red-50 text-slate-400"
                    >
                      {loadingId === debt.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
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
            await deleteDebt(confirmDeleteId);
            setLoadingId(null);
          }
        }}
        title={t.deleteTitle}
        message={t.deleteConfirm}
      />

      <Modal
        isOpen={!!editDebt}
        onClose={() => setEditDebt(null)}
        title={t.editTitle}
      >
        <DebtForm
          onComplete={() => {
            setEditDebt(null);
          }}
          editData={editDebt}
        />
      </Modal>
    </section>
  );
}
