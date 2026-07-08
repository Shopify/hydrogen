import type { I18nConfig } from "../headers";

type StandardRouteTemplateWithParam<Param extends string> =
  | `/${string}:${Param}`
  | `/${string}:${Param}/${string}`;

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
   * Redirects Shopify collection routes, for example `/collections/winter`,
   * to the app's custom collection route.
   *
   * @example "/c/:collectionHandle"
   */
  collection?: StandardRouteTemplateWithParam<"collectionHandle">;

  /**
   * Redirects Shopify page routes, for example `/pages/about-us`, to the app's
   * custom page route.
   *
   * @example "/content/:pageHandle"
   */
  page?: StandardRouteTemplateWithParam<"pageHandle">;

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
};

export type StandardRouteName = keyof ShopifyRouteTemplates;
export type StandardRouteParamName =
  | "articleHandle"
  | "blogHandle"
  | "collectionHandle"
  | "pageHandle"
  | "productHandle";
export type StandardRouteParams = Partial<Record<StandardRouteParamName, string>>;
export type StandardRouteParamsByName = {
  article: { articleHandle: string; blogHandle: string };
  blog: { blogHandle: string };
  collection: { collectionHandle: string };
  page: { pageHandle: string };
  product: { productHandle: string };
  productInCollection: { collectionHandle: string; productHandle: string };
};
export type StandardRouteOptions = Pick<I18nConfig, "pathPrefix">;

export type ShopifyStandardRouteMatch = {
  params: StandardRouteParams;
  route: StandardRouteName;
};
