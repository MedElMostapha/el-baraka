import { db } from "@/db";
import { batches, dailyLogs, sales } from "@/db/schema";
import { desc, inArray } from "drizzle-orm";
import { getTranslations } from 'next-intl/server';
import BatchesClient from "@/components/BatchesClient";

export default async function BatchesPage() {
  const t = await getTranslations('Batches');
  
  const allBatches = await db
    .select()
    .from(batches)
    .orderBy(desc(batches.arrivalDate));

  const allBatchIds = allBatches.map(b => b.id);
  const batchStats: Record<string, { mortality: number, sold: number }> = {};
  for (const id of allBatchIds) {
    batchStats[id] = { mortality: 0, sold: 0 };
  }

  if (allBatchIds.length > 0) {
    const batchLogs = await db.select({ batchId: dailyLogs.batchId, mortality: dailyLogs.mortality }).from(dailyLogs).where(inArray(dailyLogs.batchId, allBatchIds));
    const batchSales = await db.select({ batchId: sales.batchId, quantity: sales.quantity }).from(sales).where(inArray(sales.batchId, allBatchIds));
    
    batchLogs.forEach(log => {
      if (batchStats[log.batchId]) batchStats[log.batchId].mortality += log.mortality;
    });
    batchSales.forEach(sale => {
      if (batchStats[sale.batchId]) batchStats[sale.batchId].sold += sale.quantity;
    });
  }

  const serializedBatches = allBatches.map(b => {
    const stats = batchStats[b.id];
    const remainingQuantity = b.initialQuantity - stats.mortality - stats.sold;
    return {
      id: b.id,
      name: b.name,
      arrivalDate: b.arrivalDate,
      initialQuantity: b.initialQuantity,
      remainingQuantity,
      status: b.status
    };
  });

  const translations = {
    title: t('title'),
    subtitle: t('subtitle'),
    addNew: t('addNew'),
    empty: t('empty'),
    remaining: t('remaining')
  };

  return <BatchesClient initialBatches={serializedBatches} t={translations} />;
}
