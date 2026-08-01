"use client";

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Bird,
  ClipboardList,
  Handshake,
  LayoutDashboard,
  MoreHorizontal,
  Settings,
  TrendingDown,
  Wallet,
} from 'lucide-react';
import { useTranslations } from 'next-intl';

export function BottomNav() {
  const pathname = usePathname();
  const t = useTranslations('Navigation');
  const [moreOpen, setMoreOpen] = useState(false);

  const navItems = [
    { icon: LayoutDashboard, label: t('dashboard'), href: '/' },
    { icon: Bird, label: t('batches'), href: '/batches' },
    { icon: ClipboardList, label: t('inventory'), href: '/inventory' },
    { icon: Wallet, label: t('sales'), href: '/sales' },
    { icon: TrendingDown, label: t('expenses'), href: '/expenses' },
    { icon: Handshake, label: t('debts'), href: '/debts' },
    { icon: Settings, label: t('settings'), href: '/settings' },
  ];

  const primaryItems = navItems.slice(0, 4);
  const moreItems = navItems.slice(4);
  const isActive = (href: string) => pathname === href || (href !== '/' && pathname.startsWith(`${href}/`));
  const isMoreActive = moreItems.some((item) => isActive(item.href));

  return (
    <>
      <aside className="shell-sidebar" aria-label="Primary navigation">
        <div className="shell-brand">
          <div className="shell-brand__mark" aria-hidden="true">EB</div>
          <div>
            <div className="shell-brand__name">EL BARAKA</div>
            <div className="shell-brand__caption">Farm operations</div>
          </div>
        </div>

        <nav className="shell-nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`shell-nav__link ${active ? 'shell-nav__link--active' : ''}`}
              >
                <span className="shell-nav__icon"><Icon size={17} strokeWidth={2.2} /></span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="shell-sidebar__footer">
          <span className="shell-sidebar__footer-dot" aria-hidden="true" />
          <span>Local workspace</span>
        </div>
      </aside>

      <nav className="mobile-nav" aria-label="Mobile navigation">
        <div className="mobile-nav__bar">
          {primaryItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`mobile-nav__link ${active ? 'mobile-nav__link--active' : ''}`}
              >
                <Icon size={18} strokeWidth={active ? 2.5 : 2} />
                <span>{item.label}</span>
              </Link>
            );
          })}

          <div className="mobile-nav__more-wrap">
            <button
              type="button"
              aria-label={t('moreOptions')}
              aria-expanded={moreOpen}
              onClick={() => setMoreOpen((value) => !value)}
              className={`mobile-nav__link ${isMoreActive ? 'mobile-nav__link--active' : ''}`}
            >
              <MoreHorizontal size={19} strokeWidth={2.2} />
              <span>{t('more')}</span>
            </button>

            {moreOpen && (
              <div className="mobile-nav__more-menu">
                {moreItems.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMoreOpen(false)}
                      className={`mobile-nav__more-item ${active ? 'mobile-nav__more-item--active' : ''}`}
                    >
                      <Icon size={16} strokeWidth={2.2} />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </nav>
    </>
  );
}
