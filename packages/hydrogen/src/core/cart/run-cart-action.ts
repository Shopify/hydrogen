import type { CartAction } from "./actions";
import type { CartTransport, CartTransportContext, CartWriteResult } from "./transport";

export async function runCartAction(
  transport: CartTransport,
  cartId: string | null,
  action: CartAction,
  ctx: CartTransportContext,
): Promise<CartWriteResult> {
  if (action.intent === "add") {
    return transport.updateCart({ ...(cartId && { cartId }), lines: action.lines }, ctx);
  }

  if (!cartId) {
    throw new Error("cartId is required for non-add mutations");
  }

  switch (action.intent) {
    case "update":
      return transport.updateCart({ cartId, lines: action.lines }, ctx);
    case "remove":
      return transport.updateCart(
        { cartId, lines: action.lineIds.map((id) => ({ id, quantity: 0 })) },
        ctx,
      );
    case "discount-update":
      return transport.updateCart({ cartId, discountCodes: action.discountCodes }, ctx);
    case "discount-apply":
    case "discount-remove": {
      const currentCodes = await getDiscountCodes(transport, cartId, ctx);
      const discountCodes =
        action.intent === "discount-apply"
          ? [...currentCodes, action.code]
          : currentCodes.filter((code) => code !== action.code);
      return transport.updateCart({ cartId, discountCodes }, ctx);
    }
    case "attributes-update":
      return transport.updateCart({ cartId, attributes: action.attributes }, ctx);
    case "note-update":
      return transport.updateCart({ cartId, note: action.note }, ctx);
  }
}

// The cart has no endpoint that adds or removes one discount code, so concurrent
// requests can overwrite each other's codes.
async function getDiscountCodes(
  transport: CartTransport,
  cartId: string,
  ctx: CartTransportContext,
): Promise<string[]> {
  const { cart, errors } = await transport.getCart({ cartId }, ctx);
  if (errors?.length) throw new Error(errors[0]?.message ?? "GraphQL error");
  return (cart?.discountCodes ?? []).map(({ code }) => code);
}
