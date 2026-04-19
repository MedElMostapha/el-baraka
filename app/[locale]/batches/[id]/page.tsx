import { db } from "@/db";
import { batches, dailyLogs, sales, expenses } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { getTranslations } from 'next-intl/server';
import { notFound } from "next/navigation";
import BatchDetailClient from "@/components/BatchDetailClient";

export default async function BatchDetailServerPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  
  const t = await getTranslations('BatchDetails');
  const tSales = await getTranslations('Sales');

  const batch = await db.query.batches.findFirst({
    where: eq(batches.id, id),
  });

  if (!batch) {
    return notFound();
  }

  const logs = await db
    .select()
    .from(dailyLogs)
    .where(eq(dailyLogs.batchId, id))
    .orderBy(desc(dailyLogs.date));

  const batchSales = await db
    .select()
    .from(sales)
    .where(eq(sales.batchId, id))
    .orderBy(desc(sales.date));

  const batchExpenses = await db
    .select()
    .from(expenses)
    .where(eq(expenses.batchId, id))
    .orderBy(desc(expenses.date));

  // Calculations
  const totalMortality = logs.reduce((sum, log) => sum + log.mortality, 0);
  const totalSold = batchSales.reduce((sum, sale) => sum + sale.quantity, 0);
  const remainingQuantity = batch.initialQuantity - totalMortality - totalSold;
  
  const totalRevenue = batchSales.reduce((sum, sale) => sum + sale.totalPrice, 0);
  const totalBatchExpenses = batchExpenses.reduce((sum, exp) => sum + exp.amount, 0);
  const initialInvestment = batch.initialQuantity * batch.costPerChick;
  const netProfit = totalRevenue - totalBatchExpenses - initialInvestment;

  const totalFeed = logs.reduce((sum, log) => sum + log.feedConsumed, 0);
  
  const mortalityRate = (totalMortality / batch.initialQuantity) * 100;
  
  // Safe days active calculation
  const arrivalTimestamp = new Date(batch.arrivalDate).getTime();
  const currentTimestamp = new Date().getTime();
  const daysActive = Math.max(0, Math.ceil((currentTimestamp - arrivalTimestamp) / (1000 * 60 * 60 * 24)));

  const translations = {
    title: t('title'),
    back: t('back'),
    stats: t('stats'),
    financials: t('financials'),
    activity: t('activity'),
    totalSales: t('totalSales'),
    totalExpenses: t('totalExpenses'),
    netProfit: t('netProfit'),
    investment: t('investment'),
    mortality: t('mortality'),
    feedConsumption: t('feedConsumption'),
    performance: t('performance'),
    daysSinceArrival: t('daysSinceArrival'),
    perUnit: t('perUnit'),
    salesList: t('salesList'),
    expensesList: t('expensesList'),
    logsList: t('logsList'),
    noActivity: t('noActivity'),
    remaining: t('remaining'),
    chicks: t('chicks'),
    mortalityRate: t('mortalityRate'),
    avgPrice: t('avgPrice'),
    feedPerBird: t('feedPerBird'),
    currency: tSales('currency'),
    statusActive: t('statusActive'),
    statusClosed: t('statusClosed'),
    distribution: t('distribution'),
    activityTrend: t('activityTrend'),
    economicSummary: t('economicSummary'),
    profit: t('profit'),
    loss: t('loss'),
    salesLabel: t('salesLabel'),
    expensesLabel: t('expensesLabel'),
    feedLabel: t('feedLabel'),
    mortalityLabel: t('mortalityLabel'),
  };

  return (
    <BatchDetailClient 
      batch={batch}
      logs={logs}
      sales={batchSales}
      expenses={batchExpenses}
      stats={{
        totalMortality,
        totalSold,
        remainingQuantity,
        totalRevenue,
        totalBatchExpenses,
        initialInvestment,
        netProfit,
        totalFeed,
        mortalityRate,
        daysActive
      }}
      t={translations}
    />
  );
}
