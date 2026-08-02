import { db } from "@/db";
import { batches, dailyLogs, sales, expenses, restocks } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { getTranslations } from 'next-intl/server';
import { notFound } from "next/navigation";
import BatchDetailClient from "@/components/BatchDetailClient";
import { getKgPerSac } from '@/actions/settings';

export default async function BatchDetailServerPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;

  const t = await getTranslations('BatchDetails');
  const tBatches = await getTranslations('Batches');
  const tSales = await getTranslations('Sales');
  const kgPerSac = await getKgPerSac();

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

  const batchRestocks = await db
    .select()
    .from(restocks)
    .where(eq(restocks.batchId, id))
    .orderBy(desc(restocks.date));

  // Calculations
  const birdsPlaced = batchRestocks.length > 0
    ? batchRestocks.reduce((sum, restock) => sum + restock.quantity, 0)
    : batch.initialQuantity;
  const totalMortality = logs.reduce((sum, log) => sum + log.mortality, 0);
  const totalSold = batchSales.reduce((sum, sale) => sum + sale.quantity, 0);
  const remainingQuantity = Math.max(0, birdsPlaced - totalMortality - totalSold);

  const totalRevenue = batchSales.reduce((sum, sale) => sum + sale.totalPrice, 0);
  const totalBatchExpenses = batchExpenses.reduce((sum, exp) => sum + exp.amount, 0);
  const initialInvestment = batchRestocks.length > 0
    ? batchRestocks.reduce((sum, restock) => sum + restock.quantity * restock.costPerChick, 0)
    : batch.initialQuantity * batch.costPerChick;
  const netProfit = totalRevenue - totalBatchExpenses - initialInvestment;

  const totalFeedFromLogs = logs.reduce((sum, log) => sum + log.feedConsumed, 0);
  const totalFeedFromSales = batchSales.reduce((sum, sale) => sum + sale.feedConsumedBags * kgPerSac, 0);
  const totalFeed = totalFeedFromLogs + totalFeedFromSales;

  const mortalityRate = birdsPlaced > 0 ? (totalMortality / birdsPlaced) * 100 : null;

  const arrivalDate = new Date(batch.arrivalDate);
  arrivalDate.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysActive = Math.max(0, Math.floor((today.getTime() - arrivalDate.getTime()) / (1000 * 60 * 60 * 24)));

  const translations = {
    title: t('title'),
    back: t('back'),
    stats: t('stats'),
    financials: t('financials'),
    activity: t('activity'),
    totalSales: t('totalSales'),
    soldBirds: t('soldBirds'),
    remainingBirds: t('remainingBirds'),
    totalExpenses: t('totalExpenses'),
    netProfit: t('directResult'),
    investment: t('birdCost'),
    mortality: t('mortality'),
    feedConsumption: t('feedConsumption'),
    bags: t('bags'),
    feedStock: t('feedStock'),
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
    revenueFormula: t('revenueFormula'),
    expensesFormula: t('expensesFormula'),
    birdCostFormula: t('birdCostFormula'),
    directResultFormula: t('directResultFormula'),
    remainingFormula: t('remainingFormula'),
    mortalityRateFormula: t('mortalityRateFormula'),
    feedConsumptionFormula: t('feedConsumptionFormula'),
    feedStockFormula: t('feedStockFormula'),
    daysActiveFormula: t('daysActiveFormula'),
    distributionFormula: t('distributionFormula'),
    avgPriceFormula: t('avgPriceFormula'),
    feedPerBirdFormula: t('feedPerBirdFormula'),
    transactionCountFormula: t('transactionCountFormula'),
    breedBroiler: tBatches('breeds.broiler'),
    breedLayer: tBatches('breeds.layer'),
    breedOther: tBatches('breeds.other'),
    batchName: tBatches('defaultName'),
    editTitle: tBatches('editTitle'),
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
        birdsPlaced,
        remainingQuantity,
        totalRevenue,
        totalBatchExpenses,
        initialInvestment,
        netProfit,
        totalFeed,
        mortalityRate,
        daysActive
      }}
      kgPerSac={kgPerSac}
      t={translations}
    />
  );
}
