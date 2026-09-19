# Product Detail Page

Create a server-rendered product detail route with a variant picker and image.

## Route And Data

- Use the app's existing product route convention when present; otherwise create `/products/{handle}`.
- Fetch the product by handle in the framework's server data-loading boundary.
- Derive URL-selected options with `getSelectedProductOptions` and pass them as `$selectedOptions` to the product query.
- Start from the sample query below. Extend it for UI needs (extra media, SEO fields, related products). Keep one reusable `VariantFields` fragment shared by `firstSelectableVariant`, `selectedOrFirstAvailableVariant`, and `adjacentVariants` so `selectedVariant` always has the fields the UI needs after option selection.
- After writing or changing the product query, run the `hydrogen-storefront-client` skill's headless query validation check. Do not rely on TypeScript alone to catch invalid Storefront API fields.
- Check GraphQL `errors` before checking `data.product`. If the query returns errors, log them in the server console and return a 500 response. Return a 404 only when the query has no GraphQL errors and `data.product` is missing.

### `getSelectedProductOptions`

Treat each search param as an option name/value pair (`?Color=Red&Size=M` → `[{name:"Color",value:"Red"},{name:"Size",value:"M"}]`). Pass the result into the Storefront API query.

```ts
import { getSelectedProductOptions } from "@shopify/hydrogen";

const selectedOptions = getSelectedProductOptions({
  searchParams: new URL(request.url).searchParams,
});

// Optional: ignore non-option params (utm, ref, etc.) once option names are known
const selectedOptions = getSelectedProductOptions({
  searchParams,
  allowedOptionNames: product.options.map((option) => option.name),
});
```

Passing `allowedOptionNames: []` filters out every option.

The `variant` search param is reserved for Liquid-style numeric variant ids and is never treated as an option name. Pass `routeTemplates` to `handleShopifyRoutes` (see the local `hydrogen-request-handlers` skill) so `?variant=<id>` product links redirect to the canonical option-params URL before this loader runs.

### Minimum product query

Extend and adjust fields as the UI needs them.

```ts
import { gql, type StorefrontApi } from "@shopify/hydrogen";

export const VARIANT_FIELDS_FRAGMENT = gql(`
  fragment VariantFields on ProductVariant {
    id
    title
    availableForSale
    selectedOptions {
      name
      value
    }
    price {
      amount
      currencyCode
    }
    compareAtPrice {
      amount
      currencyCode
    }
    image {
      url
      altText
      width
      height
    }
    product {
      title
      handle
    }
    sku
  }
`);

export const PRODUCT_QUERY = gql(
  `
  query Product(
    $handle: String!
    $selectedOptions: [SelectedOptionInput!]!
    $country: CountryCode
    $language: LanguageCode
  ) @inContext(country: $country, language: $language) {
    product(handle: $handle) {
      id
      handle
      title
      vendor
      description
      descriptionHtml
      requiresSellingPlan
      options {
        name
        optionValues {
          name
          firstSelectableVariant {
            ...VariantFields
          }
          swatch {
            color
            image {
              ... on MediaImage {
                image {
                  url
                  altText
                }
              }
            }
          }
        }
      }
      encodedVariantExistence
      encodedVariantAvailability
      selectedOrFirstAvailableVariant(
        selectedOptions: $selectedOptions
        ignoreUnknownOptions: true
        caseInsensitiveMatch: true
      ) {
        ...VariantFields
      }
      adjacentVariants(
        selectedOptions: $selectedOptions
        ignoreUnknownOptions: true
        caseInsensitiveMatch: true
      ) {
        ...VariantFields
      }
      media(first: 8) {
        nodes {
          __typename
          id
          mediaContentType
          alt
          ... on MediaImage {
            image {
              url
              altText
              width
              height
            }
          }
          previewImage {
            url
            altText
            width
            height
          }
        }
      }
      priceRange {
        minVariantPrice {
          amount
          currencyCode
        }
        maxVariantPrice {
          amount
          currencyCode
        }
      }
    }
  }
`,
  [VARIANT_FIELDS_FRAGMENT],
);

export type ProductData = NonNullable<StorefrontApi.ResultOf<typeof PRODUCT_QUERY>["product"]>;
```

### Example data fetching

```ts
const selectedOptions = getSelectedProductOptions({
  searchParams: new URL(request.url).searchParams,
});

const { data, errors } = await storefrontClient.graphql(PRODUCT_QUERY, {
  variables: { handle, selectedOptions },
});

if (errors) {
  console.error("[hydrogen] Product query failed", errors);
  throw new Response("Product query failed", { status: 500 });
}

if (!data?.product) {
  throw new Response("Product not found", { status: 404 });
}
```

## UI

Invoke the `hydrogen-variant-form` skill and follow its reference for this app's framework. It owns the provider bindings, option controls, `variantUrl` construction, add-to-cart form structure, combined listings, price display, disabled and sold-out states, cart error display, and user acceptance tests. Do not duplicate its rules or invent separate variant matrix logic.

Setup-specific:

- This page is the first surface that renders money and accelerated checkout, so `hydrogen-money` and `hydrogen-shop-pay` apply here too.
- When the cart drawer uses the canonical anchor trigger, follow the `hydrogen-cart-drawer` skill and open optimistic state via `formProps({ beforeSubmit: openCartDrawer })`.
- Product route loaders and server helpers may read env indirectly through server-only client/config modules. Product client components must not read `process.env`, `import.meta.env`, or framework env modules.

## Continue when

- [ ] Directly loading `/products/{handle}` renders product data and a selected or first available variant when one exists
- [ ] Option values render as interactive elements (links/buttons)
- [ ] Clicking an option value in the browser changes the selected variant and the URL
- [ ] Adding a product to cart opens the cart drawer and shows the product in the cart
- [ ] An invalid or failing product query (e.g.: invalid field) logs the GraphQL error server-side and returns 500, not 404
- [ ] A valid query for a missing product returns 404
- [ ] Selecting a variant and refreshing the page persists the same variant selected
- [ ] With javascript disabled, clicking on a variant option navigates to the selected variant
- [ ] Cross-product option values use the framework's client-side link component when the app has one.
- [ ] The product variants form passes the `hydrogen-variant-form` skill's user acceptance tests.
