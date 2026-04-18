import { db } from "@/db";
import { sales, batches, clients, dailyLogs } from "@/db/schema";
import { desc, eq, inArray } from "drizzle-orm";
import { getTranslations } from 'next-intl/server';
import { SalesForm } from "@/components/SalesForm";
import { SalesListClient } from "@/components/SalesListClient";
import { PageHeader } from '@/components/PageHeader';

export default async function SalesPage() {
  const t = await getTranslations('Sales');
  
  const allSales = await db
    .select({
      id: sales.id,
      date: sales.date,
      batchId: sales.batchId,
      clientId: sales.clientId,
      quantity: sales.quantity,
      unitPrice: sales.unitPrice,
      totalPrice: sales.totalPrice,
      amountPaid: sales.amountPaid,
      type: sales.type,
      batchName: batches.name,
      clientName: clients.name,
    })
    .from(sales)
    .leftJoin(batches, eq(sales.batchId, batches.id))
    .leftJoin(clients, eq(sales.clientId, clients.id))
    .orderBy(desc(sales.date));

  const activeBatchesRaw = await db.select().from(batches).where(eq(batches.status, 'active'));
  const activeBatchIds = activeBatchesRaw.map(b => b.id);
  
  const batchStats: Record<string, { mortality: number, sold: number }> = {};
  for (const id of activeBatchIds) {
    batchStats[id] = { mortality: 0, sold: 0 };
  }

  if (activeBatchIds.length > 0) {
    const batchLogs = await db.select({ batchId: dailyLogs.batchId, mortality: dailyLogs.mortality }).from(dailyLogs).where(inArray(dailyLogs.batchId, activeBatchIds));
    const batchSales = await db.select({ batchId: sales.batchId, quantity: sales.quantity }).from(sales).where(inArray(sales.batchId, activeBatchIds));
    
    batchLogs.forEach(log => {
      if (batchStats[log.batchId]) batchStats[log.batchId].mortality += log.mortality;
    });
    batchSales.forEach(sale => {
      if (batchStats[sale.batchId]) batchStats[sale.batchId].sold += sale.quantity;
    });
  }

  const activeBatches = activeBatchesRaw.map(batch => {
    const stats = batchStats[batch.id];
    const remainingQuantity = batch.initialQuantity - stats.mortality - stats.sold;
    return {
      id: batch.id,
      name: batch.name,
      remainingQuantity
    };
  }).filter(batch => batch.remainingQuantity > 0);

  const allClients = await db.select().from(clients);

  return (
    <main className="flex-1 p-6 md:p-12 max-w-lg mx-auto w-full pb-32">
      <div className="space-y-10">
        <PageHeader title={t('title')} subtitle={t('subtitle')} />

        <section>
          <SalesForm batches={activeBatches} clients={allClients} />
        </section>

        <SalesListClient 
          sales={allSales} 
          batches={activeBatches}
          clients={allClients}
          t={{
            currency: t('currency'),
            cashClient: t('cashClient'),
            paidFull: t('paidFull'),
            filterAll: t('filterAll'),
            filterToday: t('filterToday'),
            filterWeek: t('filterWeek'),
            filterMonth: t('filterMonth'),
            filterUnpaid: t('filterUnpaid'),
            empty: t('empty'),
            editTitle: t('editTitle'),
            deleteTitle: t('deleteTitle'),
            deleteConfirm: t('deleteConfirm')
          }} 
        />
      </div>
    </main>
  );
}
