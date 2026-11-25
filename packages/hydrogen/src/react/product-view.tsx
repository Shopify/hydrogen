import { createElement, type HTMLAttributes, type ReactElement } from "react";

import { getProductViewAttributes, type ProductViewOptions } from "../core/product/product-view";
import { VIEW_EVENT_TAG_NAME } from "../core/shopify-scripts/view-event-element";

/**
 * Props for the `ProductView` component: the product, where the storefront shows it, and
 * HTML attributes such as `className` for the element.
 *
 * @publicDocs
 */
export type ProductViewProps = ProductViewOptions & HTMLAttributes<HTMLElement>;

/**
 * Sends the `shopify:product:view` event for a product that the storefront shows. Wrap the
 * product page content with `context="page"`, and each product card with `collection`,
 * `search`, or `recommendation`. It renders a `VIEW_EVENT_TAG_NAME` element, which
 * `ShopifyScripts` registers.
 *
 * The element is inline by default. Give card elements a box, such as a class with
 * `display: block`, because card contexts send the event when half of the element is visible.
 * The element sends the event again when the product ID changes, but not when the variant changes.
 *
 * @param props - The product, where the storefront shows it, the children, and HTML attributes for the element.
 * @returns The product view element.
 * @publicDocs
 */
export function ProductView(props: ProductViewProps): ReactElement {
  const { product: _product, context: _context, children, className, ...rest } = props;
  return createElement(
    VIEW_EVENT_TAG_NAME,
    // React 18 doesn't map `className` to `class` on custom elements.
    { ...rest, class: className, ...getProductViewAttributes(props) },
    children,
  );
}
