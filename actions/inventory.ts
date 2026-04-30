"use server";

import { db } from "@/db";
import { inventory } from "@/db/schema";
import { revalidatePath } from "next/cache";

import { eq, and } from "drizzle-orm";

export async function addInventoryItem(data: {
  name: string;
  category: 'feed' | 'medicine' | 'packaging' | 'other';
  quantity: number;
  unit: string;
}) {
  try {
    const existing = await db.select().from(inventory).where(
      and(
        eq(inventory.name, data.name),
        eq(inventory.category, data.category)
      )
    );

    if (existing.length > 0) {
      await db.update(inventory)
        .set({ 
          quantity: existing[0].quantity + data.quantity, 
          lastUpdated: new Date() 
        })
        .where(eq(inventory.id, existing[0].id));
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
