import type { Metadata } from "next";

import "./globals.css";

import { Suspense } from "react";

import { ShopifyScriptsWithNavigation } from "@/components/ShopifyScriptsWithNavigation";
import { getAnalyticsShop } from "@/lib/analytics-shop";
import { defaultI18n, shop } from "@/lib/config";
import { content } from "@/lib/content";
import { SITE_ORIGIN } from "@/lib/site";

import { AppShell } from "./app-shell";

/**
 * Root layout. With `cacheComponents: true`,
 * the layout is a **static shell** — it prerenders the `<html>`/`<body>` +
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

// `<html lang>` is derived from the i18n config source of truth
// (`defaultI18n.language`) rather than a hardcoded literal, so
// a store language change flows here automatically (N27/R20). Kept as a static
// value (not request-scoped) to preserve the static shell; a multi-market store
// would inject the resolved locale per request via
// middleware/parent server component instead.
const htmlLang = defaultI18n.language.toLowerCase();

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { currency } = await getAnalyticsShop();

  return (
    <html lang={htmlLang}>
      <head>
        <ShopifyScriptsWithNavigation shop={shop} currency={currency} />
      </head>
      <body className="bg-surface text-on-surface font-body flex min-h-svh flex-col antialiased">
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
          <AppShell>{children}</AppShell>
        </Suspense>
      </body>
    </html>
  );
}
