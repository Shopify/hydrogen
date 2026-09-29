import { DEFAULT_STANDARD_ROUTES } from "../../standard-routes/defaults";
import { normalizePathPrefix } from "../../standard-routes/path";
import type { ShopifyRouteTemplates } from "../../standard-routes/types";
import type { CreateRobotsTxtOptions, RobotsTxtRule } from "./types";

const DEFAULT_SITEMAP_PATH = "/sitemap.xml";
const UCP_MCP_PATH = "/api/ucp/mcp";
const MCP_PATH = "/api/mcp";

/**
 * Paths Shopify's own storefronts keep out of search engines, trimmed to the
 * ones a headless storefront can serve. Route-template-driven paths (cart,
 * search, collections) are added separately so custom paths stay covered.
 */
const PRIVATE_PATHS = [
  "/admin",
  "/checkout",
  "/checkouts/",
  "/orders",
  "/account",
  "/api/",
  "/__shopify/",
  "/graphiql",
  "/cart.js",
  "/cdn/wpm/*.js",
] as const;

const ACCOUNT_LOGIN_PATH = "/account/login";

/** Query-string crawl traps: filters, sort keys, theme previews, and language-picker state. */
const CRAWL_TRAP_SUFFIXES = ["*sort_by*", "*+*", "*%2B*", "*%2b*", "*filter*&*filter*"] as const;

const QUERY_CRAWL_TRAPS = [
  "/*?*preview_theme_id=*",
  "/*?*preview_script_id=*",
  "/*?*oseid=*",
] as const;

const ADSBOT_ALLOWED_ROUTES = ["product", "collection", "page", "blog"] as const;

function stripTemplateParams(template: string): string {
  const staticPrefix = template.split("/:")[0] ?? template;
  return staticPrefix || "/";
}

function routeBase(routeTemplates: ShopifyRouteTemplates, route: keyof ShopifyRouteTemplates) {
  return stripTemplateParams(routeTemplates[route] ?? DEFAULT_STANDARD_ROUTES[route][0]);
}

/** Emits a path both at the root and under any locale prefix, as Shopify's default robots.txt does. */
function withLocalePrefixes(path: string, pathPrefixes: readonly string[]): string[] {
  const normalized = pathPrefixes.map(normalizePathPrefix).filter(Boolean);
  const localized = normalized.length > 0 ? ["/*"] : [];
  return [path, ...localized.map((prefix) => `${prefix}${path}`)];
}

function directive(name: "Allow" | "Disallow", path: string): RobotsTxtRule {
  return { directive: name, path };
}

function defaultRules(
  routeTemplates: ShopifyRouteTemplates,
  pathPrefixes: readonly string[],
): RobotsTxtRule[] {
  const rules: RobotsTxtRule[] = [directive("Allow", "/")];
  const cartBase = routeBase(routeTemplates, "cart");
  const searchBase = routeBase(routeTemplates, "search");
  const collectionBase = routeBase(routeTemplates, "collection");
  const blogBase = routeBase(routeTemplates, "blog");

  for (const path of [cartBase, `${cartBase}/`, searchBase, ...PRIVATE_PATHS]) {
    for (const localized of withLocalePrefixes(path, pathPrefixes)) {
      rules.push(directive("Disallow", localized));
    }
  }

  // Shopify allows the login page while keeping the rest of the account private.
  for (const localized of withLocalePrefixes(ACCOUNT_LOGIN_PATH, pathPrefixes)) {
    rules.push(directive("Allow", localized));
  }

  for (const base of [collectionBase, blogBase]) {
    for (const suffix of CRAWL_TRAP_SUFFIXES) {
      for (const localized of withLocalePrefixes(`${base}/${suffix}`, pathPrefixes)) {
        rules.push(directive("Disallow", localized));
      }
    }
  }

  for (const trap of QUERY_CRAWL_TRAPS) rules.push(directive("Disallow", trap));

  return rules;
}

/**
 * Google's AdsBot ignores `User-agent: *`, so Shopify repeats the essentials
 * for it. Product, collection, page, and blog routes stay open; checkout and
 * order paths stay closed.
 */
function adsbotRules(
  routeTemplates: ShopifyRouteTemplates,
  pathPrefixes: readonly string[],
): RobotsTxtRule[] {
  const rules: RobotsTxtRule[] = [];
  for (const route of ADSBOT_ALLOWED_ROUTES) {
    const base = routeBase(routeTemplates, route);
    for (const localized of withLocalePrefixes(`${base}/`, pathPrefixes)) {
      rules.push(directive("Allow", localized));
    }
  }
  for (const path of ["/checkout", "/checkouts/", "/orders"]) {
    for (const localized of withLocalePrefixes(path, pathPrefixes)) {
      rules.push(directive("Disallow", localized));
    }
  }
  return rules;
}

function renderGroup(userAgent: string, rules: readonly RobotsTxtRule[]): string {
  const lines = [`User-agent: ${userAgent}`];
  for (const rule of rules) lines.push(`${rule.directive}: ${rule.path}`);
  return lines.join("\n");
}

function agentComments(origin: string, options: CreateRobotsTxtOptions): string[] {
  if (options.agents === false) return [];

  const lines = [
    "# Shopify Hydrogen storefront. Public product, collection, page, blog, and policy HTML is crawlable.",
    `# UCP/MCP endpoint: ${origin}${UCP_MCP_PATH}`,
    `# Storefront MCP endpoint: ${origin}${MCP_PATH}`,
    "# Agents should use UCP/MCP for catalog, cart, and checkout. Payment requires buyer approval.",
  ];
  if (options.agents?.instructionsPath) {
    lines.push(`# Agent instructions: ${origin}${options.agents.instructionsPath}`);
  }
  return lines;
}

/**
 * Builds a `robots.txt` body for a Hydrogen storefront.
 *
 * Mirrors the rules Shopify ships on Online Store: everything public is
 * crawlable, while admin, cart, checkout, orders, account, API, and
 * filter/sort crawl traps are excluded. Cart, search, collection, and blog
 * paths come from `routeTemplates`, so custom paths stay covered. The header
 * comment advertises the UCP/MCP endpoints that `handleShopifyRoutes` serves,
 * so shopping agents can find them.
 *
 * @example
 * ```ts
 * createRobotsTxt({ origin: "https://example.com", routeTemplates });
 * ```
 */
export function createRobotsTxt(options: CreateRobotsTxtOptions): string {
  const origin = new URL(options.origin).origin;
  const routeTemplates = options.routeTemplates ?? {};
  const pathPrefixes = options.pathPrefixes ?? [];
  const sitemapPath = options.sitemapPath ?? DEFAULT_SITEMAP_PATH;

  const mainRules = [
    ...defaultRules(routeTemplates, pathPrefixes),
    ...(options.disallow ?? []).map((path) => directive("Disallow", path)),
    ...(options.allow ?? []).map((path) => directive("Allow", path)),
  ];

  const sections = [
    ...agentComments(origin, options),
    "",
    renderGroup("*", mainRules),
    "",
    "# Google AdsBot ignores robots.txt unless named, so the essentials are repeated.",
    renderGroup("adsbot-google", adsbotRules(routeTemplates, pathPrefixes)),
    "",
    ...(options.additionalGroups ?? []).flatMap((group) => [
      renderGroup(group.userAgent, group.rules),
      "",
    ]),
    `Sitemap: ${origin}${sitemapPath}`,
  ];

  return `${sections.join("\n").replace(/^\n+/, "")}\n`;
}
