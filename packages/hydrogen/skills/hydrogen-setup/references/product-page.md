# Product Detail Page

Create a server-rendered product detail route that feeds the standalone `hydrogen-variant-form` skill. This setup reference owns the route and Storefront API data contract. The standalone `hydrogen-variant-form` skill owns buyer-facing variant selection and add-to-cart behavior.

## Before You Build

Read the local `hydrogen-variant-form` skill before writing the product variants form. Do not duplicate its rules or invent separate variant matrix logic.

The product form bindings depend on a cart store. Finish the setup skill's cart route step first and make sure the app root has the Hydrogen cart provider or equivalent cart store setup required by the target framework.

## Route And Data Requirements

- Use the app's existing product route convention when present; otherwise create `/products/{handle}`.
- Fetch the product by handle in the framework's server data-loading boundary.
- Derive URL-selected options with `getSelectedProductOptions(requestOrUrl)` and pass them to the Storefront API query.
- Include product `id`, `handle`, `title`, description fields used by the UI, `requiresSellingPlan`, `priceRange`, image fields used by the UI, and the variant-form fields below.
- Define one reusable `VariantFields` fragment and use it for `firstSelectableVariant`, `selectedOrFirstAvailableVariant`, and `adjacentVariants`. Do not inline different variant shapes; after option selection, `selectedVariant` can come from any of those caches and must still contain the fields the UI needs.
- Include `encodedVariantExistence` and `encodedVariantAvailability`.
- Include product `options { name optionValues { name firstSelectableVariant { ...VariantFields } swatch { ... } } }`.
- Include `selectedOrFirstAvailableVariant(selectedOptions: $selectedOptions, ignoreUnknownOptions: true, caseInsensitiveMatch: true)`.
- Include `adjacentVariants(selectedOptions: $selectedOptions, ignoreUnknownOptions: true, caseInsensitiveMatch: true)`.
- Variant fields must include `id`, `title`, `availableForSale`, `selectedOptions`, `price`, `compareAtPrice`, image fields used by the UI, `product { title handle }`, and `sku` when analytics or display needs it.
- After writing or changing the product query, run the `hydrogen-storefront-client` skill's headless query validation check. Do not rely on TypeScript alone to catch invalid Storefront API fields.
- Check GraphQL `errors` before checking `data.product`. If the query returns errors, log them in the server console and return a 500 response. Return a 404 only when the query has no GraphQL errors and `data.product` is missing.

The server data loader should follow this control flow, adapted to the framework's error helpers:

```ts
const { data, errors } = await storefrontClient.graphql(PRODUCT_QUERY, { variables });

if (errors) {
  console.error("[hydrogen] Product query failed", errors);
  throw new Response("Product query failed", { status: 500 });
}

if (!data?.product) {
  throw new Response("Product not found", { status: 404 });
}
```

## Implementation Boundary

- Wrap the product purchase UI in the framework binding's product provider when one exists.
- Use the `hydrogen-variant-form` skill for option controls, add-to-cart form structure, URL selection, combined listings, price display, disabled states, sold-out states, cart error display, and user acceptance tests.
- When the cart drawer is configured, follow the local `hydrogen-cart-drawer` skill's open-on-add guidance so successful add-to-cart submits call the drawer helper via `formProps({ afterSubmit: openCartDrawer })`.
- Product route loaders and server helpers may read env indirectly through server-only client/config modules. Product client components must not read `process.env`, `import.meta.env`, or framework env modules.

## Framework Gotchas

- Next.js App Router: render the interactive product form in a client component; the server page owns product data and selected options from `searchParams`.
- React Router framework mode: put variant URL navigation in the product provider `onSelect` callback, not in individual option buttons. Same-product option buttons spread `register("optionValue", ...)` directly. Cross-product option values use React Router `<Link>` with `preventScrollReset`, not raw `<a>` tags. Skip revalidation only when a `resolved` selection already has enough local data for the route.
- SvelteKit: if using the core store directly, create it once, hydrate on product identity changes, and destroy it on unmount.
- Astro: only build this route when the app has server output or a server adapter. Put the interactive product form in a hydrated island or client script that owns the store lifecycle.
- SolidStart: manage the core store lifecycle inside the client component unless a local binding already exists.

## Verify

- Directly loading `/products/{handle}` renders product data and a selected or first available variant when one exists.
- An invalid or failing product query logs the GraphQL error server-side and returns 500, not 404.
- A valid query for a missing product returns 404.
- URL query params select the expected variant on initial server render.
- Clicking a same-product option changes selected styling and updates the URL through the provider `onSelect` flow.
- Switching options removes stale option params before setting the new selected option params.
- Cross-product option values use the framework's client-side link component when the app has one.
- After selecting an option, `selectedVariant` still has the fields used by the UI, such as `image`, `price`, `compareAtPrice`, and `sku`.
- The product variants form passes the `hydrogen-variant-form` skill's user acceptance tests.
