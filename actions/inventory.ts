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

async function upsertInventory(name: string, category: 'feed' | 'medicine' | 'packaging' | 'other', quantity: number, unit: string) {
  const existing = await db.select().from(inventory).where(
    and(eq(inventory.name, name), eq(inventory.category, category), eq(inventory.unit, unit))
  );
  if (existing.length > 0) {
    await db.update(inventory)
      .set({ quantity: existing[0].quantity + quantity, lastUpdated: new Date() })
      .where(eq(inventory.id, existing[0].id));
  } else {
    await db.insert(inventory).values({
      id: crypto.randomUUID(),
      name,
      category,
      quantity,
      unit,
      lastUpdated: new Date(),
    });
  }
}

export async function addInventoryItem(data: {
  name: string;
  category: 'feed' | 'medicine' | 'packaging' | 'other';
  quantity: number;
  unit: string;
}) {
  try {
    if (data.category === 'feed' && data.unit === 'kg') {
      const kgPerSac = await getKgPerSac();
      if (kgPerSac > 0) {
        const fullSacs = Math.floor(data.quantity / kgPerSac);
        const remainder = data.quantity % kgPerSac;
        if (fullSacs > 0) {
          await upsertInventory(data.name, data.category, fullSacs, 'sac');
        }
        if (remainder > 0) {
          await upsertInventory(data.name, data.category, remainder, 'kg');
        }
      } else {
        await upsertInventory(data.name, data.category, data.quantity, data.unit);
      }
    } else {
      await upsertInventory(data.name, data.category, data.quantity, data.unit);
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
