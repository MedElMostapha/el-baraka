"use client";

import React, { useEffect, useRef, useState } from 'react';
import { useLocale } from 'next-intl';
import { Wallet, Bird, Calendar, ChevronDown, ChevronLeft, ChevronRight, Filter, Trash2, CheckCircle, Loader2, Pencil } from "lucide-react";
import { deleteSale, markSalePaid } from '@/actions/sales';
import { ConfirmModal } from './ConfirmModal';
import { SalesForm } from './SalesForm';
import { Modal } from './Modal';
import { Pagination } from './Pagination';

const PAGE_SIZE = 8;

interface Sale {
  id: string;
  date: Date;
  batchId: string;
  clientId: string | null;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  amountPaid: number;
  feedConsumedBags: number;
  type: 'wholesale' | 'retail';
  batchName: string | null;
  clientName: string | null;
}

interface BatchOption {
  id: string;
  name: string;
  remainingQuantity: number;
}

interface ClientOption {
  id: string;
  name: string;
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
  filterDate: string;
  pickDate: string;
  clearDate: string;
  previousMonth: string;
  nextMonth: string;
  empty: string;
  editTitle: string;
  deleteTitle: string;
  deleteConfirm: string;
  debtFormula: string;
}

export function SalesListClient({ sales, batches, clients, t }: { sales: Sale[]; batches: BatchOption[]; clients: ClientOption[]; t: Translations }) {
  const locale = useLocale();
  const [filter, setFilter] = useState<'all' | 'today' | 'week' | 'month' | 'unpaid'>('all');
  const [selectedDate, setSelectedDate] = useState('');
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [editSale, setEditSale] = useState<Sale | null>(null);
  const [page, setPage] = useState(1);

  const filteredSales = sales.filter((sale) => {
    const saleDate = new Date(sale.date);
    const now = new Date();

    if (selectedDate) {
      return toInputDate(saleDate) === selectedDate;
    }

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

  const pageCount = Math.max(1, Math.ceil(filteredSales.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const visibleSales = filteredSales.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <section className="space-y-4">
      <div className="sales-filters">
        <div className="filter-bar">
          <Filter className="ml-2 h-4 w-4 text-slate-400" />
          {filters.map((f) => (
            <button
              key={f.id}
              onClick={() => {
                setFilter(f.id);
                setSelectedDate('');
                setPage(1);
              }}
              className={`${filter === f.id && !selectedDate ? 'is-active' : ''} whitespace-nowrap`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <DatePicker
          locale={locale}
          value={selectedDate}
          label={t.filterDate}
          placeholder={t.pickDate}
          clearLabel={t.clearDate}
          previousMonthLabel={t.previousMonth}
          nextMonthLabel={t.nextMonth}
          onChange={(date) => {
            setSelectedDate(date);
            setPage(1);
          }}
        />
      </div>

      <div className="space-y-4">
        {filteredSales.length === 0 ? (
           <div className="empty-state">
              <p className="text-sm font-bold text-slate-500">{t.empty}</p>
          </div>
        ) : (
           visibleSales.map((sale) => {
             const debt = Math.max(0, sale.totalPrice - sale.amountPaid);
            return (
              <div
                key={sale.id}
                className="record-card space-y-4"
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-4">
                    <div className="record-card__icon">
                      <Wallet className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="record-card__amount">
                        {sale.totalPrice.toLocaleString()} <span className="text-xs text-slate-400 ml-1 font-bold uppercase">{t.currency}</span>
                      </h3>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <span className="text-[10px] font-black text-slate-500 bg-slate-50 px-2.5 py-1 rounded-lg uppercase tracking-wider">
                          {sale.clientName || t.cashClient}
                        </span>
                        <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-wider ${
                          debt > 0 ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-500'
                        }`}>
                          {debt > 0 ? `-${debt} ${t.currency}` : t.paidFull}
                        </span>
                        {debt > 0 && <span className="formula-caption">{t.debtFormula}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="hidden items-center gap-1 rounded-xl bg-slate-50 p-1 md:flex">
                    <button
                      onClick={() => {
                        setEditSale(sale);
                      }}
                         className="rounded-lg p-2.5 text-slate-400 transition-all hover:bg-white hover:text-slate-600 hover:shadow-sm"
                         aria-label="Edit sale"
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
                         className="rounded-lg p-2.5 text-emerald-600 transition-all hover:bg-emerald-50"
                         aria-label="Mark sale paid"
                      >
                        {loadingId === sale.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setConfirmDeleteId(sale.id);
                      }}
                      disabled={loadingId === sale.id}
                       className="rounded-lg p-2.5 text-slate-400 transition-all hover:bg-red-50 hover:text-red-500"
                       aria-label="Delete sale"
                    >
                      {loadingId === sale.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="record-card__footer">
                  <div className="record-card__meta">
                    <div className="flex flex-col gap-1.5">
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

                  <div className="md:hidden flex items-center gap-1 rounded-xl bg-slate-50 p-1">
                    <button
                      onClick={() => {
                        setEditSale(sale);
                      }}
                       className="rounded-lg bg-white p-2.5 text-slate-400 shadow-sm"
                       aria-label="Edit sale"
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
                       className="rounded-lg bg-white p-2.5 text-emerald-600 shadow-sm"
                       aria-label="Mark sale paid"
                      >
                        {loadingId === sale.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setConfirmDeleteId(sale.id);
                      }}
                      disabled={loadingId === sale.id}
                       className="rounded-lg p-2.5 text-slate-400 hover:bg-red-50 hover:text-red-500"
                       aria-label="Delete sale"
                    >
                      {loadingId === sale.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
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

interface DatePickerProps {
  locale: string;
  value: string;
  label: string;
  placeholder: string;
  clearLabel: string;
  previousMonthLabel: string;
  nextMonthLabel: string;
  onChange: (value: string) => void;
}

function DatePicker({
  locale,
  value,
  label,
  placeholder,
  clearLabel,
  previousMonthLabel,
  nextMonthLabel,
  onChange,
}: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState(() => {
    const selectedDate = parseInputDate(value);
    return selectedDate || new Date();
  });
  const pickerRef = useRef<HTMLDivElement>(null);
  const selectedDate = parseInputDate(value);
  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const todayValue = toInputDate(new Date());
  const monthLabel = viewMonth.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
  const weekdays = Array.from({ length: 7 }, (_, index) => (
    new Date(2021, 7, index + 1).toLocaleDateString(locale, { weekday: 'short' })
  ));
  const days = Array.from({ length: firstDayOfMonth + daysInMonth }, (_, index) => (
    index < firstDayOfMonth ? null : index - firstDayOfMonth + 1
  ));

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!pickerRef.current?.contains(event.target as Node)) setIsOpen(false);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [isOpen]);

  const moveMonth = (offset: number) => {
    setViewMonth(new Date(year, month + offset, 1));
  };

  return (
    <div ref={pickerRef} className="date-picker">
      <button
        type="button"
        className={`date-picker__trigger ${value ? 'date-picker__trigger--selected' : ''}`}
        aria-label={label}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        onClick={() => {
          if (selectedDate) setViewMonth(selectedDate);
          setIsOpen((open) => !open);
        }}
      >
        <Calendar className="h-4 w-4" aria-hidden="true" />
        <span>{value ? selectedDate?.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' }) : placeholder}</span>
        <ChevronDown className={`date-picker__chevron h-4 w-4 ${isOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>

      {isOpen && (
        <div className="date-picker__popover" role="dialog" aria-label={label}>
          <div className="date-picker__header">
            <strong>{monthLabel}</strong>
            <div className="date-picker__month-actions">
              <button type="button" onClick={() => moveMonth(-1)} aria-label={previousMonthLabel}>
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button type="button" onClick={() => moveMonth(1)} aria-label={nextMonthLabel}>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="date-picker__weekdays">
            {weekdays.map((weekday, index) => <span key={`${weekday}-${index}`}>{weekday}</span>)}
          </div>
          <div className="date-picker__days">
            {days.map((day, index) => {
              if (!day) return <span key={`empty-${index}`} aria-hidden="true" />;
              const dayValue = toInputDate(new Date(year, month, day));
              const isSelected = dayValue === value;
              const isToday = dayValue === todayValue;
              return (
                <button
                  key={dayValue}
                  type="button"
                  className={`date-picker__day ${isSelected ? 'date-picker__day--selected' : ''} ${isToday ? 'date-picker__day--today' : ''}`}
                  aria-pressed={isSelected}
                  onClick={() => {
                    onChange(dayValue);
                    setIsOpen(false);
                  }}
                >
                  {day}
                </button>
              );
            })}
          </div>
          {value && (
            <button
              type="button"
              className="date-picker__clear"
              onClick={() => {
                onChange('');
                setIsOpen(false);
              }}
            >
              {clearLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function toInputDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseInputDate(value: string) {
  if (!value) return null;
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}
