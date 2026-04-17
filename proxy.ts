import createMiddleware from 'next-intl/middleware';

export default createMiddleware({
  // A list of all locales that are supported
  locales: ['fr', 'ar'],
 
  // Used when no locale matches
  defaultLocale: 'fr',

  // No prefix in the URL (e.g. /dashboard instead of /fr/dashboard)
  localePrefix: 'never'
});

export const config = {
  // Match only internationalized pathnames
  matcher: ['/', '/(fr|ar)/:path*', '/((?!api|_next|_vercel|.*\\..*).*)']
};
