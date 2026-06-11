# Home Page

Create a simple server-rendered home page that proves Hydrogen is wired correctly without introducing a design system.

## Data Requirements

Use the shared Storefront API client from the setup skill's client step. Fetch both collections and products in the page's server data-loading boundary.

The home query should include:

- Collection `id`, `title`, `handle`, and optional `image { url altText }`.
- Product `id`, `title`, `handle`, optional `featuredImage { url altText }`, and `priceRange { minVariantPrice { amount currencyCode } }`.

Do not fetch cart data for the home page. Cart belongs to the cart route and navbar link state, not to the home page sample.

## Rendering Requirements

- Render collections and products as separate sections.
- Link collection cards using the app's existing collection route convention when present; otherwise use `/collections/{handle}`.
- Link product cards using the app's existing product route convention when present; otherwise use `/products/{handle}`.
- Format money with `formatMoney` from `@shopify/hydrogen`; never do client-side currency arithmetic.
- Use empty states when collections or products are missing.
- Keep styles local to the app's existing styling approach. If there is no styling system, use minimal semantic HTML.

## Framework Notes

- Next.js App Router: fetch in `app/page.tsx` or a server helper it imports.
- React Router framework mode: fetch in the index route `loader` and render from loader data.
- SvelteKit: fetch in `+page.server.ts` and render in `+page.svelte`.
- Astro: fetch in `src/pages/index.astro` frontmatter.
- SolidStart: fetch through a server query or route data API used by `src/routes/index.tsx`.
- Nuxt: fetch in the page's server-aware data primitive or route-level server API, preserving Nuxt conventions already present in the app.

## Verify

- The home page renders without client-side Storefront API tokens.
- Product and collection links point to the app's actual route shape.
- Missing images do not crash rendering.
- Prices display from Storefront API money fields, not computed values.
