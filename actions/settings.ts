"use server";

import { db } from "@/db";
import { appSettings } from "@/db/schema";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";

const KG_PER_SAC_KEY = 'kg_per_sac';

export async function getKgPerSac(): Promise<number> {
  try {
    const row = await db.select().from(appSettings).where(eq(appSettings.key, KG_PER_SAC_KEY));
    return row.length > 0 ? parseFloat(row[0].value) || 0 : 0;
  } catch {
    return 0;
  }
}

export async function setKgPerSac(value: number) {
  try {
    const existing = await db.select().from(appSettings).where(eq(appSettings.key, KG_PER_SAC_KEY));
    if (existing.length > 0) {
      await db.update(appSettings).set({ value: String(value) }).where(eq(appSettings.key, KG_PER_SAC_KEY));
    } else {
      await db.insert(appSettings).values({ key: KG_PER_SAC_KEY, value: String(value) });
    }
    revalidatePath("/", "layout");
    return { success: true };
  } catch (error) {
    console.error("Failed to set kgPerSac:", error);
    return { success: false };
  }
}
