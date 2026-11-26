---
"@shopify/hydrogen": minor
---

Add the `ProductView` component for React and Vue. It renders the `shopify-view-event` element, which sends Shopify's `shopify:product:view` event for the product that it wraps, and sends it again when the product ID changes, but not when the variant changes. Set `context` to `"page"` on the product page, to `"collection"`, `"search"`, or `"recommendation"` on product cards, or to `"dialog"` for products in a dialog. Hydrogen doesn't send the event on its own: add `ProductView` where the storefront shows products, on the product page and on each product card.

`ShopifyScripts` and `initializeShopifyScripts()` now register the element. The React `ProductView` sends the page view from an effect, so it sends again each time a React `<Activity>` shows the page. Card and dialog contexts remount the element when the product ID changes. The Vue `ProductView` remounts the element when the product ID changes.

Frameworks without a Hydrogen binding can render `VIEW_EVENT_TAG_NAME` with the `view-event-trigger` and `view-event-payload` attributes from `getProductViewAttributes()`. The element sends once each time it connects. To send again for a new product, key the element on the product ID, such as with `{#key product.id}` in Svelte or `<Show when={product.id} keyed>` in Solid. In Solid, set the attributes with `attr:`.
