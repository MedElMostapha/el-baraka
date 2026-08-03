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
import { BrandProvider } from "@/components/BrandLogo";
import { OfflineProvider } from "@/components/OfflineProvider";
import { OfflineStatus } from "@/components/OfflineStatus";
import { OfflineBanner } from "@/components/OfflineBanner";
import { getLogoImage } from "@/actions/settings";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();
  const direction = locale === 'ar' ? 'rtl' : 'ltr';
  const logoImage = await getLogoImage();

  return (
    <html
      lang={locale}
      dir={direction}
      className={`${geistSans.variable} ${geistMono.variable} ${arabicSans.variable} antialiased`}
    >
      <body className="min-h-screen text-slate-900">
        <NextIntlClientProvider messages={messages}>
          <BrandProvider logoImage={logoImage}>
            <OfflineProvider>
              <div className="app-shell">
                <BottomNav logoImage={logoImage} />
                <div className="app-main">
                  <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center gap-x-4 gap-y-2 px-4 pt-3 sm:px-6 lg:px-10">
                    <OfflineStatus />
                    <OfflineBanner />
                  </div>
                  {children}
                </div>
              </div>
            </OfflineProvider>
          </BrandProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
