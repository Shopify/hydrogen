import type { PrivateStorefrontClient } from "../../client";
import { gql } from "../../graphql";
import { getVariantIdParam } from "../product/options";
import { getStandardRoute, matchStandardRouteUrl } from "../standard-routes";
import type { ShopifyRouteTemplates } from "../standard-routes";
import { createRedirectResponse } from "./url-redirects";

const VARIANT_DEEP_LINK_QUERY = gql(`
  query VariantDeepLink($id: ID!) {
    node(id: $id) {
      ... on ProductVariant {
        product {
          handle
        }
        selectedOptions {
          name
          value
        }
      }
    }
  }
`);

const VARIANT_PARAM = "variant";

// Shopify's sentinel option for single-variant products. Not a real choice, so
// it never belongs in a product URL.
const DEFAULT_OPTION_NAME = "Title";
const DEFAULT_OPTION_VALUE = "Default Title";

export type VariantDeepLinkOptions = {
  request: Request;
  storefrontClient: PrivateStorefrontClient;
  /**
   * The app's custom route templates. Used to recognize the incoming product
   * URL and to build the redirect target, so apps serving products from a
   * non-standard path (`/p/:productHandle`) work without extra configuration.
   */
  routeTemplates?: ShopifyRouteTemplates;
  /** The active `i18n.pathPrefix`, when the app serves localized paths. */
  pathPrefix?: string;
};

/**
 * Redirects an inbound `?variant=<id>` deep link to the product URL's
 * option-param form.
 *
 * Shopify's own surfaces — Liquid storefronts, Shopping feeds, email campaigns,
 * paid ads, and Shop Pay — link to a product with a bare variant id
 * (`/products/shoes?variant=41565182099480`). Hydrogen product pages read
 * option params (`?Color=Red&Size=M`), so without this those links resolve to
 * the product's default variant instead of the one the shopper chose.
 *
 * Returns a 307 `Response` when the request is a product URL carrying a
 * resolvable variant id, and `null` otherwise — including for unresolvable or
 * stale ids, so an outdated link renders the default variant rather than 404.
 *
 * Unlike {@link handleShopifyRedirects}, this runs *before* the route renders,
 * not after a 404: the product route exists, and only the variant selection
 * needs translating. Run it early enough that the redirect is a real HTTP
 * response — a redirect issued during rendering can degrade to a client-side
 * one, which never runs for a shopper with JavaScript disabled.
 *
 * The redirect preserves unrelated params (`utm_*`, `ref`) so campaign
 * attribution survives, and follows the variant's own product handle so a
 * combined-listing variant lands on the right page.
 *
 * @example
 * ```ts
 * const variantRedirect = await handleVariantDeepLink({ request, storefrontClient });
 * if (variantRedirect) return variantRedirect;
 * ```
 */
export async function handleVariantDeepLink({
  request,
  storefrontClient,
  routeTemplates = {},
  pathPrefix,
}: VariantDeepLinkOptions): Promise<Response | null> {
  const url = new URL(request.url);

  // Cheapest guard first: almost no traffic carries a variant param.
  const variantId = getVariantIdParam({ searchParams: url.searchParams });
  if (!variantId) return null;

  const match = matchStandardRouteUrl({ url: request.url, routeTemplates, pathPrefix });
  if (match?.route !== "product") return null;

  const { data, errors } = await storefrontClient.graphql(VARIANT_DEEP_LINK_QUERY, {
    variables: { id: variantId },
  });

  if (errors) {
    console.error("[hydrogen] Variant deep link query failed", errors);
  }

  const node = data?.node;
  if (!node || !("selectedOptions" in node)) return null;

  const pathname = getStandardRoute(
    routeTemplates,
    "product",
    { productHandle: node.product.handle },
    { pathPrefix },
  );

  const search = buildOptionSearch(url.searchParams, node.selectedOptions);

  // 307, not 308: option values are merchant-editable, so this mapping must not
  // be cached in shoppers' browsers permanently.
  return createRedirectResponse(`${pathname}${search}`, 307);
}

/**
 * Swaps the variant param for the variant's option params, keeping everything
 * else so campaign attribution (`utm_*`, `ref`) survives the redirect.
 */
function buildOptionSearch(
  searchParams: URLSearchParams,
  selectedOptions: ReadonlyArray<{ name: string; value: string }>,
): string {
  const params = new URLSearchParams(searchParams);
  params.delete(VARIANT_PARAM);

  for (const option of selectedOptions) {
    if (option.name === DEFAULT_OPTION_NAME && option.value === DEFAULT_OPTION_VALUE) continue;
    params.set(option.name, option.value);
  }

  const search = params.toString();
  return search ? `?${search}` : "";
}
