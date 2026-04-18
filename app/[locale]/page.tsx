import { DailyLogForm } from "@/components/DailyLogForm";
import { db } from "@/db";
import { batches, sales, expenses, dailyLogs, inventory } from "@/db/schema";
import { eq, sql, desc, gte } from "drizzle-orm";
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { PageHeader } from '@/components/PageHeader';
import { DashboardCharts } from "@/components/DashboardCharts";
import { TrendingUp, TrendingDown, Users, Package, Bird, AlertCircle } from "lucide-react";

export default async function Home(props: { searchParams: Promise<{ range?: string }> }) {
  const searchParams = await props.searchParams;
  const range = searchParams.range || '7d';
  const t = await getTranslations('Dashboard');
  const ts = await getTranslations('Sales');
  const ti = await getTranslations('Inventory');
  
  // 1. Fetch Active Batches
  const activeBatches = await db
    .select({ id: batches.id, name: batches.name, initialQuantity: batches.initialQuantity })
    .from(batches)
    .where(eq(batches.status, "active"));

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

  const feedResult = await db.select({ sum: sql<number>`sum(${dailyLogs.feedConsumed})` }).from(dailyLogs);
  const totalFeed = feedResult[0]?.sum || 0;

  // 4. Stock Alerts (Low stock < 5 units)
  const lowStock = await db.select().from(inventory).where(sql`${inventory.quantity} < 5`);

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
    <main className="flex-1 p-6 md:p-12 max-w-lg mx-auto w-full pb-32">
      <div className="space-y-10">
        <PageHeader title="EL BARAKA" subtitle={t('subtitle')} />

        {/* Filters */}
        <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl w-fit">
          {[
            { id: '7d', label: '7D' },
            { id: '30d', label: '30D' },
            { id: 'all', label: 'ALL' }
          ].map((f) => (
            <Link 
              key={f.id}
              href={`?range=${f.id}`}
              className={`px-4 py-2 rounded-xl text-[10px] font-black transition-all ${
                range === f.id ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-400'
              }`}
            >
              {f.label}
            </Link>
          ))}
        </div>

        {/* Financial Overview */}
        <div className="grid grid-cols-1 gap-4">
          <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden group">
            <div className="absolute right-0 top-0 w-32 h-32 bg-white/5 rounded-full -mr-10 -mt-10 blur-3xl group-hover:bg-white/10 transition-colors"></div>
            <div className="flex items-center gap-3 mb-4 opacity-60">
              <TrendingUp className="w-4 h-4 text-orange-400" />
              <span className="text-[10px] font-black uppercase tracking-widest">{t('revenue')}</span>
            </div>
            <h2 className="text-4xl font-[1000] tracking-tighter mb-1">{totalRevenue.toLocaleString()} <span className="text-xl text-orange-400">{ts('currency')}</span></h2>
            
            <div className="mt-8 grid grid-cols-2 gap-4 border-t border-white/5 pt-6">
               <div className="flex flex-col">
                  <span className="text-[9px] font-black opacity-40 uppercase tracking-widest mb-1">{t('expenses')}</span>
                  <span className="text-lg font-black text-slate-300">-{totalExpenses.toLocaleString()}</span>
               </div>
               <div className="flex flex-col">
                  <span className="text-[9px] font-black opacity-40 uppercase tracking-widest mb-1 text-red-400">{ts('debt')}</span>
                  <span className="text-lg font-black text-red-400/80">{totalDebt.toLocaleString()}</span>
               </div>
            </div>
          </div>

          <div className="bg-orange-500 p-8 rounded-[2.5rem] text-white shadow-xl shadow-orange-100 relative overflow-hidden">
             <div className="absolute right-0 bottom-0 w-24 h-24 bg-white/10 rounded-full -mr-8 -mb-8 blur-2xl"></div>
             <p className="text-[10px] font-black opacity-60 uppercase tracking-widest mb-2">{t('cashOnHand')}</p>
             <h3 className="text-3xl font-[1000] tracking-tighter">{cashOnHand.toLocaleString()} <span className="text-base font-black opacity-60">{ts('currency')}</span></h3>
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center mb-4">
                  <AlertCircle className="w-5 h-5 text-red-500" />
                </div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{t('mortalityRate')}</p>
                <p className="text-2xl font-[1000] text-slate-900 tracking-tighter">{mortalityRate}%</p>
             </div>
             <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center mb-4">
                  <Package className="w-5 h-5 text-orange-500" />
                </div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{ti('feed')}</p>
                <p className="text-2xl font-[1000] text-slate-900 tracking-tighter">{totalFeed}<span className="text-xs ml-1 opacity-40">KG</span></p>
             </div>
          </div>
        </div>

        {/* Stock Alerts */}
        {lowStock.length > 0 && (
          <div className="bg-red-50 p-6 rounded-[2rem] border border-red-100 space-y-4">
             <div className="flex items-center gap-2 text-red-600">
                <AlertCircle className="w-5 h-5" />
                <span className="text-xs font-black uppercase tracking-widest">Alertes Stock Bas</span>
             </div>
             <div className="space-y-2">
                {lowStock.map(item => (
                  <div key={item.id} className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-red-50">
                    <span className="font-bold text-slate-700">{item.name}</span>
                    <span className="text-red-500 font-black">{item.quantity} {item.unit}</span>
                  </div>
                ))}
             </div>
          </div>
        )}

        <section className="animate-in fade-in slide-in-from-bottom-4 duration-700">
          <DashboardCharts 
            data={chartData} 
            t={{ 
              performance: t('performance'),
              revenue: t('revenue'),
              expenses: t('expenses')
            }} 
          />
        </section>

        <section className="animate-in fade-in slide-in-from-bottom-8 duration-700">
          <DailyLogForm batches={activeBatches.map(b => ({ id: b.id, name: b.name }))} />
        </section>
        
        {activeBatches.length === 0 && (
          <div className="bg-orange-500 p-8 rounded-[2.5rem] text-white shadow-2xl shadow-orange-200 relative overflow-hidden">
             <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>
            <p className="font-black text-xl mb-2">{t('welcome')}</p>
            <p className="text-orange-50 font-bold text-sm leading-relaxed opacity-90">
              {t('welcomeMessage')}
            </p>
            <Link href="/batches" className="mt-6 w-full h-12 bg-white text-orange-600 rounded-2xl font-black text-sm uppercase tracking-wider active:scale-95 transition-all flex items-center justify-center">
              {t('addFirstBatch')}
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
