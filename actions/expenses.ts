"use server";

import { db } from "@/db";
import { expenses } from "@/db/schema";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";

export async function addExpense(data: {
  amount: number;
  unitPrice?: number;
  quantity?: number;
  category: "feed" | "medication" | "transport" | "utilities" | "salaries" | "other";
  description?: string;
  batchId?: string;
}) {
  try {
    const id = crypto.randomUUID();
    await db.insert(expenses).values({
      id,
      ...data,
      date: new Date(),
    });
    revalidatePath("/", "layout");
    return { success: true, id };
  } catch (error) {
    console.error("Failed to add expense:", error);
    return { success: false };
  }
}

export async function deleteExpense(id: string) {
  try {
    await db.delete(expenses).where(eq(expenses.id, id));
    revalidatePath("/", "layout");
    return { success: true };
  } catch (error) {
    console.error("Failed to delete expense:", error);
    return { success: false };
  }
}

export async function updateExpense(id: string, data: Partial<{ 
  amount: number; 
  unitPrice?: number;
  quantity?: number;
  category: "feed" | "medication" | "transport" | "utilities" | "salaries" | "other";
  description: string;
  batchId?: string;
}>) {
  try {
    await db.update(expenses).set(data).where(eq(expenses.id, id));
    revalidatePath("/", "layout");
    return { success: true };
  } catch (error) {
    console.error("Failed to update expense:", error);
    return { success: false };
  }
}
