import { useEffect, useState } from "react";
import { Link } from "react-router";

import { useAside } from "~/components/Aside";
import { CartLineItem } from "~/components/CartLineItem";
import { useCart } from "~/lib/cart";

import { CartSummary } from "./CartSummary";

export type CartLayout = "page" | "aside";

export type CartMainProps = {
  layout: CartLayout;
};

/**
 * The main cart component that displays the cart items and summary.
 * It is used by both the /cart route and the cart aside dialog.
 */
export function CartMain({ layout }: CartMainProps) {
  const cartState = useCart((cart) => cart);
  const cart = cartState.data;
  const totalsPending = cartState.pending.cost === true || cartState.revalidating === true;
  const statusMessage = useCartStatusMessage(totalsPending, cartState.errors.network.length > 0);
  const cartLines = cart.lines.nodes;

  const linesCount = Boolean(cartLines.length);
  const withDiscount = Boolean(cart.discountCodes.filter((code) => code.applicable).length);
  const className = `cart-main ${withDiscount ? "with-discount" : ""}`;
  const cartHasItems = cart.totalQuantity > 0;
  const lines = cartLines.filter((line) => !getParentLineId(line));
  const lineComponents = new Map<string, typeof cartLines>();
  for (const line of cartLines) {
    const parentId = getParentLineId(line);
    if (!parentId) continue;
    lineComponents.set(parentId, [...(lineComponents.get(parentId) ?? []), line]);
  }

  return (
    <section className={className} aria-label={layout === "page" ? "Cart page" : "Cart drawer"}>
      <span role="status" className="sr-only">
        {statusMessage}
      </span>
      {cartState.errors.network.length > 0 ? (
        <div role="alert" aria-atomic="true">
          {cartState.errors.network.map((error, index) => (
            <p key={`${error.message}-${index}`}>{error.message}</p>
          ))}
        </div>
      ) : null}
      <div aria-busy={cartState.revalidating === true}>
        <CartEmpty hidden={linesCount} layout={layout} />
      </div>
      <div className="cart-details">
        <p id="cart-lines" className="sr-only">
          Line items
        </p>
        <div>
          <ul aria-labelledby="cart-lines">
            {lines.map((line) => {
              return (
                <CartLineItem
                  key={line.id}
                  line={line}
                  lineComponents={lineComponents.get(line.id) ?? []}
                  layout={layout}
                />
              );
            })}
          </ul>
        </div>
        {cartHasItems && <CartSummary cart={cart} layout={layout} totalsPending={totalsPending} />}
      </div>
    </section>
  );
}

function useCartStatusMessage(isPending: boolean, hasNetworkErrors: boolean): string {
  const [sawPending, setSawPending] = useState(false);

  useEffect(() => {
    if (isPending) setSawPending(true);
  }, [isPending]);

  if (isPending) return "Updating cart totals";
  if (sawPending && !hasNetworkErrors) return "Cart totals updated";
  return "";
}

function getParentLineId(line: object): string | undefined {
  if (!("parentRelationship" in line)) return undefined;
  const parentRelationship = line.parentRelationship as
    | { parent: { id: string } }
    | null
    | undefined;
  return parentRelationship?.parent.id;
}

function CartEmpty({ hidden = false }: { hidden: boolean; layout?: CartMainProps["layout"] }) {
  const { close } = useAside();
  return (
    <div hidden={hidden}>
      <br />
      <p>Looks like you haven&rsquo;t added anything yet, let&rsquo;s get you started!</p>
      <br />
      <Link to="/collections" onClick={close} prefetch="viewport">
        Continue shopping →
      </Link>
    </div>
  );
}
