import type { Metadata } from "next";

import "../globals.css";

import { Suspense } from "react";

import { LocaleProvider } from "@/components/LocaleProvider";
import { ShopifyScriptsWithNavigation } from "@/components/ShopifyScriptsWithNavigation";
import { getAnalyticsShop } from "@/lib/analytics-shop";
import { shop } from "@/lib/config";
import { content } from "@/lib/content";
import { localeParams, resolveShellLocale, toLanguageTag } from "@/lib/locale";
import { SITE_ORIGIN } from "@/lib/site";

import { AppShell } from "./app-shell";

type Props = {
  params: Promise<{ locale: string }>;
  children: React.ReactNode;
};

/**
 * Root layout, one static shell per locale. Every page lives under this
 * `[locale]` segment so the locale is a route param, never a request read:
 * `generateStaticParams` enumerates the definition's locales and the build
 * prerenders each. `proxy.ts` rewrites incoming URLs into this shape, so the
 * public URL keeps whatever the routing type dictates (`/fr-ca/...`,
 * `fr.example.ca/...`, or nothing for the default). A segment that is not a
 * supported locale 404s in each page's `resolveLocaleParam` (`dynamicParams =
 * false` is not available under `cacheComponents`); the layout itself renders
 * the shell in the default locale for such a segment because a root layout has
 * nowhere to render a 404.
 *
 * With `cacheComponents: true` the layout prerenders the `<html>`/`<body>` +
 * announcement bar, then wraps the per-request (dynamic) `AppShell` (cart seed
 * + analytics shop + chrome) in `<Suspense>` so the dynamic parts stream while
 * the static shell serves immediately. `AppShell` calls `connection()` to opt
 * the subtree into dynamic rendering.
 *
 * `metadataBase` is set here for canonical/OG URL resolution (F10). The `<title>`
 * template uses the live `shop.name` (via `getAnalyticsShop`, which is cached
 * for hours) so the browser tab/OG titles match the header brand (N28) instead
 * of a hardcoded "CORE".
 */
export function generateStaticParams() {
  return localeParams();
}

export async function generateMetadata(): Promise<Metadata> {
  const { shopName } = await getAnalyticsShop();
  return {
    metadataBase: new URL(SITE_ORIGIN),
    title: {
      default: `${shopName} — ${content.home.hero.heading}`,
      template: `%s — ${shopName}`,
    },
    description: content.home.hero.subtitle,
    icons: {
      icon: { url: "/favicon.svg", type: "image/svg+xml" },
    },
  };
}

export default async function RootLayout({ params, children }: Props) {
  const locale = resolveShellLocale((await params).locale);

  return (
    <html lang={toLanguageTag(locale)}>
      <head>
        <ShopifyScriptsWithNavigation shop={shop} locale={locale} />
      </head>
      <body className="bg-surface text-on-surface font-body flex min-h-svh flex-col antialiased">
        <LocaleProvider locale={locale}>
          <div
            role="region"
            aria-label={content.announcement.label}
            className="bg-on-surface px-margin py-2.5 text-center"
          >
            <p className="type-body-sm text-surface">{content.announcement.text}</p>
          </div>

          <Suspense
            fallback={
              <div className="bg-surface text-on-surface-secondary flex-1" aria-busy="true" />
            }
          >
            <AppShell locale={locale}>{children}</AppShell>
          </Suspense>
        </LocaleProvider>
      </body>
    </html>
  );
}
