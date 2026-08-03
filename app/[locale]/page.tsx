import { db } from "@/db";
import { batches, sales, expenses, dailyLogs, inventory, restocks } from "@/db/schema";
import { getKgPerSac } from '@/actions/settings';
import { DashboardClient } from '@/components/DashboardClient';

export const dynamic = 'force-dynamic';

export default async function Home(props: { searchParams: Promise<{ range?: string }> }) {
  const searchParams = await props.searchParams;
  const range = searchParams.range || '7d';
  const kgPerSac = await getKgPerSac();

  const [allBatches, allSales, allDailyLogs, allExpenses, allInventory, allRestocks] = await Promise.all([
    db.select().from(batches),
    db.select().from(sales),
    db.select().from(dailyLogs),
    db.select().from(expenses),
    db.select().from(inventory),
    db.select().from(restocks),
  ]);

  return (
    <DashboardClient
      range={range}
      kgPerSac={kgPerSac}
      server={{
        batches: allBatches.map((b) => ({
          id: b.id,
          name: b.name,
          initialQuantity: b.initialQuantity,
          costPerChick: b.costPerChick,
          status: b.status,
        })),
        sales: allSales.map((s) => ({
          id: s.id,
          batchId: s.batchId,
          date: s.date.toISOString(),
          quantity: s.quantity,
          totalPrice: s.totalPrice,
          amountPaid: s.amountPaid,
        })),
        dailyLogs: allDailyLogs.map((l) => ({
          id: l.id,
          batchId: l.batchId,
          mortality: l.mortality,
        })),
        expenses: allExpenses.map((e) => ({
          id: e.id,
          date: e.date.toISOString(),
          amount: e.amount,
        })),
        inventory: allInventory.map((i) => ({
          id: i.id,
          category: i.category,
          quantity: i.quantity,
          unit: i.unit,
        })),
        restocks: allRestocks.map((r) => ({
          id: r.id,
          quantity: r.quantity,
          costPerChick: r.costPerChick,
        })),
      }}
    />
  );
}
