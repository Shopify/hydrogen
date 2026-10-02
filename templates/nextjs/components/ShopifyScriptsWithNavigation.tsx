"use client";

import { ShopifyScripts, type ShopifyScriptsProps } from "@shopify/hydrogen/react";
import { useRouter } from "next/navigation";

import { analyticsConsent, defaultI18n } from "@/lib/config";
import { routeTemplates } from "@/lib/route-templates";

/**
 * `ShopifyScripts` navigation wrapper (`hydrogen-analytics` / `references/react.md`
 * + `hydrogen-setup` / `references/analytics.md`). The root layout is a server
 * component and cannot call `useRouter`, so `ShopifyScripts` (which needs a
 * `navigate` callback) must live in a client component. Rendered once in the
 * root layout with the resolved market `i18n` (single-market example →
 * `defaultI18n`) and server-resolved shop metadata.
 */
type ShopConfig = NonNullable<ShopifyScriptsProps["shop"]>;

export function ShopifyScriptsWithNavigation({ shop }: { shop: ShopConfig }) {
  const router = useRouter();
  return (
    <ShopifyScripts
      i18n={defaultI18n}
      shop={shop}
      consent={analyticsConsent}
      navigate={(url: string) => router.push(url)}
      routes={routeTemplates}
    />
  );
}
