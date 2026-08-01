import { db } from "@/db";
import { expenses, batches } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { getTranslations } from 'next-intl/server';
import { ExpenseForm } from "@/components/ExpenseForm";
import { ExpensesListClient } from "@/components/ExpensesListClient";
import { PageHeader } from '@/components/PageHeader';
import { getFeedPricePerSac } from '@/actions/settings';

export default async function ExpensesPage() {
  const t = await getTranslations('Expenses');
  const feedPricePerSac = await getFeedPricePerSac();

  const allExpenses = await db
    .select({
      id: expenses.id,
      date: expenses.date,
      amount: expenses.amount,
      category: expenses.category,
      description: expenses.description,
      batchName: batches.name,
    })
    .from(expenses)
    .leftJoin(batches, eq(expenses.batchId, batches.id))
    .orderBy(desc(expenses.date));

  const activeBatches = await db.select().from(batches).where(eq(batches.status, 'active'));

  return (
    <main className="page-container">
      <div className="page-stack">
        <PageHeader title={t('title')} subtitle={t('subtitle')} />

        <div className="workspace-grid">
          <section>
            <ExpenseForm batches={activeBatches} feedPricePerSac={feedPricePerSac} />
          </section>

          <ExpensesListClient
            expenses={allExpenses}
            batches={activeBatches}
            feedPricePerSac={feedPricePerSac}
            t={{
              currency: t('currency'),
              filterAll: t('filterAll'),
              filterToday: t('filterToday'),
              filterWeek: t('filterWeek'),
              filterMonth: t('filterMonth'),
              empty: t('empty'),
              generalExpense: t('generalExpense'),
              editTitle: t('editTitle'),
              deleteTitle: t('deleteTitle'),
              deleteConfirm: t('deleteConfirm'),
              categories: {
                feed: t('categories.feed'),
                medication: t('categories.medication'),
                transport: t('categories.transport'),
                utilities: t('categories.utilities'),
                salaries: t('categories.salaries'),
                other: t('categories.other')
              }
            }}
          />
        </div>
      </div>
    </main>
  );
}
