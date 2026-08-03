import type { NextConfig } from "next";
import withPWAInit, { runtimeCaching } from "@ducanh2912/next-pwa";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  extendDefaultRuntimeCaching: true,
  workboxOptions: {
    runtimeCaching: [
      {
        urlPattern: ({ url, request }) =>
          url.pathname.startsWith("/api/sync/") && request.method === "GET",
        handler: "NetworkFirst",
        options: {
          cacheName: "sync-bootstrap",
          expiration: {
            maxEntries: 8,
            maxAgeSeconds: 86400,
          },
          networkTimeoutSeconds: 10,
        },
      },
      ...runtimeCaching,
    ],
  },
});

const nextConfig: NextConfig = {
  // Standard Next.js config options here
};

export default withPWA(withNextIntl(nextConfig));
