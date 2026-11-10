# Build home page

Create a simple server-rendered home page that proves Hydrogen is wired correctly.

## Data Requirements

Use the shared Storefront API client to fetch both collections and products in the page's server data-loading boundary.

The home query should include:

- Collection `id`, `title`, `handle`, and optional `image { url altText }`.
- Product `id`, `title`, `handle`, optional `featuredImage { url altText }`, and `priceRange { minVariantPrice { amount currencyCode } }`.

Do not fetch cart data for the home page. Cart belongs to the cart route and navbar link state, not to the home page sample.

## Rendering Requirements

- Render collections and products as separate sections.
- Link collection cards using the app's routing template (`hydrogen-routing` skill).
- Link product cards using the app's existing product route templates (`hydrogen-routing` skill).
- Format money with the local `hydrogen-money` skill; never do client-side currency arithmetic.
- Use empty states when collections or products are missing.
- Keep styles local to the app's existing styling approach. If there is no styling system, use minimal semantic HTML.

## Framework Notes

- Next.js App Router: fetch in `app/page.tsx` or a server helper it imports.
- React Router framework mode: fetch in the index route `loader` and render from loader data.
- SvelteKit: fetch in `+page.server.ts` and render in `+page.svelte`.
- Astro: fetch in `src/pages/index.astro` frontmatter.
- SolidStart: fetch through a server query or route data API used by `src/routes/index.tsx`.

## Continue when

- [ ] The home page renders products and collections
- [ ] Product and collection links point to the app's actual route shape
- [ ] Prices display with digits and units (e.g.: $20.95)
