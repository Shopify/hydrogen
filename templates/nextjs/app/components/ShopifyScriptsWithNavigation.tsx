"use client";

import { ShopifyScripts } from "@shopify/hydrogen/react";
import { useRouter } from "next/navigation";

import { routeTemplates } from "../lib/route-templates";
import { analyticsConsent, shop, storefrontConfig } from "../lib/shop";

export function ShopifyScriptsWithNavigation() {
  const router = useRouter();

  return (
    <ShopifyScripts
      i18n={storefrontConfig.i18n}
      shop={shop}
      consent={analyticsConsent}
      navigate={router.push}
      routes={routeTemplates}
    />
  );
}
