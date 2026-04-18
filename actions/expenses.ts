"use server";

import { db } from "@/db";
import { expenses } from "@/db/schema";
import { revalidatePath } from "next/cache";

export async function addExpense(data: {
  amount: number;
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
