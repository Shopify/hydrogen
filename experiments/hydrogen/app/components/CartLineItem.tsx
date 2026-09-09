import type { CartLine } from "@shopify/hydrogen";
import { Link } from "react-router";

import type { CartLayout } from "~/components/CartMain";
import { Image } from "~/components/Image";
import { useCart, useCartForm } from "~/lib/cart";
import { useVariantUrl } from "~/lib/variants";

import { useAside } from "./Aside";
import { ProductPrice } from "./ProductPrice";

/**
 * A single line item in the cart. It displays the product image, title, price.
 * It also provides controls to update the quantity or remove the line item.
 */
export function CartLineItem({
  layout,
  line,
  lineComponents = line.lineComponents ?? [],
}: {
  layout: CartLayout;
  line: CartLine;
  lineComponents?: CartLine[];
}) {
  const { id, merchandise } = line;
  if (!merchandise) return null;
  const { product, title, image, selectedOptions } = merchandise;
  const lineItemUrl = useVariantUrl(product.handle ?? "", selectedOptions ?? []);
  const { close } = useAside();

  return (
    <li key={id} className="cart-line">
      <div className="cart-line-inner">
        {image?.url && (
          <Image
            alt={title}
            aspectRatio="1/1"
            data={image}
            height={100}
            loading="lazy"
            width={100}
          />
        )}

        <div>
          <Link
            prefetch="intent"
            to={lineItemUrl}
            onClick={() => {
              if (layout === "aside") {
                close();
              }
            }}
          >
            <p>
              <strong>{product.title}</strong>
            </p>
          </Link>
          <ProductPrice price={line.cost.totalAmount} />
          <ul>
            {(selectedOptions ?? []).map((option) => (
              <li key={option.name}>
                <small>
                  {option.name}: {option.value}
                </small>
              </li>
            ))}
          </ul>
          {lineComponents.length ? (
            <ul aria-label={`Line items with ${product.title}`}>
              {lineComponents.map((component) => (
                <CartLineItem key={component.id} line={component} layout={layout} />
              ))}
            </ul>
          ) : null}
          <CartLineQuantity line={line} />
        </div>
      </div>
    </li>
  );
}

/**
 * Provides the controls to update the quantity of a line item in the cart.
 * These controls are disabled when the line item is new, and the server
 * hasn't yet responded that it was successfully added to the cart.
 */
function CartLineQuantity({ line }: { line: CartLine }) {
  if (!line || typeof line?.quantity === "undefined") return null;
  const { id: lineId, quantity } = line;
  const pendingLines = useCart((cart) => cart.pending.lines);
  const isPending = pendingLines.has(lineId);

  return (
    <div className="cart-line-quantity">
      <small>Quantity: {quantity} &nbsp;&nbsp;</small>
      <CartLineUpdateButton lineId={lineId} intent="decrease" disabled={quantity <= 1}>
        <span>&#8722; </span>
      </CartLineUpdateButton>
      &nbsp;
      <CartLineUpdateButton lineId={lineId} intent="increase" disabled={false}>
        <span>&#43;</span>
      </CartLineUpdateButton>
      &nbsp;
      <CartLineRemoveButton lineId={lineId} disabled={isPending} />
    </div>
  );
}

/**
 * A button that removes a line item from the cart. It is disabled
 * when the line item is new, and the server hasn't yet responded
 * that it was successfully added to the cart.
 */
function CartLineRemoveButton({ lineId, disabled }: { lineId: string; disabled: boolean }) {
  const { formProps, register } = useCartForm();

  return (
    <form {...formProps()}>
      <input type="hidden" {...register("lineId", { value: lineId })} />
      <button disabled={disabled} type="submit" {...register("remove")}>
        Remove
      </button>
    </form>
  );
}

function CartLineUpdateButton({
  children,
  disabled,
  intent,
  lineId,
}: {
  children: React.ReactNode;
  disabled: boolean;
  lineId: string;
  intent: "increase" | "decrease";
}) {
  const { formProps, register } = useCartForm();
  const label = intent === "increase" ? "Increase quantity" : "Decrease quantity";

  return (
    <form {...formProps()}>
      <input type="hidden" {...register("lineId", { value: lineId })} />
      <button
        aria-label={label}
        disabled={disabled}
        type="submit"
        {...(intent === "increase" ? register("increase") : register("decrease"))}
      >
        {children}
      </button>
    </form>
  );
}
