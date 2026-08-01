"use client";

import React, { useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, Calendar, Filter, FileText, Trash2, Loader2, Pencil, CheckCircle2, Undo2, User } from "lucide-react";
import { deleteDebt, markDebtPaid, markDebtUnpaid } from "@/actions/debts";
import { ConfirmModal } from './ConfirmModal';
import { DebtForm } from './DebtForm';
import { Modal } from './Modal';
import { Pagination } from './Pagination';

const PAGE_SIZE = 8;

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
  borrowedFormula: string;
  lentFormula: string;
}

export function DebtsListClient({ debts, t }: { debts: Debt[]; t: Translations }) {
  const [filter, setFilter] = useState<'all' | 'borrowing' | 'lending' | 'pending' | 'paid'>('all');
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [editDebt, setEditDebt] = useState<Debt | null>(null);
  const [page, setPage] = useState(1);

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

  const pageCount = Math.max(1, Math.ceil(filteredDebts.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const visibleDebts = filteredDebts.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

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
        <div className="metric-card border-red-100 bg-red-50">
          <div className="flex items-center gap-2 mb-2">
            <ArrowDownLeft className="w-4 h-4 text-red-500" />
            <span className="text-[9px] font-black text-red-400 uppercase tracking-widest">{t.totalBorrowed}</span>
          </div>
          <p className="text-2xl font-[1000] text-red-600 tracking-tighter">
            {totalBorrowed.toLocaleString()} <span className="text-xs opacity-60">{t.currency}</span>
          </p>
          <p className="formula-caption">{t.borrowedFormula}</p>
        </div>
        <div className="metric-card border-emerald-100 bg-emerald-50">
          <div className="flex items-center gap-2 mb-2">
            <ArrowUpRight className="w-4 h-4 text-emerald-500" />
            <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">{t.totalLent}</span>
          </div>
          <p className="text-2xl font-[1000] text-emerald-600 tracking-tighter">
            {totalLent.toLocaleString()} <span className="text-xs opacity-60">{t.currency}</span>
          </p>
          <p className="formula-caption">{t.lentFormula}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        <div className="filter-bar">
          <Filter className="ml-2 h-4 w-4 text-slate-400" />
          {filters.map((f) => (
            <button
              key={f.id}
              onClick={() => {
                setFilter(f.id);
                setPage(1);
              }}
              className={`${filter === f.id ? 'is-active' : ''} whitespace-nowrap`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Debt List */}
      <div className="space-y-4">
        {filteredDebts.length === 0 ? (
          <div className="empty-state">
            <p className="text-sm font-bold text-slate-500">{t.empty}</p>
          </div>
        ) : (
          visibleDebts.map((debt) => {
            const isBorrowing = debt.type === 'borrowing';

            return (
              <div
                key={debt.id}
                className={`record-card space-y-4 ${debt.isPaid ? 'opacity-60' : ''}`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-4">
                     <div className={`record-card__icon transition-all duration-300 ${
                      debt.isPaid
                        ? 'bg-slate-100 text-slate-400'
                        : isBorrowing
                          ? 'bg-red-50 text-red-500 group-hover:bg-red-500 group-hover:text-white'
                          : 'bg-emerald-50 text-emerald-500 group-hover:bg-emerald-500 group-hover:text-white'
                    }`}>
                      {isBorrowing ? <ArrowDownLeft className="w-7 h-7" /> : <ArrowUpRight className="w-7 h-7" />}
                    </div>
                    <div>
                       <h3 className="record-card__amount">
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
                  <div className="hidden items-center gap-1 rounded-xl bg-slate-50 p-1 md:flex">
                    <button
                      onClick={() => handleTogglePaid(debt)}
                      disabled={loadingId === debt.id}
                       className={`rounded-lg p-2.5 transition-all ${
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
                      className="rounded-lg p-2.5 text-slate-400 transition-all hover:bg-white hover:text-slate-600 hover:shadow-sm"
                      aria-label="Edit debt"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setConfirmDeleteId(debt.id)}
                      disabled={loadingId === debt.id}
                      className="rounded-lg p-2.5 text-slate-400 transition-all hover:bg-red-50 hover:text-red-500"
                      aria-label="Delete debt"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Description */}
                {debt.description && (
                <div className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3 text-[13px] font-medium text-slate-500">
                    <FileText className="w-4 h-4 mt-0.5 text-slate-300 shrink-0" />
                    <span>{debt.description}</span>
                  </div>
                )}

                <div className="record-card__footer">
                  <div className="record-card__meta">
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
                  <div className="md:hidden flex items-center gap-1 rounded-xl bg-slate-50 p-1">
                    <button
                      onClick={() => handleTogglePaid(debt)}
                      disabled={loadingId === debt.id}
                       className={`rounded-lg p-2.5 transition-all ${
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
                       className="rounded-lg bg-white p-2.5 text-slate-400 shadow-sm"
                       aria-label="Edit debt"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setConfirmDeleteId(debt.id)}
                      disabled={loadingId === debt.id}
                       className="rounded-lg p-2.5 text-slate-400 hover:bg-red-50 hover:text-red-500"
                       aria-label="Delete debt"
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

      <Pagination page={currentPage} pageCount={pageCount} onPageChange={setPage} />

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
