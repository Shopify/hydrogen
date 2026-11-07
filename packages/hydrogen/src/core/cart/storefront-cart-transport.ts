import type { GraphQLFormattedError, StorefrontClient } from "../../client";
import type { AnyStorefrontQueryString } from "../../graphql";
import type { CartAction, CartLineAddInput } from "./actions";
import { getCart } from "./get-cart";
import {
  cartBuyerIdentityUpdateMutation,
  cartQueries,
  makeCartQueries,
  type CreateCartQueriesOptions,
} from "./queries";
import type { CartTransport, CartTransportContext, CartWriteResult } from "./transport";

type StorefrontCartQueries = typeof cartQueries;

type StorefrontCartTransportOptions = {
  readonly fragment?: AnyStorefrontQueryString;
};

export interface StorefrontCartTransport extends CartTransport {
  readonly cartQuery: AnyStorefrontQueryString;
  updateBuyerIdentity(
    cartId: string,
    customerAccessToken: string | null,
    ctx: Pick<CartTransportContext, "storefrontClient">,
  ): Promise<void>;
}

export function storefrontCartTransport(
  options?: StorefrontCartTransportOptions,
): StorefrontCartTransport {
  const queries = (
    options?.fragment
      ? makeCartQueries({ fragment: options.fragment } as CreateCartQueriesOptions)
      : cartQueries
  ) as StorefrontCartQueries;

  return {
    cartQuery: queries.cart,
    read: (cartId, { storefrontClient }) => getCart(cartId, storefrontClient, queries.cart),
    apply: (cartId, action, { storefrontClient, customerAccessToken }) =>
      executeMutation(action, cartId, storefrontClient, queries, customerAccessToken),
    updateBuyerIdentity: async (cartId, customerAccessToken, { storefrontClient }) => {
      const result = await storefrontClient.graphql(cartBuyerIdentityUpdateMutation, {
        variables: { cartId, buyerIdentity: { customerAccessToken } },
      });
      const { userErrors } = assertMutationData(result, "cartBuyerIdentityUpdate");
      if (userErrors.length > 0) {
        throw new Error(userErrors.map(({ message }) => message).join("\n"));
      }
    },
  };
}

type GraphQLResult<D> = {
  data: D | null;
  errors?: GraphQLFormattedError[];
  headers: Headers;
};

function assertGraphQLData<D>(result: GraphQLResult<D>): NonNullable<D> {
  if (result.errors || !result.data) {
    const message = result.errors?.[0]?.message ?? "GraphQL error";
    throw new Error(message);
  }
  return result.data as NonNullable<D>;
}

function assertMutationData<D, K extends keyof NonNullable<D>>(
  result: GraphQLResult<D>,
  key: K,
): NonNullable<NonNullable<D>[K]> {
  const data = assertGraphQLData(result);
  const payload = data[key];
  if (payload == null) {
    throw new Error(`Missing ${String(key)} in mutation response`);
  }
  return payload as NonNullable<NonNullable<D>[K]>;
}

function createWriteResult(
  {
    cart,
    userErrors,
    warnings,
  }: Omit<CartWriteResult, "cart" | "headers"> & {
    cart?: CartWriteResult["cart"];
  },
  headers: Headers,
): CartWriteResult {
  return { cart: cart ?? null, userErrors, warnings, headers };
}

type CartMutationClient = Pick<StorefrontClient, "graphql">;

async function executeMutation(
  action: CartAction,
  cartId: string | null,
  storefront: CartMutationClient,
  queries: StorefrontCartQueries,
  customerAccessToken?: string,
): Promise<CartWriteResult> {
  if (action.intent === "add") {
    return executeAdd(action.lines, cartId, storefront, queries, customerAccessToken);
  }

  if (!cartId) {
    throw new Error("cartId is required for non-add mutations");
  }

  switch (action.intent) {
    case "update": {
      const result = await storefront.graphql(queries.cartLinesUpdate, {
        variables: { cartId, lines: action.lines },
      });
      return createWriteResult(assertMutationData(result, "cartLinesUpdate"), result.headers);
    }
    case "remove": {
      const result = await storefront.graphql(queries.cartLinesRemove, {
        variables: { cartId, lineIds: action.lineIds },
      });
      return createWriteResult(assertMutationData(result, "cartLinesRemove"), result.headers);
    }
    case "discount-update": {
      const result = await storefront.graphql(queries.cartDiscountCodesUpdate, {
        variables: { cartId, discountCodes: action.discountCodes },
      });
      return createWriteResult(
        assertMutationData(result, "cartDiscountCodesUpdate"),
        result.headers,
      );
    }
    case "discount-apply":
      return executeDiscountModify(cartId, "apply", action.code, storefront, queries);
    case "discount-remove":
      return executeDiscountModify(cartId, "remove", action.code, storefront, queries);
    case "note-update": {
      const result = await storefront.graphql(queries.cartNoteUpdate, {
        variables: { cartId, note: action.note },
      });
      return createWriteResult(assertMutationData(result, "cartNoteUpdate"), result.headers);
    }
    case "attributes-update": {
      const result = await storefront.graphql(queries.cartAttributesUpdate, {
        variables: { cartId, attributes: action.attributes },
      });
      return createWriteResult(assertMutationData(result, "cartAttributesUpdate"), result.headers);
    }
    default: {
      const _exhaustive: never = action;
      throw new Error(`Unhandled cart action intent: ${(_exhaustive as CartAction).intent}`);
    }
  }
}

async function executeAdd(
  lines: CartLineAddInput[],
  cartId: string | null,
  storefront: CartMutationClient,
  queries: StorefrontCartQueries,
  customerAccessToken?: string,
): Promise<CartWriteResult> {
  if (cartId) {
    const result = await storefront.graphql(queries.cartLinesAdd, {
      variables: { cartId, lines },
    });
    return createWriteResult(assertMutationData(result, "cartLinesAdd"), result.headers);
  }

  const result = await storefront.graphql(queries.cartCreate, {
    variables: {
      input: {
        lines,
        ...(customerAccessToken && { buyerIdentity: { customerAccessToken } }),
      },
    },
  });
  return createWriteResult(assertMutationData(result, "cartCreate"), result.headers);
}

async function executeDiscountModify(
  cartId: string,
  mode: "apply" | "remove",
  code: string,
  storefront: CartMutationClient,
  queries: StorefrontCartQueries,
): Promise<CartWriteResult> {
  // Read-then-write: SFAPI has no atomic discount modify endpoint, so concurrent
  // requests can overwrite each other's discount codes.
  const cartResult = await storefront.graphql(queries.cart, {
    variables: { id: cartId },
  });
  const cartData = assertGraphQLData(cartResult);

  const currentCodes: string[] = (cartData.cart?.discountCodes ?? []).map((dc) => dc.code);

  const updatedCodes =
    mode === "apply" ? [...currentCodes, code] : currentCodes.filter((c) => c !== code);

  const result = await storefront.graphql(queries.cartDiscountCodesUpdate, {
    variables: { cartId, discountCodes: updatedCodes },
  });
  return createWriteResult(assertMutationData(result, "cartDiscountCodesUpdate"), result.headers);
}
