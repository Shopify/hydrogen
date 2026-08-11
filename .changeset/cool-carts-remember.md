---
'@shopify/hydrogen': minor
---

Add server-only cart metafield support to the cart API. `POST /api/cart` now accepts a `metafields-set` intent (JSON `{ metafields: [{ key, type, value }] }` or form fields `metafieldKey`/`metafieldType`/`metafieldValue`) and a `metafield-delete` intent (JSON `{ deleteMetafield: "namespace.key" }` or form field `metafieldKey`). The server injects the cart id as `ownerId` and refetches the cart after mutating, so responses keep the same shape as other cart mutations and include metafields selected by a custom `CartFragment`. Setting metafields without an existing cart creates one via `cartCreate`. Adds the `CartMetafieldInput` exported type.

Metafields are not supported by Standard Actions (cart ajax), so they do not flow through the optimistic client cart store.
