import type { ShopifyGlobal } from "../../globals";
import type { I18nConfig } from "../headers";
import {
  matchStandardRouteUrl,
  resolveStandardRouteUrl,
  type ShopifyRouteTemplates,
} from "../standard-routes/index";
import initializeShopifyGlobal from "./global-script" with { type: "script" };
import type { ShopifyScriptsI18n } from "./types";
import type { ShopifyScriptsShop } from "./types";
import { asInlineScript } from "./utils/inline-script";

export type ShopifyGlobalConfig = {
  country: I18nConfig["country"];
  currency?: NonNullable<ShopifyGlobal["currency"]>;
  locale: Lowercase<I18nConfig["language"]>;
  customerPrivacy: {
    config: NonNullable<ShopifyGlobal["customerPrivacy"]["config"]>;
    consentStatus: NonNullable<ShopifyGlobal["customerPrivacy"]["consentStatus"]>;
  };
  routes: {
    root: string;
  };
  shop: string;
};

export type IncompleteCustomerPrivacy = Partial<
  Omit<ShopifyGlobal["customerPrivacy"], "config">
> & {
  config?: Partial<NonNullable<ShopifyGlobal["customerPrivacy"]["config"]>>;
};

export type IncompleteShopifyGlobal = Partial<Omit<ShopifyGlobal, "customerPrivacy" | "routes">> & {
  customerPrivacy?: IncompleteCustomerPrivacy;
  routes?: Partial<ShopifyGlobal["routes"]> & Record<string, unknown>;
  [key: string]: unknown;
};

const DEFAULT_COUNTRY: ShopifyGlobalConfig["country"] = "US";
const DEFAULT_LOCALE: ShopifyGlobalConfig["locale"] = "en";
const DEFAULT_ROUTES_ROOT: ShopifyGlobalConfig["routes"]["root"] = "/";

/**
 * Returns the browser's `window.Shopify` object, creating it when needed.
 *
 * This is SSR-safe and returns `undefined` outside the browser.
 */
export function getShopifyGlobal(): IncompleteShopifyGlobal | undefined {
  if (typeof window === "undefined") return undefined;

  const shopifyWindow: { Shopify?: IncompleteShopifyGlobal } = window;
  return (shopifyWindow.Shopify ??= {});
}

/**
 * Configures Shopify runtime routing hooks used by storefront scripts.
 *
 * This is SSR-safe and no-ops outside the browser.
 */
export function configureShopifyRouting({
  navigate,
  routes,
}: {
  navigate?: ShopifyGlobal["routes"]["navigate"];
  routes?: ShopifyRouteTemplates;
}) {
  const shopify = getShopifyGlobal();
  if (!shopify) return;

  const getRouteOptions = (url: string) => ({
    baseUrl: window.location.href,
    pathPrefix: shopify.routes?.root,
    routeTemplates: routes ?? {},
    url,
  });

  shopify.routes ??= {};
  shopify.routes.match = (url) => matchStandardRouteUrl(getRouteOptions(url));
  shopify.routes.resolve = (url) => resolveStandardRouteUrl(getRouteOptions(url));

  const navigateTo = navigate ?? ((url: string) => window.location.assign(url));
  shopify.routes.navigate = (url) => navigateTo(shopify.routes?.resolve?.(url) ?? url);
  // Deprecated, kept for temporary backwards compat with WebMCP
  shopify.navigate = shopify.routes.navigate;
}

function getShopifyRoutesRoot(pathPrefix: I18nConfig["pathPrefix"]): string {
  const normalizedPathPrefix = pathPrefix?.trim().replace(/^\/+/, "").replace(/\/+$/, "") ?? "";

  return normalizedPathPrefix ? `/${normalizedPathPrefix}/` : DEFAULT_ROUTES_ROOT;
}

function normalizeMyshopifyDomain(domain: string): string {
  return domain
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/\/+$/, "");
}

/**
 * Builds the inline bootstrap script that initializes `window.Shopify` for storefront scripts.
 */
export function getShopifyGlobalBootstrapScript({
  i18n,
  shop,
}: {
  i18n?: ShopifyScriptsI18n;
  shop: ShopifyScriptsShop;
}): string {
  const config: ShopifyGlobalConfig = {
    country: i18n?.country ?? DEFAULT_COUNTRY,
    ...(i18n?.currency !== undefined ? { currency: { active: i18n.currency.toUpperCase() } } : {}),
    // oxlint-disable-next-line typescript/consistent-type-assertions
    locale: (i18n?.language ?? DEFAULT_LOCALE).toLowerCase() as Lowercase<
      ShopifyGlobalConfig["locale"]
    >,
    routes: {
      root: getShopifyRoutesRoot(i18n?.pathPrefix),
    },
    shop: normalizeMyshopifyDomain(shop.myshopifyDomain),
    customerPrivacy: {
      config: {
        isHeadless: true,
      },
      consentStatus: "pending",
    },
  };

  return asInlineScript(initializeShopifyGlobal)(config);
}
