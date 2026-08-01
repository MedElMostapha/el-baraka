import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, IBM_Plex_Sans_Arabic } from "next/font/google";
import { getLocale, getMessages } from 'next-intl/server';
import { NextIntlClientProvider } from 'next-intl';
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const arabicSans = IBM_Plex_Sans_Arabic({
  variable: "--font-plex-arabic",
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "El Baraka - Gestion Avicole",
  description: "Application mobile de gestion de ferme avicole",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "El Baraka",
  },
};

export const viewport: Viewport = {
  themeColor: "#173b35",
  width: "device-width",
  initialScale: 1,
};

import { BottomNav } from "@/components/BottomNav";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();
  const direction = locale === 'ar' ? 'rtl' : 'ltr';

  return (
    <html
      lang={locale}
      dir={direction}
      className={`${geistSans.variable} ${geistMono.variable} ${arabicSans.variable} antialiased`}
    >
      <body className="min-h-screen text-slate-900">
        <NextIntlClientProvider messages={messages}>
          <div className="app-shell">
            <BottomNav />
            <div className="app-main">{children}</div>
          </div>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
