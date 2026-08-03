import { db } from "@/db";
import { debts, sales, batches, clients } from "@/db/schema";
import { desc, eq, gt } from "drizzle-orm";
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

  const unpaidSales = await db
    .select({
      id: sales.id,
      date: sales.date,
      totalPrice: sales.totalPrice,
      amountPaid: sales.amountPaid,
      batchName: batches.name,
      clientName: clients.name,
    })
    .from(sales)
    .leftJoin(batches, eq(sales.batchId, batches.id))
    .leftJoin(clients, eq(sales.clientId, clients.id))
    .where(gt(sales.totalPrice, sales.amountPaid))
    .orderBy(desc(sales.date));

  const manualDebts = allDebts.map((debt) => ({
    ...debt,
    kind: 'manual' as const,
    saleId: undefined as string | undefined,
  }));

  const saleDebts = unpaidSales.map((sale) => ({
    id: `sale-${sale.id}`,
    kind: 'sale' as const,
    saleId: sale.id,
    personName: sale.clientName ?? t('cashClient'),
    amount: sale.totalPrice - sale.amountPaid,
    type: 'lending' as const,
    description: sale.batchName,
    date: sale.date,
    isPaid: false,
    paidDate: null as Date | null,
  }));

  const mergedDebts = [...manualDebts, ...saleDebts].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return (
    <main className="page-container">
      <div className="page-stack">
        <PageHeader title={t('title')} subtitle={t('subtitle')} />

        <div className="workspace-grid">
          <section>
            <DebtForm />
          </section>

          <DebtsListClient
            debts={mergedDebts}
            t={{
              currency: t('currency'),
              filterAll: t('filterAll'),
              filterBorrowing: t('filterBorrowing'),
              filterLending: t('filterLending'),
              filterPending: t('filterPending'),
              filterPaid: t('filterPaid'),
              filterDate: t('filterDate'),
              saleDebt: t('saleDebt'),
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
