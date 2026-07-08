import type { ShopifyGlobal } from "../../globals";
import type { I18nConfig } from "../headers";
import {
  matchStandardRouteUrl,
  resolveStandardRouteUrl,
  type ShopifyRouteTemplates,
} from "../standard-routes/index";
import type { ShopifyScriptsI18n } from "./types";

type ShopifyGlobalConfig = {
  country: I18nConfig["country"];
  locale: Lowercase<I18nConfig["language"]>;
  routes: {
    root: string;
  };
};

type IncompleteShopifyGlobal = Partial<Omit<ShopifyGlobal, "routes">> & {
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
  navigate?: ShopifyGlobal["navigate"];
  routes: ShopifyRouteTemplates;
}) {
  const shopify = getShopifyGlobal();
  if (!shopify) return;

  const getRouteOptions = (url: string) => ({
    baseUrl: window.location.href,
    pathPrefix: shopify.routes?.root,
    routeTemplates: routes,
    url,
  });

  shopify.routes ??= {};
  shopify.routes.match = (url) => matchStandardRouteUrl(getRouteOptions(url));
  shopify.routes.resolve = (url) => resolveStandardRouteUrl(getRouteOptions(url));

  shopify.navigate = navigate
    ? (url: string) => navigate(shopify.routes?.resolve?.(url) ?? url)
    : navigate;
}

function getShopifyRoutesRoot(pathPrefix: I18nConfig["pathPrefix"]): string {
  const normalizedPathPrefix = pathPrefix?.trim().replace(/^\/+/, "").replace(/\/+$/, "") ?? "";

  return normalizedPathPrefix ? `/${normalizedPathPrefix}/` : DEFAULT_ROUTES_ROOT;
}

/**
 * Builds the inline bootstrap script that initializes `window.Shopify` for storefront scripts.
 */
export function getShopifyGlobalBootstrapScript({
  i18n,
}: {
  i18n?: ShopifyScriptsI18n;
} = {}): string {
  const config: ShopifyGlobalConfig = {
    country: i18n?.country ?? DEFAULT_COUNTRY,
    // oxlint-disable-next-line typescript/consistent-type-assertions
    locale: (i18n?.language ?? DEFAULT_LOCALE).toLowerCase() as Lowercase<
      ShopifyGlobalConfig["locale"]
    >,
    routes: {
      root: getShopifyRoutesRoot(i18n?.pathPrefix),
    },
  };

  return `(${initializeShopifyGlobal.toString()})(${serializeScriptData(config)});`;
}

/**
 * Initializes `window.Shopify` in the browser.
 *
 * This function is serialized with `.toString()` and inlined into SSR HTML, so its runtime body
 * must stay self-contained. Do not reference module variables or imported values from here.
 */
function initializeShopifyGlobal(config: ShopifyGlobalConfig) {
  const shopifyWindow: { Shopify?: IncompleteShopifyGlobal } = window;
  const shopify = (shopifyWindow.Shopify ??= {});

  shopify.routes ??= {};

  shopify.country = config.country;
  shopify.locale = config.locale;
  shopify.routes.root = config.routes.root;
}

function serializeScriptData(value: ShopifyGlobalConfig): string {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}
