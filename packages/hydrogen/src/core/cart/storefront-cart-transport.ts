import type { CartLineInput, UpdateCartPayload } from "../../../vendor/standard-actions";
import type { GraphQLFormattedError, StorefrontClient } from "../../client";
import type { AnyStorefrontQueryString } from "../../graphql";
import type { CartLineAddInput, CartLineUpdateInput } from "./actions";
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
    getCart: ({ cartId }, { storefrontClient }) => getCart(cartId, storefrontClient, queries.cart),
    updateCart: ({ cartId, ...changes }, { storefrontClient, customerAccessToken }) =>
      cartId
        ? updateExistingCart(cartId, changes, storefrontClient, queries)
        : createCart(changes, storefrontClient, queries, customerAccessToken),
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

type CartChanges = Omit<UpdateCartPayload, "cartId">;

type CartMutation = () => Promise<CartWriteResult>;

async function createCart(
  { lines, note, discountCodes, attributes }: CartChanges,
  storefront: CartMutationClient,
  queries: StorefrontCartQueries,
  customerAccessToken?: string,
): Promise<CartWriteResult> {
  const { added, changed } = splitLines(lines);
  if (changed.length > 0) {
    throw new Error("cartId is required to change existing cart lines");
  }

  const result = await storefront.graphql(queries.cartCreate, {
    variables: {
      input: {
        ...(lines && { lines: added }),
        ...(note !== undefined && { note }),
        ...(discountCodes && { discountCodes }),
        ...(attributes && { attributes }),
        ...(customerAccessToken && { buyerIdentity: { customerAccessToken } }),
      },
    },
  });
  return createWriteResult(assertMutationData(result, "cartCreate"), result.headers);
}

// The Storefront API has one mutation per kind of change, so a payload with several
// fields runs several mutations in order and stops at the first one with user errors.
async function updateExistingCart(
  cartId: string,
  changes: CartChanges,
  storefront: CartMutationClient,
  queries: StorefrontCartQueries,
): Promise<CartWriteResult> {
  const [first, ...rest] = cartMutations(cartId, changes, storefront, queries);
  if (!first) {
    throw new Error("updateCart payload has no changes");
  }

  let result = await first();
  for (const mutation of rest) {
    if (result.userErrors.length > 0) break;
    const next = await mutation();
    result = {
      ...next,
      userErrors: [...result.userErrors, ...next.userErrors],
      warnings: [...result.warnings, ...next.warnings],
    };
  }
  return result;
}

function cartMutations(
  cartId: string,
  { lines, note, discountCodes, attributes }: CartChanges,
  storefront: CartMutationClient,
  queries: StorefrontCartQueries,
): CartMutation[] {
  const { added, changed } = splitLines(lines);
  const mutations: CartMutation[] = [];

  if (added.length > 0) {
    mutations.push(async () => {
      const result = await storefront.graphql(queries.cartLinesAdd, {
        variables: { cartId, lines: added },
      });
      return createWriteResult(assertMutationData(result, "cartLinesAdd"), result.headers);
    });
  }
  if (changed.length > 0 && changed.every(({ quantity }) => quantity === 0)) {
    mutations.push(async () => {
      const result = await storefront.graphql(queries.cartLinesRemove, {
        variables: { cartId, lineIds: changed.map(({ id }) => id) },
      });
      return createWriteResult(assertMutationData(result, "cartLinesRemove"), result.headers);
    });
  } else if (changed.length > 0) {
    mutations.push(async () => {
      const result = await storefront.graphql(queries.cartLinesUpdate, {
        variables: { cartId, lines: changed },
      });
      return createWriteResult(assertMutationData(result, "cartLinesUpdate"), result.headers);
    });
  }
  if (discountCodes) {
    mutations.push(async () => {
      const result = await storefront.graphql(queries.cartDiscountCodesUpdate, {
        variables: { cartId, discountCodes },
      });
      return createWriteResult(
        assertMutationData(result, "cartDiscountCodesUpdate"),
        result.headers,
      );
    });
  }
  if (note !== undefined) {
    mutations.push(async () => {
      const result = await storefront.graphql(queries.cartNoteUpdate, {
        variables: { cartId, note },
      });
      return createWriteResult(assertMutationData(result, "cartNoteUpdate"), result.headers);
    });
  }
  if (attributes) {
    mutations.push(async () => {
      const result = await storefront.graphql(queries.cartAttributesUpdate, {
        variables: { cartId, attributes },
      });
      return createWriteResult(assertMutationData(result, "cartAttributesUpdate"), result.headers);
    });
  }
  return mutations;
}

function splitLines(lines: CartLineInput[] = []): {
  added: CartLineAddInput[];
  changed: CartLineUpdateInput[];
} {
  const added = lines.filter(isNewLine);
  const changed = lines.filter(isExistingLine);
  if (added.length + changed.length !== lines.length) {
    throw new Error("Each cart line needs an id or a merchandiseId");
  }
  return { added, changed };
}

function isNewLine(line: CartLineInput): line is CartLineAddInput {
  return !line.id && typeof line.merchandiseId === "string";
}

function isExistingLine(line: CartLineInput): line is CartLineUpdateInput {
  return typeof line.id === "string" && line.id !== "";
}
