import { findCartDiscountLink } from "../../cart/discount-link";
import { applyPrivateResponseCacheHeaders } from "../../headers";
import { matchLocale } from "../../i18n/match";
import type { ShopifyRequestContext } from "../../request-context";
import { prependPathPrefix, stripI18nPathPrefix } from "../../standard-routes/path";
import { DISCOUNT_LINK_RE, getSameOriginPath } from "../../url";
import type { HydrogenRouteInterceptor } from "../route-types";

const REDIRECT_PARAMS = ["redirect", "return_to"];

export const handleDiscountLinkRedirect: HydrogenRouteInterceptor = (url, options) => {
  const { request, requestContext } = options;
  const pathname = stripI18nPathPrefix(url.pathname, requestContext.locale.pathPrefix);
  const match = pathname.match(DISCOUNT_LINK_RE);
  // Without cart handlers there is no Hydrogen cart to apply the code to, so the app owns the path.
  const applyDiscountLink = match ? findCartDiscountLink(options.handlers) : undefined;
  if (!match || !applyDiscountLink) return null;

  if (request.method !== "GET" && request.method !== "HEAD") {
    return Promise.resolve(new Response("Method Not Allowed", { status: 405 }));
  }

  const location = getRedirectLocation(url, requestContext);
  const code = parseCode(match[1] ?? "");
  // HEAD comes from link checkers and unfurlers; they get the redirect without the cart write.
  if (code === null || request.method === "HEAD") {
    return Promise.resolve(createDiscountRedirect(location));
  }

  return applyDiscountLink(options, code).then((headers) =>
    createDiscountRedirect(location, headers),
  );
};

function parseCode(segment: string): string | null {
  try {
    return decodeURIComponent(segment).trim() || null;
  } catch {
    return null;
  }
}

function getRedirectLocation(url: URL, requestContext: ShopifyRequestContext): string {
  const target = REDIRECT_PARAMS.map((key) => url.searchParams.get(key)).find(Boolean);
  const location = new URL(getSameOriginPath(target, url.origin) ?? "/", url.origin);
  // A target without a locale stays in the link's locale. A target that names one keeps it.
  const { pathPrefix } = requestContext.locale;
  if (pathPrefix && !namesLocale(location, pathPrefix, requestContext.i18nDefinition)) {
    location.pathname =
      location.pathname === "/" ? pathPrefix : `${pathPrefix}${location.pathname}`;
  }
  const targetKeys = new Set(location.searchParams.keys());

  for (const [key, value] of url.searchParams) {
    if (REDIRECT_PARAMS.includes(key) || targetKeys.has(key)) continue;
    location.searchParams.append(key, value);
  }

  // Absolute because framework proxy runtimes such as Next.js middleware reject relative locations.
  return location.toString();
}

function namesLocale(
  location: URL,
  pathPrefix: string,
  i18nDefinition: ShopifyRequestContext["i18nDefinition"],
): boolean {
  if (i18nDefinition) return matchLocale(location, i18nDefinition).pathPrefix !== "";
  return stripI18nPathPrefix(location.pathname, pathPrefix) !== location.pathname;
}

function createDiscountRedirect(location: string, headers = new Headers()): Response {
  headers.set("location", location);
  applyPrivateResponseCacheHeaders(headers);
  return new Response(null, { status: 303, headers });
}
