"use server";

import { db } from "@/db";
import { inventory, appSettings } from "@/db/schema";
import { revalidatePath } from "next/cache";

import { eq, and } from "drizzle-orm";

async function getKgPerSac(): Promise<number> {
  try {
    const row = await db.select().from(appSettings).where(eq(appSettings.key, 'kg_per_sac'));
    return row.length > 0 ? parseFloat(row[0].value) || 0 : 0;
  } catch {
    return 0;
  }
}

function toBaseUnit(quantity: number, unit: string, kgPerSac: number): number {
  if (unit === 'sac' && kgPerSac > 0) return quantity * kgPerSac;
  return quantity;
}

export async function addInventoryItem(data: {
  name: string;
  category: 'feed' | 'medicine' | 'packaging' | 'other';
  quantity: number;
  unit: string;
}) {
  try {
    const existing = await db.select().from(inventory).where(
      and(eq(inventory.name, data.name), eq(inventory.category, data.category))
    );

    if (existing.length > 0) {
      const item = existing[0];
      const kgPerSac = await getKgPerSac();
      const existingKg = toBaseUnit(item.quantity, item.unit, kgPerSac);
      const addedKg = toBaseUnit(data.quantity, data.unit, kgPerSac);
      const totalKg = existingKg + addedKg;

      if (item.unit === 'sac' && kgPerSac > 0) {
        await db.update(inventory)
          .set({ quantity: totalKg / kgPerSac, lastUpdated: new Date() })
          .where(eq(inventory.id, item.id));
      } else {
        await db.update(inventory)
          .set({ quantity: totalKg, lastUpdated: new Date() })
          .where(eq(inventory.id, item.id));
      }
    } else {
      await db.insert(inventory).values({
        id: crypto.randomUUID(),
        ...data,
        lastUpdated: new Date(),
      });
    }
    revalidatePath("/", "layout");
    return { success: true };
  } catch (error) {
    console.error("Failed to add inventory:", error);
    return { success: false };
  }
}



export async function deleteInventoryItem(id: string) {
  try {
    await db.delete(inventory).where(eq(inventory.id, id));
    revalidatePath("/", "layout");
    return { success: true };
  } catch (error) {
    console.error("Failed to delete inventory item:", error);
    return { success: false };
  }
}

export async function updateInventoryItem(id: string, data: Partial<{ name: string; quantity: number }>) {
  try {
    await db.update(inventory).set({ ...data, lastUpdated: new Date() }).where(eq(inventory.id, id));
    revalidatePath("/", "layout");
    return { success: true };
  } catch (error) {
    console.error("Failed to update inventory item:", error);
    return { success: false };
  }
}
