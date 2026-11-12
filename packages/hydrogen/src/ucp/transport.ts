import type { CartLineInput, UpdateCartPayload } from "../../vendor/standard-actions";
import type { StorefrontClient } from "../client";
import type { CartData, CartUserError } from "../core/cart/state";
import {
  createCartServerTransport,
  type CartServerTransport,
  type CartTransportContext,
  type CartWriteResult,
} from "../core/cart/transport";
import { getLogger } from "../core/logging";
import { gql } from "../graphql";
import {
  CATALOG_LOOKUP_CAPABILITY,
  DISCOUNT_CAPABILITY,
  hasCapability,
  indexCatalog,
  isUcpCart,
  isUcpCatalog,
  toCartData,
  toUserErrors,
  toWarnings,
  type CatalogEntry,
  type UcpCart,
} from "./cart-data";
import { createUcpToolCaller, UcpToolError, type UcpToolCaller } from "./mcp";

const OPTIMISTIC_LINE_ID_PREFIX = "optimistic:";
const CART_CHECKOUT_URL_QUERY = gql(`
  query HydrogenUcpCartCheckoutUrl($id: ID!) {
    cart(id: $id) {
      checkoutUrl
    }
  }
`);
const log = getLogger("ucp-cart");

/**
 * Options for `createUcpCartTransport`.
 *
 * @publicDocs
 */
export type CreateUcpCartTransportOptions = {
  /** URL of your UCP agent profile. It must declare `dev.ucp.shopping.cart`. Declare `dev.ucp.shopping.discount` for discount codes and `dev.ucp.shopping.catalog.lookup` for product titles and links. */
  agentProfile: string | URL;
};

type UcpLineInput = { id?: string; item: { id: string }; quantity: number };

type UcpSession = {
  call: UcpToolCaller;
  context: { address_country: string; language: string };
  /** Finds the checkout URL for a cart whose UCP reply has no `continue_url`. */
  checkoutUrl: (cartId: string) => Promise<string | null>;
};

type PlanError = { error: CartUserError };

type UpdatePlan = { lines: UcpLineInput[]; codes: string[] | undefined } | PlanError;

type CartChanges = Omit<UpdateCartPayload, "cartId">;

/**
 * Creates a cart transport that keeps carts in your store's Universal Commerce Protocol (UCP) cart, through the store's UCP MCP endpoint at `/api/ucp/mcp`. Pass the transport to `createCartServerHandlers`.
 *
 * The transport also keeps one cart per seller: the handlers' `/api/cart?seller=<handle>` route sends that seller's requests to `https://<handle>.myshopify.com/api/ucp/mcp`.
 *
 * The transport sends requests as an anonymous agent with your agent profile, and never forwards the customer's cookies. Carts have no buyer identity, note, cart attributes, line attributes, or selling plans: those changes return a user error and leave the cart unchanged. The cart store sends one change at a time to a UCP cart, because each UCP update replaces the whole cart.
 *
 * When a home-store cart's UCP reply has no `continue_url`, the transport reads the cart's `checkoutUrl` with one Storefront API query through the handlers' Storefront API client. When that query fails, the cart's `checkoutUrl` is `null` and the transport logs a warning. Seller carts never use the Storefront API, so a seller cart without `continue_url` has a `null` `checkoutUrl`.
 *
 * Use the transport only on the server. The function throws in a browser, and throws a `TypeError` when `agentProfile` isn't a valid URL.
 *
 * @example
 * ```ts
 * import { createCartServerHandlers } from "@shopify/hydrogen";
 * import { createUcpCartTransport } from "@shopify/hydrogen/ucp";
 *
 * const cartHandlers = createCartServerHandlers({
 *   transport: createUcpCartTransport({
 *     agentProfile: "https://example.com/.well-known/ucp-agent.json",
 *   }),
 * });
 * ```
 * @publicDocs
 */
export function createUcpCartTransport({
  agentProfile,
}: CreateUcpCartTransportOptions): CartServerTransport {
  if (typeof document !== "undefined") {
    throw new Error(
      "createUcpCartTransport can't run in a browser. Use it from server or edge routes only.",
    );
  }
  const profile = new URL(agentProfile).href;

  const session = ({ storefrontClient, seller }: CartTransportContext): UcpSession => ({
    call: createUcpToolCaller(profile, storefrontClient, seller),
    context: {
      address_country: storefrontClient.i18n.country,
      language: storefrontClient.i18n.language,
    },
    checkoutUrl:
      seller === undefined
        ? (cartId) => queryCheckoutUrl(storefrontClient, cartId)
        : () => Promise.resolve(null),
  });

  return createCartServerTransport({
    ordering: "sequential",
    sellers: true,
    getCart: async ({ cartId }, ctx) => {
      const ucp = session(ctx);
      const cart = await getCart(ucp.call, cartId);
      if (!cart) return { cart: null, headers: new Headers() };
      const catalog = await lookupCatalog(ucp.call, cart, variantIds(cart));
      return {
        cart: await transportCart(ucp, cart, catalog),
        headers: new Headers(),
        ...expiry(cart),
      };
    },
    updateCart: async ({ cartId, ...changes }, ctx) => {
      const ucp = session(ctx);
      if (!cartId) return createCart(ucp, changes);

      const current = await getCart(ucp.call, cartId);
      if (!current)
        return isAddOnly(changes) ? createCart(ucp, changes) : userErrorResult(CART_NOT_FOUND);

      const plan = planUpdate(current, changes);
      if ("error" in plan) return currentCartResult(ucp, current, plan.error);

      const [updated, catalog] = await Promise.all([
        ucp.call(
          "update_cart",
          {
            id: cartId,
            cart: {
              line_items: plan.lines,
              context: ucp.context,
              ...(plan.codes && { discounts: { codes: plan.codes } }),
            },
          },
          isUcpCart,
        ),
        lookupCatalog(
          ucp.call,
          current,
          plan.lines.map(({ item }) => item.id),
        ),
      ]);
      return cartResult(ucp, updated, catalog);
    },
  });
}

const NOT_SUPPORTED_LINE: CartUserError = {
  code: null,
  message: "UCP carts don't support line attributes, selling plans, or changing a line's variant.",
};

const NOT_SUPPORTED_CART_FIELDS: CartUserError = {
  code: null,
  message: "UCP carts don't support cart notes or cart attributes.",
};

const DISCOUNTS_NOT_SUPPORTED: CartUserError = {
  code: null,
  message: `Discount codes need ${DISCOUNT_CAPABILITY}, which the store or your UCP agent profile doesn't support.`,
};

const CART_NOT_FOUND: CartUserError = { code: null, message: "The cart doesn't exist." };

const MISSING_MERCHANDISE: CartUserError = {
  code: "INVALID",
  message: "A new cart line needs a merchandiseId.",
};

async function createCart(ucp: UcpSession, changes: CartChanges) {
  const { call, context } = ucp;
  if (changes.note !== undefined || changes.attributes !== undefined) {
    return userErrorResult(NOT_SUPPORTED_CART_FIELDS);
  }
  const lines = applyLineChanges([], changes.lines ?? []);
  if ("error" in lines) return userErrorResult(lines.error);
  const created = await call(
    "create_cart",
    {
      cart: {
        line_items: lines,
        context,
        ...(changes.discountCodes && { discounts: { codes: changes.discountCodes } }),
      },
    },
    isUcpCart,
  );
  return cartResult(ucp, created, await lookupCatalog(call, created, variantIds(created)));
}

async function getCart(call: UcpToolCaller, cartId: string): Promise<UcpCart | null> {
  try {
    return await call("get_cart", { id: cartId }, isUcpCart);
  } catch (error) {
    // Stores name a missing, expired, or canceled cart differently (`cart_not_found`,
    // `not_found`, `invalid_cart_id`), but all mark it unrecoverable.
    if (error instanceof UcpToolError && error.severity === "unrecoverable") return null;
    throw error;
  }
}

async function lookupCatalog(
  call: UcpToolCaller,
  response: UcpCart,
  ids: string[],
): Promise<Map<string, CatalogEntry>> {
  if (ids.length === 0 || !hasCapability(response, CATALOG_LOOKUP_CAPABILITY)) return new Map();
  try {
    return indexCatalog(await call("lookup_catalog", { catalog: { ids } }, isUcpCatalog));
  } catch (error) {
    log.warn("product lookup failed, so cart lines show their variant titles", { error });
    return new Map();
  }
}

async function currentCartResult(
  ucp: UcpSession,
  cart: UcpCart,
  error: CartUserError,
): Promise<CartWriteResult> {
  const catalog = await lookupCatalog(ucp.call, cart, variantIds(cart));
  return {
    cart: await transportCart(ucp, cart, catalog),
    userErrors: [error],
    warnings: [],
    headers: new Headers(),
    ...expiry(cart),
  };
}

async function cartResult(
  ucp: UcpSession,
  cart: UcpCart,
  catalog: Map<string, CatalogEntry>,
): Promise<CartWriteResult> {
  return {
    cart: await transportCart(ucp, cart, catalog),
    userErrors: toUserErrors(cart.messages),
    warnings: toWarnings(cart.messages),
    headers: new Headers(),
    ...expiry(cart),
  };
}

async function transportCart(
  ucp: UcpSession,
  cart: UcpCart,
  catalog: Map<string, CatalogEntry>,
): Promise<CartData> {
  const data = toCartData(cart, catalog);
  if (data.checkoutUrl !== null) return data;
  return { ...data, checkoutUrl: await ucp.checkoutUrl(cart.id) };
}

// Some stores' UCP carts have no `continue_url`. The Storefront API returns the checkout URL for
// the same cart ID, but only on the home store, so seller carts never use it.
async function queryCheckoutUrl(
  storefrontClient: StorefrontClient,
  cartId: string,
): Promise<string | null> {
  let result;
  try {
    result = await storefrontClient.graphql(CART_CHECKOUT_URL_QUERY, {
      variables: { id: cartId },
    });
  } catch (error) {
    log.warn("checkout URL lookup failed, so the cart has no checkout URL", { error });
    return null;
  }
  const checkoutUrl = result.data?.cart?.checkoutUrl;
  if (checkoutUrl) return checkoutUrl;
  log.warn("checkout URL lookup returned no cart, so the cart has no checkout URL", {
    errors: result.errors?.map(({ message }) => message),
  });
  return null;
}

function expiry(cart: UcpCart): { expiresAt?: string } {
  return cart.expires_at === undefined ? {} : { expiresAt: cart.expires_at };
}

function userErrorResult(error: CartUserError): CartWriteResult {
  return { cart: null, userErrors: [error], warnings: [], headers: new Headers() };
}

function variantIds(cart: UcpCart): string[] {
  return cart.line_items.map(({ item }) => item.id);
}

function hasUnsupportedLineFields(line: {
  attributes?: unknown[];
  sellingPlanId?: string;
}): boolean {
  return Boolean(line.attributes?.length || line.sellingPlanId);
}

function isAddOnly({ lines, note, discountCodes, attributes }: CartChanges): boolean {
  return (
    note === undefined &&
    discountCodes === undefined &&
    attributes === undefined &&
    (lines ?? []).every((line) => line.id === undefined)
  );
}

function planUpdate(
  cart: UcpCart,
  { lines: changes = [], discountCodes, note, attributes }: CartChanges,
): UpdatePlan {
  if (note !== undefined || attributes !== undefined) return { error: NOT_SUPPORTED_CART_FIELDS };
  const discounts = hasCapability(cart, DISCOUNT_CAPABILITY);
  if (discountCodes !== undefined && !discounts) return { error: DISCOUNTS_NOT_SUPPORTED };

  const current = cart.line_items.map(({ id, item, quantity }) => ({
    id,
    item: { id: item.id },
    quantity,
  }));
  const lines = applyLineChanges(current, changes);
  if ("error" in lines) return lines;
  return { lines, codes: discounts ? (discountCodes ?? cart.discounts?.codes ?? []) : undefined };
}

// A line with an `id` sets that line's quantity, and 0 removes it. A line without one adds
// its quantity to the line for the same variant, the way Standard Actions payloads work.
function applyLineChanges(
  lines: UcpLineInput[],
  changes: CartLineInput[],
): UcpLineInput[] | PlanError {
  const next = lines.map((line) => ({ ...line }));
  for (const change of changes) {
    if (hasUnsupportedLineFields(change)) return { error: NOT_SUPPORTED_LINE };
    if (change.id === undefined) {
      if (!change.merchandiseId) return { error: MISSING_MERCHANDISE };
      const existing = next.find(({ item }) => item.id === change.merchandiseId);
      if (existing) existing.quantity += change.quantity;
      else next.push({ item: { id: change.merchandiseId }, quantity: change.quantity });
      continue;
    }
    const line = findLine(next, change.id);
    if (!line) return unknownLine(change.id);
    if (change.merchandiseId !== undefined && change.merchandiseId !== line.item.id) {
      return { error: NOT_SUPPORTED_LINE };
    }
    line.quantity = change.quantity;
  }
  return next.filter(({ quantity }) => quantity > 0);
}

function findLine(lines: UcpLineInput[], id: string): UcpLineInput | undefined {
  // The cart store names a line it hasn't confirmed yet `optimistic:<variant ID>`. A UCP cart
  // has one line per variant.
  const variantId = id.startsWith(OPTIMISTIC_LINE_ID_PREFIX)
    ? id.slice(OPTIMISTIC_LINE_ID_PREFIX.length)
    : undefined;
  const lineId = withoutCartSuffix(id);
  return lines.find((line) =>
    variantId
      ? line.item.id === variantId
      : line.id !== undefined && withoutCartSuffix(line.id) === lineId,
  );
}

// Standard Actions adds `?cart=<token>` to line IDs, and some UCP stores return IDs without it.
function withoutCartSuffix(lineId: string): string {
  return lineId.replace(/\?cart=.*$/, "");
}

function unknownLine(id: string): PlanError {
  return {
    error: { code: "INVALID_MERCHANDISE_LINE", message: `The cart has no line with ID ${id}.` },
  };
}
