"use client";

import { defaultI18n, type shop as shopConfigType } from "@shared/config";
import { ShopifyScripts } from "@shopify/hydrogen/react";
import { useRouter } from "next/navigation";

import { routeTemplates } from "@/lib/route-templates";

/**
 * `ShopifyScripts` client wrapper (`hydrogen-analytics` / `references/react.md`
 * + `hydrogen-setup` / `references/analytics.md`). The root layout is a server
 * component and cannot call `useRouter`, so `ShopifyScripts` (which needs a
 * `navigate` callback) must live in a client component. Rendered once in the
 * root layout with the resolved market `i18n` (single-market example →
 * `defaultI18n`) and the numeric `shop` from `@shared/config`.
 */
type ShopConfig = typeof shopConfigType;

export function ShopifyScriptsClient({ shop }: { shop: ShopConfig }) {
  const router = useRouter();
  return (
    <ShopifyScripts
      i18n={defaultI18n}
      shop={shop}
      navigate={(url: string) => router.push(url)}
      routes={routeTemplates}
    />
  );
}
