import { db } from "@/db";
import { batches, dailyLogs, sales, restocks } from "@/db/schema";
import { desc, eq, inArray, sql } from "drizzle-orm";
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

  const allRestocks = await db
    .select({
      id: restocks.id,
      batchId: restocks.batchId,
      quantity: restocks.quantity,
      costPerChick: restocks.costPerChick,
      date: restocks.date,
      batchName: batches.name,
      batchBreed: batches.breed,
    })
    .from(restocks)
    .leftJoin(batches, eq(restocks.batchId, batches.id))
    .orderBy(desc(restocks.date));

  const activeBatch = allBatches.find(b => b.status === 'active');
  const activeBatchStats = activeBatch ? batchStats[activeBatch.id] : null;
  const remainingQuantity = activeBatch && activeBatchStats
    ? activeBatch.initialQuantity - activeBatchStats.mortality - activeBatchStats.sold
    : 0;

  const serializedBatches = allBatches.map(b => {
    const stats = batchStats[b.id];
    return {
      id: b.id,
      name: b.name,
      breed: b.breed,
      arrivalDate: b.arrivalDate.toISOString(),
      initialQuantity: b.initialQuantity,
      remainingQuantity: b.initialQuantity - stats.mortality - stats.sold,
      costPerChick: b.costPerChick,
      status: b.status,
    };
  });

  const serializedRestocks = allRestocks.map(r => ({
    ...r,
    date: r.date.toISOString(),
  }));

  const translations = {
    title: t('title'),
    subtitle: t('subtitle'),
    addNew: t('addNew'),
    empty: t('empty'),
    remaining: t('remaining'),
    editTitle: t('editTitle'),
    deleteTitle: t('deleteTitle'),
    deleteConfirm: t('deleteConfirm'),
    defaultName: t('defaultName'),
    quantity: t('quantity'),
    cost: t('cost'),
    save: t('save'),
    restockHistory: t('restockHistory'),
    chicks: t('chicks'),
    unit: t('unit'),
    breedBroiler: t('breeds.broiler'),
    breedLayer: t('breeds.layer'),
    breedOther: t('breeds.other'),
  };

  return (
    <BatchesClient
      initialBatches={serializedBatches}
      activeBatch={activeBatch ? { ...activeBatch, remainingQuantity, arrivalDate: activeBatch.arrivalDate.toISOString() } : null}
      restocks={serializedRestocks}
      t={translations}
    />
  );
}
