import { DailyLogForm } from "@/components/DailyLogForm";
import { db } from "@/db";
import { batches } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';

export default async function Home() {
  const t = await getTranslations('Dashboard');
  
  let activeBatches: { id: string; name: string }[] = [];
  try {
    activeBatches = await db
      .select({ id: batches.id, name: batches.name })
      .from(batches)
      .where(eq(batches.status, "active"));
  } catch (e) {
    console.error("Failed to fetch batches:", e);
  }

  return (
    <main className="flex-1 p-6 md:p-12 max-w-lg mx-auto w-full">
      <div className="space-y-10">
        <header className="flex items-center justify-between mt-4">
          <div>
            <h1 className="text-4xl font-[900] text-slate-900 tracking-tight leading-none">
              EL BARAKA
            </h1>
            <p className="text-orange-500 font-black text-xs uppercase tracking-[0.2em] mt-2">{t('subtitle')}</p>
          </div>
          <div className="relative">
             <div className="w-14 h-14 bg-gradient-to-br from-orange-400 to-orange-600 rounded-[1.25rem] flex items-center justify-center text-white font-black text-xl shadow-xl shadow-orange-200">
              EB
            </div>
            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 border-4 border-[#f8fafc] rounded-full"></div>
          </div>
        </header>

        <section className="animate-in fade-in slide-in-from-bottom-4 duration-700">
          <DailyLogForm batches={activeBatches} />
        </section>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 gap-4 pb-10">
          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{t('connectivity')}</p>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <p className="text-lg font-black text-slate-800 tracking-tight">{t('cloud')}</p>
            </div>
          </div>
          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{t('activeBatches')}</p>
            <p className="text-2xl font-[1000] text-slate-900 tracking-tighter">{activeBatches.length}</p>
          </div>
        </div>
        
        {activeBatches.length === 0 && (
          <div className="bg-orange-500 p-8 rounded-[2.5rem] text-white shadow-2xl shadow-orange-200 relative overflow-hidden">
             <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>
            <p className="font-black text-xl mb-2">{t('welcome')}</p>
            <p className="text-orange-50 font-bold text-sm leading-relaxed opacity-90">
              {t('welcomeMessage')}
            </p>
            <Link href="/batches" className="mt-6 w-full h-12 bg-white text-orange-600 rounded-2xl font-black text-sm uppercase tracking-wider active:scale-95 transition-all flex items-center justify-center">
              {t('addFirstBatch')}
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
