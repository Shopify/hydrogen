import type { UpdateCartPayload, UpdateCartUserError } from "../../vendor/standard-actions";
import type { CartTransport } from "../core/cart/cart";
import { cartPayloadToUcpUpdate, ucpCartToCartData } from "./mapping";
import type { UcpCart, UcpCartContext, UcpChildCart, UcpRequest } from "./types";
export interface UcpCartTransportOptions {
  call(
    operation: "create_cart" | "get_cart" | "update_cart",
    args: UcpRequest,
    options: { signal?: AbortSignal },
  ): Promise<UcpCart>;
  resolveShop(merchandiseId: string): string | Promise<string>;
  /** Buyer signals sent as cart.context on creates and updates. Omit to use merchant defaults.
   * Supply a function for per-shop context; returning undefined omits context for that shop.
   * Currency is a hint; always use the response's currency for displayed money.
   */
  context?: UcpCartContext | ((shop: string) => UcpCartContext | undefined);
  ucpVersion?: "2026-08-25";
}
function decode(id?: string | null): Record<string, string> {
  if (!id) return {};
  try {
    const value: unknown = JSON.parse(id);
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error();
    return Object.fromEntries(
      Object.entries(value).map(([shop, child]) => {
        if (!shop.trim() || typeof child !== "string" || !child.trim()) throw new Error();
        return [shop, child];
      }),
    );
  } catch {
    throw new Error("Invalid UCP cart ID");
  }
}
function failures(
  results: PromiseSettledResult<unknown>[],
  shops: string[],
  errors: UpdateCartUserError[],
  signal?: AbortSignal,
) {
  signal?.throwIfAborted();
  const rejected = results.filter((r) => r.status === "rejected");
  const abort = rejected.find((r) => r.reason instanceof Error && r.reason.name === "AbortError");
  if (abort) throw abort.reason;
  if (results.length && rejected.length === results.length)
    throw new Error("UCP request failed", { cause: rejected[0] });
  results.forEach((r, i) => {
    if (r.status === "rejected")
      errors.push({
        code: "UCP_REQUEST_FAILED",
        message: "UCP request failed",
        field: ["shops", shops[i] ?? ""],
      });
  });
}
function mapped(children: Record<string, UcpChildCart>) {
  const id = JSON.stringify(
    Object.fromEntries(Object.entries(children).map(([shop, c]) => [shop, c.id])),
  );
  return ucpCartToCartData(
    { id, currency: "", totals: [], line_items: [], carts: Object.values(children) },
    id,
  );
}
/** Creates a UCP 2026-08-25 buyer transport. Persist the returned opaque cart ID.
 * Updates are serialized per instance and refresh child IDs before replacement updates.
 * Discount codes apply independently per shop. Note and attributes are unsupported.
 * @publicDocs
 * @example
 * ```tsx
 * const transport = createUcpCartTransport({call, resolveShop});
 * <CartProvider transport={transport}>{children}</CartProvider>
 * ```
 */
export function createUcpCartTransport({
  call,
  resolveShop,
  context,
  ucpVersion = "2026-08-25",
}: UcpCartTransportOptions): CartTransport {
  if (ucpVersion !== "2026-08-25") throw new Error("Unsupported UCP version");
  let queue: Promise<unknown> = Promise.resolve();
  const redirects = new Map<string | undefined, string>();
  function current(id?: string) {
    const seen = new Set<string | undefined>();
    while (redirects.has(id) && !seen.has(id)) {
      seen.add(id);
      id = redirects.get(id);
    }
    return id;
  }
  async function load(id?: string | null, signal?: AbortSignal) {
    const children: Record<string, UcpChildCart> = {};
    const errors: UpdateCartUserError[] = [];
    const entries = Object.entries(decode(id));
    const results = await Promise.allSettled(
      entries.map(async ([shop, childId]) => {
        const child = await call("get_cart", { shop, id: childId }, { signal });
        const messages = child.messages?.filter((m) => m.type === "error") ?? [];
        if (messages.length)
          errors.push(
            ...messages.map((m) => ({ code: m.code, message: m.content, field: ["shops", shop] })),
          );
        else children[shop] = { ...child, shop };
      }),
    );
    failures(
      results,
      entries.map(([shop]) => shop),
      errors,
      signal,
    );
    return { children, errors };
  }
  async function changesFor(
    payload: UpdateCartPayload,
    children: Record<string, UcpChildCart>,
    errors: UpdateCartUserError[],
  ) {
    const changes = new Map<string, NonNullable<UpdateCartPayload["lines"]>>();
    for (const [index, line] of (payload.lines ?? []).entries()) {
      const known = Object.entries(children).find(([, c]) =>
        c.line_items.some((l) => (line.id ? l.id === line.id : l.item.id === line.merchandiseId)),
      )?.[0];
      const shop =
        (line.merchandiseId ? await resolveShop(line.merchandiseId) : undefined) || known;
      if (!shop) {
        errors.push({
          code: "UNKNOWN_LINE",
          message: "Cannot resolve line seller",
          field: ["lines", line.merchandiseId ?? String(index)],
        });
        continue;
      }
      changes.set(shop, [...(changes.get(shop) ?? []), line]);
    }
    if (payload.discountCodes !== undefined)
      for (const shop of Object.keys(children)) changes.set(shop, changes.get(shop) ?? []);
    return changes;
  }
  async function update(payload: UpdateCartPayload, signal?: AbortSignal) {
    const { children, errors } = await load(current(payload.cartId), signal);
    for (const field of ["note", "attributes"] as const)
      if (payload[field] !== undefined)
        errors.push({
          code: "UNSUPPORTED",
          message: `UCP does not support ${field}`,
          field: [field],
        });
    const warnings: Array<{ code?: string; message: string }> = [];
    const changes = await changesFor(payload, children, errors);
    const results = await Promise.allSettled(
      [...changes].map(async ([shop, lines]) => {
        const child = children[shop];
        const cart = cartPayloadToUcpUpdate(child, { lines, discountCodes: payload.discountCodes });
        const buyerContext = typeof context === "function" ? context(shop) : context;
        if (buyerContext !== undefined) cart.context = buyerContext;
        if (!child && !cart.line_items.length) return;
        const result = await call(
          child ? "update_cart" : "create_cart",
          { shop, ...(child ? { id: child.id } : {}), cart },
          { signal },
        );
        const messages = result.messages ?? [];
        const problems = messages.filter((m) => m.type === "error");
        errors.push(
          ...problems.map((m) => ({ code: m.code, message: m.content, field: ["shops", shop] })),
        );
        warnings.push(
          ...messages
            .filter((m) => m.type !== "error")
            .map((m) => ({ code: m.code, message: m.content })),
        );
        if (problems.length) return;
        if (cart.line_items.length) children[shop] = { ...result, shop };
        else delete children[shop];
      }),
    );
    failures(results, [...changes.keys()], errors, signal);
    const cart = mapped(children);
    if (cart.id) redirects.set(payload.cartId, cart.id);
    return { cart, userErrors: errors, warnings };
  }
  return {
    async getCart({ cartId, signal }) {
      if (!cartId) return { cart: null };
      const { children, errors } = await load(cartId, signal);
      return { cart: mapped(children), userErrors: errors };
    },
    updateCart(payload, options) {
      const result = queue.then(() => {
        options?.signal?.throwIfAborted();
        return update(payload, options?.signal);
      });
      queue = result.catch(() => undefined);
      return result;
    },
  };
}
