export interface DashboardInputBatch {
  id: string;
  name: string;
  initialQuantity: number;
  costPerChick: number;
  status: string;
}

export interface DashboardInputSale {
  id: string;
  batchId: string;
  date: string;
  quantity: number;
  totalPrice: number;
  amountPaid: number;
}

export interface DashboardInputDailyLog {
  id: string;
  batchId: string;
  mortality: number;
}

export interface DashboardInputExpense {
  id: string;
  date: string;
  amount: number;
}

export interface DashboardInputInventory {
  id: string;
  category: string;
  quantity: number;
  unit: string;
}

export interface DashboardInputRestock {
  id: string;
  quantity: number;
  costPerChick: number;
}

export interface DashboardInput {
  batches: DashboardInputBatch[];
  sales: DashboardInputSale[];
  dailyLogs: DashboardInputDailyLog[];
  expenses: DashboardInputExpense[];
  inventory: DashboardInputInventory[];
  restocks: DashboardInputRestock[];
}

export interface ActiveBatchStats {
  id: string;
  name: string;
  mortality: number;
  sold: number;
  remainingQuantity: number;
}

export interface DashboardComputed {
  activeBatches: ActiveBatchStats[];
  activeBatchIds: string[];
  activeBirdCount: number;
  totalRevenue: number;
  totalExpenses: number;
  totalDebt: number;
  totalPaid: number;
  cashOnHand: number;
  netProfit: number;
  mortalityRate: string | null;
  totalFeedKg: number;
  lowStock: boolean;
  chartData: Array<{ date: string; revenue: number; expenses: number }>;
}

function parseDate(value: string): Date {
  return new Date(value);
}

function dateKey(date: Date): string {
  return date.toLocaleDateString(undefined, { day: '2-digit', month: 'short' });
}

export function computeDashboard(input: DashboardInput, kgPerSac: number, range: string, now = new Date()): DashboardComputed {
  const activeBatches = input.batches
    .filter((b) => b.status === 'active')
    .map((b) => {
      const mortality = input.dailyLogs
        .filter((l) => l.batchId === b.id)
        .reduce((sum, l) => sum + l.mortality, 0);
      const sold = input.sales
        .filter((s) => s.batchId === b.id)
        .reduce((sum, s) => sum + s.quantity, 0);
      return {
        id: b.id,
        name: b.name,
        mortality,
        sold,
        remainingQuantity: Math.max(0, b.initialQuantity - mortality - sold),
      };
    });

  const activeBirdCount = activeBatches.reduce((sum, b) => sum + b.remainingQuantity, 0);

  const totalRevenue = input.sales.reduce((sum, s) => sum + s.totalPrice, 0);
  const totalExpenses = input.expenses.reduce((sum, e) => sum + e.amount, 0);
  const totalDebt = input.sales.reduce((sum, s) => sum + Math.max(0, s.totalPrice - s.amountPaid), 0);
  const totalPaid = input.sales.reduce((sum, s) => sum + s.amountPaid, 0);
  const cashOnHand = totalPaid - totalExpenses;

  const restockCost = input.restocks.reduce((sum, r) => sum + r.quantity * r.costPerChick, 0);
  const batchCost = input.batches.reduce((sum, b) => sum + b.initialQuantity * b.costPerChick, 0);
  const birdCost = restockCost > 0 ? restockCost : batchCost;
  const netProfit = totalRevenue - totalExpenses - birdCost;

  const totalMortality = input.dailyLogs.reduce((sum, l) => sum + l.mortality, 0);
  const totalBirds = input.batches.reduce((sum, b) => sum + b.initialQuantity, 0);
  const mortalityRate = totalBirds > 0 ? ((totalMortality / totalBirds) * 100).toFixed(1) : null;

  const feedItems = input.inventory.filter((i) => i.category === 'feed');
  const totalFeedKg = feedItems.reduce((sum, i) => sum + toKg(i.quantity, i.unit, kgPerSac), 0);
  const lowStock = feedItems.length > 0 && totalFeedKg < 5;

  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  let startDate = new Date(todayStart);
  let days = 7;

  if (range === '30d') {
    startDate.setDate(todayStart.getDate() - 29);
    days = 30;
  } else if (range === 'all') {
    startDate = new Date(0);
  } else {
    startDate.setDate(todayStart.getDate() - 6);
    days = 7;
  }

  const recentSales = input.sales.filter((s) => parseDate(s.date).getTime() >= startDate.getTime());
  const recentExpenses = input.expenses.filter((e) => parseDate(e.date).getTime() >= startDate.getTime());

  if (range === 'all') {
    const earliest = [...recentSales, ...recentExpenses]
      .map((entry) => parseDate(entry.date).getTime())
      .sort((a, b) => a - b)[0];
    if (earliest) {
      const earliestStart = new Date(earliest);
      earliestStart.setHours(0, 0, 0, 0);
      days = Math.max(1, Math.floor((todayStart.getTime() - earliestStart.getTime()) / 86400000) + 1);
    }
  }

  const chartDataMap: Record<string, { revenue: number; expenses: number }> = {};
  for (let i = 0; i < days; i++) {
    const d = new Date(todayStart);
    d.setDate(d.getDate() - i);
    const key = dateKey(d);
    chartDataMap[key] = { revenue: 0, expenses: 0 };
  }

  recentSales.forEach((s) => {
    const key = dateKey(parseDate(s.date));
    if (chartDataMap[key]) chartDataMap[key].revenue += s.totalPrice;
  });
  recentExpenses.forEach((e) => {
    const key = dateKey(parseDate(e.date));
    if (chartDataMap[key]) chartDataMap[key].expenses += e.amount;
  });

  const chartData = Object.entries(chartDataMap)
    .map(([date, vals]) => ({ date, ...vals }))
    .reverse();

  return {
    activeBatches,
    activeBatchIds: activeBatches.map((b) => b.id),
    activeBirdCount,
    totalRevenue,
    totalExpenses,
    totalDebt,
    totalPaid,
    cashOnHand,
    netProfit,
    mortalityRate,
    totalFeedKg,
    lowStock,
    chartData,
  };
}

function toKg(quantity: number, unit: string, kgPerSac: number): number {
  if ((unit === 'sac' || unit === 'bag') && kgPerSac > 0) return quantity * kgPerSac;
  if (unit === 'g') return quantity / 1000;
  if (unit === 'kg') return quantity;
  return 0;
}
