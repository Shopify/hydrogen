# Product page core notes

This page is the frozen visual/design source for the generated Hydrogen/Storefront Kit **product page** plus the shared site chrome (announcement bar, header with mobile-nav + cart drawers, footer). It is a static reference derived from a Shopify reference Liquid theme. The product page is the runtime anchor of the five-page storefront (product, collection, collections list, search, home) — it stands up the shared chrome, the cart drawer, and the shared `ProductCard` that the other pages reuse. See the sibling `notes/*.md` for those pages.

## Translate idiomatically

Do **not** transliterate `reference/product.html` line-for-line into a framework component. Use it as a visual and structural contract, then translate idiomatically into the target framework:

- Use framework state, routes, forms, loaders/actions, and composition patterns.
- Use shipped Hydrogen/Storefront Kit skills for product variants, money formatting, cart UI/drawer, request handlers, analytics, and Shop Pay.
- Keep the semantic classes from `tokens.css` as the cross-example consistency anchor.
- Replace static demo data with real Storefront API data and framework-native fallbacks.
- **Streaming & caching:** render the chrome, breadcrumbs, product shell, and gallery skeleton without waiting on every below-the-fold query; load/cache non-personalized product, variant, media, and related-product data through the framework's catalog-cache path, while cart/personalized state stays request-scoped or client-seeded.
- **SEO:** emit a canonical URL for `/products/{handle}` (variant query params do not change the canonical) and server-render Product JSON-LD with offer/availability data using the shared safe JSON-LD helper.

## Dynamic vs. static map

| Static reference markup | Generated example responsibility |
| --- | --- |
| Hardcoded product title/vendor/description/prices | Load product by handle; render selected variant price, compare-at price, inventory, and SEO metadata. |
| Static `<s-variant-picker>` radio DOM | Use the `variant-form` skill/framework state to derive selected options, selected variant, disabled/unavailable options, URL updates, and hidden variant id. |
| Static color swatches | Map option values to swatch colors/images from merchant product metadata. Do not invent permanent color mappings in the design core. |
| Static quantity selector DOM | Use framework state or the Hydrogen quantity/cart skill equivalent. The submitted quantity input remains authoritative. |
| Static add-to-cart button | Submit to the real cart action/API, update the cart drawer, and announce status for assistive tech. |
| Static payment button placeholder | Replace with the Shop Pay/payment-button skill when available for the target framework. |
| Static cart drawer sample item | Use the real cart drawer/cart UI skills, cart lines, optimistic updates, remove/update controls, total, checkout URL, and live region messages. |
| Static related product cards | Load related products from a collection/recommendations source; exclude the current product and cap display at four cards for this slice. |
| Static navigation/footer links | Use the target app's route/link primitives and merchant/menu data where available. |

## Product data shape an agent needs

> **Illustrative, not authoritative.** The type below is a *sketch* of the data a
> product page consumes — it is **not** a contract to code against and may drift
> from the real query. Generated examples derive their types from the typed
> `gql()` loader (gql.tada), per the React Router skill's `product.md` §4; do
> **not** sync code to this shape. Keep it only as a quick mental model of the
> fields involved.

At minimum, product page generation needs:

```ts
type CoreProductPageData = {
  product: {
    id: string;
    handle: string;
    title: string;
    vendor?: string;
    description?: string;
    descriptionHtml?: string;
    media: Array<{
      id: string;
      mediaContentType: 'IMAGE' | 'VIDEO' | 'MODEL_3D' | 'EXTERNAL_VIDEO';
      alt?: string;
      image?: {url: string; width?: number; height?: number; altText?: string};
      previewImage?: {url: string; width?: number; height?: number; altText?: string};
    }>;
    options: Array<{
      name: string;
      values: Array<{
        name: string;
        selected?: boolean;
        available?: boolean;
        swatch?: {color?: string; image?: {url: string; altText?: string}};
      }>;
    }>;
    variants: Array<{
      id: string;
      title: string;
      availableForSale: boolean;
      // Optional-enhancement data sourced from a SEPARATE best-effort operation
      // (see engineering.md §F14): `quantityAvailable` is gated behind the
      // `unauthenticated_read_product_inventory` scope and may be absent. It is
      // NOT part of the critical product query; the low-stock hint is omitted
      // silently when it is missing. `availableForSale` (sold-out) is not gated.
      quantityAvailable?: number;
      selectedOptions: Array<{name: string; value: string}>;
      price: {amount: string; currencyCode: string; formatted?: string};
      compareAtPrice?: {amount: string; currencyCode: string; formatted?: string};
      image?: {url: string; width?: number; height?: number; altText?: string};
    }>;
    selectedVariant?: CoreProductPageData['product']['variants'][number];
  };
  relatedProducts: Array<{
    id: string;
    handle: string;
    title: string;
    availableForSale: boolean;
    featuredImage?: {url: string; altText?: string};
    secondaryImage?: {url: string; altText?: string};
    price: {formatted: string};
    compareAtPrice?: {formatted: string};
  }>;
  cart: {
    id?: string;
    totalQuantity: number;
    cost?: {totalAmount: {formatted: string}};
    lines: Array<unknown>;
    checkoutUrl?: string;
  };
};
```

Prices may arrive pre-formatted from the framework/Hydrogen money layer. Preserve the theme semantics: sale price uses `text-sale`, compare-at price uses `<s class="text-compare">`, and regular price uses `text-on-surface`.

## Without JavaScript

The PDP and the shared chrome it stands up must stay usable with scripting disabled (engineering.md §F4). Document these as design requirements; the framework code is the skills' job.

- **Product content renders server-side.** Title, vendor, description, the default/selected variant's price + compare-at, availability, and at least the primary gallery image render from the loader without JS. The gallery may be a JS carousel on top of a server-rendered image set, but the images themselves are not JS-gated.
- **Same-product variant selection degrades to links.** Each selectable option value renders as a real GET link (`/products/{handle}?Color=…&Size=…`) that the loader resolves to the matching variant server-side — not a bare `<button onClick>`. JS intercepts these links for client-side option swapping, but a no-JS shopper can still pick a different option value (not only switch to a different product) and land on the correct variant. The selected variant's hidden id stays authoritative for add-to-cart.
- **Add-to-cart submits a real form.** The add-to-cart control is a real `POST` form carrying the selected (or default) variant id and quantity, so a no-JS shopper can add to cart; JS upgrades it to an optimistic drawer update without double-wiring the action.
- **Cart page renders server-side.** The cart drawer's declared no-JS fallback is the `/cart` link; wherever `/cart` is implemented it must read the cart in the **server data path** (loader / server component) and render line items + totals — not from a client-only store that renders empty without JS. Seed the cart provider from that server data so the first render is populated. (The standalone `/cart` page *layout* is out of scope for this core, but this server-render requirement is not — see `notes/cart.md`.)
- **Mobile nav has a real no-JS fallback.** The mobile nav links live in a `<dialog>` opened by Invoker Commands + JS; on browsers without that support the navigation must still be reachable without JS — via a native disclosure (`<details>`/checkbox) or an always-rendered fallback link list (e.g. in `<noscript>`), since the desktop nav is `md:flex`-hidden at mobile widths. The drawer enhancement layers on top; it is not the only path to navigation.
- **Cart drawer** — see `notes/cart.md` “Without JavaScript”: PE overlay over a real `/cart` link, native Invoker open with a link fallback, native quantity/remove form path.

## Gotchas

- **Swatches are merchant data.** The reference uses placeholder hex values to show treatment only. A generator must source option-value → color/image from product option swatches/metafields/data, not from `content.json` or hardcoded design assumptions.
- **Gallery layout is responsive.** Mobile is a one-at-a-time horizontal snap carousel in an `<s-slideshow>`-shaped DOM. Desktop is a two-column image grid. Framework examples should replace `<s-slideshow>` behavior with framework state or the relevant Hydrogen skill, while keeping the visual structure.
- **The whole PDP is contained — no bleed.** The product `<section>`, the gallery, and the "you may also like" strip all sit **inside `max-w-page px-margin mx-auto`** (centered, capped at `--spacing-page`/1280px). The gallery does **not** use `gallery-bleed-start`/`bleed-full`; it stays within the constrained two-column (`2fr 1fr`) `product-grid`. The `bleed-full`/`gallery-bleed-start` primitives remain in `tokens.css` but are not applied on this page.
- **Info column is sticky.** The product info column uses `md:sticky md:top-8 md:self-start`; preserve this in generated examples unless the target framework/layout has a stronger convention.
- **`<s-*>` elements are behavioral spec only.** Do not port theme JavaScript. Treat `<s-cart>`, `<s-dialog>`, `<s-mobile-nav>`, `<s-slideshow>`, `<s-quantity-selector>`, and `<s-variant-picker>` as hints for required behavior and DOM roles. Replace them with framework state/components and Hydrogen/Storefront Kit skills.
- **Buttons/badges/types are semantic classes.** Keep classes like `button-primary`, `badge-sale`, `type-display`, `type-body-sm`, `swatch-md`, `quantity-selector-outlined` from `tokens.css` for consistency across generated examples.
- **Cart drawer is part of this page.** Even though the full standalone cart page is out of scope, add-to-cart should update/open the real cart drawer in generated examples.
- **The product page owns the shared runtime.** Chrome, cart drawer, and `ProductCard` stand up here and are *reused* by the collection, collections-list, search, and home pages — never forked. The standalone cart page and a 404 remain out of scope for this core.
