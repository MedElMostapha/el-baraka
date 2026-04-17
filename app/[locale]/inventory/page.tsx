import { db } from "@/db";
import { inventory } from "@/db/schema";
import { desc } from "drizzle-orm";
import { getTranslations } from 'next-intl/server';
import InventoryClient from "@/components/InventoryClient";

export default async function InventoryPage() {
  const t = await getTranslations('Inventory');
  
  let stockItems: {
    id: string;
    name: string;
    category: string;
    quantity: number;
    unit: string;
    lastUpdated: string | null;
  }[] = [];

  try {
    const rawItems = await db
      .select()
      .from(inventory)
      .orderBy(desc(inventory.lastUpdated));
    
    stockItems = rawItems.map(item => ({
      ...item,
      lastUpdated: item.lastUpdated ? item.lastUpdated.toISOString() : null
    }));
  } catch (error: unknown) {
    console.error("DATABASE ERROR in InventoryPage:", error);
    throw error;
  }

  const translations = {
    title: t('title'),
    subtitle: t('subtitle'),
    addNew: t('addNew'),
    feed: t('feed'),
    medicine: t('medicine'),
    packaging: t('packaging'),
    other: t('other')
  };

  return <InventoryClient initialItems={stockItems} t={translations} />;
}
