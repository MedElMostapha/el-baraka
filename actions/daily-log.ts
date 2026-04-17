"use server";

import { db } from "@/db";
import { dailyLogs } from "@/db/schema";
import { revalidatePath } from "next/cache";

export async function createDailyLog(formData: {
  batchId: string;
  mortality: number;
  feedConsumed: number;
  waterConsumed: number;
  medications?: string;
  notes?: string;
}) {
  try {
    await db.insert(dailyLogs).values({
      id: crypto.randomUUID(),
      batchId: formData.batchId,
      date: new Date(),
      mortality: formData.mortality,
      feedConsumed: formData.feedConsumed,
      waterConsumed: formData.waterConsumed,
      medications: formData.medications,
      notes: formData.notes,
    });

    revalidatePath("/", "layout");
    return { success: true };
  } catch (error) {
    console.error("Failed to create daily log:", error);
    return { success: false, error: "Failed to save data" };
  }
}
