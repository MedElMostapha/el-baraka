"use server";

import { db } from "@/db";
import { dailyLogs, inventory, batches, sales, appSettings, expenses } from "@/db/schema";
import { revalidatePath } from "next/cache";
import { eq, sql } from "drizzle-orm";

export async function createDailyLog(formData: {
  batchId: string;
  mortality: number;
  feedConsumedBags: number;
  waterConsumed: number;
  medications?: string;
  notes?: string;
}) {
  try {
    await db.transaction(async (tx) => {
      let feedConsumedKg = 0;
      let feedItemId: string | null = null;
      let remainingFeedKg = 0;
      let feedUnit = '';
      let kgPerSac = 0;
      let feedPricePerSac = 0;

      if (formData.feedConsumedBags > 0) {
        const kgPerSacRow = await tx.select().from(appSettings).where(eq(appSettings.key, 'kg_per_sac'));
        kgPerSac = kgPerSacRow.length > 0 ? parseFloat(kgPerSacRow[0].value) || 0 : 0;
        if (kgPerSac <= 0) throw new Error('kgPerSacMissing');
        const feedPriceRow = await tx.select().from(appSettings).where(eq(appSettings.key, 'feed_price_per_sac'));
        feedPricePerSac = feedPriceRow.length > 0 ? parseFloat(feedPriceRow[0].value) || 0 : 0;

        const feedItem = (await tx.select().from(inventory).where(eq(inventory.category, 'feed')))[0];
        if (!feedItem) throw new Error('feedStockMissing');

        const isBagUnit = feedItem.unit === 'sac' || feedItem.unit === 'bag';
        const existingFeedKg = isBagUnit
          ? feedItem.quantity * kgPerSac
          : feedItem.unit === 'g'
            ? feedItem.quantity / 1000
            : feedItem.quantity;
        feedConsumedKg = formData.feedConsumedBags * kgPerSac;

        if (feedConsumedKg > existingFeedKg + 0.000001) {
          throw new Error('feedStockInsufficient');
        }

        feedItemId = feedItem.id;
        feedUnit = feedItem.unit;
        remainingFeedKg = existingFeedKg - feedConsumedKg;
      }

      // 1. Record the daily log in kg for existing reports and statistics.
      await tx.insert(dailyLogs).values({
        id: crypto.randomUUID(),
        batchId: formData.batchId,
        date: new Date(),
        mortality: formData.mortality,
        feedConsumed: feedConsumedKg,
        waterConsumed: formData.waterConsumed,
        medications: formData.medications,
        notes: formData.notes,
      });

      // 2. Subtract the converted amount from inventory after availability is verified.
      if (feedItemId) {
        const nextQuantity = feedUnit === 'sac' || feedUnit === 'bag'
          ? remainingFeedKg / kgPerSac
          : feedUnit === 'g'
            ? remainingFeedKg * 1000
            : remainingFeedKg;
        await tx.update(inventory)
          .set({ quantity: nextQuantity, lastUpdated: new Date() })
          .where(eq(inventory.id, feedItemId));

        await tx.insert(expenses).values({
          id: crypto.randomUUID(),
          date: new Date(),
          amount: formData.feedConsumedBags * feedPricePerSac,
          unitPrice: feedPricePerSac,
          quantity: formData.feedConsumedBags,
          category: 'feed',
          batchId: formData.batchId,
        });
      }

      // 3. Auto-close batch if fully sold/died
      const batch = await tx.query.batches.findFirst({
        where: eq(batches.id, formData.batchId)
      });

      if (batch) {
        const totalSoldResult = await tx.select({ sum: sql<number>`sum(${sales.quantity})` }).from(sales).where(eq(sales.batchId, formData.batchId));
        const totalMortalityResult = await tx.select({ sum: sql<number>`sum(${dailyLogs.mortality})` }).from(dailyLogs).where(eq(dailyLogs.batchId, formData.batchId));
        
        const totalSold = totalSoldResult[0]?.sum || 0;
        const totalMortality = totalMortalityResult[0]?.sum || 0;
        
        if (totalSold + totalMortality >= batch.initialQuantity) {
          await tx.update(batches).set({ status: 'closed' }).where(eq(batches.id, formData.batchId));
        }
      }
    });

    revalidatePath("/", "layout");
    revalidatePath("/inventory");
    return { success: true };
  } catch (error) {
    console.error("Failed to create daily log:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to save data" };
  }
}
