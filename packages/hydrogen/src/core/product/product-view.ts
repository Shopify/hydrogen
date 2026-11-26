import type * as StandardEvents from "../../../vendor/standard-events";
import type { ProductVariantInput } from "./state";

/**
 * Product fields that the product view event needs from your Storefront API query.
 *
 * Pass your full query type, which can include more fields.
 */
export interface ProductViewProduct {
  id: string;
  title: string;
  handle: string;
  /** Variant that the product page or dialog shows, or `null` when none is selected. */
  selectedOrFirstAvailableVariant: ProductVariantInput | null;
}

/**
 * The product and where the storefront shows it. `page` sends the event on render, `dialog` sends
 * it when the closest dialog opens, and the card contexts send it when half of the element is visible.
 * Card contexts need only the product ID, title, and handle.
 */
export type ProductViewOptions =
  | { context: "page" | "dialog"; product: ProductViewProduct }
  | {
      context: "collection" | "search" | "recommendation";
      product: Pick<ProductViewProduct, "id" | "title" | "handle">;
    };

const TRIGGERS = {
  page: "connect",
  dialog: "dialog",
  collection: "intersect",
  search: "intersect",
  recommendation: "intersect",
} satisfies Record<StandardEvents.ProductViewPayload["context"], StandardEvents.ViewEventTrigger>;

/**
 * Returns the attributes of the product view element. Render the attributes on a
 * `VIEW_EVENT_TAG_NAME` element on a framework without a Hydrogen binding.
 *
 * The element sends the `shopify:product:view` event on connect for `page`, the first time half of
 * a card element is visible, and each time the dialog opens, or on connect if it is already open.
 * The element sends the event once per connection. To send it again when the product changes,
 * re-key the element on the product ID with your framework's primitive, such as
 * `{#key product.id}` on Svelte or `<Show when={product.id} keyed>` on Solid. Set the values as
 * HTML attributes, such as with `attr:` on Solid, because the element doesn't read properties.
 *
 * @param options - The product and where the storefront shows it.
 * @returns The `view-event-trigger` and `view-event-payload` attributes.
 * @publicDocs
 */
export function getProductViewAttributes(
  options: ProductViewOptions,
): Record<"view-event-trigger" | "view-event-payload", string> {
  const { product, context } = options;
  const variant =
    context === "page" || context === "dialog" ? product.selectedOrFirstAvailableVariant : null;
  const selectedOptions =
    variant?.selectedOptions.map(({ name, value }) => ({ name, value })) ?? [];
  const payload: StandardEvents.ProductViewPayload = {
    context,
    selectedOptions,
    product: {
      id: product.id,
      title: product.title,
      handle: product.handle,
      selectedVariant: variant
        ? {
            id: variant.id,
            title: variant.title,
            availableForSale: variant.availableForSale,
            price: { amount: variant.price.amount, currencyCode: variant.price.currencyCode },
            selectedOptions,
          }
        : null,
    },
  };

  return {
    "view-event-trigger": TRIGGERS[context],
    "view-event-payload": JSON.stringify(payload),
  };
}
