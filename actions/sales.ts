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
