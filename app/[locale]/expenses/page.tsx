import { db } from "@/db";
import { expenses, batches } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { getTranslations } from 'next-intl/server';
import { ExpenseForm } from "@/components/ExpenseForm";
import { ExpensesListClient } from "@/components/ExpensesListClient";
import { PageHeader } from '@/components/PageHeader';

export default async function ExpensesPage() {
  const t = await getTranslations('Expenses');
  
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
    <main className="flex-1 p-6 md:p-12 max-w-lg mx-auto w-full pb-32">
      <div className="space-y-10">
        <PageHeader title={t('title')} subtitle={t('subtitle')} />

        <section>
          <ExpenseForm batches={activeBatches} />
        </section>

        <ExpensesListClient 
          expenses={allExpenses} 
          t={{
            currency: t('currency'),
            filterAll: t('filterAll'),
            filterToday: t('filterToday'),
            filterWeek: t('filterWeek'),
            filterMonth: t('filterMonth'),
            empty: t('empty'),
            generalExpense: t('generalExpense'),
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
    </main>
  );
}
