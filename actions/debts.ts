"use server";

import { db } from "@/db";
import { debts } from "@/db/schema";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";

export async function addDebt(data: {
  personName: string;
  amount: number;
  type: "borrowing" | "lending";
  description?: string;
}) {
  try {
    const id = crypto.randomUUID();
    await db.insert(debts).values({
      id,
      ...data,
      date: new Date(),
    });
    revalidatePath("/", "layout");
    return { success: true, id };
  } catch (error) {
    console.error("Failed to add debt:", error);
    return { success: false };
  }
}

export async function deleteDebt(id: string) {
  try {
    await db.delete(debts).where(eq(debts.id, id));
    revalidatePath("/", "layout");
    return { success: true };
  } catch (error) {
    console.error("Failed to delete debt:", error);
    return { success: false };
  }
}

export async function updateDebt(id: string, data: Partial<{
  personName: string;
  amount: number;
  type: "borrowing" | "lending";
  description: string;
}>) {
  try {
    await db.update(debts).set(data).where(eq(debts.id, id));
    revalidatePath("/", "layout");
    return { success: true };
  } catch (error) {
    console.error("Failed to update debt:", error);
    return { success: false };
  }
}

export async function markDebtPaid(id: string) {
  try {
    await db.update(debts).set({ 
      isPaid: true, 
      paidDate: new Date() 
    }).where(eq(debts.id, id));
    revalidatePath("/", "layout");
    return { success: true };
  } catch (error) {
    console.error("Failed to mark debt as paid:", error);
    return { success: false };
  }
}

export async function markDebtUnpaid(id: string) {
  try {
    await db.update(debts).set({ 
      isPaid: false, 
      paidDate: null 
    }).where(eq(debts.id, id));
    revalidatePath("/", "layout");
    return { success: true };
  } catch (error) {
    console.error("Failed to mark debt as unpaid:", error);
    return { success: false };
  }
}
