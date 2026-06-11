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
  const cart = useCart((cart) => cart.data);
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
      <CartEmpty hidden={linesCount} layout={layout} />
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
        {cartHasItems && <CartSummary cart={cart} layout={layout} />}
      </div>
    </section>
  );
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
