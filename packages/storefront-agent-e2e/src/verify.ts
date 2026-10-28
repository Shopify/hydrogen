import { gql } from "@shopify/hydrogen";

import { redactCartKeys } from "./checkout";
import { createStorefrontApiClient, requestSignal } from "./storefront-api";
import type { AddToCartTask } from "./task";

export type CartLine = {
  readonly quantity: number;
  readonly variantId: string;
  readonly label: string;
};

export type CartState =
  | {
      readonly kind: "correct";
      readonly lines: readonly CartLine[];
      readonly unexpectedLines: readonly CartLine[];
    }
  | { readonly kind: "wrong"; readonly lines: readonly CartLine[]; readonly reason: string }
  | { readonly kind: "no-checkout" }
  | { readonly kind: "unverifiable"; readonly reason: string };

const CART_QUERY = gql(`
  query AgentVerifyCart($id: ID!) {
    cart(id: $id) {
      lines(first: 50) {
        pageInfo {
          hasNextPage
        }
        nodes {
          quantity
          merchandise {
            ... on ProductVariant {
              id
              title
              product {
                title
              }
            }
          }
        }
      }
    }
  }
`);

// Reads the cart from the checkout URL alone, so the verdict never depends on how a
// storefront stores cart identity or on what the agent claims.
export async function verifyCart(
  task: AddToCartTask,
  checkoutUrl: string | null,
): Promise<CartState> {
  if (!checkoutUrl) return { kind: "no-checkout" };

  const url = new URL(checkoutUrl);
  const cartId = cartIdFromCheckoutUrl(url);
  if (!cartId) {
    return { kind: "unverifiable", reason: `Unrecognized checkout URL path ${url.pathname}` };
  }

  const result = await createStorefrontApiClient(url.host)
    .graphql(CART_QUERY, { signal: requestSignal(), variables: { id: cartId } })
    .catch((error: unknown) => ({ data: null, errors: [{ message: String(error) }] }));
  if (result.errors?.length) {
    const messages = result.errors.map((e) => e.message).join("; ");
    return { kind: "unverifiable", reason: redactCartKeys(`${url.host}: ${messages}`) };
  }
  const cart = result.data?.cart;
  if (!cart) return { kind: "unverifiable", reason: `${url.host}: cart not found` };
  if (cart.lines.pageInfo.hasNextPage) {
    return { kind: "unverifiable", reason: `${url.host}: cart has more than 50 lines` };
  }

  const lines = cart.lines.nodes.map((line) => ({
    quantity: line.quantity,
    variantId: line.merchandise.id,
    label: `${line.merchandise.product.title} - ${line.merchandise.title}`,
  }));
  const targetQuantity = lines
    .filter((line) => line.variantId === task.variantId)
    .reduce((sum, line) => sum + line.quantity, 0);

  if (targetQuantity !== task.quantity) {
    return {
      kind: "wrong",
      lines,
      reason: `Expected ${task.quantity} x ${task.productTitle} - ${task.variantTitle}, cart has ${targetQuantity}`,
    };
  }
  return {
    kind: "correct",
    lines,
    unexpectedLines: lines.filter((line) => line.variantId !== task.variantId),
  };
}

// Two handoff shapes: the Storefront API's checkoutUrl (/cart/c/<token>?key=<key>), and the
// checkout a Liquid cart form redirects to (/checkouts/cn/<token>/<locale>), which has no key.
// The cart token alone reads the cart there.
export function cartIdFromCheckoutUrl(url: URL): string | null {
  const match =
    url.pathname.match(/^\/cart\/c\/([^/]+)$/) ?? url.pathname.match(/^\/checkouts\/cn\/([^/]+)/);
  if (!match) return null;
  const key = url.searchParams.get("key");
  return `gid://shopify/Cart/${match[1]}${key ? `?key=${key}` : ""}`;
}
