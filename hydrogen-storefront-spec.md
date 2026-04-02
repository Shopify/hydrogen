# Hydrogen Storefront Specification

A self-contained specification for scaffolding a Shopify storefront from scratch. Uses only the Storefront API — no Shopify packages. Framework-agnostic: works with any React-based framework that supports server-side rendering.

### Implementation Notes

- **Testing**: Focus on getting the storefront functional first. The verification checklist in Section 13 covers all acceptance criteria. Automated tests can be added in a follow-up iteration once the core storefront is working end-to-end.
- **Scope**: This spec covers a complete but minimal storefront. It intentionally does not cover customer accounts, search, blog, SEO meta tags, privacy banners, or internationalization.

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

### 1.3 Existing Patterns

Scan the codebase for established conventions and follow them. Specifically:

- **Data fetching**: Does the project use framework loaders (`loader` in React Router/TanStack), server components, TanStack Query (`useQuery`), SWR, or plain `fetch`? Follow whichever pattern is already in use.
- **Mutations**: Does the project use framework actions, server actions, TanStack Query mutations, or API routes? Follow the existing pattern.
- **File structure**: Where do routes, components, utilities, and types live? Follow the existing conventions.
- **Naming**: camelCase vs kebab-case for files, named exports vs default exports, etc.

If the project is freshly scaffolded with no patterns yet, follow the framework's recommended conventions.

---

## 2. Environment & API Version

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

## 3. Storefront API Client

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

Create a reusable utility for making Storefront API requests. The client must use `TypedDocumentNode` from the codegen output so that return types are inferred automatically — callers should never need to pass a generic or manually type the response.

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

## 4. GraphQL Codegen

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
    [`https://hydrogen-preview.myshopify.com/api/${SFAPI_VERSION}/graphql.json`]: {
      headers: {
        "X-Shopify-Storefront-Access-Token": "3b580e70970c4528da70c98e097c2fa0",
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

The `SFAPI_VERSION` must reference the same constant from Section 2. The schema URL uses a public demo store for introspection — replace with the project's own store domain and token for production.

### Usage

Add to `package.json`:
```json
{
  "scripts": {
    "codegen": "graphql-codegen --config codegen.ts"
  }
}
```

Run `npm run codegen` after adding or modifying any GraphQL query.

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
4. **Re-run `npm run codegen`** whenever you add or modify a query. The generated `graphql()` overloads must be up to date.

---

## 5. UX Patterns

These rules apply across the entire storefront. They ensure the UI feels responsive and correct.

### 5.1 Optimistic UI

Cart interactions must feel instant. The underlying mutations still execute server-side, but the UI should not wait for them.

| Action | Immediate (optimistic) | Pending (wait for server) |
|---|---|---|
| **Add to cart** | Update the cart lines optimistically (see line-merging rule below) and open the drawer | Cart subtotal/total (grey out or spinner) |
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

### 5.2 Cart as a Drawer

The cart must be a **drawer/aside** (overlay panel) that slides in from the side of the page. It must NOT be a separate route/page. The user should be able to add items and view their cart without leaving the current page.

The drawer should:
- Open when an item is added to cart
- Open when a "cart" button/icon is clicked (show item count badge)
- Close when clicking outside or pressing a close button
- Show the checkout link at the bottom

### 5.3 Money Handling

**The codebase must NEVER perform arithmetic on monetary values.** No `price * quantity`, no summing line totals, no currency conversion.

All money values must come directly from the Storefront API:
- Line item total: `cart.lines[].cost.totalAmount`
- Cart subtotal: `cart.cost.subtotalAmount`
- Cart total: `cart.cost.totalAmount`
- Product price: `variant.price`
- Compare-at price: `variant.compareAtPrice`

When a cart mutation is in-flight, any monetary value that may have become stale (line totals, cart subtotal, cart total) should show a loading/pending indicator (greyed out, spinner, or skeleton). Non-monetary data (product title, image, quantity number) can be shown optimistically since it is known client-side.

### 5.4 Client-Side Navigation

Variant selection, image switching, and cart interactions must never trigger a full page navigation. Use client-side state updates and URL param changes (via `history.replaceState()` or equivalent) to keep the experience snappy.

---

## 6. GraphQL Queries

All queries in this section are the exact GraphQL operations for the Storefront API. They use the `@inContext` directive for localization.

**Each query must be defined using the generated `graphql()` function** (see Section 4) so that its return type and variables are automatically inferred. For example:

```typescript
import { graphql } from "../gql";
export const SHOP_QUERY = graphql(`query ShopData(...) { ... }`);
```

The query strings below show the GraphQL content to pass to `graphql()`. Do not use them as raw strings.

### 6.1 Shop Analytics Query

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

### 6.2 Collections List Query

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

### 6.3 Single Collection with Products Query

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

### 6.4 Product Query with Variant Selection

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

### 6.5 Cart Query Fragment

This is the full cart query fragment. It includes all fields needed for both the cart UI and analytics. **The `merchandise.product.vendor` field is critical for analytics — omitting it silently prevents monorail events from firing.**

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
  lines(first: $numCartLines) {
    nodes {
      ...CartLine
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

### 6.6 Cart Get Query

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

### 6.7 Cart Create Mutation

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

### 6.8 Cart Lines Add Mutation

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

### 6.9 Cart Lines Update Mutation

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

### 6.10 Cart Lines Remove Mutation

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

## 7. Product Variant Selection

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

## 8. Cart System

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

When no cart cookie exists yet, use the `cartCreate` mutation (6.7) with the line items as input. After creation, set the `cart` cookie from the response's `cart.id`.

When a cart already exists, use `cartLinesAdd` (6.8) with the cart GID and new lines. The pattern for lazy creation:

```
if (no cart cookie) {
  result = cartCreate({ input: { lines } })
} else {
  result = cartLinesAdd({ cartId, lines })
}
set cart cookie from result.cart.id
```

#### Updating Quantity

Use `cartLinesUpdate` (6.9). Pass the cart line ID and the new quantity.

#### Removing a Line

Use `cartLinesRemove` (6.10). Pass the cart line ID(s) to remove.

#### Getting the Cart

Use the cart get query (6.6) with the cart GID from the cookie. If no cookie exists, the cart is empty — no API call needed.

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

**Optimistic behavior** (see Section 5.1):
- When adding an item: immediately show it in the drawer using client-side data. Mark monetary totals as pending.
- When changing quantity: immediately update the quantity number. Mark all monetary values as pending.
- When removing: immediately hide the line. Mark totals as pending.
- When the mutation response returns: update monetary values with the real data from the API and clear pending states.

### Checkout

The `checkoutUrl` field on the cart object is a fully-qualified URL to Shopify's hosted checkout. Render it as a standard anchor link. No custom checkout implementation needed.

---

## 9. Analytics — Monorail Events

Shopify analytics events are sent to a monorail endpoint. This enables merchant analytics dashboards.

### Endpoint

```
POST https://monorail-edge.shopifysvc.com/unstable/produce_batch
Content-Type: text/plain
```

Note: Content type is `text/plain`, not `application/json`, despite the body being JSON.

### Batch Event Format

```typescript
{
  events: Array<{
    schema_id: string;
    payload: Record<string, unknown>;
    metadata: {
      event_created_at_ms: number;  // Date.now()
    };
  }>;
  metadata: {
    event_sent_at_ms: number;  // Date.now()
  };
}
```

### Tracking Tokens

Every monorail event requires `uniqueToken` (user identity) and `visitToken` (session identity). These come from `Server-Timing` response headers on Storefront API requests.

**Extraction:**

1. After a Storefront API fetch, use the Performance API: `performance.getEntriesByType('resource')`
2. Find entries matching the Storefront API URL pattern (`/api/.../graphql.json`)
3. Read the `serverTiming` array on the matched entry
4. Extract values where `name === '_y'` (uniqueToken) and `name === '_s'` (visitToken)

**Fallback**: Check for deprecated `_shopify_y` and `_shopify_s` cookies.

**Cache**: Store extracted tokens in a module-level variable for the session.

### Event ID Generation

Each event needs a unique `event_id`. Generate a UUID:
- Format: `{hexTimestamp}-xxxx-4xxx-xxxx-xxxxxxxxxxxx`
- `hexTimestamp`: 8-char hex of `(Date.now() + performance.now()) >>> 0`
- Replace each `x` with a random hex digit via `crypto.getRandomValues()`

### Schema 1: `trekkie_storefront_page_view/1.4`

Sent on every page navigation:

```typescript
{
  appClientId: "6167201",
  isMerchantRequest: boolean,          // true if hostname contains "myshopify.dev" or is "localhost"
  hydrogenSubchannelId: string,        // PUBLIC_STOREFRONT_ID or "0"
  isPersistentCookie: boolean,         // same as hasUserConsent
  uniqToken: string,                   // uniqueToken from Server-Timing
  visitToken: string,                  // visitToken from Server-Timing
  microSessionId: string,              // generated UUID
  microSessionCount: 1,
  url: string,                         // window.location.href
  path: string,                        // window.location.pathname
  search: string,                      // window.location.search
  referrer: string,                    // document.referrer
  title: string,                       // document.title
  shopId: number,                      // numeric ID parsed from shop GID
  currency: string,                    // e.g. "USD"
  contentLanguage: string,             // e.g. "EN"
  // Optional, for typed pages:
  pageType?: string,                   // "product", "collection", etc.
  resourceType?: string,               // lowercase resource type
  resourceId?: number,                 // numeric ID from resource GID
  customerId?: number,                 // 0 when not logged in
}
```

### Schema 2: `custom_storefront_customer_tracking/1.2`

Sent alongside trekkie for page views, and separately for typed events and cart events.

#### Base payload (all events)

```typescript
{
  source: "hydrogen",
  asset_version_id: "2025.1.0",       // version string
  hydrogenSubchannelId: string,        // PUBLIC_STOREFRONT_ID or "0"
  is_persistent_cookie: boolean,
  deprecated_visit_token: string,      // visitToken
  unique_token: string,                // uniqueToken
  event_time: number,                  // Date.now()
  event_id: string,                    // generated UUID
  event_source_url: string,            // window.location.href
  referrer: string,                    // document.referrer
  user_agent: string,                  // navigator.userAgent
  navigation_type: string,             // from Performance Navigation API
  navigation_api: string,              // "PerformanceNavigationTiming" or "performance.navigation"
  shop_id: number,                     // numeric ID from shop GID
  currency: string,
  ccpa_enforced: false,
  gdpr_enforced: false,
  gdpr_enforced_as_string: "false",
  analytics_allowed: true,
  marketing_allowed: true,
  sale_of_data_allowed: true,
}
```

#### Event: `page_rendered`

```typescript
{ event_name: "page_rendered", canonical_url: string, customer_id: 0 }
```

#### Event: `product_page_rendered`

```typescript
{ event_name: "product_page_rendered", canonical_url: string, customer_id: 0,
  products: string[], total_value: number }
```

#### Event: `collection_page_rendered`

```typescript
{ event_name: "collection_page_rendered", canonical_url: string, customer_id: 0,
  collection_name: string, collection_id: number }
```

#### Event: `product_added_to_cart`

```typescript
{ event_name: "product_added_to_cart", cart_token: string, total_value: number,
  products: string[], customer_id: 0 }
```

### Product Payload Format

The `products` field is an array of **JSON-stringified** objects:

```typescript
{
  product_gid: string,       // "gid://shopify/Product/123"
  variant_gid: string,       // "gid://shopify/ProductVariant/456"
  name: string,              // product title
  variant: string,           // variant title
  brand: string,             // product vendor
  price: number,             // parseFloat(price.amount)
  quantity: number,
  category: string,          // product type (optional)
  sku: string,               // (optional)
  product_id: number,        // numeric from GID
  variant_id: number,        // numeric from GID
}
```

**All of `product_gid`, `name`, `brand` (vendor), `price`, `variant_gid`, and `variant` (variant title) are required. Missing any one silently drops the event.**

### Event Flow

| Navigation | Events Sent |
|---|---|
| Any page | `PAGE_VIEW_2`: 1x trekkie + 1x custom `page_rendered` |
| Product page | `PRODUCT_VIEW`: 1x custom `product_page_rendered` |
| Collection page | `COLLECTION_VIEW`: 1x custom `collection_page_rendered` |
| Add to cart | `ADD_TO_CART`: 1x custom `product_added_to_cart` |

### GID Parsing

Parse `gid://shopify/Product/123` by treating it as a URL:
- pathname segments: `["", "shopify", "Product", "123"]`
- Numeric ID: `parseInt(last segment)` → `123`
- Resource type: second-to-last segment → `"Product"`

---

## 10. Analytics — PerfKit

PerfKit tracks storefront performance metrics (Core Web Vitals, TTFB).

### Script Loading

Load in the document:

```
https://cdn.shopify.com/shopifycloud/perf-kit/shopify-perf-kit-spa.min.js
```

Required `data-*` attributes on the `<script>` tag:

| Attribute | Value |
|---|---|
| `data-application` | `"hydrogen"` |
| `data-shop-id` | Numeric shop ID from GID (e.g., `"12345"`) |
| `data-storefront-id` | `PUBLIC_STOREFRONT_ID` or `"0"` |
| `data-monorail-region` | `"global"` |
| `data-spa-mode` | `"true"` |
| `data-resource-timing-sampling-rate` | `"100"` |

### SPA Navigation

After each client-side navigation:
```javascript
window.PerfKit?.navigate();
```

### Page Types

On typed pages:
```javascript
window.PerfKit?.setPageType('product');     // product pages
window.PerfKit?.setPageType('collection');  // collection pages
window.PerfKit?.setPageType('cart');        // cart (if using a cart page)
```

---

## 11. Image and Price Rendering

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

## 12. Pages

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

Fetch using the Collections List Query (6.2) with `{ first: 12 }`. Render a grid of collection cards with images and titles. Each card links to `/collections/{handle}`.

### Single Collection

**Route**: `/collections/:handle`

Fetch using the Collection Query (6.3). Display the collection title, description, and a product grid. Each product card shows the featured image, title, and `priceRange.minVariantPrice`.

Fire a collection view analytics event (Section 9).

### Product

**Route**: `/products/:handle`

Fetch using the Product Query (6.4). Parse selected options from URL search params.

Display: product image, title, price (with compare-at if on sale), variant selector (Section 7), Add to Cart button, description HTML.

The Add to Cart button submits `merchandiseId` (the selected variant's ID) and `quantity: 1`. It should be disabled when `!selectedVariant.availableForSale`. On click, it triggers the cart add operation and opens the cart drawer.

Fire a product view analytics event (Section 9).

### Cart

The cart is a **drawer** (Section 5.2), not a standalone page. See Section 8 for the full cart UI specification.

---

## 13. Verification Checklist

- [ ] Collections page shows collection tiles with images and titles
- [ ] Collection page shows title, description, and product grid with prices
- [ ] Product page shows image, title, price, description
- [ ] Variant selection updates image and price **without full page navigation**
- [ ] URL search params update when selecting variants
- [ ] Add to cart **immediately** shows item in cart drawer (optimistic)
- [ ] Cart drawer opens on add-to-cart and on cart icon click
- [ ] Cart monetary values show pending state during mutations, then update from API response
- [ ] Quantity +/- buttons update quantity immediately (optimistic), monetary values update after server response
- [ ] Remove button immediately hides the line item
- [ ] No monetary calculations exist in the codebase (search for `*` operator near price/money variables)
- [ ] Checkout link navigates to Shopify hosted checkout
- [ ] `npm run codegen` generates types, and all query return values use generated types
- [ ] DevTools Network: `monorail-edge.shopifysvc.com` receives POST on page navigations
- [ ] DevTools Network: product pages send `product_page_rendered`, collection pages send `collection_page_rendered`
- [ ] DevTools Network: add-to-cart sends `product_added_to_cart`
- [ ] DevTools Elements: PerfKit script tag has correct `data-*` attributes
- [ ] The Storefront API version appears in exactly one place as a constant
