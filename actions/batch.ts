"use server";

import { db } from "@/db";
import { batches, inventory, restocks } from "@/db/schema";
import { revalidatePath } from "next/cache";
import { eq, and } from "drizzle-orm";

export async function createBatch(data: {
  name: string;
  breed?: string;
  arrivalDate: Date;
  initialQuantity: number;
  costPerChick: number;
  feedStock?: number;
}) {
  try {
    let batchId: string;

    const existingBatch = await db
      .select()
      .from(batches)
      .where(and(eq(batches.status, 'active'), eq(batches.costPerChick, data.costPerChick)))
      .limit(1);

    if (existingBatch.length > 0) {
      batchId = existingBatch[0].id;
      await db.update(batches)
        .set({ initialQuantity: existingBatch[0].initialQuantity + data.initialQuantity })
        .where(eq(batches.id, batchId));
    } else {
      batchId = crypto.randomUUID();
      await db.insert(batches).values({
        id: batchId,
        name: data.name || 'lot',
        breed: data.breed,
        arrivalDate: new Date(data.arrivalDate),
        initialQuantity: data.initialQuantity,
        costPerChick: data.costPerChick,
        feedStock: data.feedStock || 0,
        status: 'active',
      });
    }

    await db.insert(restocks).values({
      id: crypto.randomUUID(),
      batchId,
      quantity: data.initialQuantity,
      costPerChick: data.costPerChick,
      date: new Date(),
    });

    if (data.feedStock && data.feedStock > 0) {
      const existing = await db.select().from(inventory).where(
        and(eq(inventory.name, 'Aliment'), eq(inventory.category, 'feed'))
      );

      if (existing.length > 0) {
        await db.update(inventory)
          .set({ quantity: existing[0].quantity + data.feedStock, lastUpdated: new Date() })
          .where(eq(inventory.id, existing[0].id));
      } else {
        await db.insert(inventory).values({
          id: crypto.randomUUID(),
          name: 'Aliment',
          category: 'feed',
          quantity: data.feedStock,
          unit: 'kg',
          lastUpdated: new Date()
        });
      }
    }

    revalidatePath("/", "layout");
    return { success: true };
  } catch (error) {
    console.error("Failed to create batch:", error);
    return { success: false, error: "Failed to create batch" };
  }
}

export async function deleteBatch(id: string) {
  try {
    await db.delete(batches).where(eq(batches.id, id));
    revalidatePath("/", "layout");
    return { success: true };
  } catch (error) {
    console.error("Failed to delete batch:", error);
    return { success: false, error: "Failed to delete batch" };
  }
}

export async function updateBatch(id: string, data: Partial<{ name: string; breed: string; arrivalDate: Date; initialQuantity: number; costPerChick: number; feedStock: number; status: "active" | "closed" }>) {
  try {
    if (data.feedStock !== undefined) {
      const oldBatch = await db.query.batches.findFirst({ where: eq(batches.id, id) });
      if (oldBatch) {
        const delta = data.feedStock - (oldBatch.feedStock || 0);
        if (delta > 0) {
          const existing = await db.select().from(inventory).where(
            and(eq(inventory.name, 'Aliment'), eq(inventory.category, 'feed'))
          );
          if (existing.length > 0) {
            await db.update(inventory)
              .set({ quantity: existing[0].quantity + delta, lastUpdated: new Date() })
              .where(eq(inventory.id, existing[0].id));
          } else {
            await db.insert(inventory).values({
              id: crypto.randomUUID(),
              name: 'Aliment',
              category: 'feed',
              quantity: delta,
              unit: 'kg',
              lastUpdated: new Date()
            });
          }
        }
      }
    }

    await db.update(batches).set(data).where(eq(batches.id, id));
    revalidatePath("/", "layout");
    return { success: true };
  } catch (error) {
    console.error("Failed to update batch:", error);
    return { success: false, error: "Failed to update batch" };
  }
}
