"use server";

import { db } from "@/db";
import { inventory } from "@/db/schema";
import { revalidatePath } from "next/cache";

export async function addInventoryItem(data: {
  name: string;
  category: 'feed' | 'medicine' | 'packaging' | 'other';
  quantity: number;
  unit: string;
}) {
  try {
    await db.insert(inventory).values({
      id: crypto.randomUUID(),
      ...data,
      lastUpdated: new Date(),
    });
    revalidatePath("/", "layout");
    return { success: true };
  } catch (error) {
    console.error("Failed to add inventory:", error);
    return { success: false };
  }
}
