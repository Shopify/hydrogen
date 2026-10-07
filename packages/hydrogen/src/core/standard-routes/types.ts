import type { I18nConfig } from "../request-context";

/** A path template that starts with `/` and includes the named handle placeholder. */
type StandardRouteTemplateWithParam<Param extends string> =
  | `/${string}:${Param}`
  | `/${string}:${Param}/${string}`;

/** A path template that starts with `/`. */
type StandardRouteTemplate = `/${string}`;

/** Your app's custom path templates for Shopify standard storefront routes, keyed by route name. */
export type ShopifyRouteTemplates = {
  /**
   * The app's article path. Hydrogen redirects Shopify article paths, such as
   * `/blogs/news/snowboard-guide`, to this template.
   *
   * @example "/journal/:blogHandle/:articleHandle"
   */
  article?: StandardRouteTemplateWithParam<"blogHandle"> &
    StandardRouteTemplateWithParam<"articleHandle">;

  /**
   * The app's blog path. Hydrogen redirects Shopify blog paths, such as
   * `/blogs/news`, to this template.
   *
   * @example "/journal/:blogHandle"
   */
  blog?: StandardRouteTemplateWithParam<"blogHandle">;

  /**
   * The app's cart path. Hydrogen redirects Shopify's `/cart` path to this template.
   *
   * @example "/basket"
   */
  cart?: StandardRouteTemplate;

  /**
   * The app's collection path. Hydrogen redirects Shopify collection paths, such as
   * `/collections/winter`, to this template.
   *
   * @example "/c/:collectionHandle"
   */
  collection?: StandardRouteTemplateWithParam<"collectionHandle">;

  /**
   * The app's collection list path. Hydrogen redirects Shopify's `/collections`
   * path and the legacy `/products` path to this template.
   *
   * @example "/catalog"
   */
  collectionList?: StandardRouteTemplate;

  /**
   * The app's page path. Hydrogen redirects Shopify page paths, such as
   * `/pages/about-us`, to this template.
   *
   * @example "/content/:pageHandle"
   */
  page?: StandardRouteTemplateWithParam<"pageHandle">;

  /**
   * The app's policy path. Hydrogen redirects Shopify policy paths, such as
   * `/policies/privacy-policy`, to this template.
   *
   * @example "/legal/:policyHandle"
   */
  policy?: StandardRouteTemplateWithParam<"policyHandle">;

  /**
   * The app's product path. Hydrogen redirects Shopify product paths, such as
   * `/products/snowboard`, to this template.
   *
   * @example "/p/:productHandle"
   */
  product?: StandardRouteTemplateWithParam<"productHandle">;

  /**
   * The app's path for products inside a collection. Hydrogen redirects Shopify
   * paths such as `/collections/winter/products/snowboard` to this template.
   *
   * The template must include `:productHandle`. Add `:collectionHandle` when the
   * app's product path also names the collection.
   *
   * @example "/p/:productHandle"
   * @example "/c/:collectionHandle/p/:productHandle"
   */
  productInCollection?: StandardRouteTemplateWithParam<"productHandle">;

  /**
   * The app's search path. Hydrogen redirects Shopify's `/search` path to this template.
   *
   * @example "/find"
   */
  search?: StandardRouteTemplate;
};

export type StandardRouteName = keyof ShopifyRouteTemplates;
export type ShopifyStandardRouteName = StandardRouteName | "index";
/** The page template name for a standard route. Collection-scoped products use `product`, and the collection list uses `list-collections`. */
export type ShopifyPageTemplateName<
  TRoute extends ShopifyStandardRouteName = ShopifyStandardRouteName,
> = TRoute extends "productInCollection"
  ? "product"
  : TRoute extends "collectionList"
    ? "list-collections"
    : TRoute;
export type StandardRouteParamName =
  | "articleHandle"
  | "blogHandle"
  | "collectionHandle"
  | "pageHandle"
  | "policyHandle"
  | "productHandle";
/** The handle values that fill a route template's placeholders, keyed by placeholder name. */
export type StandardRouteParams = Partial<Record<StandardRouteParamName, string>>;
export type StandardRouteParamsByName = {
  article: { articleHandle: string; blogHandle: string };
  blog: { blogHandle: string };
  cart: Record<string, never>;
  collection: { collectionHandle: string };
  collectionList: Record<string, never>;
  page: { pageHandle: string };
  policy: { policyHandle: string };
  product: { productHandle: string };
  productInCollection: { collectionHandle: string; productHandle: string };
  search: Record<string, never>;
};
export type StandardRouteOptions = Pick<I18nConfig, "pathPrefix">;

/** The standard route that a storefront URL matches, with its handles, page template name, and templates. */
export type ShopifyStandardRouteMatch<
  TRoute extends ShopifyStandardRouteName = ShopifyStandardRouteName,
> = {
  /** Shopify's default path for the matched resource, with the locale path prefix applied. */
  standardPathname: string;
  /** The decoded handle values from the matched URL. */
  params: StandardRouteParams;
  /** The standard route name that the URL matched, or `"index"` for the home page. */
  route: TRoute;
  /** The page template name for the matched route, such as `"product"` or `"list-collections"`. */
  pageTemplateName: ShopifyPageTemplateName<TRoute>;
  /** Shopify's default template for the matched route and your app's custom template, which falls back to the default. */
  templates: {
    standard: string;
    custom: string;
  };
};
