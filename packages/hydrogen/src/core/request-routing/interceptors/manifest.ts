import { getSupportedLocales } from "../../i18n/define";
import { getLocaleHostname } from "../../i18n/locale";
import { resolveSupportedLocale } from "../../i18n/match";
import type { ShopifyI18n, ShopifyLocale } from "../../i18n/types";
import { DEFAULT_STANDARD_ROUTES } from "../../standard-routes/defaults";
import type { ShopifyRouteTemplates, StandardRouteName } from "../../standard-routes/types";
import { HYDROGEN_MANIFEST_PATH } from "../../url";
import type { HydrogenRouteInterceptor } from "../route-types";

const MANIFEST_VERSION = 1;
const MANIFEST_CACHE_CONTROL = "public, max-age=60, s-maxage=60, stale-while-revalidate=300";

type ManifestLocale = ShopifyLocale & ({ pathPrefix: string } | { hostname: string });

/**
 * The storefront's routing and i18n setup, as Shopify services read it from the manifest route.
 *
 * A locale's URL for a route is its `hostname` (domain routing) or the storefront's host, then its
 * `pathPrefix`, then the route template. Additive fields don't change `version`, so consumers must
 * ignore unknown keys.
 */
export type HydrogenManifest = {
  version: typeof MANIFEST_VERSION;
  /**
   * Every standard route's template, with Shopify's default for each route the app doesn't
   * override. `null` when `handleShopifyRoutes` received no `routeTemplates`: unlike the URL
   * helpers, which assume defaults, a published manifest must not claim routes the app may not serve.
   */
  routes: Record<StandardRouteName, string> | null;
  /**
   * Every supported locale, default first for convenience; `defaultLocale` is authoritative.
   * `null` when the request context has no `defineShopifyI18n` definition.
   */
  i18n: {
    type: "single" | "pathname" | "domain";
    defaultLocale: ShopifyLocale;
    locales: ManifestLocale[];
  } | null;
};

/**
 * Serves the storefront's routing and i18n setup at `/__shopify/hydrogen/manifest.json`. The
 * route is always on and needs no options beyond what `handleShopifyRoutes` already receives.
 */
export const handleHydrogenManifest: HydrogenRouteInterceptor = (
  url,
  { request, requestContext, routeTemplates },
) => {
  if (url.pathname !== HYDROGEN_MANIFEST_PATH) return null;

  if (request.method !== "GET" && request.method !== "HEAD") {
    return Promise.resolve(
      new Response("Method Not Allowed", { status: 405, headers: { allow: "GET, HEAD" } }),
    );
  }

  // Built inside the promise so a failure rejects, as handleShopifyRoutes documents.
  return Promise.resolve().then(() => {
    const manifest = buildHydrogenManifest(routeTemplates, requestContext.i18nDefinition);
    return new Response(request.method === "HEAD" ? null : JSON.stringify(manifest), {
      headers: {
        "content-type": "application/json",
        "cache-control": MANIFEST_CACHE_CONTROL,
        "x-content-type-options": "nosniff",
      },
    });
  });
};

function buildHydrogenManifest(
  routeTemplates: ShopifyRouteTemplates | undefined,
  i18n: ShopifyI18n | undefined,
): HydrogenManifest {
  return {
    version: MANIFEST_VERSION,
    routes: routeTemplates ? buildRoutes(routeTemplates) : null,
    i18n: i18n ? buildI18n(i18n) : null,
  };
}

// Allowlists known route names and own string values: templates are only type-checked, and the
// manifest is public, so nothing else on the object may leak into it.
function buildRoutes(routeTemplates: ShopifyRouteTemplates): Record<StandardRouteName, string> {
  const route = (name: StandardRouteName): string => {
    const template = Object.hasOwn(routeTemplates, name) ? routeTemplates[name] : undefined;
    return typeof template === "string" ? template : DEFAULT_STANDARD_ROUTES[name][0];
  };
  return {
    product: route("product"),
    collection: route("collection"),
    collectionList: route("collectionList"),
    page: route("page"),
    policy: route("policy"),
    blog: route("blog"),
    article: route("article"),
    productInCollection: route("productInCollection"),
    cart: route("cart"),
    search: route("search"),
  };
}

// Resolves each locale through the request matcher so the published URLs are the ones the
// storefront routes, then copies only routing fields: locale entries may carry app-specific extras.
function buildI18n(i18n: ShopifyI18n): NonNullable<HydrogenManifest["i18n"]> {
  const routingType = i18n.routing?.type;
  const locales = getSupportedLocales(i18n).map((supported): ManifestLocale => {
    const locale = resolveSupportedLocale(supported, i18n);
    // Under domain routing every resolved locale carries its hostname and an empty prefix.
    return routingType === "domain" && "hostname" in locale
      ? { ...toLocale(locale), hostname: getLocaleHostname(locale) }
      : { ...toLocale(locale), pathPrefix: locale.pathPrefix };
  });

  return { type: routingType ?? "single", defaultLocale: toLocale(i18n.defaultLocale), locales };
}

function toLocale({ language, country }: ShopifyLocale): ShopifyLocale {
  return { language, country };
}
