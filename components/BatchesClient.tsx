"use client";

import React from 'react';
import { BatchForm } from "@/components/BatchForm";
import { Bird, Calendar, Hash, ArrowRight } from "lucide-react";
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/PageHeader';

interface Batch {
  id: string;
  name: string;
  arrivalDate: Date;
  initialQuantity: number;
  remainingQuantity: number;
  status: string;
}

interface BatchTranslations {
  title: string;
  subtitle: string;
  addNew: string;
  empty: string;
  remaining: string;
}

export default function BatchesClient({ initialBatches, t }: { initialBatches: Batch[], t: BatchTranslations }) {
  const router = useRouter();

  const handleComplete = () => {
    router.refresh();
  };

  return (
    <main className="flex-1 p-6 md:p-12 max-w-lg mx-auto w-full pb-32">
      <div className="space-y-10">
        <PageHeader title={t.title} subtitle={t.subtitle} />

        <section>
          <BatchForm onComplete={handleComplete} />
        </section>

        <section className="space-y-4">
          {initialBatches.length === 0 ? (
            <div className="text-center py-12 bg-white/50 rounded-[2.5rem] border border-dashed border-slate-300">
              <Bird className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-400 font-bold">{t.empty}</p>
            </div>
          ) : (
            initialBatches.map((batch) => (
              <div 
                key={batch.id} 
                className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center justify-between group active:scale-95 transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                    batch.status === 'active' ? 'bg-orange-100 text-orange-600' : 'bg-slate-100 text-slate-400'
                  }`}>
                    <Bird className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-800 tracking-tight">{batch.name}</h3>
                    <div className="flex items-center gap-3 mt-1">
                      <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase">
                        <Calendar className="w-3 h-3" />
                        {new Date(batch.arrivalDate).toLocaleDateString()}
                      </div>
                      <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase">
                        <Hash className="w-3 h-3" />
                        {batch.initialQuantity}
                      </div>
                      <div className="flex items-center gap-1 text-[10px] font-bold text-orange-500 uppercase ml-2 bg-orange-50 px-2 py-0.5 rounded-md">
                        {t.remaining}: {batch.remainingQuantity}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="w-10 h-10 rounded-full border border-slate-100 flex items-center justify-center group-hover:bg-slate-50 transition-colors">
                  <ArrowRight className="w-5 h-5 text-slate-300" />
                </div>
              </div>
            ))
          )}
        </section>
      </div>
    </main>
  );
}
