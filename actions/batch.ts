"use server";

import { db } from "@/db";
import { batches } from "@/db/schema";
import { revalidatePath } from "next/cache";

export async function createBatch(data: {
  name: string;
  breed?: string;
  arrivalDate: Date;
  initialQuantity: number;
  costPerChick: number;
}) {
  try {
    await db.insert(batches).values({
      id: crypto.randomUUID(),
      name: data.name,
      breed: data.breed,
      arrivalDate: new Date(data.arrivalDate),
      initialQuantity: data.initialQuantity,
      costPerChick: data.costPerChick,
      status: 'active',
    });

    // Revalidate with layout segment to ensure [locale] routes are covered
    revalidatePath("/", "layout");
    return { success: true };
  } catch (error) {
    console.error("Failed to create batch:", error);
    return { success: false, error: "Failed to create batch" };
  }
}
