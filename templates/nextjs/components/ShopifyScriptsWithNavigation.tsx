"use client";

import { ShopifyScripts, type ShopifyScriptsProps } from "@shopify/hydrogen/react";
import { useRouter } from "next/navigation";

import { analyticsConsent } from "@/lib/config";
import { routeTemplates } from "@/lib/route-templates";

/**
 * `ShopifyScripts` navigation wrapper. The root layout is a server component
 * and cannot call `useRouter`, so `ShopifyScripts` (which needs a `navigate`
 * callback) must live in a client component. The layout assembles the resolved
 * `i18n` (with server-fetched currency) and passes it here as a complete object.
 */
type ShopConfig = NonNullable<ShopifyScriptsProps["shop"]>;
type I18nConfig = NonNullable<ShopifyScriptsProps["i18n"]>;

export function ShopifyScriptsWithNavigation({
  shop,
  i18n,
}: {
  shop: ShopConfig;
  i18n: I18nConfig;
}) {
  const router = useRouter();
  return (
    <ShopifyScripts
      i18n={i18n}
      shop={shop}
      consent={analyticsConsent}
      navigate={(url: string) => router.push(url)}
      routes={routeTemplates}
    />
  );
}
