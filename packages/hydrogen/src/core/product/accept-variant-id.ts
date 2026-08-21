import type { StorefrontClient } from "../../client";
import { withStorefrontClientCache } from "../../client/client";
import { StorefrontApiError } from "../../client/errors";
import { gql } from "../../graphql";
import { Cache } from "../cache";
import { getLogger } from "../logging";
import type { HydrogenRouteInterceptor } from "../request-routing/route-types";
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

/**
 * Accepts Liquid-style `?variant=<numeric id>` links on product pages by redirecting them
 * to the canonical option-params URL, e.g. `/products/snowboard?variant=123` →
 * `302 /products/snowboard?Color=Red&Size=M`.
 *
 * `handleShopifyRoutes` runs this before app routing. It claims only GET/HEAD requests
 * whose URL matches a product route template and carries a numeric `variant` param;
 * everything else falls through to the framework. When both `variant` and option params
 * are present, the variant wins and the option params are replaced.
 * Unknown/deleted variant ids redirect to the same URL with the `variant` param stripped,
 * preserving any remaining params for the product loader. Params unrelated to the
 * selection (`?ref=campaign`) are preserved. On cross-product (combined listing) redirects,
 * params matching the *source* product's option names are not stripped — the handler only
 * knows the target variant's options; loaders filtering with `allowedOptionNames` ignore
 * the leftovers.
 *
 * Configure the app's URL shape once with `handleShopifyRoutes({ routeTemplates })`.
 */
export const handleProductVariantId: HydrogenRouteInterceptor = (
  url,
  { request, requestContext, storefrontClient, routeTemplates = {} },
) => {
  if (request.method !== "GET" && request.method !== "HEAD") return null;

  const variantId = parseVariantSearchParam(url.searchParams.get(VARIANT_SEARCH_PARAM));
  if (!variantId) return null;

  const pathPrefix = requestContext.i18n.pathPrefix;
  const match = matchStandardRouteUrl({ routeTemplates, pathPrefix, url: url.href });
  if (match?.pageTemplateName !== "product") return null;

  return resolveVariantRedirect({
    pathPrefix,
    requestedHandle: match.params.productHandle,
    routeTemplates,
    storefrontClient,
    url,
    variantId,
  });
};

async function resolveVariantRedirect({
  pathPrefix,
  requestedHandle,
  routeTemplates,
  storefrontClient,
  url,
  variantId,
}: {
  pathPrefix: string | undefined;
  requestedHandle: string | undefined;
  routeTemplates: ShopifyRouteTemplates;
  storefrontClient: StorefrontClient;
  url: URL;
  variantId: string;
}): Promise<Response> {
  const variant = await queryVariantSelectedOptions(storefrontClient, variantId);

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
  const location = search ? `${pathname}?${search}` : pathname;
  return new Response(null, {
    status: HTTP_FOUND_STATUS,
    headers: { location: new URL(location, url.origin).toString() },
  });
}

async function queryVariantSelectedOptions(
  storefrontClient: StorefrontClient,
  variantId: string,
): Promise<SelectedOptionsVariant | null> {
  try {
    const result = await storefrontClient.graphql(
      VARIANT_SELECTED_OPTIONS_QUERY,
      withStorefrontClientCache(
        storefrontClient,
        { variables: { id: variantId } },
        Cache.long(),
        hasResolvedVariant,
      ),
    );

    if (result.errors) {
      log.error("variant id redirect lookup failed", { errors: result.errors, variantId });
      return null;
    }

    const node = result.data?.node;
    if (node && "selectedOptions" in node) return node;
  } catch (error) {
    if (!(error instanceof StorefrontApiError)) throw error;

    // Losing the requested selection beats failing the page: strip the param and render
    // the default variant instead of surfacing a 5xx for a lookup the buyer cannot retry.
    log.error("variant id redirect lookup failed", { error, variantId });
  }

  return null;
}

function hasResolvedVariant(body: object): boolean {
  if (!("data" in body) || typeof body.data !== "object" || body.data == null) return false;
  return "node" in body.data && body.data.node != null;
}

function isSameHandle(variantProductHandle: string, requestedHandle: string | undefined): boolean {
  return requestedHandle !== undefined
    ? variantProductHandle.toLowerCase() === requestedHandle.toLowerCase()
    : true;
}
