import type { GraphQLFormattedError, RequestScopedPrivateStorefrontClient } from "../../client";
import type { AnyStorefrontQueryString } from "../../graphql";
import type { CartDataFromHandlers } from "../cart/server-handlers";
import { createProxyResponseHeaders } from "../interceptors/proxy";
import type { ShopifyRouteJsonResult } from "../route-handlers";
import {
  makeProductQueries,
  productQueries,
  type CreateProductQueriesOptions,
  type ProductDataForOptions,
  type ProductDataFromQuery,
} from "./queries";
import type { ProductInput, ProductVariantFrom, SelectedOption } from "./state";

export const productServerHandlersProductQuery: unique symbol = Symbol(
  "storefront-kit.productQuery",
);

export type ProductGetData<TProduct = ProductInput> = {
  product: TProduct | null;
  errors?: Array<{ message: string }>;
};

export type ProductGetResult<TProduct = ProductInput> = ShopifyRouteJsonResult<
  ProductGetData<TProduct>
>;

export type ProductGetHandlerContext = {
  storefrontClient: RequestScopedPrivateStorefrontClient;
  handle: string;
  selectedOptions?: SelectedOption[];
};

export type ProductGetHandler<TProduct = ProductInput> = (
  context: ProductGetHandlerContext,
) => Promise<ProductGetResult<TProduct>>;

export type ProductServerHandlers<
  TProductQuery extends AnyStorefrontQueryString = typeof productQueries.product,
  TProduct extends ProductInput = ProductDataFromQuery<TProductQuery>,
> = {
  readonly [productServerHandlersProductQuery]: TProductQuery | undefined;
  get: ProductGetHandler<TProduct>;
};

type AsyncHandlerResult<THandler> = THandler extends (
  ...args: infer _Args
) => Promise<infer TResult>
  ? TResult
  : never;

type ProductGetHandlerResult<THandlers> = THandlers extends { get: infer THandler }
  ? AsyncHandlerResult<THandler>
  : never;

type ProductDataFromHandlerResult<TResult> = [TResult] extends [never]
  ? never
  : TResult extends { data: { product: infer TProduct } }
    ? NonNullable<TProduct>
    : ProductInput;

export type ProductDataFromHandlers<THandlers> = ProductDataFromHandlerResult<
  ProductGetHandlerResult<THandlers>
>;

type CartLineMerchandiseFromHandlers<TCartHandlers> = NonNullable<
  CartDataFromHandlers<TCartHandlers>["lines"]["nodes"][number]["merchandise"]
>;

type ProductCartCompatibilityError<TCartHandlers> = {
  readonly __productFragmentMustFitCartLineMerchandise: {
    readonly expectedMerchandise: CartLineMerchandiseFromHandlers<TCartHandlers>;
  };
};

type ProductCartCompatibilityArgs<TOptions extends CreateProductServerHandlersOptions> = [
  ProductVariantFrom<ProductDataForOptions<TOptions>>,
] extends [CartLineMerchandiseFromHandlers<TOptions["cartHandlers"]>]
  ? []
  : [ProductCartCompatibilityError<TOptions["cartHandlers"]>];

export type CreateProductServerHandlersOptions<
  TCartHandlers = unknown,
  TProductFragment extends AnyStorefrontQueryString = AnyStorefrontQueryString,
> = CreateProductQueriesOptions<TProductFragment> & {
  readonly cartHandlers: TCartHandlers;
};

export function createProductServerHandlers<
  const TOptions extends CreateProductServerHandlersOptions,
>(
  options: TOptions,
  ..._compatibility: ProductCartCompatibilityArgs<TOptions>
): ProductServerHandlers<
  ReturnType<typeof makeProductQueries<TOptions>>["product"],
  ProductDataForOptions<TOptions>
>;
export function createProductServerHandlers(
  options: CreateProductServerHandlersOptions,
): ProductServerHandlers<AnyStorefrontQueryString, ProductInput> {
  const queries = makeProductQueries({ fragment: options.fragment });
  // The public overload preserves fragment-specific result types; this runtime
  // path only needs the shared product-query shape for executing the request.
  const runtimeQueries = queries as RuntimeProductQueries;
  const handlers: ProductServerHandlers<AnyStorefrontQueryString, ProductInput> = {
    [productServerHandlersProductQuery]: undefined,
    get: (context: ProductGetHandlerContext) => handleGet(context, runtimeQueries),
  };

  Object.defineProperty(handlers, productServerHandlersProductQuery, {
    value: queries.product,
    writable: false,
    enumerable: false,
    configurable: false,
  });
  return handlers;
}

type RuntimeProductQueries = typeof productQueries;

async function handleGet(
  { handle, selectedOptions, storefrontClient }: ProductGetHandlerContext,
  queries: RuntimeProductQueries,
): Promise<ProductGetResult> {
  const variables = { handle, selectedOptions };
  const result = await storefrontClient.graphql(queries.product, {
    variables,
  });
  const data = {
    product: result.data?.product ?? null,
    ...(result.errors && { errors: toErrors(result.errors) }),
  };
  const headers = createProxyResponseHeaders(result.headers);

  return { type: "json", data, headers };
}

function toErrors(errors: GraphQLFormattedError[]): Array<{ message: string }> {
  return errors.map(({ message }) => ({ message }));
}
