"use client";

import React, { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { TrendingUp, Package, Bird, AlertCircle } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { DashboardCharts } from "@/components/DashboardCharts";
import { FilterMenu } from "@/components/FilterMenu";
import { DailyLogForm } from "@/components/DailyLogForm";
import { computeDashboard, type DashboardInput } from '@/lib/dashboard/compute';
import { usePendingRecords, mergeIntoList } from '@/lib/offline/merge';
import { useOfflineSnapshot } from '@/lib/offline/useOfflineStatus';

export interface DashboardServerData {
  batches: DashboardInput['batches'];
  sales: DashboardInput['sales'];
  dailyLogs: DashboardInput['dailyLogs'];
  expenses: DashboardInput['expenses'];
  inventory: DashboardInput['inventory'];
  restocks: DashboardInput['restocks'];
}

interface DashboardClientProps {
  range: string;
  kgPerSac: number;
  server: DashboardServerData;
}

export function DashboardClient({ range, kgPerSac, server }: DashboardClientProps) {
  const t = useTranslations('Dashboard');
  const ts = useTranslations('Sales');
  const ti = useTranslations('Inventory');
  const { data: snapshot } = useOfflineSnapshot();

  const cachedKgPerSac = snapshot?.settings?.kg_per_sac ? parseFloat(snapshot.settings.kg_per_sac) : NaN;
  const effectiveKgPerSac = Number.isFinite(cachedKgPerSac) && cachedKgPerSac > 0 ? cachedKgPerSac : kgPerSac;

  const pendingBatches = usePendingRecords('batches');
  const pendingSales = usePendingRecords('sales');
  const pendingDailyLogs = usePendingRecords('dailyLogs');
  const pendingExpenses = usePendingRecords('expenses');
  const pendingInventory = usePendingRecords('inventory');
  const pendingRestocks = usePendingRecords('restocks');

  const input = useMemo<DashboardInput>(() => {
    const batches = mergeIntoList(server.batches, pendingBatches, (p) => ({
      id: p.id as string,
      name: (p.name as string) || 'PENDING',
      initialQuantity: p.initialQuantity as number,
      costPerChick: p.costPerChick as number,
      status: (p.status as string) || 'active',
    })).records;
    const sales = mergeIntoList(server.sales, pendingSales, (p) => ({
      id: p.id as string,
      batchId: p.batchId as string,
      date: p.date as string,
      quantity: p.quantity as number,
      totalPrice: p.totalPrice as number,
      amountPaid: p.amountPaid as number,
    })).records;
    const dailyLogs = mergeIntoList(server.dailyLogs, pendingDailyLogs, (p) => ({
      id: p.id as string,
      batchId: p.batchId as string,
      mortality: p.mortality as number,
    })).records;
    const expenses = mergeIntoList(server.expenses, pendingExpenses, (p) => ({
      id: p.id as string,
      date: p.date as string,
      amount: p.amount as number,
    })).records;
    const inventory = mergeIntoList(server.inventory, pendingInventory, (p) => ({
      id: p.id as string,
      category: p.category as string,
      quantity: p.quantity as number,
      unit: p.unit as string,
    })).records;
    const restocks = mergeIntoList(server.restocks, pendingRestocks, (p) => ({
      id: p.id as string,
      quantity: p.quantity as number,
      costPerChick: p.costPerChick as number,
    })).records;

    return { batches, sales, dailyLogs, expenses, inventory, restocks };
  }, [server, pendingBatches, pendingSales, pendingDailyLogs, pendingExpenses, pendingInventory, pendingRestocks]);

  const {
    activeBatches,
    activeBirdCount,
    totalRevenue,
    totalExpenses,
    totalDebt,
    cashOnHand,
    netProfit,
    mortalityRate,
    totalFeedKg,
    lowStock,
    chartData,
  } = useMemo(() => computeDashboard(input, effectiveKgPerSac, range), [input, effectiveKgPerSac, range]);

  const lowStockGrouped = lowStock
    ? [{ category: ti('feed'), totalQuantity: totalFeedKg, unit: 'kg' }]
    : [];

  return (
    <main className="page-container">
      <div className="page-stack">
        <PageHeader title="EL BARAKA" subtitle={t('subtitle')} />

        <div className="dashboard-toolbar">
          <div className="dashboard-toolbar__copy">
            <span className="section-kicker">{t('performance')}</span>
            <strong>{t('recentActivity')}</strong>
          </div>
          <FilterMenu
            desktopVariant="range-switcher"
            options={[
              { id: '7d', label: t('filter7d'), active: range === '7d', href: '?range=7d' },
              { id: '30d', label: t('filter30d'), active: range === '30d', href: '?range=30d' },
              { id: 'all', label: t('filterAll'), active: range === 'all', href: '?range=all' },
            ]}
          />
        </div>

        {lowStockGrouped.length > 0 && (
          <div className="attention-card">
            <div>
              <div className="attention-card__heading">
                <AlertCircle className="h-4 w-4" />
                <span>{t('lowStockAlert')}</span>
              </div>
              <div className="attention-card__items">
                {lowStockGrouped.map(item => (
                  <div key={item.category} className="attention-card__item">
                    {item.category}
                    <strong>{item.totalQuantity} {item.unit}</strong>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <section className="dashboard-hero">
          <div className="dashboard-hero__main">
            <div className="dashboard-hero__tag"><span /> {t('connectivity')} · {t('cloud')}</div>
            <p className="dashboard-hero__label">{t('revenue')}</p>
            <div className="dashboard-hero__value">
              {totalRevenue.toLocaleString()} <span>{ts('currency')}</span>
            </div>
            <p className="dashboard-hero__formula">{t('revenueFormula')}</p>
            <p className="dashboard-hero__note">
              {t('cashOnHand')}: {cashOnHand.toLocaleString()} {ts('currency')} · {t('receivables')}: {totalDebt.toLocaleString()} {ts('currency')}
            </p>
            <div className="dashboard-hero__profit">
              <span className="dashboard-hero__profit-label">{t('netProfit')}</span>
              <strong
                className="dashboard-hero__profit-value"
                style={netProfit < 0 ? { color: '#f7b2ae' } : undefined}
              >
                {netProfit.toLocaleString()} {ts('currency')}
              </strong>
              <span className="dashboard-hero__profit-formula">{t('netProfitFormula')}</span>
            </div>
          </div>
          <div className="dashboard-hero__aside">
            <div className="dashboard-hero__stat">
              <span className="dashboard-hero__stat-label">{t('cashOnHand')}</span>
              <strong className="dashboard-hero__stat-value">{cashOnHand.toLocaleString()} {ts('currency')}</strong>
              <span className="dashboard-hero__stat-formula">{t('cashFormula')}</span>
            </div>
            <div className="dashboard-hero__stat">
              <span className="dashboard-hero__stat-label">{t('activeBatches')}</span>
              <strong className="dashboard-hero__stat-value">{activeBatches.length} · {activeBirdCount}</strong>
              <span className="dashboard-hero__stat-formula">{t('activeBirdsFormula')}</span>
            </div>
            <div className="dashboard-hero__stat">
              <span className="dashboard-hero__stat-label">{t('receivables')}</span>
              <strong className="dashboard-hero__stat-value">{totalDebt.toLocaleString()} {ts('currency')}</strong>
              <span className="dashboard-hero__stat-formula">{t('receivablesFormula')}</span>
            </div>
          </div>
        </section>

        <section className="metric-grid" aria-label="Key metrics">
          <div className="metric-card">
            <div className="metric-card__icon" style={{ background: 'var(--orange-soft)', color: 'var(--orange)' }}>
              <Bird className="h-4 w-4" />
            </div>
            <span className="metric-card__label">{t('activeBatches')}</span>
            <strong className="metric-card__value">{activeBatches.length}</strong>
            <span className="formula-caption">{t('activeBatchesFormula')}</span>
          </div>
          <div className="metric-card">
            <div className="metric-card__icon" style={{ background: 'var(--red-soft)', color: 'var(--red)' }}>
              <AlertCircle className="h-4 w-4" />
            </div>
            <span className="metric-card__label">{t('mortalityRate')}</span>
            <strong className="metric-card__value">{mortalityRate === null ? '—' : `${mortalityRate}%`}</strong>
            <span className="formula-caption">{t('mortalityFormula')}</span>
          </div>
          <div className="metric-card">
            <div className="metric-card__icon" style={{ background: 'var(--blue-soft)', color: 'var(--blue)' }}>
              <Package className="h-4 w-4" />
            </div>
            <span className="metric-card__label">{ti('feed')}</span>
            <strong className="metric-card__value">{Math.round(totalFeedKg)} <small>kg</small></strong>
            <span className="formula-caption">{t('feedFormula')}</span>
          </div>
          <div className="metric-card">
            <div className="metric-card__icon" style={{ background: 'var(--pine-soft)', color: 'var(--pine)' }}>
              <TrendingUp className="h-4 w-4" />
            </div>
            <span className="metric-card__label">{t('expenses')}</span>
            <strong className="metric-card__value">{totalExpenses.toLocaleString()} <small>{ts('currency')}</small></strong>
            <span className="formula-caption">{t('expensesFormula')}</span>
          </div>
        </section>

        <div className="dashboard-lower-grid">
          <DashboardCharts
            data={chartData}
            t={{
              performance: t('performance'),
              revenue: t('revenue'),
              expenses: t('expenses'),
              formula: t('chartFormula')
            }}
          />
          <DailyLogForm
            batches={activeBatches.map(b => ({ id: b.id, name: b.name }))}
          />
        </div>

        {activeBatches.length === 0 && (
          <div className="empty-state">
            <p className="section-kicker">{t('welcome')}</p>
            <p className="mt-3 text-sm font-semibold text-slate-500">{t('welcomeMessage')}</p>
            <Link href="/batches" className="button-accent mt-6">
              {t('addFirstBatch')}
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
