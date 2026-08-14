import type { StorefrontClient } from "../../client";
import { StorefrontApiError, StorefrontTimeoutError } from "../../client/errors";
import { gql } from "../../graphql";
import type { CachingStrategy } from "../cache";
import { getLogger } from "../logging";
import type {
  ShopifyRouteHandlerResult,
  ShopifyRouteMatchHandler,
} from "../request-routing/route-types";
import { getStandardRoute } from "../standard-routes/build";
import { matchStandardRouteUrl } from "../standard-routes/match";
import type { ShopifyRouteTemplates } from "../standard-routes/types";
import {
  buildProductSelectionSearchParams,
  parseVariantSearchParam,
  VARIANT_SEARCH_PARAM,
} from "./url";

const log = getLogger("product");

const HTTP_FOUND_STATUS = 302;
const inFlightVariantLookups = new Map<string, Promise<SelectedOptionsVariant | null>>();

const VARIANT_SELECTED_OPTIONS_QUERY = gql(`
  query VariantSelectedOptions($id: ID!, $country: CountryCode, $language: LanguageCode)
  @inContext(country: $country, language: $language) {
    node(id: $id) {
      ... on ProductVariant {
        selectedOptions {
          name
          value
        }
        product {
          handle
        }
      }
    }
  }
`);

type SelectedOptionsVariant = {
  selectedOptions: { name: string; value: string }[];
  product: { handle: string };
};

export type AcceptProductVariantIdOptions = {
  /**
   * The app's route templates, used to recognize product page URLs and to build the
   * redirect target when the variant belongs to a different product (combined listings).
   */
  routeTemplates: ShopifyRouteTemplates;
  /**
   * i18n path prefix of the current request (`i18n.pathPrefix`, e.g. `"/fr-ca"`), for apps
   * serving locale-prefixed URLs. Omit it when the app does not prefix pathnames.
   *
   * It is needed in two places:
   *
   * 1. Recognizing product URLs: `/fr-ca/products/snowboard?variant=123` only matches the
   *    product route template once the prefix is stripped, and Hydrogen cannot guess which
   *    leading segments are locales (`/fr`, `/fr-ca`, `/en-gb/eu`, …).
   * 2. Cross-product redirects: when the variant belongs to a different product (combined
   *    listings), the target pathname is rebuilt from the product route template, and the
   *    prefix must be prepended so the buyer stays in the localized tree.
   *
   * Same-product redirects reuse the request pathname, so the prefix survives those
   * automatically.
   *
   * @example
   * ```ts
   * // Without pathPrefix, localized URLs pass through unhandled:
   * //   /fr-ca/products/snowboard?variant=123 → no match → default variant renders
   * // With pathPrefix: "/fr-ca":
   * //   /fr-ca/products/snowboard?variant=123 → 302 /fr-ca/products/snowboard?Color=Red
   * //   /fr-ca/products/snowboard?variant=456 → 302 /fr-ca/products/combined-parent?Size=M
   * acceptProductVariantId({ routeTemplates, pathPrefix: i18n.pathPrefix });
   * ```
   */
  pathPrefix?: string;
  /**
   * Caching strategy for the variant lookup, e.g. `Cache.long()`. A variant's selected
   * options are near-immutable, so caching absorbs repeated lookups for hot campaign
   * links. Requires a storefront client created with a `cache` instance; omit otherwise.
   */
  cache?: CachingStrategy;
};

/**
 * Accepts Liquid-style `?variant=<numeric id>` links on product pages by redirecting them
 * to the canonical option-params URL, e.g. `/products/snowboard?variant=123` →
 * `302 /products/snowboard?Color=Red&Size=M`.
 *
 * Pass the returned handler to `handleShopifyRoutes` via `handlers`. It claims only
 * GET/HEAD requests whose URL matches a product route template and carries a numeric
 * `variant` param; everything else falls through to the framework. When both `variant`
 * and option params are present, the variant wins and the option params are replaced.
 * Unknown/deleted variant ids redirect to the same URL with the `variant` param stripped,
 * preserving any remaining params for the product loader. Params unrelated to the
 * selection (`?ref=campaign`) are preserved. On cross-product (combined listing) redirects,
 * params matching the *source* product's option names are not stripped — the handler only
 * knows the target variant's options; loaders filtering with `allowedOptionNames` ignore
 * the leftovers.
 *
 * @example
 * ```ts
 * handleShopifyRoutes({
 *   request,
 *   requestContext,
 *   sessionManager,
 *   storefrontClient,
 *   handlers: [acceptProductVariantId({ routeTemplates }), cartHandlers],
 * });
 * ```
 */
export function acceptProductVariantId({
  routeTemplates,
  pathPrefix,
  cache,
}: AcceptProductVariantIdOptions): ShopifyRouteMatchHandler {
  return (url, { request, storefrontClient }) => {
    if (request.method !== "GET" && request.method !== "HEAD") return null;

    const variantId = parseVariantSearchParam(url.searchParams.get(VARIANT_SEARCH_PARAM));
    if (!variantId) return null;

    const match = matchStandardRouteUrl({ routeTemplates, pathPrefix, url: url.href });
    if (match?.pageTemplateName !== "product") return null;

    return resolveVariantRedirect({
      cache,
      pathPrefix,
      requestedHandle: match.params.productHandle,
      routeTemplates,
      storefrontClient,
      url,
      variantId,
    });
  };
}

async function resolveVariantRedirect({
  cache,
  pathPrefix,
  requestedHandle,
  routeTemplates,
  storefrontClient,
  url,
  variantId,
}: {
  cache: CachingStrategy | undefined;
  pathPrefix: string | undefined;
  requestedHandle: string | undefined;
  routeTemplates: ShopifyRouteTemplates;
  storefrontClient: StorefrontClient;
  url: URL;
  variantId: string;
}): Promise<ShopifyRouteHandlerResult> {
  const variant = await fetchVariantSelectedOptions(storefrontClient, variantId, cache);

  const searchParams = buildProductSelectionSearchParams({
    selectedOptions: variant?.selectedOptions ?? [],
    optionNames: [],
    base: url.searchParams,
  });

  const pathname =
    variant && !isSameHandle(variant.product.handle, requestedHandle)
      ? getStandardRoute(
          routeTemplates,
          "product",
          { productHandle: variant.product.handle },
          { pathPrefix },
        )
      : url.pathname;

  const search = searchParams.toString();
  return {
    type: "redirect",
    status: HTTP_FOUND_STATUS,
    location: search ? `${pathname}?${search}` : pathname,
  };
}

async function fetchVariantSelectedOptions(
  storefrontClient: StorefrontClient,
  variantId: string,
  cache: CachingStrategy | undefined,
): Promise<SelectedOptionsVariant | null> {
  const { country, language } = storefrontClient.i18n;
  const cacheKey = `${storefrontClient.storeUrl}:${country ?? ""}:${language ?? ""}:${variantId}`;
  const inFlight = inFlightVariantLookups.get(cacheKey);
  if (inFlight) return inFlight;

  const lookup = queryVariantSelectedOptions(storefrontClient, variantId, cache).finally(() => {
    inFlightVariantLookups.delete(cacheKey);
  });
  inFlightVariantLookups.set(cacheKey, lookup);
  return lookup;
}

async function queryVariantSelectedOptions(
  storefrontClient: StorefrontClient,
  variantId: string,
  cache: CachingStrategy | undefined,
): Promise<SelectedOptionsVariant | null> {
  try {
    // Typed as a variable (not an object literal) so the optional `cache` key is
    // assignable to clients whose graphql options do not declare it; the client
    // validates cache usage at runtime.
    const options: { variables: { id: string }; cache?: CachingStrategy } = {
      variables: { id: variantId },
    };
    if (cache) options.cache = cache;

    const result = await storefrontClient.graphql(VARIANT_SELECTED_OPTIONS_QUERY, options);

    if (result.errors) {
      log.error("variant id redirect lookup failed", { errors: result.errors, variantId });
      return null;
    }

    const node = result.data?.node;
    if (node && "selectedOptions" in node) return node;
  } catch (error) {
    if (error instanceof StorefrontTimeoutError) throw error;
    if (!(error instanceof StorefrontApiError)) throw error;

    // Losing the requested selection beats failing the page: strip the param and render
    // the default variant instead of surfacing a 5xx for a lookup the buyer cannot retry.
    log.error("variant id redirect lookup failed", { error, variantId });
  }

  return null;
}

function isSameHandle(variantProductHandle: string, requestedHandle: string | undefined): boolean {
  return requestedHandle !== undefined
    ? variantProductHandle.toLowerCase() === requestedHandle.toLowerCase()
    : true;
}
