import { db } from "@/db";
import { sales, batches, clients } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { getTranslations } from 'next-intl/server';
import { SalesForm } from "@/components/SalesForm";
import { Wallet, Bird, Calendar } from "lucide-react";

export default async function SalesPage() {
  const t = await getTranslations('Sales');
  
  const allSales = await db
    .select({
      id: sales.id,
      date: sales.date,
      quantity: sales.quantity,
      totalPrice: sales.totalPrice,
      amountPaid: sales.amountPaid,
      type: sales.type,
      batchName: batches.name,
      clientName: clients.name,
    })
    .from(sales)
    .leftJoin(batches, eq(sales.batchId, batches.id))
    .leftJoin(clients, eq(sales.clientId, clients.id))
    .orderBy(desc(sales.date));

  const activeBatches = await db.select().from(batches).where(eq(batches.status, 'active'));
  const allClients = await db.select().from(clients);

  return (
    <main className="flex-1 p-6 md:p-12 max-w-lg mx-auto w-full pb-32">
      <div className="space-y-10">
        <header>
          <h1 className="text-4xl font-[900] text-slate-900 tracking-tight leading-none">
            {t('title')}
          </h1>
          <p className="text-orange-500 font-black text-xs uppercase tracking-[0.2em] mt-2">{t('subtitle')}</p>
        </header>

        <section>
          <SalesForm batches={activeBatches} clients={allClients} />
        </section>

        <section className="space-y-4">
          {allSales.map((sale) => {
            const debt = sale.totalPrice - sale.amountPaid;
            return (
              <div 
                key={sale.id} 
                className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm space-y-4"
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400">
                      <Wallet className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-black text-slate-800 tracking-tight">
                        {sale.totalPrice.toLocaleString()} DH
                      </h3>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                        {sale.clientName || t('cashClient')}
                      </p>
                    </div>
                  </div>
                  <span className={`text-[10px] font-black px-2 py-1 rounded-lg uppercase ${
                    debt > 0 ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-500'
                  }`}>
                    {debt > 0 ? `-${debt} DH` : t('paidFull')}
                  </span>
                </div>

                <div className="flex items-center gap-4 border-t border-slate-50 pt-4">
                   <div className="flex items-center gap-1 text-[10px] font-black text-slate-400 uppercase">
                      <Bird className="w-3 h-3 text-orange-400" />
                      {sale.batchName}
                   </div>
                   <div className="flex items-center gap-1 text-[10px] font-black text-slate-400 uppercase">
                      <Calendar className="w-3 h-3" />
                      {new Date(sale.date).toLocaleDateString()}
                   </div>
                </div>
              </div>
            );
          })}
        </section>
      </div>
    </main>
  );
}
