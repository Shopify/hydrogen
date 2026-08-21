---
name: hydrogen-cart-metafields
description: >
  Behavioral guide for reading and writing cart metafields with @shopify/hydrogen.
  Use when adding, modifying, or reviewing cart metafield reads or writes, an
  app-owned cart metafield route, cart-to-order metafield copying, or custom cart
  data such as delivery instructions or gift preferences. Framework agnostic.
---

# Cart Metafields

Cart metafields store custom data on the cart (for example delivery instructions or a gift preference). They are **server-only**: the Storefront cart ajax API (Standard Actions) does not support them, so they never flow through Hydrogen's optimistic cart store the way line, discount, note, and attribute mutations do.

Because of that, **do not add metafields to the core cart action/intent model.** Compose three pieces Hydrogen already provides:

1. **Read** — a custom `CartFragment` on `createCartServerHandlers`, so metafields appear in cart state.
2. **Write** — an app-owned route (`createShopifyRouteHandler`) calling `cartMetafieldsSet` / `cartMetafieldDelete` (and `cartCreate` when no cart exists yet).
3. **Re-sync** — `useCartActions().refresh()` after a successful write.

See `hydrogen-cart-ui` for cart state, `refresh()`, and form patterns, and `hydrogen-request-handlers` for registering the custom route.

## Golden rule: decouple the write from the read

The mutation route returns **only the mutation's `userErrors`** — it must never refetch and return the cart. Re-syncing is a separate `refresh()` call.

```
POST /api/cart/metafields  → cartMetafieldsSet → { userErrors }   (truthful: success is success)
then, on success:
refresh()                  → re-reads the cart via CartFragment
```

If the write and a refetch were coupled in one request, a blip on the read would mask a successful save as a "network error." Decoupled, a failed re-sync surfaces as `state.errors.network` (a soft refresh error) and preserves the saved cart — it is never reported as a failed save.

## Reading metafields

Select the metafields you need in a `CartFragment` named `CartFragment`:

```ts
const CART_FRAGMENT = gql(`
  fragment CartFragment on Cart {
    metafields(identifiers: [{ namespace: "custom", key: "delivery_instructions" }]) {
      namespace
      key
      type
      value
    }
  }
`);

export const cartHandlers = createCartServerHandlers({ fragment: CART_FRAGMENT });
```

They then appear in cart state. Read a **primitive** in the selector so referential equality can skip re-renders:

```ts
const instructions = useCart(
  (state) =>
    state.data.metafields?.find(
      (m) => m?.namespace === "custom" && m.key === "delivery_instructions",
    )?.value ?? "",
);
```

## Writing metafields (app-owned route)

Register a custom `POST` route with `createShopifyRouteHandler` in `handleShopifyRoutes`. Do **not** extend `/api/cart` or open up its intents.

```ts
async function handleCartMetafieldsPost({ request, storefrontClient }) {
  const body = parseRequest(await request.json()); // validate at the boundary
  const cartId = getCartId(request); // read the owner from the cookie, never the client body

  if (body.intent === "delete") {
    if (!cartId) return { type: "error", error: { code: "missing_cart", message: "No cart exists." } };
    const result = await storefrontClient.graphql(CART_METAFIELD_DELETE_MUTATION, {
      variables: { input: { ownerId: cartId, key: body.key } },
    });
    return { type: "json", data: { userErrors: result.data?.cartMetafieldDelete?.userErrors ?? [] } };
  }

  // No cart yet: create one carrying the metafields, then persist its id in the cookie.
  if (!cartId) {
    const result = await storefrontClient.graphql(cartQueries.cartCreate, {
      variables: { input: { metafields: body.metafields } },
    });
    const createdCartId = result.data?.cartCreate?.cart?.id ?? null;
    const headers = new Headers();
    if (createdCartId) headers.append("set-cookie", createCartCookie(createdCartId));
    return { type: "json", data: { userErrors: result.data?.cartCreate?.userErrors ?? [] }, headers };
  }

  const result = await storefrontClient.graphql(CART_METAFIELDS_SET_MUTATION, {
    variables: { metafields: body.metafields.map((m) => ({ ...m, ownerId: cartId })) },
  });
  return { type: "json", data: { userErrors: result.data?.cartMetafieldsSet?.userErrors ?? [] } };
}
```

- **Existing cart** → `cartMetafieldsSet` with `ownerId` = the cart id from `getCartId(request)`.
- **No cart yet** → `cartCreate` with the metafields, then persist the new cart id with `createCartCookie`. This preserves legacy `cartCreate`-with-metafields behavior (set data before a product is added).
- **Delete** → a single key via `cartMetafieldDelete`. The Storefront API deletes one metafield per call, so keep the contract single-key. Deletion needs an existing cart.

## Re-syncing the store

On success, call `refresh()`:

```ts
const { refresh } = useCartActions();
// after the POST resolves ok:
refresh();
```

`refresh()` reconciles the `CartFragment` fields for an existing cart, and **loads** the cart when none was present locally (e.g. right after `cartCreate`), so one call covers both flows. Never call `refresh()` after ordinary Hydrogen cart forms — their Standard Actions events already synchronize the store.

## Copying to the order

To copy a cart metafield onto the order at checkout, the store must define the metafield with the cart-to-order copyable capability:
https://shopify.dev/docs/apps/build/metafields/use-metafield-capabilities#cart-to-order-copyable
Without the definition the cart write still succeeds, but nothing is copied to the order.

## Rules

- **Server-only.** Never route metafields through Standard Actions or the optimistic cart store.
- **No core intents.** Do not add `metafields-set`/`metafield-delete` to the cart action model; use an app-owned route.
- **Mutation returns `userErrors` only.** Never refetch and return the cart in the same request.
- **Re-sync with `refresh()`** after success. Treat a refresh failure as a soft error (`errors.network`), not a failed save.
- **Inject `ownerId` server-side** from the cart cookie (`getCartId`). Never trust a client-supplied `ownerId`.
- **Validate the request body** at the route boundary before calling the Storefront API.
- **Delete is single-key**, matching `cartMetafieldDelete`.

## Reference implementation

`examples/hydrogen`:

- `app/lib/cart-handlers.ts` — `CartFragment` for reads.
- `app/lib/cart-metafields.ts` — app-owned `POST /api/cart/metafields` route.
- `app/components/CartDeliveryInstructions.tsx` — read via `useCart`, write via the route, then `refresh()`.
