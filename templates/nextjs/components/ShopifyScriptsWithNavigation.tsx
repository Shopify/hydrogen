"use client";

import { ShopifyScripts, type ShopifyScriptsProps } from "@shopify/hydrogen/react";
import { useRouter } from "next/navigation";

import { analyticsConsent } from "@/lib/config";
import type { Locale } from "@/lib/locale";
import { routeTemplates } from "@/lib/route-templates";

/**
 * `ShopifyScripts` navigation wrapper (`hydrogen-analytics` / `references/react.md`
 * + `hydrogen-setup` / `references/analytics.md`). The root layout is a server
 * component and cannot call `useRouter`, so `ShopifyScripts` (which needs a
 * `navigate` callback) must live in a client component. Rendered once in the
 * `[locale]` layout with that segment's resolved locale (which carries
 * `pathPrefix` and the `currency` set on the definition) and server-resolved
 * shop metadata.
 */
type ShopConfig = NonNullable<ShopifyScriptsProps["shop"]>;

export function ShopifyScriptsWithNavigation({
  shop,
  locale,
}: {
  shop: ShopConfig;
  locale: Locale;
}) {
  const router = useRouter();
  return (
    <ShopifyScripts
      i18n={locale}
      shop={shop}
      consent={analyticsConsent}
      navigate={(url: string) => router.push(url)}
      routes={routeTemplates}
    />
  );
}
