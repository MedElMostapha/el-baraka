import { db } from "@/db";
import { batches } from "@/db/schema";
import { desc } from "drizzle-orm";
import { getTranslations } from 'next-intl/server';
import BatchesClient from "@/components/BatchesClient";

export default async function BatchesPage() {
  const t = await getTranslations('Batches');
  
  const allBatches = await db
    .select()
    .from(batches)
    .orderBy(desc(batches.arrivalDate));

  const serializedBatches = allBatches.map(b => ({
    id: b.id,
    name: b.name,
    arrivalDate: b.arrivalDate,
    initialQuantity: b.initialQuantity,
    status: b.status
  }));

  const translations = {
    title: t('title'),
    subtitle: t('subtitle'),
    addNew: t('addNew'),
    empty: t('empty')
  };

  return <BatchesClient initialBatches={serializedBatches} t={translations} />;
}
