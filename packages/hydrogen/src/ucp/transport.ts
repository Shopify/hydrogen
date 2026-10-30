import type { UpdateCartPayload, UpdateCartUserError } from "../../vendor/standard-actions";
import { type CartTransport } from "../core/cart/cart";
import { cartPayloadToUcpUpdate, ucpCartToCartData } from "./mapping";
import type { UcpCart, UcpChildCart, UcpRequest } from "./types";
export interface UcpCartTransportOptions {
  call(
    operation: "create_cart" | "get_cart" | "update_cart",
    args: UcpRequest,
    options: { signal?: AbortSignal },
  ): Promise<UcpCart>;
  resolveShop(merchandiseId: string): string | Promise<string>;
  ucpVersion?: "2026-08-25";
}
function unsupported(payload: UpdateCartPayload): UpdateCartUserError[] {
  return (["note", "attributes"] as const)
    .filter((field) => payload[field] !== undefined)
    .map((field) => ({
      code: "UNSUPPORTED",
      field: [field],
      message: `UCP does not support ${field}`,
    }));
}
function decode(id?: string | null): Record<string, string> {
  if (!id) return {};
  const value: unknown = JSON.parse(id);
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Invalid UCP cart ID");
  return Object.fromEntries(
    Object.entries(value).map(([shop, childId]) => {
      if (typeof childId !== "string") throw new Error("Invalid UCP cart ID");
      return [shop, childId];
    }),
  );
}
function knownShop(
  children: Record<string, UcpChildCart>,
  line: NonNullable<UpdateCartPayload["lines"]>[number],
) {
  return Object.entries(children).find(([, c]) =>
    c.line_items.some((l) => (line.id ? l.id === line.id : l.item.id === line.merchandiseId)),
  )?.[0];
}
/** Creates a UCP 2026-08-25 buyer transport. Persist the returned opaque cart ID.
 * Discount codes apply independently to every shop; note and attributes are unsupported.
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
  ucpVersion = "2026-08-25",
}: UcpCartTransportOptions): CartTransport {
  if (ucpVersion !== "2026-08-25") throw new Error("Unsupported UCP version");
  async function invoke(
    op: "create_cart" | "get_cart" | "update_cart",
    args: UcpRequest,
    signal?: AbortSignal,
  ) {
    try {
      return await call(op, args, { signal });
    } catch (error) {
      throw new Error("UCP request failed", { cause: error });
    }
  }
  async function load(id?: string | null, signal?: AbortSignal) {
    return Object.fromEntries(
      await Promise.all(
        Object.entries(decode(id)).map(async ([shop, childId]) => [
          shop,
          { ...(await invoke("get_cart", { shop, id: childId }, signal)), shop },
        ]),
      ),
    );
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
  return {
    async getCart({ cartId, signal }) {
      return { cart: cartId ? mapped(await load(cartId, signal)) : null };
    },
    async updateCart(payload, options) {
      const children: Record<string, UcpChildCart> = await load(payload.cartId, options?.signal);
      const userErrors: UpdateCartUserError[] = unsupported(payload);
      const warnings: Array<{ code?: string; message: string }> = [];
      const changes = new Map<string, NonNullable<UpdateCartPayload["lines"]>>();
      for (const line of payload.lines ?? []) {
        const shop =
          knownShop(children, line) ??
          (line.merchandiseId ? await resolveShop(line.merchandiseId) : undefined);
        if (!shop) {
          userErrors.push({
            code: "UNKNOWN_LINE",
            message: "Cannot resolve line seller",
            field: ["lines", line.id ?? ""],
          });
          continue;
        }
        changes.set(shop, [...(changes.get(shop) ?? []), line]);
      }
      if (payload.discountCodes !== undefined)
        for (const shop of Object.keys(children)) changes.set(shop, changes.get(shop) ?? []);
      await Promise.all(
        [...changes].map(async ([shop, lines]) => {
          const child = children[shop];
          const cart = cartPayloadToUcpUpdate(child, {
            lines,
            discountCodes: payload.discountCodes,
          });
          if (!child && !cart.line_items.length) return;
          const result = await invoke(
            child ? "update_cart" : "create_cart",
            { shop, ...(child ? { id: child.id } : {}), cart },
            options?.signal,
          );
          const errors = result.messages?.filter((m) => m.type === "error") ?? [];
          warnings.push(
            ...(result.messages ?? [])
              .filter((m) => m.type !== "error")
              .map((m) => ({ code: m.code, message: m.content })),
          );
          userErrors.push(
            ...errors.map((m) => ({ code: m.code, message: m.content, field: ["shops", shop] })),
          );
          if (errors.length) return;
          if (cart.line_items.length) children[shop] = { ...result, shop };
          else delete children[shop];
        }),
      );
      return { cart: mapped(children), userErrors, warnings };
    },
  };
}
