import { db } from "@/db";
import { debts } from "@/db/schema";
import { desc } from "drizzle-orm";
import { getTranslations } from 'next-intl/server';
import { DebtForm } from "@/components/DebtForm";
import { DebtsListClient } from "@/components/DebtsListClient";
import { PageHeader } from '@/components/PageHeader';

export default async function DebtsPage() {
  const t = await getTranslations('Debts');

  const allDebts = await db
    .select()
    .from(debts)
    .orderBy(desc(debts.date));

  return (
    <main className="page-container">
      <div className="page-stack">
        <PageHeader title={t('title')} subtitle={t('subtitle')} />

        <div className="workspace-grid">
          <section>
            <DebtForm />
          </section>

          <DebtsListClient
            debts={allDebts}
            t={{
              currency: t('currency'),
              filterAll: t('filterAll'),
              filterBorrowing: t('filterBorrowing'),
              filterLending: t('filterLending'),
              filterPending: t('filterPending'),
              filterPaid: t('filterPaid'),
              empty: t('empty'),
              editTitle: t('editTitle'),
              deleteTitle: t('deleteTitle'),
              deleteConfirm: t('deleteConfirm'),
              markPaid: t('markPaid'),
              statusPending: t('statusPending'),
              statusPaid: t('statusPaid'),
              iOwe: t('iOwe'),
              owesMe: t('owesMe'),
              totalBorrowed: t('totalBorrowed'),
              totalLent: t('totalLent'),
              borrowedFormula: t('borrowedFormula'),
              lentFormula: t('lentFormula'),
            }}
          />
        </div>
      </div>
    </main>
  );
}
