"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Bird, ClipboardList, Wallet, Settings, TrendingDown } from 'lucide-react';
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
    { icon: Settings, label: t('settings'), href: '/settings' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass border-t border-slate-200/50 safe-bottom">
      <div className="flex justify-around items-center h-16 max-w-lg mx-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          
          return (
            <Link 
              key={item.href} 
              href={item.href}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-all active:scale-90 ${
                isActive ? 'text-orange-600' : 'text-slate-400'
              }`}
            >
              <div className={`p-1 rounded-xl transition-colors ${isActive ? 'bg-orange-50' : ''}`}>
                <Icon className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-bold mt-1 uppercase tracking-tighter">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
