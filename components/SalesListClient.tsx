"use client";

import React, { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Wallet, Bird, Calendar, Trash2, CheckCircle, Loader2, Pencil, Download, Share2 } from "lucide-react";
import { deleteSale, markSalePaid } from '@/actions/sales';
import { shareInvoice } from '@/lib/invoices/shareInvoice';
import { ConfirmModal } from './ConfirmModal';
import { SalesForm } from './SalesForm';
import { Modal } from './Modal';
import { Pagination } from './Pagination';
import { FilterMenu } from './FilterMenu';
import { DatePicker, parseInputDate, toInputDate } from './DatePicker';
import { mergeIntoList, usePendingRecords } from '@/lib/offline/merge';

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
  clientPhone: string | null;
  invoiceNumber: string | null;
  isPending?: boolean;
}

interface BatchOption {
  id: string;
  name: string;
  remainingQuantity: number;
}

interface ClientOption {
  id: string;
  name: string;
  phone: string | null;
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
  empty: string;
  editTitle: string;
  deleteTitle: string;
  deleteConfirm: string;
  debtFormula: string;
}

export function SalesListClient({ sales, batches, clients, t }: { sales: Sale[]; batches: BatchOption[]; clients: ClientOption[]; t: Translations }) {
  const locale = useLocale();
  const ti = useTranslations('Invoice');
  const to = useTranslations('Offline');
  const [filter, setFilter] = useState<'all' | 'today' | 'week' | 'month' | 'unpaid'>('all');
  const [selectedDate, setSelectedDate] = useState('');
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [editSale, setEditSale] = useState<Sale | null>(null);
  const [page, setPage] = useState(1);
  const [sharingId, setSharingId] = useState<string | null>(null);
  const [shareError, setShareError] = useState<string | null>(null);

  const { records: mergedSales, pendingIds } = mergeIntoList(
    sales,
    usePendingRecords('sales'),
    (r) => ({
      id: r.id,
      date: new Date(r.date as string),
      batchId: r.batchId as string,
      clientId: (r.clientId as string | null) ?? null,
      quantity: r.quantity as number,
      unitPrice: r.unitPrice as number,
      totalPrice: r.totalPrice as number,
      amountPaid: r.amountPaid as number,
      feedConsumedBags: r.feedConsumedBags as number,
      type: r.type as 'wholesale' | 'retail',
      batchName: (r.batchName as string | null) ?? null,
      clientName: (r.clientName as string | null) ?? null,
      clientPhone: (r.clientPhone as string | null) ?? null,
      invoiceNumber: (r.invoiceNumber as string | null) ?? null,
    }),
  );

  const handleShare = async (sale: Sale) => {
    setSharingId(sale.id);
    setShareError(null);
    try {
      const result = await shareInvoice({
        saleId: sale.id,
        invoiceNumber: sale.invoiceNumber || undefined,
        phone: sale.clientPhone,
        message: ti('whatsappShareMessage', { invoiceNumber: sale.invoiceNumber || '' }),
        title: ti('title'),
      });
      if (result.status === 'unsupported') {
        setShareError(ti('whatsappShareUnsupported'));
      }
    } catch {
      setShareError(ti('whatsappShareError'));
    } finally {
      setSharingId(null);
    }
  };

  const filteredSales = mergedSales.filter((sale) => {
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
          <DatePicker
            value={selectedDate}
            label={t.filterDate}
            onChange={handleDateChange}
          />
        }
        mobileExtra={
          <DatePicker
            value={selectedDate}
            label={t.filterDate}
            onChange={handleDateChange}
          />
        }
      />

      {shareError && <div className="rounded-xl border border-red-100 bg-red-50 p-3 text-center text-sm font-bold text-red-600">{shareError}</div>}

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
                        {sale.isPending && (
                          <span className="rounded-lg bg-orange-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-orange-600">
                            {to('statusPending')}
                          </span>
                        )}
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
                    {!sale.isPending && (
                      <>
                    <a
                      href={`/sales/${sale.id}/invoice`}
                      download
                      aria-label={ti('download')}
                       className="rounded-lg p-2.5 text-slate-400 transition-all hover:bg-blue-50 hover:text-blue-600"
                    >
                      <Download className="w-4 h-4" />
                    </a>
                    <button
                      onClick={() => handleShare(sale)}
                      disabled={sharingId === sale.id}
                      aria-label={ti('shareWhatsApp')}
                       className="rounded-lg p-2.5 text-slate-400 transition-all hover:bg-green-50 hover:text-green-600"
                    >
                      {sharingId === sale.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
                    </button>
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
                      </>
                    )}
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
                    {!sale.isPending && (
                      <>
                    <a
                      href={`/sales/${sale.id}/invoice`}
                      download
                      aria-label={ti('download')}
                       className="rounded-lg bg-white p-2.5 text-slate-400 shadow-sm hover:bg-blue-50 hover:text-blue-600"
                    >
                      <Download className="w-4 h-4" />
                    </a>
                    <button
                      onClick={() => handleShare(sale)}
                      disabled={sharingId === sale.id}
                      aria-label={ti('shareWhatsApp')}
                       className="rounded-lg bg-white p-2.5 text-slate-400 shadow-sm hover:bg-green-50 hover:text-green-600"
                    >
                      {sharingId === sale.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
                    </button>
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
                      </>
                    )}
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
