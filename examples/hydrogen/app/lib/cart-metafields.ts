import {
  cartQueries,
  createCartCookie,
  createShopifyRouteHandler,
  getCartId,
  gql,
  type ShopifyRouteErrorResult,
  type ShopifyRouteHandlerContext,
  type ShopifyRouteHandlerResult,
} from "@shopify/hydrogen";

// App-owned cart metafield endpoint.
//
// Cart metafields are not part of Standard Actions (the cart ajax API), so they
// cannot flow through Hydrogen's optimistic cart store the way line/discount/note
// mutations do. Instead of teaching the core cart API about metafields, this
// example owns the mutation itself and relies on two composable Hydrogen pieces:
//
//   1. A custom `CartFragment` (see cart-handlers.ts) so metafields are *read*
//      back through the normal cart query.
//   2. `useCartActions().refresh()` on the client so the store re-syncs after a
//      successful write (see CartDeliveryInstructions.tsx).
//
// The mutation and the re-sync are intentionally decoupled: this route returns
// only the mutation's `userErrors`, never a refetched cart. A failed re-sync is
// therefore reported as a soft cart-refresh error, never as a failed save.
export const CART_METAFIELDS_PATH = "/api/cart/metafields";

const HTTP_BAD_GATEWAY_STATUS = 502;

const CART_METAFIELDS_SET_MUTATION = gql(`
  mutation ExampleCartMetafieldsSet(
    $metafields: [CartMetafieldsSetInput!]!
    $country: CountryCode
    $language: LanguageCode
  ) @inContext(country: $country, language: $language) {
    cartMetafieldsSet(metafields: $metafields) {
      userErrors {
        code
        elementIndex
        field
        message
      }
    }
  }
`);

const CART_METAFIELD_DELETE_MUTATION = gql(`
  mutation ExampleCartMetafieldDelete(
    $input: CartMetafieldDeleteInput!
    $country: CountryCode
    $language: LanguageCode
  ) @inContext(country: $country, language: $language) {
    cartMetafieldDelete(input: $input) {
      userErrors {
        code
        field
        message
      }
    }
  }
`);

type CartMetafieldInput = { key: string; type: string; value: string };

type CartMetafieldRequest =
  | { intent: "set"; metafields: CartMetafieldInput[] }
  | { intent: "delete"; key: string };

// Thrown for malformed request bodies so the handler can answer 400 rather than
// letting an unexpected shape reach the Storefront API.
class CartMetafieldRequestError extends Error {}

// Hand-rolled validation mirrors the core cart action parser's style rather than
// pulling a schema library into the example. Swap in Zod here if the app already
// depends on it.
function parseCartMetafieldRequest(body: unknown): CartMetafieldRequest {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throw new CartMetafieldRequestError("Request body must be a JSON object.");
  }
  const record = body as Record<string, unknown>;

  if ("deleteMetafield" in record) {
    const key = record.deleteMetafield;
    if (typeof key !== "string" || key === "") {
      throw new CartMetafieldRequestError('"deleteMetafield" must be a non-empty metafield key.');
    }
    return { intent: "delete", key };
  }

  if ("metafields" in record && Array.isArray(record.metafields)) {
    if (record.metafields.length === 0) {
      throw new CartMetafieldRequestError('"metafields" must not be empty.');
    }
    return { intent: "set", metafields: record.metafields.map(parseMetafieldEntry) };
  }

  throw new CartMetafieldRequestError('Body must contain "metafields" or "deleteMetafield".');
}

function parseMetafieldEntry(raw: unknown): CartMetafieldInput {
  if (typeof raw !== "object" || raw === null) {
    throw new CartMetafieldRequestError("Each metafield must be an object.");
  }
  const entry = raw as Record<string, unknown>;
  if (
    typeof entry.key !== "string" ||
    typeof entry.type !== "string" ||
    typeof entry.value !== "string"
  ) {
    throw new CartMetafieldRequestError('Each metafield needs string "key", "type", and "value".');
  }
  return { key: entry.key, type: entry.type, value: entry.value };
}

function requestError(message: string): ShopifyRouteErrorResult {
  return { type: "error", error: { code: "invalid_cart_metafield_request", message } };
}

function storefrontError(message = "Storefront request failed."): ShopifyRouteErrorResult {
  return {
    type: "error",
    status: HTTP_BAD_GATEWAY_STATUS,
    error: { code: "storefront_error", message },
  };
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

async function handleCartMetafieldsPost(
  context: ShopifyRouteHandlerContext,
): Promise<ShopifyRouteHandlerResult> {
  const { request, storefrontClient } = context;

  let parsed: CartMetafieldRequest;
  try {
    parsed = parseCartMetafieldRequest(await request.json());
  } catch (error) {
    return requestError(getErrorMessage(error, "Bad Request"));
  }

  const cartId = getCartId(request);

  if (parsed.intent === "delete") {
    if (!cartId)
      return { type: "error", error: { code: "missing_cart", message: "No cart exists." } };

    const result = await storefrontClient.graphql(CART_METAFIELD_DELETE_MUTATION, {
      variables: { input: { ownerId: cartId, key: parsed.key } },
    });
    if (result.errors || !result.data) return storefrontError(result.errors?.[0]?.message);
    return {
      type: "json",
      data: { userErrors: result.data.cartMetafieldDelete?.userErrors ?? [] },
    };
  }

  // No cart yet: preserve legacy cartCreate-with-metafields behavior by creating
  // the cart carrying the metafields, then persisting its id in the cart cookie.
  // The client seeds the store afterwards via refresh(), which loads the cart
  // when none is present locally.
  if (!cartId) {
    const result = await storefrontClient.graphql(cartQueries.cartCreate, {
      variables: { input: { metafields: parsed.metafields } },
    });
    if (result.errors || !result.data) return storefrontError(result.errors?.[0]?.message);

    const createdCartId = result.data.cartCreate?.cart?.id ?? null;
    const headers = new Headers();
    if (createdCartId) headers.append("set-cookie", createCartCookie(createdCartId));
    return {
      type: "json",
      data: { userErrors: result.data.cartCreate?.userErrors ?? [] },
      headers,
    };
  }

  const result = await storefrontClient.graphql(CART_METAFIELDS_SET_MUTATION, {
    variables: {
      metafields: parsed.metafields.map((metafield) => ({ ...metafield, ownerId: cartId })),
    },
  });
  if (result.errors || !result.data) return storefrontError(result.errors?.[0]?.message);
  return { type: "json", data: { userErrors: result.data.cartMetafieldsSet?.userErrors ?? [] } };
}

export const cartMetafieldHandlers = {
  post: createShopifyRouteHandler(CART_METAFIELDS_PATH, "POST", handleCartMetafieldsPost),
};
