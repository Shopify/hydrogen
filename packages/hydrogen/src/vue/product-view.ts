import { defineComponent, h } from "vue";

import { getProductViewAttributes, type ProductViewOptions } from "../core/product/product-view";
import { VIEW_EVENT_TAG_NAME } from "../core/shopify-scripts/view-event-element";

/**
 * Props for the Vue `ProductView` component.
 *
 * @publicDocs
 */
export type ProductViewProps = ProductViewOptions;

/**
 * Sends the `shopify:product:view` event for a product that the storefront shows. Wrap the
 * product page content with `context="page"`, and each product card with `collection`,
 * `search`, or `recommendation`. It renders a `VIEW_EVENT_TAG_NAME` element, which
 * `ShopifyScripts` registers.
 *
 * The element is inline by default. Give card elements a box, such as a class with
 * `display: block`, because card contexts send the event when half of the element is visible.
 * The element sends the event again when the product ID changes, but not when the variant
 * changes. `<KeepAlive>` removes the element from the document and adds it again, so the element
 * sends again when it is shown again. Attributes such as `class` go on the element.
 *
 * @publicDocs
 */
export const ProductView = defineComponent(
  (props: ProductViewProps, { slots }) =>
    () =>
      // The key remounts the element for a new product, so the element's trigger runs again.
      h(
        VIEW_EVENT_TAG_NAME,
        { key: props.product.id, ...getProductViewAttributes(props) },
        slots.default?.(),
      ),
  {
    name: "ProductView",
    props: {
      product: { type: null, required: true },
      context: { type: null, required: true },
    },
  },
);
