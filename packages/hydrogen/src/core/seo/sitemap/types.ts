import type { CachingStrategy } from "../../cache";
import type { ShopifyRouteTemplates } from "../../standard-routes/types";
import type { LanguageAlternateLocale } from "../types";

/** Resource types the Storefront API `sitemap` query can list. */
export type SitemapResourceType =
  | "products"
  | "collections"
  | "pages"
  | "blogs"
  | "articles"
  | "metaobjects";

export type SitemapChangeFrequency =
  | "always"
  | "hourly"
  | "daily"
  | "weekly"
  | "monthly"
  | "yearly"
  | "never";

/** One resource from the Storefront API sitemap, as passed to URL callbacks. */
export type SitemapResource = {
  type: SitemapResourceType;
  handle: string;
  updatedAt: string;
  /** Metaobject definition type, for `metaobjects` only. */
  metaobjectType?: string;
  /** Online Store URL handle for the metaobject definition, for `metaobjects` only. */
  onlineStoreUrlHandle?: string | null;
};

export interface CreateSitemapServerHandlersOptions {
  /**
   * Trusted origin for every `<loc>`, for example from a `PUBLIC_SITE_ORIGIN`
   * environment variable. Defaults to the request origin. Prefer passing it in
   * production: `Host` and `X-Forwarded-Host` headers are attacker-controlled.
   */
  origin?: string;
  /**
   * Resource types to list. Defaults to `products`, `collections`, `pages`, and
   * `blogs`. `articles` and `metaobjects` need `getResourceUrl`, because the
   * Storefront API sitemap does not include the blog handle or the metaobject
   * page path, so Hydrogen cannot build their URLs on its own.
   */
  types?: readonly SitemapResourceType[];
  /**
   * The app's route templates, so product, collection, page, and blog URLs
   * follow the same paths the storefront serves.
   */
  routeTemplates?: ShopifyRouteTemplates;
  /**
   * Every locale the storefront serves. When set, each resource is listed once
   * per locale with `xhtml:link` alternates pointing at the others. When
   * omitted, resources are listed once under the request's i18n `pathPrefix`.
   */
  locales?: readonly LanguageAlternateLocale[];
  /** `hrefLang` of the locale to also emit as `x-default` alternate. */
  xDefault?: string;
  /**
   * Overrides the pathname for a resource. Return `null` to omit it. Receives
   * the default pathname Hydrogen would use (`null` for `articles` and
   * `metaobjects`). The pathname is prefixed per locale and resolved against
   * `origin` afterwards.
   */
  getResourceUrl?: (resource: SitemapResource, defaultPathname: string | null) => string | null;
  /** Sets `<changefreq>` per resource. Omitted by default; most search engines ignore it. */
  getChangeFrequency?: (resource: SitemapResource) => SitemapChangeFrequency | undefined;
  /**
   * App-owned pathnames to list in their own child sitemap, for example `/`,
   * `/collections`, or `/about`. Localized like resources when `locales` is set.
   */
  staticPaths?: readonly string[];
  /** Absolute or root-relative URLs of extra child sitemaps to reference from the index. */
  additionalSitemaps?: readonly string[];
  /** Pathname served as the sitemap index. Defaults to `/sitemap.xml`. */
  indexPath?: string;
  /**
   * Pathname template for child sitemaps. Must contain `:type` and `:page`.
   * Defaults to `/sitemap/:type/:page.xml`.
   */
  pagePath?: string;
  /**
   * Caching strategy for the Storefront API sitemap queries and the
   * `Cache-Control` header on the XML responses. Defaults to `Cache.long()`.
   * The query cache only applies when the Storefront client was created with a
   * `cache` instance; the response header always applies.
   */
  cache?: CachingStrategy;
  /**
   * Pathname listed when a child sitemap page has no resources, so the file is
   * never empty (Search Console reports empty sitemaps as errors). Defaults to `/`.
   */
  emptyPageFallbackPath?: string;
}

export type RobotsTxtRule = {
  directive: "Allow" | "Disallow";
  path: string;
};

export type RobotsTxtGroup = {
  userAgent: string;
  rules: readonly RobotsTxtRule[];
};

export interface CreateRobotsTxtOptions {
  /** Absolute storefront origin used for the `Sitemap:` line and agent endpoint comments. */
  origin: string;
  /** Pathname of the sitemap index. Defaults to `/sitemap.xml`. */
  sitemapPath?: string;
  /** The app's route templates, so custom cart, search, collection, and blog paths are covered. */
  routeTemplates?: ShopifyRouteTemplates;
  /** Locale path prefixes the storefront serves, for example `["/fr-ca", "/es"]`. */
  pathPrefixes?: readonly string[];
  /** Extra `Disallow` paths appended to the `*` group. */
  disallow?: readonly string[];
  /** Extra `Allow` paths appended to the `*` group. */
  allow?: readonly string[];
  /** Extra user-agent groups, for example crawl delays for specific bots. */
  additionalGroups?: readonly RobotsTxtGroup[];
  /**
   * Header comments that tell shopping agents where the storefront's UCP/MCP
   * endpoints are. Enabled by default; pass `false` to omit them.
   */
  agents?:
    | false
    | {
        /** Pathname of an agent instructions document, for example `/agents.md`. */
        instructionsPath?: string;
      };
}

export interface CreateRobotsTxtServerHandlersOptions extends Omit<
  CreateRobotsTxtOptions,
  "origin"
> {
  /** Trusted origin. Defaults to the request origin. */
  origin?: string;
  /** Pathname served. Defaults to `/robots.txt`. */
  path?: string;
  /** `Cache-Control` strategy for the response. Defaults to `Cache.long()`. */
  cache?: CachingStrategy;
}
