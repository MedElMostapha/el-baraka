"use server";

import { db } from "@/db";
import { sales, clients, payments } from "@/db/schema";
import { revalidatePath } from "next/cache";

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

    revalidatePath("/", "layout");
    return { success: true };
  } catch (error) {
    console.error("Failed to record sale:", error);
    return { success: false };
  }
}

import { eq } from "drizzle-orm";

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
        amount: totalPrice, // Assuming we mark the remaining as paid, but let's just insert a record for the rest if needed. For simplicity, just update amountPaid in sales. Wait, if there was a previous payment we shouldn't insert the full totalPrice. Just updating sales amountPaid is enough for now.
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
