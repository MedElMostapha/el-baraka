"use server";

import { db } from "@/db";
import { sales, clients, payments, batches, dailyLogs, inventory, appSettings, expenses } from "@/db/schema";
import { revalidatePath } from "next/cache";
import { eq, sql } from "drizzle-orm";

type SalesTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function adjustFeedStock(tx: SalesTransaction, bags: number, direction: 'consume' | 'restore') {
  if (bags <= 0) return;

  const kgPerSacRow = await tx.select().from(appSettings).where(eq(appSettings.key, 'kg_per_sac'));
  const kgPerSac = kgPerSacRow.length > 0 ? parseFloat(kgPerSacRow[0].value) || 0 : 0;
  if (kgPerSac <= 0) throw new Error('kgPerSacMissing');

  const feedItem = (await tx.select().from(inventory).where(eq(inventory.category, 'feed')))[0];
  const amountKg = bags * kgPerSac;

  if (!feedItem) {
    if (direction === 'consume') throw new Error('feedStockMissing');
    await tx.insert(inventory).values({
      id: crypto.randomUUID(),
      name: 'Aliment',
      category: 'feed',
      quantity: amountKg,
      unit: 'kg',
      lastUpdated: new Date(),
    });
    return;
  }

  const isBagUnit = feedItem.unit === 'sac' || feedItem.unit === 'bag';
  const existingKg = isBagUnit
    ? feedItem.quantity * kgPerSac
    : feedItem.unit === 'g'
      ? feedItem.quantity / 1000
      : feedItem.quantity;

  if (direction === 'consume' && amountKg > existingKg + 0.000001) {
    throw new Error('feedStockInsufficient');
  }

  const nextKg = direction === 'consume' ? existingKg - amountKg : existingKg + amountKg;
  const nextQuantity = isBagUnit
    ? nextKg / kgPerSac
    : feedItem.unit === 'g'
      ? nextKg * 1000
      : nextKg;

  await tx.update(inventory)
    .set({ quantity: nextQuantity, lastUpdated: new Date() })
    .where(eq(inventory.id, feedItem.id));
}

async function syncFeedExpense(tx: SalesTransaction, saleId: string, batchId: string, bags: number) {
  const existingExpense = (await tx.select({ id: expenses.id }).from(expenses).where(eq(expenses.saleId, saleId)))[0];

  if (bags <= 0) {
    if (existingExpense) await tx.delete(expenses).where(eq(expenses.id, existingExpense.id));
    return;
  }

  const priceRow = await tx.select().from(appSettings).where(eq(appSettings.key, 'feed_price_per_sac'));
  const unitPrice = priceRow.length > 0 ? parseFloat(priceRow[0].value) || 0 : 0;
  const expenseData = {
    date: new Date(),
    amount: bags * unitPrice,
    unitPrice,
    quantity: bags,
    category: 'feed' as const,
    batchId,
    saleId,
  };

  if (existingExpense) {
    await tx.update(expenses).set(expenseData).where(eq(expenses.id, existingExpense.id));
  } else {
    await tx.insert(expenses).values({ id: crypto.randomUUID(), ...expenseData });
  }
}

export async function createClient(data: { name: string; phone?: string; address?: string }) {
  try {
    const id = crypto.randomUUID();
    await db.insert(clients).values({ id, ...data });
    revalidatePath("/", "layout");
    return { success: true, id };
  } catch (error) {
    console.error("Failed to create client:", error);
    return { success: false };
  }
}

export async function recordSale(data: {
  batchId: string;
  clientId?: string;
  quantity: number;
  unitPrice: number;
  feedConsumedBags: number;
  amountPaid: number;
  type: 'wholesale' | 'retail';
}) {
  try {
    const saleId = crypto.randomUUID();
    const totalPrice = data.quantity * data.unitPrice;
    const amountPaid = Math.min(Math.max(data.amountPaid, 0), totalPrice);

    await db.transaction(async (tx) => {
      await adjustFeedStock(tx, data.feedConsumedBags, 'consume');

      await tx.insert(sales).values({
        id: saleId,
        batchId: data.batchId,
        clientId: data.clientId,
        quantity: data.quantity,
        unitPrice: data.unitPrice,
        totalPrice,
        amountPaid,
        feedConsumedBags: data.feedConsumedBags,
        type: data.type,
        date: new Date(),
      });
      await syncFeedExpense(tx, saleId, data.batchId, data.feedConsumedBags);

      if (amountPaid > 0 && data.clientId) {
        await tx.insert(payments).values({
          id: crypto.randomUUID(),
          clientId: data.clientId,
          saleId,
          amount: amountPaid,
          date: new Date(),
          method: 'cash',
        });
      }

      const batch = await tx.query.batches.findFirst({ where: eq(batches.id, data.batchId) });
      if (batch) {
        const totalSoldResult = await tx.select({ sum: sql<number>`sum(${sales.quantity})` }).from(sales).where(eq(sales.batchId, data.batchId));
        const totalMortalityResult = await tx.select({ sum: sql<number>`sum(${dailyLogs.mortality})` }).from(dailyLogs).where(eq(dailyLogs.batchId, data.batchId));
        const totalSold = totalSoldResult[0]?.sum || 0;
        const totalMortality = totalMortalityResult[0]?.sum || 0;

        if (totalSold + totalMortality >= batch.initialQuantity) {
          await tx.update(batches).set({ status: 'closed' }).where(eq(batches.id, data.batchId));
        }
      }
    });

    revalidatePath("/", "layout");
    return { success: true };
  } catch (error) {
    console.error("Failed to record sale:", error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to record sale' };
  }
}

export async function deleteSale(id: string) {
  try {
    await db.transaction(async (tx) => {
      const sale = await tx.query.sales.findFirst({ where: eq(sales.id, id) });
      if (sale) await adjustFeedStock(tx, sale.feedConsumedBags, 'restore');
      await tx.delete(expenses).where(eq(expenses.saleId, id));
      await tx.delete(payments).where(eq(payments.saleId, id));
      await tx.delete(sales).where(eq(sales.id, id));
    });
    revalidatePath("/", "layout");
    return { success: true };
  } catch (error) {
    console.error("Failed to delete sale:", error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to delete sale' };
  }
}

export async function markSalePaid(id: string, _totalPrice: number, _clientId: string | null) {
  try {
    const sale = await db.query.sales.findFirst({ where: eq(sales.id, id) });
    if (!sale) return { success: false };

    const outstanding = Math.max(0, sale.totalPrice - sale.amountPaid);
    await db.update(sales).set({ amountPaid: sale.totalPrice }).where(eq(sales.id, id));

    if (outstanding > 0 && sale.clientId) {
      await db.insert(payments).values({
        id: crypto.randomUUID(),
        clientId: sale.clientId,
        saleId: id,
        amount: outstanding,
        date: new Date(),
        method: 'cash',
      });
    }

    revalidatePath("/", "layout");
    return { success: true };
  } catch (error) {
    console.error("Failed to mark sale as paid:", error);
    return { success: false };
  }
}

export async function updateSale(id: string, data: {
  batchId: string;
  clientId?: string;
  quantity: number;
  unitPrice: number;
  feedConsumedBags: number;
  amountPaid: number;
  type: 'wholesale' | 'retail';
}) {
  try {
    const totalPrice = data.quantity * data.unitPrice;
    const amountPaid = Math.min(Math.max(Number(data.amountPaid) || 0, 0), totalPrice);
    await db.transaction(async (tx) => {
      const oldSale = await tx.query.sales.findFirst({ where: eq(sales.id, id) });
      if (!oldSale) throw new Error('Sale not found');

      const feedDelta = data.feedConsumedBags - oldSale.feedConsumedBags;
      if (feedDelta > 0) await adjustFeedStock(tx, feedDelta, 'consume');
      if (feedDelta < 0) await adjustFeedStock(tx, Math.abs(feedDelta), 'restore');

      await tx.update(sales).set({ ...data, amountPaid, totalPrice }).where(eq(sales.id, id));
      await syncFeedExpense(tx, id, data.batchId, data.feedConsumedBags);
    });
    revalidatePath("/", "layout");
    return { success: true };
  } catch (error) {
    console.error("Failed to update sale:", error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to update sale' };
  }
}
