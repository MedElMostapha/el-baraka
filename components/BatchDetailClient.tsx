"use client";

import React, { useState, useEffect, useRef } from 'react';
import { 
  Bird, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  ShoppingCart, 
  Activity, 
  Skull, 
  Utensils, 
  Calendar, 
  ArrowLeft,
  PieChart as PieChartIcon,
  BarChart3,
  CheckCircle2,
  XCircle,
  Package,
  Plus
} from "lucide-react";
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/PageHeader';
import { updateBatch } from '@/actions/batch';
import { Modal } from '@/components/Modal';
import { Pagination } from '@/components/Pagination';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';

interface Batch {
  id: string;
  name: string;
  breed: string | null;
  arrivalDate: Date;
  initialQuantity: number;
  costPerChick: number;
  feedStock: number;
  status: string;
}

interface Stats {
  totalMortality: number;
  totalSold: number;
  remainingQuantity: number;
  totalRevenue: number;
  totalBatchExpenses: number;
  initialInvestment: number;
  netProfit: number;
  totalFeed: number;
  mortalityRate: number;
  daysActive: number;
}

interface BatchDetailClientProps {
  batch: Batch;
  logs: any[];
  sales: any[];
  expenses: any[];
  stats: Stats;
  t: any;
}

const COLORS = ['#f97316', '#64748b', '#ef4444'];
const ACTIVITY_PAGE_SIZE = 5;

function formatBreed(breed: string | null, t: any): string {
  if (!breed) return '--';
  const map: Record<string, string> = {
    broiler: t.breedBroiler,
    layer: t.breedLayer,
    other: t.breedOther,
  };
  return map[breed] || breed;
}

export default function BatchDetailClient({ batch, logs, sales, expenses, stats, t }: BatchDetailClientProps) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [isUpdating, setIsUpdating] = useState(false);
  const [showRechargeModal, setShowRechargeModal] = useState(false);
  const [rechargeAmount, setRechargeAmount] = useState('');
  const [salesPage, setSalesPage] = useState(1);
  const [expensesPage, setExpensesPage] = useState(1);

  const handleRecharge = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(rechargeAmount);
    if (!amount || amount <= 0) return;
    
    setIsUpdating(true);
    await updateBatch(batch.id, { feedStock: (batch.feedStock || 0) + amount });
    setRechargeAmount('');
    setShowRechargeModal(false);
    setIsUpdating(false);
    router.refresh();
  };

  const toggleStatus = async () => {
    setIsUpdating(true);
    const newStatus = batch.status === 'active' ? 'closed' : 'active';
    await updateBatch(batch.id, { status: newStatus });
    setIsUpdating(false);
    router.refresh();
  };

  useEffect(() => {
    setMounted(true);
    
    const observeTarget = containerRef.current;
    if (!observeTarget) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          setDimensions({ width, height });
        }
      }
    });

    resizeObserver.observe(observeTarget);
    return () => resizeObserver.disconnect();
  }, []);

  const safeDaysActive = Math.max(0, stats.daysActive);

  const pieData = [
    { name: t.totalSales, value: stats.totalSold },
    { name: t.remaining, value: stats.remainingQuantity },
    { name: t.mortality, value: stats.totalMortality },
  ].filter(d => d.value > 0);

  if (pieData.length === 0) {
    pieData.push({ name: t.remaining, value: batch.initialQuantity });
  }

  const activityData = [...logs].reverse().map(log => ({
    date: new Date(log.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }),
    mortality: log.mortality,
    feed: log.feedConsumed,
  }));

  const salesPageCount = Math.max(1, Math.ceil(sales.length / ACTIVITY_PAGE_SIZE));
  const currentSalesPage = Math.min(salesPage, salesPageCount);
  const visibleSales = sales.slice(
    (currentSalesPage - 1) * ACTIVITY_PAGE_SIZE,
    currentSalesPage * ACTIVITY_PAGE_SIZE,
  );
  const expensesPageCount = Math.max(1, Math.ceil(expenses.length / ACTIVITY_PAGE_SIZE));
  const currentExpensesPage = Math.min(expensesPage, expensesPageCount);
  const visibleExpenses = expenses.slice(
    (currentExpensesPage - 1) * ACTIVITY_PAGE_SIZE,
    currentExpensesPage * ACTIVITY_PAGE_SIZE,
  );

  return (
    <main className="page-container" ref={containerRef}>
      <div className="page-stack">
        <button 
          onClick={() => router.back()}
          className="button-secondary w-fit"
        >
          <ArrowLeft className="w-4 h-4" />
          {t.back}
        </button>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <PageHeader 
            title={batch.name === 'lot' ? t.batchName : batch.name} 
            subtitle={`${formatBreed(batch.breed, t)} • ${new Date(batch.arrivalDate).toLocaleDateString()}`} 
          />
          <div className="flex items-center gap-3">
            <button 
              onClick={toggleStatus}
              disabled={isUpdating}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest shadow-sm transition-all active:scale-95 ${
                batch.status === 'active' 
                  ? 'bg-orange-500 text-white hover:bg-orange-600' 
                  : 'bg-emerald-500 text-white hover:bg-emerald-600'
              } disabled:opacity-50`}
            >
              {batch.status === 'active' ? <XCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
              {batch.status === 'active' ? t.statusActive : t.statusClosed}
            </button>
            <div className="bg-white px-4 py-1.5 rounded-full border border-slate-100 shadow-sm text-xs font-black text-slate-400 uppercase tracking-widest">
              {safeDaysActive} {t.daysSinceArrival}
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <StatCard 
            icon={<DollarSign className="w-5 h-5" />} 
            label={t.netProfit} 
            value={`${stats.netProfit.toLocaleString()} ${t.currency}`}
            trend={stats.netProfit >= 0 ? 'up' : 'down'}
            trendLabel={stats.netProfit >= 0 ? t.profit : t.loss}
            color={stats.netProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}
            bgColor={stats.netProfit >= 0 ? 'bg-emerald-50' : 'bg-red-50'}
          />
          <StatCard 
            icon={<Bird className="w-5 h-5" />} 
            label={t.remaining} 
            value={stats.remainingQuantity}
            subtext={`${t.chicks}`}
            color="text-orange-600"
            bgColor="bg-orange-50"
          />
          <StatCard 
            icon={<Skull className="w-5 h-5" />} 
            label={t.mortalityRate} 
            value={`${stats.mortalityRate.toFixed(1)}%`}
            subtext={`${stats.totalMortality} ${t.chicks}`}
            color="text-slate-600"
            bgColor="bg-slate-50"
          />
          <StatCard 
            icon={<Utensils className="w-5 h-5" />} 
            label={t.feedConsumption} 
            value={stats.totalFeed}
            subtext="kg"
            color="text-blue-600"
            bgColor="bg-blue-50"
          />
          <div className="metric-card group relative space-y-3">
            <div className="metric-card__icon" style={{ background: 'var(--orange-soft)', color: 'var(--orange)' }}>
              <Package className="w-5 h-5" />
            </div>
            <div>
              <p className="metric-card__label mt-0">Stock Restant</p>
              <div className="flex items-baseline gap-1">
                <span className={`text-lg font-black ${((batch.feedStock || 0) - stats.totalFeed) <= 0 ? 'text-red-500' : 'text-orange-600'}`}>
                  {((batch.feedStock || 0) - stats.totalFeed).toFixed(1)}
                </span>
                <span className="text-[10px] font-bold text-slate-400 uppercase">kg</span>
              </div>
            </div>
            {batch.status === 'active' && (
              <button 
                onClick={() => setShowRechargeModal(true)}
                className="absolute top-4 right-4 w-8 h-8 bg-slate-50 text-slate-400 hover:bg-orange-500 hover:text-white rounded-full flex items-center justify-center transition-all opacity-0 group-hover:opacity-100"
              >
                <Plus className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Inventory Distribution */}
           <div className="panel space-y-4 p-6 md:col-span-1">
            <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-tight text-slate-800">
              <PieChartIcon className="w-4 h-4 text-orange-500" />
              {t.distribution}
            </h3>
            <div className="h-[200px] w-full relative">
              {mounted && dimensions.width > 0 && (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="space-y-2">
              {pieData.map((entry, index) => (
                <div key={entry.name} className="flex justify-between items-center text-xs font-bold">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                    <span className="text-slate-500 uppercase">{entry.name}</span>
                  </div>
                  <span className="text-slate-800">{entry.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Activity Over Time */}
          <div className="panel space-y-4 p-6 md:col-span-2">
            <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-tight text-slate-800">
              <Activity className="w-4 h-4 text-blue-500" />
              {t.activityTrend}
            </h3>
            <div className="h-[250px] w-full relative">
              {mounted && dimensions.width > 0 && (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={activityData}>
                    <defs>
                      <linearGradient id="colorFeed" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    />
                    <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em' }} />
                    <Area type="monotone" dataKey="feed" name={t.feedLabel} stroke="#3b82f6" fillOpacity={1} fill="url(#colorFeed)" strokeWidth={3} />
                    <Area type="monotone" dataKey="mortality" name={t.mortalityLabel} stroke="#ef4444" fill="transparent" strokeWidth={2} strokeDasharray="5 5" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>

        {/* Financial Breakdown */}
        <div className="overflow-hidden rounded-[22px] bg-[#173b35] p-8 text-white shadow-xl shadow-slate-200">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-orange-400" />
            </div>
            <div>
              <h2 className="text-xl font-black">{t.financials}</h2>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">{t.economicSummary}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="space-y-1">
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">{t.investment}</p>
              <p className="text-2xl font-black">-{stats.initialInvestment.toLocaleString()} <span className="text-sm font-bold text-slate-500">{t.currency}</span></p>
            </div>
            <div className="space-y-1">
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">{t.totalExpenses}</p>
              <p className="text-2xl font-black">-{stats.totalBatchExpenses.toLocaleString()} <span className="text-sm font-bold text-slate-500">{t.currency}</span></p>
            </div>
            <div className="space-y-1">
              <p className="text-orange-400 text-[10px] font-black uppercase tracking-widest">{t.totalSales}</p>
              <p className="text-2xl font-black">+{stats.totalRevenue.toLocaleString()} <span className="text-sm font-bold text-orange-900/50">{t.currency}</span></p>
            </div>
          </div>

          <div className="mt-10 pt-10 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-6">
            <div>
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">{t.netProfit}</p>
              <p className={`text-4xl font-black ${stats.netProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {stats.netProfit > 0 ? '+' : ''}{stats.netProfit.toLocaleString()} <span className="text-lg">{t.currency}</span>
              </p>
            </div>
            <div className="flex gap-4">
              <div className="bg-white/5 px-6 py-4 rounded-3xl border border-white/10 text-center">
                <p className="text-slate-400 text-[9px] font-black uppercase tracking-widest mb-1">{t.avgPrice}</p>
                <p className="font-black text-lg">{(stats.totalSold > 0 ? stats.totalRevenue / stats.totalSold : 0).toFixed(1)}</p>
              </div>
              <div className="bg-white/5 px-6 py-4 rounded-3xl border border-white/10 text-center">
                <p className="text-slate-400 text-[9px] font-black uppercase tracking-widest mb-1">{t.feedPerBird}</p>
                <p className="font-black text-lg">{(stats.totalFeed / batch.initialQuantity).toFixed(2)} <span className="text-xs text-slate-500">kg</span></p>
              </div>
            </div>
          </div>
        </div>

        {/* Lists Tabs */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black text-slate-800">{t.activity}</h2>
            <div className="flex gap-2">
              <span className="bg-white border border-slate-100 px-4 py-1.5 rounded-full text-[10px] font-black uppercase text-slate-400 shadow-sm">
                {sales.length} {t.salesLabel}
              </span>
              <span className="bg-white border border-slate-100 px-4 py-1.5 rounded-full text-[10px] font-black uppercase text-slate-400 shadow-sm">
                {expenses.length} {t.expensesLabel}
              </span>
            </div>
          </div>

          <div className="space-y-3">
             {sales.length === 0 && expenses.length === 0 && logs.length === 0 ? (
               <div className="empty-state">
                 <p className="text-slate-400 font-bold">{t.noActivity}</p>
               </div>
             ) : (
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 {/* Recent Sales */}
                 <div className="space-y-3">
                   <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest ml-4">{t.salesList}</h3>
                    {visibleSales.map(sale => (
                      <div key={sale.id} className="record-card flex items-center justify-between">
                       <div className="flex items-center gap-3">
                         <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                           <ShoppingCart className="w-5 h-5" />
                         </div>
                         <div>
                           <p className="font-bold text-slate-800 text-sm">{sale.quantity} {t.chicks}</p>
                           <p className="text-[10px] font-bold text-slate-400 uppercase">{new Date(sale.date).toLocaleDateString()}</p>
                         </div>
                       </div>
                       <p className="font-black text-slate-800">{sale.totalPrice} <span className="text-[10px] text-slate-400">{t.currency}</span></p>
                      </div>
                    ))}
                    <Pagination page={currentSalesPage} pageCount={salesPageCount} onPageChange={setSalesPage} />
                  </div>

                 {/* Recent Expenses */}
                 <div className="space-y-3">
                   <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest ml-4">{t.expensesList}</h3>
                    {visibleExpenses.map(exp => (
                      <div key={exp.id} className="record-card flex items-center justify-between">
                       <div className="flex items-center gap-3">
                         <div className="w-10 h-10 bg-red-50 text-red-600 rounded-xl flex items-center justify-center">
                           <TrendingDown className="w-5 h-5" />
                         </div>
                         <div>
                           <p className="font-bold text-slate-800 text-sm truncate max-w-[120px]">{exp.category}</p>
                           <p className="text-[10px] font-bold text-slate-400 uppercase">{new Date(exp.date).toLocaleDateString()}</p>
                         </div>
                       </div>
                       <p className="font-black text-slate-800">{exp.amount} <span className="text-[10px] text-slate-400">{t.currency}</span></p>
                      </div>
                    ))}
                    <Pagination page={currentExpensesPage} pageCount={expensesPageCount} onPageChange={setExpensesPage} />
                  </div>
               </div>
             )}
          </div>
        </div>
      </div>

      <Modal 
        isOpen={showRechargeModal} 
        onClose={() => setShowRechargeModal(false)} 
        title="Recharger le Stock d'Aliment"
      >
        <form onSubmit={handleRecharge} className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase">Quantité à ajouter (kg)</label>
            <input 
              type="number" 
              step="0.1"
              value={rechargeAmount}
              onChange={(e) => setRechargeAmount(e.target.value)}
              className="w-full h-12 px-4 rounded-xl border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none transition-all"
              placeholder="ex: 50"
              autoFocus
            />
          </div>
          <button 
            type="submit" 
            disabled={isUpdating || !rechargeAmount}
            className="w-full h-12 bg-slate-900 text-white rounded-xl font-black uppercase tracking-wider hover:bg-black transition-all active:scale-95 disabled:opacity-50"
          >
            {isUpdating ? 'Chargement...' : 'Confirmer la recharge'}
          </button>
        </form>
      </Modal>
    </main>
  );
}

function StatCard({ icon, label, value, subtext, trend, trendLabel, color, bgColor }: any) {
  return (
    <div className="metric-card space-y-3">
      <div className={`metric-card__icon ${bgColor} ${color}`}>
        {icon}
      </div>
      <div>
        <p className="metric-card__label mt-0">{label}</p>
        <div className="flex items-baseline gap-1">
          <span className={`text-lg font-black ${color}`}>{value}</span>
          {subtext && <span className="text-[10px] font-bold text-slate-400 uppercase">{subtext}</span>}
        </div>
      </div>
      {trend && (
        <div className={`flex items-center gap-1 text-[10px] font-bold ${trend === 'up' ? 'text-emerald-500' : 'text-red-500'}`}>
          {trend === 'up' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {trendLabel}
        </div>
      )}
    </div>
  );
}
