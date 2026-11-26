---
"@shopify/hydrogen": minor
---

Add the `CollectionView` component for React and Vue. It renders the `shopify-view-event` element, which sends Shopify's `shopify:collection:view` event when the collection page renders. The element sends the event again when the collection handle changes, but not when `productsCount` changes. Hydrogen doesn't send the event on its own: wrap the product grid of the collection page in `CollectionView`, and pass the `collection` and `productsCount`. The Storefront API has no product total for a collection, so pass the number of products that the page loaded.

`ShopifyScripts` and `initializeShopifyScripts()` register the element. The React `CollectionView` sends the view from an effect, so it also sends again each time a React `<Activity>` shows the page. The Vue `CollectionView` remounts the element when the collection handle changes. Frameworks without a Hydrogen binding can render `VIEW_EVENT_TAG_NAME` with the `view-event-trigger` and `view-event-payload` attributes from `getCollectionViewAttributes()`. The element sends once each time it connects. To send again for a new collection, key the element on the collection handle, such as with `{#key collection.handle}` in Svelte or `<Show when={collection.handle} keyed>` in Solid. In Solid, set the attributes with `attr:`.

`@shopify/hydrogen` also exports the `CollectionViewCollection` type: the collection fields that the event needs (`id`, or `null` for a page without a collection record, and `handle`).
