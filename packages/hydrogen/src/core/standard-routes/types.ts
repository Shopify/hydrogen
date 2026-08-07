import type { I18nConfig } from "../request-context";

type StandardRouteTemplateWithParam<Param extends string> =
  | `/${string}:${Param}`
  | `/${string}:${Param}/${string}`;

type StandardRouteTemplate = `/${string}`;

export type ShopifyRouteTemplates = {
  /**
   * Redirects Shopify article routes, for example
   * `/blogs/news/snowboard-guide`, to the app's custom article route.
   *
   * @example "/journal/:blogHandle/:articleHandle"
   */
  article?: StandardRouteTemplateWithParam<"blogHandle"> &
    StandardRouteTemplateWithParam<"articleHandle">;

  /**
   * Redirects Shopify blog routes, for example `/blogs/news`, to the app's
   * custom blog route.
   *
   * @example "/journal/:blogHandle"
   */
  blog?: StandardRouteTemplateWithParam<"blogHandle">;

  /**
   * Redirects Shopify's `/cart` route to the app's custom cart route.
   *
   * @example "/basket"
   */
  cart?: StandardRouteTemplate;

  /**
   * Redirects Shopify collection routes, for example `/collections/winter`,
   * to the app's custom collection route.
   *
   * @example "/c/:collectionHandle"
   */
  collection?: StandardRouteTemplateWithParam<"collectionHandle">;

  /**
   * Redirects Shopify's collection-listing routes, `/collections` and the
   * legacy `/products`, to the app's custom collection-listing route.
   *
   * @example "/catalog"
   */
  collectionList?: StandardRouteTemplate;

  /**
   * Redirects Shopify page routes, for example `/pages/about-us`, to the app's
   * custom page route.
   *
   * @example "/content/:pageHandle"
   */
  page?: StandardRouteTemplateWithParam<"pageHandle">;

  /**
   * Redirects Shopify policy routes, for example `/policies/privacy-policy`,
   * to the app's custom policy route.
   *
   * @example "/legal/:policyHandle"
   */
  policy?: StandardRouteTemplateWithParam<"policyHandle">;

  /**
   * Redirects Shopify product routes, for example `/products/snowboard`,
   * to the app's custom product route.
   *
   * @example "/p/:productHandle"
   */
  product?: StandardRouteTemplateWithParam<"productHandle">;

  /**
   * Redirects Shopify collection-scoped product routes, for example
   * `/collections/winter/products/snowboard`, to the app's custom product route.
   *
   * Must include `:productHandle`. May include `:collectionHandle` when the
   * app's custom product route is also collection-scoped.
   *
   * @example "/p/:productHandle"
   * @example "/c/:collectionHandle/p/:productHandle"
   */
  productInCollection?: StandardRouteTemplateWithParam<"productHandle">;

  /**
   * Redirects Shopify's `/search` route to the app's custom search route.
   *
   * @example "/find"
   */
  search?: StandardRouteTemplate;
};

export type StandardRouteName = keyof ShopifyRouteTemplates;
export type ShopifyStandardRouteName = StandardRouteName | "index";
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

export type ShopifyStandardRouteMatch<
  TRoute extends ShopifyStandardRouteName = ShopifyStandardRouteName,
> = {
  params: StandardRouteParams;
  route: TRoute;
  pageTemplateName: ShopifyPageTemplateName<TRoute>;
};
