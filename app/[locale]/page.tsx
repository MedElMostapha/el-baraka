import { DailyLogForm } from "@/components/DailyLogForm";
import { db } from "@/db";
import { batches, sales, expenses, dailyLogs, inventory, restocks } from "@/db/schema";
import { eq, sql, gte, inArray } from "drizzle-orm";
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { PageHeader } from '@/components/PageHeader';
import { DashboardCharts } from "@/components/DashboardCharts";
import { TrendingUp, Package, Bird, AlertCircle } from "lucide-react";
import { getKgPerSac } from '@/actions/settings';

function toKg(quantity: number, unit: string, kgPerSac: number): number {
  if ((unit === 'sac' || unit === 'bag') && kgPerSac > 0) return quantity * kgPerSac;
  if (unit === 'g') return quantity / 1000;
  if (unit === 'kg') return quantity;
  return 0;
}

export default async function Home(props: { searchParams: Promise<{ range?: string }> }) {
  const searchParams = await props.searchParams;
  const range = searchParams.range || '7d';
  const t = await getTranslations('Dashboard');
  const ts = await getTranslations('Sales');
  const ti = await getTranslations('Inventory');
  const kgPerSac = await getKgPerSac();

  // 1. Fetch Active Batches
  const activeBatches = await db
    .select({ id: batches.id, name: batches.name, initialQuantity: batches.initialQuantity })
    .from(batches)
    .where(eq(batches.status, "active"));
  const activeBatchIds = activeBatches.map((batch) => batch.id);
  const activeBatchStats: Record<string, { mortality: number; sold: number }> = {};
  activeBatches.forEach((batch) => {
    activeBatchStats[batch.id] = { mortality: 0, sold: 0 };
  });

  if (activeBatchIds.length > 0) {
    const activeLogs = await db
      .select({ batchId: dailyLogs.batchId, mortality: dailyLogs.mortality })
      .from(dailyLogs)
      .where(inArray(dailyLogs.batchId, activeBatchIds));
    const activeSales = await db
      .select({ batchId: sales.batchId, quantity: sales.quantity })
      .from(sales)
      .where(inArray(sales.batchId, activeBatchIds));

    activeLogs.forEach((log) => {
      activeBatchStats[log.batchId].mortality += log.mortality;
    });
    activeSales.forEach((sale) => {
      activeBatchStats[sale.batchId].sold += sale.quantity;
    });
  }

  const activeBirdCount = activeBatches.reduce((sum, batch) => {
    const stats = activeBatchStats[batch.id];
    return sum + Math.max(0, batch.initialQuantity - stats.mortality - stats.sold);
  }, 0);

  // 2. Financial Metrics
  const revenueResult = await db.select({ sum: sql<number>`sum(${sales.totalPrice})` }).from(sales);
  const expensesResult = await db.select({ sum: sql<number>`sum(${expenses.amount})` }).from(expenses);
  const debtResult = await db.select({
    sum: sql<number>`sum(case when ${sales.totalPrice} > ${sales.amountPaid} then ${sales.totalPrice} - ${sales.amountPaid} else 0 end)`,
  }).from(sales);
  const paidResult = await db.select({ sum: sql<number>`sum(${sales.amountPaid})` }).from(sales);

  const restockCostResult = await db.select({
    sum: sql<number>`sum(${restocks.quantity} * ${restocks.costPerChick})`,
  }).from(restocks);
  const batchCostResult = await db.select({
    sum: sql<number>`sum(${batches.initialQuantity} * ${batches.costPerChick})`,
  }).from(batches);
  const restockCost = restockCostResult[0]?.sum || 0;
  const batchCost = batchCostResult[0]?.sum || 0;
  const birdCost = restockCost > 0 ? restockCost : batchCost;

  const totalRevenue = revenueResult[0]?.sum || 0;
  const totalExpenses = expensesResult[0]?.sum || 0;
  const totalDebt = debtResult[0]?.sum || 0;
  const totalPaid = paidResult[0]?.sum || 0;
  const cashOnHand = totalPaid - totalExpenses;
  const netProfit = totalRevenue - totalExpenses - birdCost;

  // 3. Performance Stats
  const mortalityResult = await db.select({ sum: sql<number>`sum(${dailyLogs.mortality})` }).from(dailyLogs);
  const totalMortality = mortalityResult[0]?.sum || 0;

  const totalBirdsEver = await db.select({ sum: sql<number>`sum(${batches.initialQuantity})` }).from(batches);
  const totalBirds = totalBirdsEver[0]?.sum || 0;
  const mortalityRate = totalBirds > 0 ? ((totalMortality / totalBirds) * 100).toFixed(1) : null;

  const allInventory = await db.select().from(inventory);
  const feedItems = allInventory.filter(i => i.category === 'feed');
  const totalFeed = feedItems.reduce((sum, i) => sum + toKg(i.quantity, i.unit, kgPerSac), 0);

  // 4. Feed stock is normalized to kg; other categories use incompatible units.
  const lowStockGrouped = feedItems.length > 0 && totalFeed < 5
    ? [{ category: ti('feed'), totalQuantity: totalFeed, unit: 'kg' }]
    : [];

  // 5. Chart Data Logic based on Range
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  let startDate = new Date(todayStart);
  let days = 7;

  if (range === '30d') { startDate.setDate(todayStart.getDate() - 29); days = 30; }
  else if (range === 'all') { startDate = new Date(0); }
  else { startDate.setDate(todayStart.getDate() - 6); days = 7; }

  const recentSales = await db.select().from(sales).where(gte(sales.date, startDate));
  const recentExpenses = await db.select().from(expenses).where(gte(expenses.date, startDate));

  if (range === 'all') {
    const earliestTimestamp = [...recentSales, ...recentExpenses]
      .map((entry) => entry.date.getTime())
      .sort((a, b) => a - b)[0];
    if (earliestTimestamp) {
      const earliestStart = new Date(earliestTimestamp);
      earliestStart.setHours(0, 0, 0, 0);
      days = Math.max(1, Math.floor((todayStart.getTime() - earliestStart.getTime()) / 86400000) + 1);
    }
  }

  const chartDataMap: Record<string, { revenue: number, expenses: number }> = {};
  for (let i = 0; i < days; i++) {
    const d = new Date(todayStart);
    d.setDate(d.getDate() - i);
    const dateStr = d.toLocaleDateString(undefined, { day: '2-digit', month: 'short' });
    chartDataMap[dateStr] = { revenue: 0, expenses: 0 };
  }

  recentSales.forEach(s => {
      const dateStr = s.date.toLocaleDateString(undefined, { day: '2-digit', month: 'short' });
    if (chartDataMap[dateStr]) chartDataMap[dateStr].revenue += s.totalPrice;
  });
  recentExpenses.forEach(e => {
    const dateStr = e.date.toLocaleDateString(undefined, { day: '2-digit', month: 'short' });
    if (chartDataMap[dateStr]) chartDataMap[dateStr].expenses += e.amount;
  });

  const chartData = Object.entries(chartDataMap).map(([date, vals]) => ({
    date,
    ...vals
  })).reverse();

  return (
    <main className="page-container">
      <div className="page-stack">
        <PageHeader title="EL BARAKA" subtitle={t('subtitle')} />

        <div className="dashboard-toolbar">
          <div className="dashboard-toolbar__copy">
            <span className="section-kicker">{t('performance')}</span>
            <strong>{t('recentActivity')}</strong>
          </div>
          <div className="range-switcher" aria-label="Chart range">
            {[
              { id: '7d', label: t('filter7d') },
              { id: '30d', label: t('filter30d') },
              { id: 'all', label: t('filterAll') }
            ].map((f) => (
              <Link key={f.id} href={`?range=${f.id}`} className={range === f.id ? 'is-active' : ''}>
                {f.label}
              </Link>
            ))}
          </div>
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
            <strong className="metric-card__value">{Math.round(totalFeed)} <small>kg</small></strong>
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
          <DailyLogForm batches={activeBatches.map(b => ({ id: b.id, name: b.name }))} />
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
