"use server";

import { db } from "@/db";
import { sales, clients, payments, batches, dailyLogs } from "@/db/schema";
import { revalidatePath } from "next/cache";
import { eq, sql } from "drizzle-orm";

export async function createClient(data: { name: string; phone?: string; address?: string }) {
  try {
    const id = crypto.randomUUID();
    await db.insert(clients).values({ id, ...data });
    revalidatePath("/", "layout");
    return { success: true, id };
  } catch (error) {
    console.error("Failed to create client:", error);
    return { success: false };
  }
}

export async function recordSale(data: {
  batchId: string;
  clientId?: string;
  quantity: number;
  unitPrice: number;
  amountPaid: number;
  type: 'wholesale' | 'retail';
}) {
  try {
    const saleId = crypto.randomUUID();
    const totalPrice = data.quantity * data.unitPrice;

    await db.insert(sales).values({
      id: saleId,
      ...data,
      date: new Date(),
      totalPrice,
    });

    // If there's an initial payment, record it
    if (data.amountPaid > 0 && data.clientId) {
      await db.insert(payments).values({
        id: crypto.randomUUID(),
        clientId: data.clientId,
        saleId,
        amount: data.amountPaid,
        date: new Date(),
        method: 'cash',
      });
    }

    // Auto-close batch if fully sold
    const batch = await db.query.batches.findFirst({
      where: eq(batches.id, data.batchId)
    });

    if (batch) {
      const totalSoldResult = await db.select({ sum: sql<number>`sum(${sales.quantity})` }).from(sales).where(eq(sales.batchId, data.batchId));
      const totalMortalityResult = await db.select({ sum: sql<number>`sum(${dailyLogs.mortality})` }).from(dailyLogs).where(eq(dailyLogs.batchId, data.batchId));
      
      const totalSold = totalSoldResult[0]?.sum || 0;
      const totalMortality = totalMortalityResult[0]?.sum || 0;
      
      if (totalSold + totalMortality >= batch.initialQuantity) {
        await db.update(batches).set({ status: 'closed' }).where(eq(batches.id, data.batchId));
      }
    }

    revalidatePath("/", "layout");
    return { success: true };
  } catch (error) {
    console.error("Failed to record sale:", error);
    return { success: false };
  }
}

export async function deleteSale(id: string) {
  try {
    await db.delete(sales).where(eq(sales.id, id));
    revalidatePath("/", "layout");
    return { success: true };
  } catch (error) {
    console.error("Failed to delete sale:", error);
    return { success: false };
  }
}

export async function markSalePaid(id: string, totalPrice: number, clientId: string | null) {
  try {
    await db.update(sales).set({ amountPaid: totalPrice }).where(eq(sales.id, id));
    
    if (clientId) {
      await db.insert(payments).values({
        id: crypto.randomUUID(),
        clientId: clientId,
        saleId: id,
        amount: totalPrice,
        date: new Date(),
        method: 'cash',
      });
    }

    revalidatePath("/", "layout");
    return { success: true };
  } catch (error) {
    console.error("Failed to mark sale as paid:", error);
    return { success: false };
  }
}

export async function updateSale(id: string, data: any) {
  try {
    const totalPrice = data.quantity * data.unitPrice;
    await db.update(sales).set({ ...data, totalPrice }).where(eq(sales.id, id));
    revalidatePath("/", "layout");
    return { success: true };
  } catch (error) {
    console.error("Failed to update sale:", error);
    return { success: false };
  }
}
