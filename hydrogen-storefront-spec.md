# Headless Storefront Implementation Guide

This guide will lead you into implementing a Shopify Headless Storefront making use of all the best practices into an existing or new codebase.

### Implementation Notes

- **Testing**: Focus on getting the storefront functional first. Automated tests can be added in a follow-up iteration once the core storefront is working end-to-end.
- **Scope**: This spec covers a complete but minimal storefront. It intentionally does not cover customer accounts, search, blog, SEO meta tags, or internationalization.
- **Phased delivery**: This spec is structured as implementation phases (Section 2). Complete each phase and verify it works before moving to the next. The reference material (Sections 3+) is the knowledge base that phases point into.

---

## 1. Codebase Discovery

Before writing any code, explore the existing codebase and establish the foundation. This phase is mandatory — do not skip it.

### 1.1 Framework Detection

Check whether you are working inside an existing project or starting fresh.

**If an existing project exists:**
- Identify the framework: look for `next.config.*` (Next.js), `react-router.config.*` or `routes.ts` (React Router 7), `app.config.*` with TanStack imports (TanStack Start), or `vite.config.*` with other setups
- Move to step 1.2

**If no project exists:**
- Ask the user which framework to scaffold: **React Router 7**, **TanStack Start**, or **Next.js**
- Scaffold the project using the framework's official CLI
- Move to step 1.2

### 1.2 Styling and UI Primitives

Check the existing project for styling and component library choices.

**Styling** — look for:
- `tailwind.config.*` or `@tailwind` directives → Tailwind CSS
- CSS modules (`.module.css` imports) → CSS Modules
- Styled-components or emotion imports → CSS-in-JS
- If nothing is set up, ask the user: **Tailwind CSS**, **CSS Modules**, or **plain CSS**

**UI Primitives** — look for:
- `@radix-ui/*` imports → Radix UI
- `@base-ui-components/*` imports → Base UI
- `shadcn` config or `components/ui/` directory → shadcn/ui (built on Radix)
- If nothing is set up, ask the user: **shadcn/ui**, **Radix UI**, or **Base UI**

A UI primitive library is required. The storefront needs interactive components (drawers, dropdowns, dialogs) and these must not be written from scratch. Always use the chosen primitive library for:
- Cart drawer (slide-out panel)
- Variant option selectors
- Quantity input controls
- Any modal or overlay UI

### 1.3 Package Manager

Detect which package manager the project uses: look for `pnpm-lock.yaml` (pnpm), `yarn.lock` (yarn), `bun.lockb` (bun), or `package-lock.json` (npm). Use the detected package manager for all install and script commands throughout the project. If starting fresh, ask the user which they prefer.

### 1.4 Existing Patterns

Scan the codebase for established conventions and follow them. Specifically:

- **Data fetching**: Does the project use framework loaders (`loader` in React Router/TanStack), server components, TanStack Query (`useQuery`), SWR, or plain `fetch`? Follow whichever pattern is already in use.
- **Mutations**: Does the project use framework actions, server actions, TanStack Query mutations, or API routes? Follow the existing pattern.
- **File structure**: Where do routes, components, utilities, and types live? Follow the existing conventions.
- **Naming**: camelCase vs kebab-case for files, named exports vs default exports, etc.

If the project is freshly scaffolded with no patterns yet, follow the framework's recommended conventions.

---

## 2. Implementation Phases

**Complete each phase and verify it before starting the next.** Do not proceed if the current phase fails verification. Each phase builds on the previous one's verified output.

### Phase 1: Foundation — "Can we talk to Shopify?"

**Build:**
- Environment variables and API version constant (Section 3)
- Storefront API client utility (Section 4)
- GraphQL codegen setup (Section 5)

**Verify:**
- [ ] The `codegen` script runs without errors and generates types
- [ ] A test query for `shop { name }` returns the store name (log it to the console or render it)
- [ ] The API version is defined as a constant in exactly one file

*If this fails, nothing else will work. Debug the client before proceeding.*

### Phase 2: Browse Products — "Can we see products?"

**Build:**
- Homepage with featured collection + recommended products (Section 13)
- Collections index page (Section 13)
- Single collection page with product grid (Section 13)
- Product page displaying the default variant — no variant selection or add-to-cart yet (Section 13)
- Image rendering with Shopify CDN (Section 12)
- Price formatting with `Intl.NumberFormat` (Section 12)

**Verify:**
- [ ] `/` shows a featured collection and product cards with images and prices
- [ ] `/collections` shows a grid of collection cards
- [ ] `/collections/{handle}` shows the collection's products
- [ ] `/products/{handle}` shows the product image, title, price, and description
- [ ] All prices are formatted as currency (not raw numbers)
- [ ] All images load from the Shopify CDN
- [ ] All query return types come from codegen (no manual type annotations)

### Phase 3: Variant Selection — "Can we pick options?"

**Build:**
- URL-based variant selection on the product page (Section 8)
- Option picker UI using the chosen primitive library
- Client-side image/price switching from `adjacentVariants`

**Verify:**
- [ ] On a product with multiple variants, clicking an option updates the image and price
- [ ] The URL search params update (e.g., `?Color=Red&Size=L`)
- [ ] No full page navigation occurs when selecting a variant
- [ ] Refreshing the page preserves the selected variant
- [ ] Unavailable combinations are visually disabled

### Phase 4: Cart — "Can we buy things?"

**Build:**
- Cart cookie management (Section 9)
- Cart mutations: create, add lines, update quantity, remove lines (Sections 7.5–7.10)
- Cart drawer UI using the chosen primitive library (Sections 6.1–6.3, 9)
- Optimistic UI with line-merging and correct line ordering (Section 6.1)

**Verify:**
- [ ] Adding an item **immediately** shows it in the cart drawer (optimistic)
- [ ] Cart drawer opens on add-to-cart and on cart icon click
- [ ] Adding the same item again increments quantity (no duplicate line)
- [ ] Quantity +/- updates the number instantly; monetary values show a pending state then update from the API
- [ ] Remove hides the line immediately
- [ ] No monetary calculations exist in the codebase (search for arithmetic near price/money variables)
- [ ] Checkout link navigates to Shopify hosted checkout
- [ ] A `cart` cookie is set after the first cart mutation

### Phase 5: Analytics — "Is Shopify tracking this?"

**Build:**
- Install `@shopify/hydrogen-analytics` and create the analytics bus with shop data (Section 7.1) and consent config (Section 10)
- Publish `page_viewed` on every route change (Section 10.3)
- Publish `product_viewed` and `collection_viewed` on respective pages (Sections 10.4, 10.5)
- Connect cart state changes to `bus.updateCart()` (Section 9, Cart Analytics)

**Verify:**
- [ ] DevTools Network: POSTs to `monorail-edge.shopifysvc.com` appear on page navigations
- [ ] Product pages send `product_page_rendered` in the Monorail payload
- [ ] Collection pages send `collection_page_rendered`
- [ ] Adding to cart sends `product_added_to_cart`
- [ ] DevTools Elements: PerfKit `<script>` tag appears after consent resolves
- [ ] No raw Monorail code exists in the codebase — all analytics go through the bus

---

## 3. Environment & API Version

### Storefront API Version

Define a single constant for the API version. Every reference to the Storefront API version — the fetch endpoint, the codegen config — must use this constant. Bumping the version is then a one-line change.

```typescript
const SFAPI_VERSION = "2025-01";
```

### Environment Variables

```env
SESSION_SECRET="mock-session"
PUBLIC_CHECKOUT_DOMAIN="mock.shop"
PUBLIC_STORE_DOMAIN="mock.shop"
PUBLIC_STOREFRONT_API_TOKEN=""
PUBLIC_STOREFRONT_ID=""
```

| Variable | Purpose |
|---|---|
| `PUBLIC_STORE_DOMAIN` | Shopify store domain. Used to construct the Storefront API endpoint. |
| `PUBLIC_STOREFRONT_API_TOKEN` | Public access token for the Storefront API. Empty for `mock.shop`. |
| `PUBLIC_STOREFRONT_ID` | Identifies this storefront channel for analytics. Defaults to `"0"` when empty. |
| `PUBLIC_CHECKOUT_DOMAIN` | Domain for hosted checkout. Used in analytics consent config. |
| `SESSION_SECRET` | Used for signing session cookies if needed. |

---

## 4. Storefront API Client

### Endpoint

```
POST https://{PUBLIC_STORE_DOMAIN}/api/{SFAPI_VERSION}/graphql.json
```

Headers:
```
Content-Type: application/json
X-Shopify-Storefront-Access-Token: {PUBLIC_STOREFRONT_API_TOKEN}
```

Body:
```json
{
  "query": "query { shop { name } }",
  "variables": {}
}
```

### Client Pattern

Create a reusable utility for making Storefront API requests. The client must use `TypedDocumentNode` from the codegen output (4) so that return types are inferred automatically — callers should never need to pass a generic or manually type the response.

**Signature pattern:**

```typescript
import type { TypedDocumentNode } from "@graphql-typed-document-node/core";

async function storefront<TResult, TVariables>(
  query: TypedDocumentNode<TResult, TVariables>,
  ...[variables]: TVariables extends Record<string, never> ? [] : [TVariables]
): Promise<TResult>
```

This signature means:
- `TResult` and `TVariables` are inferred from the `TypedDocumentNode` — no manual generics at the call site
- If the query has no variables, the second argument is omitted entirely
- The return type is the exact shape of the query's selected fields

**Usage at call sites looks like:**

```typescript
import { graphql } from "../gql";

const PRODUCT_QUERY = graphql(`query Product(...) { ... }`);

// `data` is fully typed — no generic, no manual type annotation
const data = await storefront(PRODUCT_QUERY, { handle, selectedOptions });
// data.product.title  ← autocomplete works, typos are caught at compile time
```

**Implementation responsibilities:**

1. Extract the query string from the `TypedDocumentNode` (it has a `.loc?.source.body` or can be printed with `print()` from `graphql`)
2. POST to the endpoint above with the correct headers
3. Return the parsed `data` field from the JSON response
4. Throw on GraphQL errors (check `response.errors`)
5. Auto-inject `country: "US"` and `language: "EN"` variables if the query declares `$country: CountryCode` or `$language: LanguageCode` parameters and they are not explicitly provided — this powers the `@inContext` directive

Every query in this spec uses `@inContext(country: $country, language: $language)` for localization. The client should handle injecting defaults.

**Important:** The storefront client must NEVER accept a plain `string` query. Accepting strings bypasses type inference and forces callers to manually specify generics or cast return types. Always require `TypedDocumentNode`.

---

## 5. GraphQL Codegen

Set up automatic TypeScript type generation from GraphQL queries. This prevents manual typing of API responses and catches type drift when the SFAPI version changes.

### Required Packages

```
@graphql-codegen/cli
@graphql-codegen/client-preset
graphql
```

### Configuration

Create a `codegen.ts` at the project root:

```typescript
import type { CodegenConfig } from "@graphql-codegen/cli";

const config: CodegenConfig = {
  overwrite: true,
  schema: {
    [`https://${PUBLIC_STORE_DOMAIN}/api/${SFAPI_VERSION}/graphql.json`]: {
      headers: {
        "X-Shopify-Storefront-Access-Token": PUBLIC_STOREFRONT_API_TOKEN,
        "content-type": "application/json",
      },
    },
  },
  documents: ["src/**/*.{ts,tsx}"],
  generates: {
    "./src/gql/": {
      preset: "client",
      config: {
        scalars: {
          DateTime: "string",
          Decimal: "string",
          HTML: "string",
          URL: "string",
          Color: "string",
          UnsignedInt64: "string",
        },
      },
    },
  },
};

export default config;
```

### Usage

Add a `codegen` script to the project that runs `graphql-codegen --config codegen.ts`.

Run the `codegen` script after adding or modifying any GraphQL query.

### How It Works: The `graphql()` Function

The `client-preset` generates a `graphql()` function (in the output directory, e.g., `src/gql/gql.ts`) with overloads for every query found in the codebase. This is the bridge between your queries and TypeScript.

**Defining queries:**

```typescript
import { graphql } from "../gql";

// The graphql() function returns a TypedDocumentNode with inferred result and variable types
export const PRODUCT_QUERY = graphql(`
  query Product($handle: String!, $selectedOptions: [SelectedOptionInput!]!) {
    product(handle: $handle) {
      id
      title
    }
  }
`);
```

The generated `graphql()` function recognizes this exact query string (matched at codegen time) and returns a `TypedDocumentNode<ProductQuery, ProductQueryVariables>` — both types are generated automatically.

**Consuming queries:**

```typescript
// The storefront client infers types from the TypedDocumentNode — no generics needed
const data = await storefront(PRODUCT_QUERY, { handle: "t-shirt", selectedOptions: [] });
data.product?.title; // ← string | undefined — fully typed
```

**Rules:**

1. **Always define queries with the generated `graphql()` function**, not as plain strings. Plain strings produce `unknown` return types.
2. **Never manually type query results.** If you find yourself writing `type ProductData = { product: { ... } }`, you're doing it wrong — codegen should generate this.
3. **Never pass generics to the storefront client.** If you're writing `storefront<SomeType>(...)`, the client signature is wrong — `TypedDocumentNode` should handle inference.
4. **Re-run the `codegen` script** whenever you add or modify a query. The generated `graphql()` overloads must be up to date.

---

## 6. UX Patterns

These rules apply across the entire storefront. They ensure the UI feels responsive and correct.

### 6.1 Optimistic UI

Cart interactions must feel instant. The underlying mutations still execute server-side, but the UI should not wait for them.

| Action | Immediate (optimistic) | Pending (wait for server) |
|---|---|---|
| **Add to cart** | Open the cart drawer **instantly** and update the cart lines optimistically (see line-merging rule below). The drawer must not wait for the mutation response to open. | Cart subtotal/total (grey out or spinner) |
| **Change quantity** | Update the displayed quantity number | All monetary amounts on that line and cart totals |
| **Remove line** | Hide the line item from the cart | Cart totals |

If a mutation fails, revert the optimistic state and show an error.

#### Line-Merging Rule for Add to Cart

The Storefront API merges cart lines with the same `merchandiseId`. If you add a variant that already exists in the cart, the API increments the existing line's quantity — it does NOT create a duplicate line.

Optimistic UI must mirror this behavior. When adding an item to the cart:

1. Check if a line with the same `merchandiseId` already exists in the current cart state
2. **If it exists**: increment that line's `quantity` by the added amount
3. **If it does not exist**: append a new line using the variant data available client-side (title, image, price, quantity)

Failing to do this causes a visual glitch: the user momentarily sees a duplicate line (e.g., "T-Shirt x2" and "T-Shirt x1") that snaps into a single merged line (e.g., "T-Shirt x3") when the server response arrives.

#### Line Ordering

The cart `lines` field returns newest lines first by default. This means a newly added item appears at the top of the server response, but an optimistic append puts it at the bottom — causing the list to visually reorder when the server response arrives.

To avoid this, pass `reverse: true` to the `lines` field in the cart query so that newest items appear last. This way optimistic appends and server responses are in the same order. See the cart query fragment in Section 7.5.

### 6.2 Cart as a Drawer

The cart must be a **drawer/aside** (overlay panel) that slides in from the side of the page. It must NOT be a separate route/page. The user should be able to add items and view their cart without leaving the current page.

The drawer should:
- Open when an item is added to cart
- Open when a "cart" button/icon is clicked (show item count badge)
- Close when clicking outside or pressing a close button
- Show the checkout link at the bottom

### 6.3 Money Handling

**The codebase must NEVER perform arithmetic on monetary values.** No `price * quantity`, no summing line totals, no currency conversion.

All money values must come directly from the Storefront API:
- Line item total: `cart.lines[].cost.totalAmount`
- Cart subtotal: `cart.cost.subtotalAmount`
- Cart total: `cart.cost.totalAmount`
- Product price: `variant.price`
- Compare-at price: `variant.compareAtPrice`

When a cart mutation is in-flight, any monetary value that may have become stale (line totals, cart subtotal, cart total) should show a loading/pending indicator (greyed out, spinner, or skeleton). Non-monetary data (product title, image, quantity number) can be shown optimistically since it is known client-side.

### 6.4 Client-Side Navigation

Variant selection, image switching, and cart interactions must never trigger a full page navigation. Use client-side state updates and URL param changes (via `history.replaceState()` or equivalent) to keep the experience snappy.

---

## 7. GraphQL Queries

All queries in this section are the exact GraphQL operations for the Storefront API. They use the `@inContext` directive for localization.

**Each query must be defined using the generated `graphql()` function** (see Section 5) so that its return type and variables are automatically inferred. For example:

```typescript
import { graphql } from "../gql";
export const SHOP_QUERY = graphql(`query ShopData(...) { ... }`);
```

The query strings below show the GraphQL content to pass to `graphql()`. Do not use them as raw strings.

### 7.1 Shop Analytics Query

Fetches shop ID and localization data for analytics. Call once on app initialization and cache the result.

```graphql
query ShopData(
  $country: CountryCode
  $language: LanguageCode
) @inContext(country: $country, language: $language) {
  shop {
    id
  }
  localization {
    country {
      currency {
        isoCode
      }
    }
    language {
      isoCode
    }
  }
}
```

Parse into:
```typescript
type ShopAnalytics = {
  shopId: string;              // e.g. "gid://shopify/Shop/12345"
  acceptedLanguage: string;    // e.g. "EN"
  currency: string;            // e.g. "USD"
  hydrogenSubchannelId: string; // PUBLIC_STOREFRONT_ID or "0"
};
```

This type matches `ShopAnalytics` from `@shopify/hydrogen-analytics`. Import it from the package instead of defining it manually:

```typescript
import type {ShopAnalytics} from '@shopify/hydrogen-analytics';
```

### 7.2 Collections List Query

Fetches collections. For simplicity, fetches the first 12. The query shape supports cursor-based pagination via `first`/`last`/`startCursor`/`endCursor` for future enhancement.

```graphql
fragment Collection on Collection {
  id
  title
  handle
  image {
    id
    url
    altText
    width
    height
  }
}
query StoreCollections(
  $country: CountryCode
  $endCursor: String
  $first: Int
  $language: LanguageCode
  $last: Int
  $startCursor: String
) @inContext(country: $country, language: $language) {
  collections(
    first: $first,
    last: $last,
    before: $startCursor,
    after: $endCursor
  ) {
    nodes {
      ...Collection
    }
    pageInfo {
      hasNextPage
      hasPreviousPage
      startCursor
      endCursor
    }
  }
}
```

Call with `variables: { first: 12 }`.

### 7.3 Single Collection with Products Query

```graphql
fragment MoneyProductItem on MoneyV2 {
  amount
  currencyCode
}
fragment ProductItem on Product {
  id
  handle
  title
  featuredImage {
    id
    altText
    url
    width
    height
  }
  priceRange {
    minVariantPrice {
      ...MoneyProductItem
    }
    maxVariantPrice {
      ...MoneyProductItem
    }
  }
}
query Collection(
  $handle: String!
  $country: CountryCode
  $language: LanguageCode
  $first: Int
  $last: Int
  $startCursor: String
  $endCursor: String
) @inContext(country: $country, language: $language) {
  collection(handle: $handle) {
    id
    handle
    title
    description
    products(
      first: $first,
      last: $last,
      before: $startCursor,
      after: $endCursor
    ) {
      nodes {
        ...ProductItem
      }
      pageInfo {
        hasPreviousPage
        hasNextPage
        endCursor
        startCursor
      }
    }
  }
}
```

Call with `variables: { handle: "the-handle", first: 12 }`.

### 7.4 Product Query with Variant Selection

The most important query. Uses `$selectedOptions` to resolve the correct variant server-side, and `adjacentVariants` for the option picker UI.

```graphql
fragment ProductVariant on ProductVariant {
  availableForSale
  compareAtPrice {
    amount
    currencyCode
  }
  id
  image {
    __typename
    id
    url
    altText
    width
    height
  }
  price {
    amount
    currencyCode
  }
  product {
    title
    handle
  }
  selectedOptions {
    name
    value
  }
  sku
  title
  unitPrice {
    amount
    currencyCode
  }
}

fragment Product on Product {
  id
  title
  vendor
  handle
  descriptionHtml
  description
  encodedVariantExistence
  encodedVariantAvailability
  options {
    name
    optionValues {
      name
      firstSelectableVariant {
        ...ProductVariant
      }
      swatch {
        color
        image {
          previewImage {
            url
          }
        }
      }
    }
  }
  selectedOrFirstAvailableVariant(
    selectedOptions: $selectedOptions
    ignoreUnknownOptions: true
    caseInsensitiveMatch: true
  ) {
    ...ProductVariant
  }
  adjacentVariants(selectedOptions: $selectedOptions) {
    ...ProductVariant
  }
  seo {
    description
    title
  }
}

query Product(
  $country: CountryCode
  $handle: String!
  $language: LanguageCode
  $selectedOptions: [SelectedOptionInput!]!
) @inContext(country: $country, language: $language) {
  product(handle: $handle) {
    ...Product
  }
}
```

**Variables:** `{ handle: "the-handle", selectedOptions: [{ name: "Color", value: "Red" }, { name: "Size", value: "L" }] }`

The `selectedOptions` are parsed from URL search params (e.g., `?Color=Red&Size=L`). When no params are set, pass an empty array — the API returns the first available variant.

### 7.5 Cart Query Fragment

This is the full cart query fragment. It includes all fields needed for both the cart UI and analytics.

**Three important gotchas:**
- **`merchandise.product.vendor`** is critical for analytics — omitting it silently prevents monorail events from firing.
- **`cart.lines.nodes` returns a union of `CartLine | ComponentizableCartLine`.** Some stores (including `mock.shop`) return `ComponentizableCartLine` for all lines. If you only spread `...CartLine`, the response will have `__typename` but no fields — the cart drawer will appear empty even though `totalQuantity` shows items. Both fragment types must be included.
- **Do not add `__typename` runtime checks on `merchandise`.** The `... on ProductVariant` syntax in the fragment is a GraphQL inline fragment spread — it tells the API which fields to return, but it does NOT add a `__typename` field to the response. If your code filters lines with `merchandise.__typename === "ProductVariant"`, every line will be silently filtered out because `__typename` is `undefined`. The `merchandise` field in the Storefront API always resolves to `ProductVariant` — no runtime discriminator is needed. Access `merchandise.id`, `merchandise.title`, etc. directly.

```graphql
fragment Money on MoneyV2 {
  currencyCode
  amount
}
fragment CartLine on CartLine {
  id
  quantity
  attributes {
    key
    value
  }
  cost {
    totalAmount {
      ...Money
    }
    amountPerQuantity {
      ...Money
    }
    compareAtAmountPerQuantity {
      ...Money
    }
  }
  merchandise {
    ... on ProductVariant {
      id
      availableForSale
      compareAtPrice {
        ...Money
      }
      price {
        ...Money
      }
      requiresShipping
      title
      image {
        id
        url
        altText
        width
        height
      }
      product {
        handle
        title
        id
        vendor
      }
      selectedOptions {
        name
        value
      }
    }
  }
}
fragment CartLineComponent on ComponentizableCartLine {
  id
  quantity
  attributes {
    key
    value
  }
  cost {
    totalAmount {
      ...Money
    }
    amountPerQuantity {
      ...Money
    }
    compareAtAmountPerQuantity {
      ...Money
    }
  }
  merchandise {
    ... on ProductVariant {
      id
      availableForSale
      compareAtPrice {
        ...Money
      }
      price {
        ...Money
      }
      requiresShipping
      title
      image {
        id
        url
        altText
        width
        height
      }
      product {
        handle
        title
        id
        vendor
      }
      selectedOptions {
        name
        value
      }
    }
  }
  lineComponents {
    ...CartLine
  }
}
fragment CartApiQuery on Cart {
  updatedAt
  id
  checkoutUrl
  totalQuantity
  buyerIdentity {
    countryCode
    customer {
      id
      email
      firstName
      lastName
      displayName
    }
    email
    phone
  }
  lines(first: $numCartLines, reverse: true) {
    nodes {
      ...CartLine
    }
    nodes {
      ...CartLineComponent
    }
  }
  cost {
    subtotalAmount {
      ...Money
    }
    totalAmount {
      ...Money
    }
    totalDutyAmount {
      ...Money
    }
    totalTaxAmount {
      ...Money
    }
  }
  note
  attributes {
    key
    value
  }
  discountCodes {
    code
    applicable
  }
}
```

### 7.6 Cart Get Query

```graphql
query CartQuery(
  $cartId: ID!
  $numCartLines: Int = 100
  $country: CountryCode = ZZ
  $language: LanguageCode
) @inContext(country: $country, language: $language) {
  cart(id: $cartId) {
    ...CartApiQuery
  }
}
```

Use the `CartApiQuery` fragment from 5.5. Pass the full cart GID as `$cartId`.

### 7.7 Cart Create Mutation

```graphql
mutation cartCreate(
  $input: CartInput!
  $country: CountryCode = ZZ
  $language: LanguageCode
) @inContext(country: $country, language: $language) {
  cartCreate(input: $input) {
    cart {
      id
      totalQuantity
      checkoutUrl
    }
    userErrors {
      message
      field
      code
    }
  }
}
```

**Variables:**
```json
{
  "input": {
    "lines": [
      {
        "merchandiseId": "gid://shopify/ProductVariant/123",
        "quantity": 1
      }
    ]
  }
}
```

### 7.8 Cart Lines Add Mutation

```graphql
mutation cartLinesAdd(
  $cartId: ID!
  $lines: [CartLineInput!]!
  $country: CountryCode = ZZ
  $language: LanguageCode
) @inContext(country: $country, language: $language) {
  cartLinesAdd(cartId: $cartId, lines: $lines) {
    cart {
      id
      totalQuantity
      checkoutUrl
    }
    userErrors {
      message
      field
      code
    }
  }
}
```

### 7.9 Cart Lines Update Mutation

```graphql
mutation cartLinesUpdate(
  $cartId: ID!
  $lines: [CartLineUpdateInput!]!
  $language: LanguageCode
  $country: CountryCode
) @inContext(country: $country, language: $language) {
  cartLinesUpdate(cartId: $cartId, lines: $lines) {
    cart {
      id
      totalQuantity
      checkoutUrl
    }
    userErrors {
      message
      field
      code
    }
  }
}
```

**Variables for quantity update:**
```json
{
  "cartId": "gid://shopify/Cart/c1-abc",
  "lines": [{ "id": "gid://shopify/CartLine/xyz", "quantity": 3 }]
}
```

### 7.10 Cart Lines Remove Mutation

```graphql
mutation cartLinesRemove(
  $cartId: ID!
  $lineIds: [ID!]!
  $language: LanguageCode
  $country: CountryCode
) @inContext(country: $country, language: $language) {
  cartLinesRemove(cartId: $cartId, lineIds: $lineIds) {
    cart {
      id
      totalQuantity
      checkoutUrl
    }
    userErrors {
      message
      field
      code
    }
  }
}
```

---

## 8. Product Variant Selection

Variant selection uses URL search params as the source of truth. All variant and image switching must happen client-side — no full page navigations.

### How It Works

1. **URL encodes the selection**: `/products/t-shirt?Color=Red&Size=L`
2. **Parse into `selectedOptions`**: Convert URL search params into `[{name: "Color", value: "Red"}, {name: "Size", value: "L"}]`
3. **Pass to the product query**: The API's `selectedOrFirstAvailableVariant(selectedOptions: $selectedOptions)` returns the matching variant. If no match exists, it returns the first available variant.
4. **`adjacentVariants`** returns all variants that differ by exactly one option from the current selection. This data is used client-side for instant variant switching.

### Client-Side Variant Switching

The initial page load fetches the product with `selectedOrFirstAvailableVariant` and `adjacentVariants`. When the user selects a different option value:

1. **Find the matching variant** in the already-loaded `adjacentVariants` array — the one whose `selectedOptions` matches the new selection
2. **Immediately update the UI**: swap the displayed image (from `variant.image`), update the price (from `variant.price` and `variant.compareAtPrice`), and update the availability state (from `variant.availableForSale`)
3. **Update the URL** search params via `history.replaceState()` or equivalent — no full navigation, no scroll reset
4. Only if the new selection isn't found in `adjacentVariants` (rare, for complex multi-option products), trigger a background fetch with the new `selectedOptions` and update the UI when it resolves

### Building the Option Picker

For each option in `product.options`:
1. Display the option name (e.g., "Color", "Size")
2. For each value in `option.optionValues`:
   - **Determine if selected**: Compare against `selectedOrFirstAvailableVariant.selectedOptions`
   - **Determine if available**: Find a matching variant in `adjacentVariants` where this option value differs from the current selection. If found and `availableForSale === true`, the option is available. Also check `firstSelectableVariant` — if it exists, the value has at least one purchasable variant.
   - **Render as a button**: On click, find the matching adjacent variant and update the UI immediately. Disabled/greyed-out if the combination doesn't exist.

### Key Fields

- `product.encodedVariantExistence` — Compact encoding of which option combinations exist as variants
- `product.encodedVariantAvailability` — Compact encoding of which existing variants are in stock
- `product.options[].optionValues[].firstSelectableVariant` — The first available variant for this option value. If null, no purchasable variant exists with this value.

---

## 9. Cart System

### Cart Cookie

The cart ID is stored in a browser cookie:

| Property | Value |
|---|---|
| Name | `cart` |
| Value | Cart ID suffix only (e.g., `c1-abc123def`) |
| Path | `/` |
| SameSite | `Lax` |

**Full GID construction**: Prepend `gid://shopify/Cart/` to the cookie value.
**Extract suffix**: Strip `gid://shopify/Cart/` from the API response's `cart.id`.

### Cart Operations

#### Creating a Cart / Adding Lines

When no cart cookie exists yet, use the `cartCreate` mutation (7.7) with the line items as input. After creation, set the `cart` cookie from the response's `cart.id`.

When a cart already exists, use `cartLinesAdd` (7.8) with the cart GID and new lines. The pattern for lazy creation:

```
if (no cart cookie) {
  result = cartCreate({ input: { lines } })
} else {
  result = cartLinesAdd({ cartId, lines })
}
set cart cookie from result.cart.id
```

#### Updating Quantity

Use `cartLinesUpdate` (7.9). Pass the cart line ID and the new quantity.

#### Removing a Line

Use `cartLinesRemove` (7.10). Pass the cart line ID(s) to remove.

#### Getting the Cart

Use the cart get query (7.6) with the cart GID from the cookie. If no cookie exists, the cart is empty — no API call needed.

### Cart UI (Drawer)

The cart is a **slide-out drawer**, not a separate page. It overlays the current page content.

**Drawer behavior:**
- Opens automatically when an item is added to cart
- Opens when the cart icon/button in the header is clicked
- Shows a badge on the cart icon with `cart.totalQuantity`
- Closes when clicking outside or pressing a close button

**Line items display:**
- Product image, product title (links to product page), selected options
- Unit price from `line.cost.amountPerQuantity` (this is a monetary value from the API — do not calculate it)
- Quantity with +/- buttons and a remove button
- Line total from `line.cost.totalAmount` (from the API — do not multiply price by quantity)

**Cart summary:**
- Subtotal from `cart.cost.subtotalAmount`
- Checkout link: `<a href={cart.checkoutUrl}>Continue to Checkout</a>` — a plain link to Shopify's hosted checkout

**Optimistic behavior** (see Section 6.1):
- When adding an item: immediately show it in the drawer using client-side data. Mark monetary totals as pending.
- When changing quantity: immediately update the quantity number. Mark all monetary values as pending.
- When removing: immediately hide the line. Mark totals as pending.
- When the mutation response returns: update monetary values with the real data from the API and clear pending states.

### Checkout

The `checkoutUrl` field on the cart object is a fully-qualified URL to Shopify's hosted checkout. Render it as a standard anchor link. No custom checkout implementation needed.

### Cart Analytics

After every cart mutation (create, add, update quantity, remove), pass the updated cart object to the analytics bus:

```typescript
bus.updateCart(cart);
```

The bus automatically diffs the current cart against the previous cart and emits:
- `cart_updated` — on any cart change
- `product_added_to_cart` — for each line with increased quantity or newly added line
- `product_removed_from_cart` — for each line with decreased quantity or removed line

You do not manually publish these events. The bus handles the diffing and event emission.

**Required cart line fields for analytics:** The cart query (Section 7.5) must include `id`, `quantity`, and `merchandise` with `id`, `title`, `price { amount }`, and `product { id, title, vendor }`. These fields are already present in the cart fragment defined in Section 7.5.

**Cart shape:** The bus expects `AnalyticsCart` from `@shopify/hydrogen-analytics`:

```typescript
import type {AnalyticsCart} from '@shopify/hydrogen-analytics';

// AnalyticsCart expects the Storefront API connection format:
type AnalyticsCart = {
  id: string;
  updatedAt: string;
  lines: {
    nodes?: AnalyticsCartLine[];
    edges?: Array<{node: AnalyticsCartLine}>;
  };
};
```

If your framework reshapes the Storefront API response (e.g., flattening `edges`/`nodes` into an array), you must map it back to the connection format before passing to `updateCart()`.

---

## 10. Analytics

Shopify analytics (page views, product views, cart events, performance metrics) are handled by the `@shopify/hydrogen-analytics` package. The package encapsulates Monorail dispatch, consent management, tracking token extraction, PerfKit loading, and legacy cookie handling. You do not implement any of these directly.

### 10.1 Install

Install the analytics package using the project's package manager:

```bash
npm install @shopify/hydrogen-analytics
```

### 10.2 Create the Bus

The bus is a client-side singleton. Create it once at app initialization.

```typescript
import {createAnalyticsBus, AnalyticsEvent} from '@shopify/hydrogen-analytics';
import type {ShopAnalytics, ConsentConfig} from '@shopify/hydrogen-analytics';
```

**Shop data** — resolve from the Storefront API using the query in Section 7.1:

```typescript
const shop: ShopAnalytics = {
  shopId: "gid://shopify/Shop/12345",
  acceptedLanguage: "EN",
  currency: "USD",
  hydrogenSubchannelId: PUBLIC_STOREFRONT_ID || "0",
};
```

**Consent config** — required for consent script loading and privacy banner:

```typescript
const consent: ConsentConfig = {
  checkoutDomain: PUBLIC_CHECKOUT_DOMAIN,
  storefrontAccessToken: PUBLIC_STOREFRONT_API_TOKEN,
  withPrivacyBanner: true,
  country: "US",
  language: "EN",
};
```

**Create:**

```typescript
const bus = createAnalyticsBus({shop, consent});
```

When `shop` data is not yet available (async resolution from a server-side query), pass `shop: null` at creation and call `bus._internal.updateShop(shop)` once resolved. The bus defers internal subscriber initialization until shop data is provided.

### 10.3 Page View Events

Publish `page_viewed` on every route change (including initial page load):

```typescript
bus.publish(AnalyticsEvent.PAGE_VIEWED, {
  url: window.location.href,
  shop,
});
```

The bus internally sends both Monorail schemas (`trekkie_storefront_page_view/1.4` and `custom_storefront_customer_tracking/1.2` with `page_rendered`) and notifies PerfKit.

### 10.4 Product View Events

On the product page, after the page renders with product data:

```typescript
bus.publish(AnalyticsEvent.PRODUCT_VIEWED, {
  url: window.location.href,
  shop,
  products: [{
    id: product.id,               // "gid://shopify/Product/123"
    title: product.title,
    price: selectedVariant.price.amount,  // string, e.g. "29.99"
    vendor: product.vendor,
    variantId: selectedVariant.id, // "gid://shopify/ProductVariant/456"
    variantTitle: selectedVariant.title,
    quantity: 1,
  }],
});
```

**All fields (`id`, `title`, `price`, `vendor`, `variantId`, `variantTitle`) are required. Missing any field silently drops the event.** The bus validates product data completeness and logs detailed error messages when fields are missing.

### 10.5 Collection View Events

On the collection page:

```typescript
bus.publish(AnalyticsEvent.COLLECTION_VIEWED, {
  url: window.location.href,
  shop,
  collection: {
    id: collection.id,
    handle: collection.handle,
  },
});
```

### 10.6 Cart Events

Cart events (`cart_updated`, `product_added_to_cart`, `product_removed_from_cart`) are handled automatically via `bus.updateCart()`. See Section 9 (Cart Analytics). You do not manually publish these events.

### 10.7 Custom Subscribers

To add custom analytics (e.g., third-party pixels, logging):

```typescript
const unsubscribe = bus.subscribe(AnalyticsEvent.PAGE_VIEWED, (payload) => {
  thirdPartyTracker.pageView(payload.url);
});

// Later, to clean up:
unsubscribe();
```

You can subscribe to any event: `page_viewed`, `product_viewed`, `collection_viewed`, `cart_updated`, `product_added_to_cart`, `product_removed_from_cart`. Custom events prefixed with `custom_` are also supported.

### 10.8 Event Deduplication

Publish each event once per navigation. Track the last published URL and skip if unchanged. This prevents duplicate events from React re-renders, Strict Mode double effects, or other framework-level re-invocations.

```typescript
let lastPublishedUrl = "";

function onRouteChange(url: string) {
  if (url === lastPublishedUrl) return;
  lastPublishedUrl = url;
  bus.publish(AnalyticsEvent.PAGE_VIEWED, {url, shop});
}
```

### 10.9 Cleanup

Call `bus.destroy()` when the analytics provider unmounts (e.g., in a framework cleanup/teardown hook). This removes all subscribers and internal subsystem state.

```typescript
bus.destroy();
```

### 10.10 What the Bus Handles Internally

You do not implement any of the following — the bus handles them automatically when `shop` is provided:

| Subsystem | What it does |
|---|---|
| **Monorail dispatch** | Batches events to `monorail-edge.shopifysvc.com` with both `trekkie_storefront_page_view/1.4` and `custom_storefront_customer_tracking/1.2` schemas |
| **Tracking tokens** | Extracts `uniqueToken` and `visitToken` from `Server-Timing` headers via the Performance API (with cookie fallback) |
| **Event IDs** | Generates UUIDs using `crypto.getRandomValues` with hex timestamp prefix |
| **GID parsing** | Extracts numeric IDs and resource types from Shopify Global IDs |
| **Consent management** | Loads the Shopify consent tracking API (or privacy banner when `withPrivacyBanner: true`), blocks event dispatch until consent resolves, with timeout fallbacks for ad blockers |
| **PerfKit** | Loads the perf-kit SPA script after consent, calls `navigate()` on page views and `setPageType()` for product/collection pages |
| **Legacy cookies** | Manages deprecated `_shopify_y` / `_shopify_s` cookies for backward compatibility |

### Reference: React Integration Pattern

For React-based frameworks, the recommended pattern wraps the bus in a context provider:

1. **AnalyticsProvider** — creates the bus in a `useRef`, resolves async shop data in a `useEffect`, publishes `page_viewed` on URL changes via a child component that watches `usePathname()` + `useSearchParams()`
2. **CartAnalyticsTracker** — renderless component that observes cart state and calls `bus.updateCart()` on changes
3. **ProductViewed / CollectionViewed** — renderless components placed on product/collection pages that publish the typed event in a `useEffect` with URL deduplication

See `templates/commerce/components/analytics/` in the Hydrogen repo for a complete Next.js App Router reference implementation.

For non-React frameworks, the same pattern applies: create the bus once at app initialization, publish events in response to route changes, and pipe cart state into `updateCart()`.

---

## 11. Analytics — PerfKit

PerfKit (Core Web Vitals, TTFB tracking) is handled automatically by `@shopify/hydrogen-analytics`. The bus loads the PerfKit script after consent resolves and calls `navigate()` on page views and `setPageType()` for product/collection pages.

No manual PerfKit integration is required.

---

## 12. Image and Price Rendering

### Shopify CDN Images

Image URLs from the API already point to Shopify's CDN. The CDN supports URL-based transforms — append `&width=N` for responsive images:

```html
<img
  src="{url}&width=400"
  srcset="{url}&width=200 200w, {url}&width=400 400w, {url}&width=800 800w"
  sizes="(min-width: 45em) 400px, 100vw"
  alt="{altText}"
  loading="lazy"
/>
```

Use `loading="eager"` for above-the-fold images (first 3-4 items) and `loading="lazy"` for the rest.

### Price Display

Prices come as `MoneyV2`: `{ amount: "29.99", currencyCode: "USD" }`.

Format using the `Intl.NumberFormat` API:

```typescript
new Intl.NumberFormat(locale, {
  style: "currency",
  currency: money.currencyCode,
}).format(parseFloat(money.amount));
```

**Never compute prices.** Always display values directly from the API response. For sale items, show the compare-at price struck through alongside the current price — both values come from the API.

---

## 13. Pages

### Homepage

**Route**: `/`

The homepage should feature a curated entry point into the store. Fetch the first collection (sorted by `UPDATED_AT`, reversed) and the first 4 products (sorted by `UPDATED_AT`, reversed) using these queries:

```graphql
query FeaturedCollection($country: CountryCode, $language: LanguageCode)
  @inContext(country: $country, language: $language) {
  collections(first: 1, sortKey: UPDATED_AT, reverse: true) {
    nodes {
      id
      title
      handle
      image {
        id
        url
        altText
        width
        height
      }
    }
  }
}

query RecommendedProducts($country: CountryCode, $language: LanguageCode)
  @inContext(country: $country, language: $language) {
  products(first: 4, sortKey: UPDATED_AT, reverse: true) {
    nodes {
      id
      title
      handle
      priceRange {
        minVariantPrice {
          amount
          currencyCode
        }
      }
      featuredImage {
        id
        url
        altText
        width
        height
      }
    }
  }
}
```

Display a hero section with the featured collection (image + title + "Shop now" link to `/collections/{handle}`), followed by a grid of recommended products (each linking to `/products/{handle}`).

### Collections Index

**Route**: `/collections`

Fetch using the Collections List Query (7.2) with `{ first: 12 }`. Render a grid of collection cards with images and titles. Each card links to `/collections/{handle}`.

### Single Collection

**Route**: `/collections/:handle`

Fetch using the Collection Query (7.3). Display the collection title, description, and a product grid. Each product card shows the featured image, title, and `priceRange.minVariantPrice`.

Fire a collection view analytics event (Section 10).

### Product

**Route**: `/products/:handle`

Fetch using the Product Query (7.4). Parse selected options from URL search params.

Display: product image, title, price (with compare-at if on sale), variant selector (Section 8), Add to Cart button, description HTML.

The Add to Cart button submits `merchandiseId` (the selected variant's ID) and `quantity: 1`. It should be disabled when `!selectedVariant.availableForSale`. On click, it triggers the cart add operation and opens the cart drawer.

Fire a product view analytics event (Section 10).

### Cart

The cart is a **drawer** (Section 6.2), not a standalone page. See Section 9 for the full cart UI specification.

---

Verification is embedded in each implementation phase (Section 2). Complete and verify each phase before moving to the next.
