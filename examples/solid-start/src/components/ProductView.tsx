import { getProductViewAttributes, type ProductViewOptions } from "@shopify/hydrogen";
import type { JSX } from "solid-js";

declare module "solid-js" {
  namespace JSX {
    interface IntrinsicElements {
      "shopify-product-view": HTMLAttributes<HTMLElement>;
    }
    interface ExplicitAttributes {
      "view-event-trigger": string;
      "view-event-payload": string;
    }
  }
}

/**
 * Renders Hydrogen's product view element, which sends `shopify:product:view`.
 * The element sends the event again when the product ID in its payload changes.
 */
export function ProductView(props: ProductViewOptions & { class?: string; children: JSX.Element }) {
  const attributes = () => getProductViewAttributes(props);
  // `attr:` sets HTML attributes. Without it, Solid sets properties on custom elements in the
  // browser, and the element only reads attributes.
  return (
    <shopify-product-view
      attr:view-event-trigger={attributes()["view-event-trigger"]}
      attr:view-event-payload={attributes()["view-event-payload"]}
      class={props.class}
    >
      {props.children}
    </shopify-product-view>
  );
}
