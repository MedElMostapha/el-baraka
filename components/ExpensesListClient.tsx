"use client";

import React, { useState } from 'react';
import { useLocale } from 'next-intl';
import { Wallet, Bird, Calendar, FileText, Trash2, Loader2, Pencil } from "lucide-react";
import { deleteExpense } from "@/actions/expenses";
import { ConfirmModal } from './ConfirmModal';
import { ExpenseForm } from './ExpenseForm';
import { Modal } from './Modal';
import { Pagination } from './Pagination';
import { FilterMenu } from './FilterMenu';
import { DatePicker, parseInputDate, toInputDate } from './DatePicker';

const PAGE_SIZE = 8;

interface Expense {
  id: string;
  date: Date;
  amount: number;
  category: string;
  description: string | null;
  batchId: string | null;
  batchName: string | null;
}

interface Translations {
  currency: string;
  filterAll: string;
  filterToday: string;
  filterWeek: string;
  filterMonth: string;
  filterDate: string;
  filterGeneral: string;
  empty: string;
  categories: Record<string, string>;
  generalExpense: string;
  editTitle: string;
  deleteTitle: string;
  deleteConfirm: string;
}

export function ExpensesListClient({ expenses, batches, feedPricePerSac, t }: { expenses: Expense[]; batches: { id: string; name: string }[]; feedPricePerSac: number; t: Translations }) {
  const locale = useLocale();
  const [filter, setFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [selectedDate, setSelectedDate] = useState('');
  const [generalOnly, setGeneralOnly] = useState(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [editExpense, setEditExpense] = useState<Expense | null>(null);
  const [page, setPage] = useState(1);

  const filteredExpenses = expenses.filter((expense) => {
    const expenseDate = new Date(expense.date);
    const now = new Date();

    if (selectedDate) {
      if (toInputDate(expenseDate) !== selectedDate) return false;
    } else if (filter === 'today') {
      if (expenseDate.getDate() !== now.getDate() ||
          expenseDate.getMonth() !== now.getMonth() ||
          expenseDate.getFullYear() !== now.getFullYear()) return false;
    } else if (filter === 'week') {
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      if (expenseDate < sevenDaysAgo) return false;
    } else if (filter === 'month') {
      if (expenseDate.getMonth() !== now.getMonth() ||
          expenseDate.getFullYear() !== now.getFullYear()) return false;
    }

    if (generalOnly && expense.batchId !== null) return false;

    return true;
  });

  const filters = [
    { id: 'all', label: t.filterAll },
    { id: 'today', label: t.filterToday },
    { id: 'week', label: t.filterWeek },
    { id: 'month', label: t.filterMonth },
  ] as const;

  const pageCount = Math.max(1, Math.ceil(filteredExpenses.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const visibleExpenses = filteredExpenses.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const selectedDateLabel = selectedDate
    ? parseInputDate(selectedDate)?.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })
    : undefined;

  const handleDateChange = (date: string) => {
    setSelectedDate(date);
    setPage(1);
  };

  return (
    <section className="space-y-4">
      <FilterMenu
        activeLabel={selectedDateLabel}
        options={filters.map((f) => ({
          ...f,
          active: filter === f.id && !selectedDate,
          onSelect: () => {
            setFilter(f.id);
            setSelectedDate('');
            setPage(1);
          },
        }))}
        desktopExtra={
          <>
            <DatePicker
              value={selectedDate}
              label={t.filterDate}
              onChange={handleDateChange}
            />
            <label className="filter-checkbox">
              <input
                type="checkbox"
                checked={generalOnly}
                onChange={(e) => {
                  setGeneralOnly(e.target.checked);
                  setPage(1);
                }}
              />
              <span>{t.filterGeneral}</span>
            </label>
          </>
        }
        mobileExtra={
          <>
            <DatePicker
              value={selectedDate}
              label={t.filterDate}
              onChange={handleDateChange}
            />
            <label className="filter-checkbox">
              <input
                type="checkbox"
                checked={generalOnly}
                onChange={(e) => {
                  setGeneralOnly(e.target.checked);
                  setPage(1);
                }}
              />
              <span>{t.filterGeneral}</span>
            </label>
          </>
        }
      />

      <div className="space-y-4">
        {filteredExpenses.length === 0 ? (
           <div className="empty-state">
              <p className="text-sm font-bold text-slate-500">{t.empty}</p>
          </div>
        ) : (
           visibleExpenses.map((expense) => {
            return (
              <div
                key={expense.id}
                 className="record-card space-y-4"
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-4">
                     <div className="record-card__icon" style={{ background: 'var(--red-soft)', color: 'var(--red)' }}>
                       <Wallet className="h-5 w-5" />
                    </div>
                    <div>
                       <h3 className="record-card__amount">
                        {expense.amount.toLocaleString()} <span className="text-xs text-slate-400 ml-1 font-bold uppercase">{t.currency}</span>
                      </h3>
                      <div className="mt-1">
                        <span className="text-[10px] font-black text-red-500 bg-red-50 px-2.5 py-1 rounded-lg uppercase tracking-wider group-hover:bg-red-100 transition-colors">
                          {t.categories[expense.category] || expense.category}
                        </span>
                      </div>
                    </div>
                  </div>

                   <div className="hidden items-center gap-1 rounded-xl bg-slate-50 p-1 md:flex">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditExpense(expense);
                      }}
                       className="rounded-lg p-2.5 text-slate-400 transition-all hover:bg-white hover:text-slate-600 hover:shadow-sm"
                       aria-label="Edit expense"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        setConfirmDeleteId(expense.id);
                      }}
                      disabled={loadingId === expense.id}
                       className="rounded-lg p-2.5 text-slate-400 transition-all hover:bg-red-50 hover:text-red-500"
                       aria-label="Delete expense"
                    >
                      {loadingId === expense.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                 {expense.description && (
                   <div className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3 text-[13px] font-medium text-slate-500">
                    <FileText className="w-4 h-4 mt-0.5 text-slate-300 shrink-0" />
                    <span>{expense.description}</span>
                  </div>
                )}

                 <div className="record-card__footer">
                   <div className="record-card__meta">
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

                   <div className="md:hidden flex items-center gap-1 rounded-xl bg-slate-50 p-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditExpense(expense);
                      }}
                       className="rounded-lg bg-white p-2.5 text-slate-400 shadow-sm"
                       aria-label="Edit expense"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        setConfirmDeleteId(expense.id);
                      }}
                      disabled={loadingId === expense.id}
                       className="rounded-lg p-2.5 text-slate-400 hover:bg-red-50 hover:text-red-500"
                       aria-label="Delete expense"
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

      <Pagination page={currentPage} pageCount={pageCount} onPageChange={setPage} />

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
          feedPricePerSac={feedPricePerSac}
          onComplete={() => {
            setEditExpense(null);
          }}
          editData={editExpense}
        />
      </Modal>
    </section>
  );
}
