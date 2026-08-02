"use server";

import { db } from "@/db";
import { batches, inventory, restocks, appSettings } from "@/db/schema";
import { revalidatePath } from "next/cache";
import { eq, and, desc } from "drizzle-orm";

function toBaseUnit(quantity: number, unit: string, kgPerSac: number): number {
  if ((unit === 'sac' || unit === 'bag') && kgPerSac > 0) return quantity * kgPerSac;
  return quantity;
}

export async function createBatch(data: {
  name?: string;
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
      const kgPerSacRow = await db.select().from(appSettings).where(eq(appSettings.key, 'kg_per_sac'));
      const kgPerSac = kgPerSacRow.length > 0 ? parseFloat(kgPerSacRow[0].value) || 0 : 0;

      const existing = await db.select().from(inventory).where(
        and(eq(inventory.name, 'Aliment'), eq(inventory.category, 'feed'))
      );

      if (existing.length > 0) {
        const item = existing[0];
        const existingKg = toBaseUnit(item.quantity, item.unit, kgPerSac);
        const totalKg = existingKg + data.feedStock;

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
    const oldBatch = await db.query.batches.findFirst({ where: eq(batches.id, id) });
    if (!oldBatch) return { success: false, error: "Batch not found" };

    if (data.feedStock !== undefined) {
      const delta = data.feedStock - (oldBatch.feedStock || 0);
      if (delta !== 0) {
        const kgPerSacRow = await db.select().from(appSettings).where(eq(appSettings.key, 'kg_per_sac'));
        const kgPerSac = kgPerSacRow.length > 0 ? parseFloat(kgPerSacRow[0].value) || 0 : 0;
        const existing = await db.select().from(inventory).where(
          and(eq(inventory.name, 'Aliment'), eq(inventory.category, 'feed'))
        );

        if (existing.length > 0) {
          const item = existing[0];
          const nextKg = Math.max(0, toBaseUnit(item.quantity, item.unit, kgPerSac) + delta);
          const nextQuantity = ((item.unit === 'sac' || item.unit === 'bag') && kgPerSac > 0)
            ? nextKg / kgPerSac
            : nextKg;
          await db.update(inventory)
            .set({ quantity: nextQuantity, lastUpdated: new Date() })
            .where(eq(inventory.id, item.id));
        } else if (delta > 0) {
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

    if (data.initialQuantity !== undefined || data.costPerChick !== undefined) {
      const batchRestocks = await db
        .select()
        .from(restocks)
        .where(eq(restocks.batchId, id))
        .orderBy(desc(restocks.date));

      if (batchRestocks.length > 0) {
        const targetQuantity = data.initialQuantity ?? oldBatch.initialQuantity;
        const currentQuantity = batchRestocks.reduce((sum, restock) => sum + restock.quantity, 0);
        const quantityDelta = targetQuantity - currentQuantity;

        if (quantityDelta < 0) {
          const removable = batchRestocks.reduce((sum, restock) => sum + Math.max(0, restock.quantity - 1), 0);
          if (-quantityDelta > removable) {
            return { success: false, error: "Quantity cannot be lower than the recorded activity" };
          }

          let remainingToRemove = -quantityDelta;
          for (const restock of batchRestocks) {
            const removableFromRow = Math.min(remainingToRemove, Math.max(0, restock.quantity - 1));
            if (removableFromRow > 0) {
              await db.update(restocks)
                .set({ quantity: restock.quantity - removableFromRow })
                .where(eq(restocks.id, restock.id));
              remainingToRemove -= removableFromRow;
            }
            if (remainingToRemove === 0) break;
          }
        } else if (quantityDelta > 0) {
          await db.update(restocks)
            .set({ quantity: batchRestocks[0].quantity + quantityDelta })
            .where(eq(restocks.id, batchRestocks[0].id));
        }

        if (data.costPerChick !== undefined) {
          await db.update(restocks)
            .set({ costPerChick: data.costPerChick })
            .where(eq(restocks.batchId, id));
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
