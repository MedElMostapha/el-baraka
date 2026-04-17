"use client";

import React from 'react';
import { InventoryForm } from "@/components/InventoryForm";
import { Package, Layers } from "lucide-react";
import { useRouter } from 'next/navigation';

interface InventoryItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  lastUpdated: string | null;
}

interface InventoryTranslations {
  title: string;
  subtitle: string;
  addNew: string;
  feed: string;
  medicine: string;
  packaging: string;
  other: string;
  [key: string]: string;
}

export default function InventoryClient({ initialItems, t }: { initialItems: InventoryItem[], t: InventoryTranslations }) {
  const router = useRouter();

  const handleComplete = () => {
    router.refresh();
  };

  return (
    <main className="flex-1 p-6 md:p-12 max-w-lg mx-auto w-full pb-32">
      <div className="space-y-10">
        <header>
          <h1 className="text-4xl font-[900] text-slate-900 tracking-tight leading-none">
            {t.title}
          </h1>
          <p className="text-orange-500 font-black text-xs uppercase tracking-[0.2em] mt-2">{t.subtitle}</p>
        </header>

        <section>
          <InventoryForm onComplete={handleComplete} />
        </section>

        <section className="space-y-4">
          {initialItems.map((item) => (
            <div 
              key={item.id} 
              className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center justify-between"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400">
                  <Package className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-black text-slate-800 tracking-tight">{item.name}</h3>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-[10px] font-black text-orange-500 bg-orange-50 px-2 py-0.5 rounded-full uppercase tracking-tighter">
                      {t[item.category] || item.category}
                    </span>
                    <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase">
                      <Layers className="w-3 h-3" />
                      {item.quantity} {item.unit}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}
