import { DailyLogForm } from "@/components/DailyLogForm";
import { db } from "@/db";
import { batches, sales, expenses, dailyLogs, inventory } from "@/db/schema";
import { eq, sql, desc, gte } from "drizzle-orm";
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { PageHeader } from '@/components/PageHeader';
import { DashboardCharts } from "@/components/DashboardCharts";
import { TrendingUp, Package, Bird, AlertCircle } from "lucide-react";
import { getKgPerSac } from '@/actions/settings';

function toKg(quantity: number, unit: string, kgPerSac: number): number {
  if (unit === 'sac' && kgPerSac > 0) return quantity * kgPerSac;
  return quantity;
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
  const activeBirdCount = activeBatches.reduce((sum, batch) => sum + batch.initialQuantity, 0);

  // 2. Financial Metrics
  const revenueResult = await db.select({ sum: sql<number>`sum(${sales.totalPrice})` }).from(sales);
  const expensesResult = await db.select({ sum: sql<number>`sum(${expenses.amount})` }).from(expenses);
  const debtResult = await db.select({ sum: sql<number>`sum(${sales.totalPrice} - ${sales.amountPaid})` }).from(sales);
  const paidResult = await db.select({ sum: sql<number>`sum(${sales.amountPaid})` }).from(sales);

  const totalRevenue = revenueResult[0]?.sum || 0;
  const totalExpenses = expensesResult[0]?.sum || 0;
  const totalDebt = debtResult[0]?.sum || 0;
  const totalPaid = paidResult[0]?.sum || 0;
  const cashOnHand = totalPaid - totalExpenses;

  // 3. Performance Stats
  const mortalityResult = await db.select({ sum: sql<number>`sum(${dailyLogs.mortality})` }).from(dailyLogs);
  const totalMortality = mortalityResult[0]?.sum || 0;

  const totalBirdsEver = await db.select({ sum: sql<number>`sum(${batches.initialQuantity})` }).from(batches);
  const totalBirds = totalBirdsEver[0]?.sum || 1;
  const mortalityRate = ((totalMortality / totalBirds) * 100).toFixed(1);

  const allInventory = await db.select().from(inventory);
  const feedItems = allInventory.filter(i => i.category === 'feed');
  const totalFeed = feedItems.reduce((sum, i) => sum + toKg(i.quantity, i.unit, kgPerSac), 0);

  // 4. Stock Alerts (Group by category with kg-normalized quantities)
  const groupedByCategory = allInventory.reduce<Record<string, { totalKg: number, units: string[] }>>((acc, i) => {
    if (!acc[i.category]) acc[i.category] = { totalKg: 0, units: [] };
    acc[i.category].totalKg += toKg(i.quantity, i.unit, kgPerSac);
    acc[i.category].units.push(i.unit);
    return acc;
  }, {});
  const lowStockGrouped = Object.entries(groupedByCategory)
    .filter(([, v]) => v.totalKg < 5)
    .map(([category, v]) => ({
      category,
      totalQuantity: v.totalKg,
      unit: v.units.includes('sac') ? 'kg' : v.units[0],
    }));

  // 5. Chart Data Logic based on Range
  const now = new Date();
  let startDate = new Date();
  let days = 7;

  if (range === '30d') { startDate.setDate(now.getDate() - 30); days = 30; }
  else if (range === 'all') { startDate = new Date(0); days = 30; } // Fallback to 30 for chart viz
  else { startDate.setDate(now.getDate() - 7); days = 7; }

  const recentSales = await db.select().from(sales).where(gte(sales.date, startDate));
  const recentExpenses = await db.select().from(expenses).where(gte(expenses.date, startDate));

  const chartDataMap: Record<string, { revenue: number, expenses: number }> = {};
  for (let i = 0; i < days; i++) {
    const d = new Date();
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
                    {ti(item.category)}
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
            <p className="dashboard-hero__note">
              {t('cashOnHand')}: {cashOnHand.toLocaleString()} {ts('currency')} · {totalDebt.toLocaleString()} {ts('debt')}
            </p>
          </div>
          <div className="dashboard-hero__aside">
            <div className="dashboard-hero__stat">
              <span className="dashboard-hero__stat-label">{t('cashOnHand')}</span>
              <strong className="dashboard-hero__stat-value">{cashOnHand.toLocaleString()} {ts('currency')}</strong>
            </div>
            <div className="dashboard-hero__stat">
              <span className="dashboard-hero__stat-label">{t('activeBatches')}</span>
              <strong className="dashboard-hero__stat-value">{activeBatches.length} · {activeBirdCount}</strong>
            </div>
            <div className="dashboard-hero__stat">
              <span className="dashboard-hero__stat-label">{t('expenses')}</span>
              <strong className="dashboard-hero__stat-value">-{totalExpenses.toLocaleString()} {ts('currency')}</strong>
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
          </div>
          <div className="metric-card">
            <div className="metric-card__icon" style={{ background: 'var(--red-soft)', color: 'var(--red)' }}>
              <AlertCircle className="h-4 w-4" />
            </div>
            <span className="metric-card__label">{t('mortalityRate')}</span>
            <strong className="metric-card__value">{mortalityRate}%</strong>
          </div>
          <div className="metric-card">
            <div className="metric-card__icon" style={{ background: 'var(--blue-soft)', color: 'var(--blue)' }}>
              <Package className="h-4 w-4" />
            </div>
            <span className="metric-card__label">{ti('feed')}</span>
            <strong className="metric-card__value">{Math.round(totalFeed)} <small>kg</small></strong>
          </div>
          <div className="metric-card">
            <div className="metric-card__icon" style={{ background: 'var(--pine-soft)', color: 'var(--pine)' }}>
              <TrendingUp className="h-4 w-4" />
            </div>
            <span className="metric-card__label">{t('expenses')}</span>
            <strong className="metric-card__value">{totalExpenses.toLocaleString()} <small>{ts('currency')}</small></strong>
          </div>
        </section>

        <div className="dashboard-lower-grid">
          <DashboardCharts
            data={chartData}
            t={{
              performance: t('performance'),
              revenue: t('revenue'),
              expenses: t('expenses')
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
