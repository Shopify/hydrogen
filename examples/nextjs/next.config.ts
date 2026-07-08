import { localCdnAssetsTurbopackRules } from "@shared/local-cdn-assets-plugin/turbopack";
import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";

/**
 * Next.js 16 config for the Hydrogen example.
 *
 * `cacheComponents: true` enables Cache Components / `use cache` (engineering.md
 * F2 native Next caching instead of the Oxygen sub-request LRU). Turbopack
 * rules wire `localCdnAssetsTurbopackRules()` so Shopify WebMCP scripts resolve
 * locally in dev (parity with the react-router `localCdnAssets()` vite plugin).
 *
 * No `next/image` remote patterns — we use plain `<img>` + the `hydrogen-image`
 * helper (F12; Hydrogen ships no Image component and we size CDN URLs ourselves).
 */
const EMPTY_TURBOPACK_RULES = {};

export default function nextConfig(phase: string): NextConfig {
  const isDevelopmentServer = phase === PHASE_DEVELOPMENT_SERVER;

  return {
    cacheComponents: true,
    // React Strict Mode is disabled because `@shopify/hydrogen/react`'s
    // `PredictiveSearchProvider` destroys its store in the Strict Mode effect
    // cleanup (double-invoke), and `useMemo` returns the same (now-destroyed)
    // store instance for the second mount — so the predictive search store is
    // permanently `destroyed` and `store.search()` no-ops, breaking header
    // autocomplete. Disabling Strict Mode avoids the destroy; the cart provider
    // is unaffected (it recreates its store). Re-enable once the provider is
    // Strict-Mode-safe upstream.
    reactStrictMode: false,
    turbopack: {
      rules: isDevelopmentServer
        ? localCdnAssetsTurbopackRules({ createSymlinks: true })
        : EMPTY_TURBOPACK_RULES,
    },
  };
}
