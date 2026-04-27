"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Bird, ClipboardList, Wallet, Settings, TrendingDown, Handshake } from 'lucide-react';
import { useTranslations } from 'next-intl';

export function BottomNav() {
  const pathname = usePathname();
  const t = useTranslations('Navigation');

  const navItems = [
    { icon: LayoutDashboard, label: t('dashboard'), href: '/' },
    { icon: Bird, label: t('batches'), href: '/batches' },
    { icon: ClipboardList, label: t('inventory'), href: '/inventory' },
    { icon: Wallet, label: t('sales'), href: '/sales' },
    { icon: TrendingDown, label: t('expenses'), href: '/expenses' },
    { icon: Handshake, label: t('debts'), href: '/debts' },
    { icon: Settings, label: t('settings'), href: '/settings' },
  ];

  return (
    <nav className="fixed bottom-6 left-6 right-6 z-50 max-w-lg mx-auto">
      <div className="flex justify-around items-center h-16 bg-white/80 backdrop-blur-2xl border border-white/50 shadow-[0_20px_50px_rgba(0,0,0,0.1)] rounded-[2rem] px-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          
          return (
            <Link 
              key={item.href} 
              href={item.href}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-all relative group ${
                isActive ? 'text-orange-600' : 'text-slate-400'
              }`}
            >
              <div className={`p-2 rounded-xl transition-all duration-300 ${
                isActive ? 'bg-orange-500 text-white shadow-lg shadow-orange-200 scale-110 -translate-y-1' : 'group-hover:bg-slate-50 group-hover:text-slate-600'
              }`}>
                <Icon className="w-[18px] h-[18px]" />
              </div>
              {!isActive && (
                <span className="text-[9px] font-black mt-1.5 uppercase tracking-tighter opacity-0 group-hover:opacity-100 transition-opacity">
                  {item.label}
                </span>
              )}
              {isActive && (
                <div className="absolute -bottom-1 w-1 h-1 bg-orange-500 rounded-full animate-pulse"></div>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
