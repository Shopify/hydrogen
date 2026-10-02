import type { StorefrontClient } from "../../../client";
import { gql } from "../../../graphql";
import { createCartCookie, getCartIdFromCookie } from "../../cart/cookie";
import { getLogger } from "../../logging";
import { DISCOUNT_LINK_RE, getSameOriginPath } from "../../url";
import type { HydrogenRouteInterceptor } from "../route-types";

const log = getLogger("discount-link");

const REDIRECT_PARAMS = ["redirect", "return_to"];

const CART_DISCOUNT_CODES_QUERY = gql(`
  query DiscountLinkCart($id: ID!) {
    cart(id: $id) {
      id
      discountCodes {
        code
      }
    }
  }
`);

const CART_DISCOUNT_CODES_UPDATE_MUTATION = gql(`
  mutation DiscountLinkCartDiscountCodesUpdate($cartId: ID!, $discountCodes: [String!]!) {
    cartDiscountCodesUpdate(cartId: $cartId, discountCodes: $discountCodes) {
      cart {
        id
      }
      userErrors {
        message
      }
    }
  }
`);

const CART_CREATE_MUTATION = gql(`
  mutation DiscountLinkCartCreate($discountCodes: [String!], $country: CountryCode, $language: LanguageCode)
  @inContext(country: $country, language: $language) {
    cartCreate(input: { discountCodes: $discountCodes }) {
      cart {
        id
      }
      userErrors {
        message
      }
    }
  }
`);

export const handleDiscountLinkRedirect: HydrogenRouteInterceptor = (
  url,
  { request, storefrontClient },
) => {
  const match = url.pathname.match(DISCOUNT_LINK_RE);
  if (!match) {
    return null;
  }

  if (request.method !== "GET") {
    return Promise.resolve(new Response("Method Not Allowed", { status: 405 }));
  }

  const code = parseCode(match[1] ?? "");
  const location = getRedirectLocation(url);
  if (code === null) {
    return Promise.resolve(createDiscountRedirect(location));
  }

  return applyDiscountCode(code, request, storefrontClient).then(
    (createdCartId) => createDiscountRedirect(location, createdCartId),
    (error: unknown) => {
      log.error("discount link could not apply code", { error });
      return createDiscountRedirect(location);
    },
  );
};

function parseCode(segment: string): string | null {
  try {
    return decodeURIComponent(segment).trim() || null;
  } catch {
    return null;
  }
}

function getRedirectLocation(url: URL): string {
  const target = REDIRECT_PARAMS.map((key) => url.searchParams.get(key)).find(Boolean);
  const location = new URL(getSameOriginPath(target, url.origin) ?? "/", url.origin);
  const targetKeys = new Set(location.searchParams.keys());

  for (const [key, value] of url.searchParams) {
    if (REDIRECT_PARAMS.includes(key) || targetKeys.has(key)) continue;
    location.searchParams.append(key, value);
  }

  // Absolute because framework proxy runtimes such as Next.js middleware reject relative locations.
  return location.toString();
}

async function applyDiscountCode(
  code: string,
  request: Request,
  storefrontClient: StorefrontClient,
): Promise<string | null> {
  const cartId = getCartIdFromCookie(request);
  const cart = cartId ? await getCartDiscountCodes(cartId, storefrontClient) : null;
  if (!cart) return createCartWithCode(code, storefrontClient);

  const codes = cart.discountCodes.map((discount) => discount.code);
  const normalizedCode = code.toLowerCase();
  if (codes.some((existing) => existing.toLowerCase() === normalizedCode)) return null;

  // cartDiscountCodesUpdate replaces the whole list, so existing codes must be resent.
  const result = await storefrontClient.graphql(CART_DISCOUNT_CODES_UPDATE_MUTATION, {
    variables: { cartId: cart.id, discountCodes: [...codes, code] },
  });
  assertNoErrors("cartDiscountCodesUpdate", [
    ...(result.errors ?? []),
    ...(result.data?.cartDiscountCodesUpdate?.userErrors ?? []),
  ]);
  return null;
}

async function getCartDiscountCodes(cartId: string, storefrontClient: StorefrontClient) {
  const result = await storefrontClient.graphql(CART_DISCOUNT_CODES_QUERY, {
    variables: { id: cartId },
  });
  assertNoErrors("cart", result.errors ?? []);
  return result.data?.cart ?? null;
}

async function createCartWithCode(code: string, storefrontClient: StorefrontClient) {
  const result = await storefrontClient.graphql(CART_CREATE_MUTATION, {
    variables: { discountCodes: [code] },
  });
  const payload = result.data?.cartCreate;
  assertNoErrors("cartCreate", [...(result.errors ?? []), ...(payload?.userErrors ?? [])]);

  const createdCartId = payload?.cart?.id;
  if (!createdCartId) throw new Error("cartCreate returned no cart");
  return createdCartId;
}

function assertNoErrors(operation: string, errors: ReadonlyArray<{ message: string }>): void {
  if (errors.length > 0) {
    throw new Error(`${operation} failed: ${errors.map((e) => e.message).join("; ")}`);
  }
}

function createDiscountRedirect(location: string, createdCartId?: string | null): Response {
  const headers = new Headers({ location, "cache-control": "no-store" });
  if (createdCartId) headers.append("set-cookie", createCartCookie(createdCartId));
  return new Response(null, { status: 303, headers });
}
