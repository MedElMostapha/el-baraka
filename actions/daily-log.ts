"use server";

import { db } from "@/db";
import { dailyLogs, inventory, batches, sales, appSettings } from "@/db/schema";
import { revalidatePath } from "next/cache";
import { eq, sql } from "drizzle-orm";

export async function createDailyLog(formData: {
  batchId: string;
  mortality: number;
  feedConsumed: number;
  waterConsumed: number;
  medications?: string;
  notes?: string;
}) {
  try {
    await db.transaction(async (tx) => {
      // 1. Record the daily log
      await tx.insert(dailyLogs).values({
        id: crypto.randomUUID(),
        batchId: formData.batchId,
        date: new Date(),
        mortality: formData.mortality,
        feedConsumed: formData.feedConsumed,
        waterConsumed: formData.waterConsumed,
        medications: formData.medications,
        notes: formData.notes,
      });

      // 2. Subtract feed from inventory if any was consumed
      if (formData.feedConsumed > 0) {
        const kgPerSacRow = await tx.select().from(appSettings).where(eq(appSettings.key, 'kg_per_sac'));
        const kgPerSac = kgPerSacRow.length > 0 ? parseFloat(kgPerSacRow[0].value) || 0 : 0;

        const feedItems = await tx.select().from(inventory).where(eq(inventory.category, 'feed'));

        for (const item of feedItems) {
          let amountToSubtract = formData.feedConsumed;
          if (item.unit === 'sac' && kgPerSac > 0) {
            amountToSubtract = formData.feedConsumed / kgPerSac;
          }
          await tx.update(inventory)
            .set({
              quantity: sql`MAX(0, ${inventory.quantity} - ${amountToSubtract})`,
              lastUpdated: new Date()
            })
            .where(eq(inventory.id, item.id));
          break;
        }
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
    return { success: false, error: "Failed to save data" };
  }
}
