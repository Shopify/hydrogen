---
"@shopify/hydrogen": minor
---

Add the `CollectionView` component for React and Vue. It renders the `shopify-collection-view` element, which sends Shopify's `shopify:collection:view` event when the collection page renders. The element sends the event again when the collection handle changes, but not when `productsCount` changes. Hydrogen doesn't send the event on its own: wrap the product grid of the collection page in `CollectionView`, and pass the `collection` and `productsCount`. The Storefront API has no product total for a collection, so pass the number of products that the page loaded.

`ShopifyScripts` and `initializeShopifyScripts()` now register the element. Frameworks without a Hydrogen binding can render `COLLECTION_VIEW_TAG_NAME` with the attributes from `getCollectionViewAttributes()`, and call `defineCollectionView()` when they don't use `initializeShopifyScripts()`.

`@shopify/hydrogen` also exports the `CollectionViewCollection` type: the collection fields that the event needs (`id`, or `null` for a page without a collection record, and `handle`).
