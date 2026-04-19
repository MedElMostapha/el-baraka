"use server";

import { db } from "@/db";
import { dailyLogs, inventory } from "@/db/schema";
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
    console.log("Creating daily log with feedConsumed:", formData.feedConsumed);

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
        console.log("Updating inventory for category 'feed'...");
        // Subtract from ALL items in the 'feed' category (usually only one)
        // This is safer than finding one and updating it separately
        const result = await tx.update(inventory)
          .set({ 
            quantity: sql`MAX(0, ${inventory.quantity} - ${formData.feedConsumed})`,
            lastUpdated: new Date()
          })
          .where(eq(inventory.category, 'feed'));
        
        console.log("Inventory update result executed");
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
