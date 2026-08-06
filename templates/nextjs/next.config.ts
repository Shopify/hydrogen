import type { NextConfig } from "next";

/**
 * Next.js 16 config for the Hydrogen template.
 *
 * `cacheComponents: true` enables Cache Components / `use cache`.
 *
 * No `next/image` remote patterns — we use plain `<img>` + the `hydrogen-image`
 * helper (F12; Hydrogen ships no Image component and we size CDN URLs ourselves).
 */
export default function nextConfig(): NextConfig {
  return {
    cacheComponents: true,
    turbopack: {
      root: __dirname,
    },
    // React Strict Mode is disabled because `@shopify/hydrogen/react`'s
    // `PredictiveSearchProvider` destroys its store in the Strict Mode effect
    // cleanup (double-invoke), and `useMemo` returns the same (now-destroyed)
    // store instance for the second mount — so the predictive search store is
    // permanently `destroyed` and `store.search()` no-ops, breaking header
    // autocomplete. Disabling Strict Mode avoids the destroy; the cart provider
    // is unaffected (it recreates its store). Re-enable once the provider is
    // Strict-Mode-safe upstream.
    reactStrictMode: false,
  };
}
