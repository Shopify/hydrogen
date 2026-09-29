import { storefrontConfig } from "./config";
import { getOptionalSharedSecret } from "./private-env";

/**
 * Zero-secrets Storefront config resolver shared by the framework examples
 * (`astro`, `nuxt`, `solid-start`, `sveltekit`).
 *
 * When no `PRIVATE_STOREFRONT_API_TOKEN` is provisioned (local dev without the
 * decrypted ejson secrets — the default for anyone outside Shopify), the
 * examples fall back to [mock.shop](https://mock.shop) with tokenless public
 * access, so a fresh clone renders instead of throwing on every SSR request.
 * mock.shop is auth-free and rejects any private token. With a real private
 * token present, the configured store is used unchanged (`PUBLIC_STORE_DOMAIN`
 * overrides the bundled demo store domain).
 *
 * Mirrors the mock mode in `templates/nextjs/lib/storefront-config.ts`.
 * mock.shop has no Customer Account API, so account sign-in is unavailable in
 * this mode.
 */

export const MOCK_SHOP_DOMAIN = "mock.shop";

// Discriminated on `mode` so a private token can never be attached to a mock
// store, and a real store can never be created tokenless.
export type ResolvedStorefrontConfig =
  | { mode: "mock"; storeDomain: string }
  | { mode: "private"; storeDomain: string; privateStorefrontToken: string };

let mockShopFallbackWarned = false;

/**
 * @param exampleName Package-ish label used in the fallback warning, e.g. `"hydrogen-example-astro"`.
 * @param env Framework-supplied env bag (SvelteKit's `$env/dynamic/private`,
 *   Nitro's runtime env, …) for runtimes where `process.env` isn't populated.
 */
export function resolveStorefrontConfig(
  exampleName: string,
  env?: object | null,
): ResolvedStorefrontConfig {
  const privateStorefrontToken = getOptionalSharedSecret("PRIVATE_STOREFRONT_API_TOKEN", env);

  if (!privateStorefrontToken) {
    if (!mockShopFallbackWarned) {
      mockShopFallbackWarned = true;
      console.warn(
        `[${exampleName}] No PRIVATE_STOREFRONT_API_TOKEN found — ` +
          `running against mock.shop (${MOCK_SHOP_DOMAIN}). Set ` +
          `PRIVATE_STOREFRONT_API_TOKEN and PUBLIC_STORE_DOMAIN, or run ` +
          `"pnpm examples:secrets:decrypt", to use a real store.`,
      );
    }
    return { mode: "mock", storeDomain: MOCK_SHOP_DOMAIN };
  }

  const storeDomain =
    getOptionalSharedSecret("PUBLIC_STORE_DOMAIN", env) ?? storefrontConfig.storeDomain;

  return { mode: "private", storeDomain, privateStorefrontToken };
}
