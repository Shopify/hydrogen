# Examples

## Examples in this repo

- `base/` — canonical static design (HTML + Tailwind CDN, no JS)
- `shared/` — common example configuration and request helpers
- `react-router/` — React Router v7 port with server loaders
- `nextjs/` — Next.js 16 (App Router) port with server components
- `hydrogen/` — Hydrogen port with React Router server loaders and Oxygen-style request context
- `sveltekit/` — SvelteKit 2 + Svelte 5 (runes) port with server `load`
- `astro/` — Astro 6 port with `@astrojs/node` SSR and frontmatter data fetching
- `solid-start/` — SolidStart v1 port with `query` + `createAsync` and signal-driven product page state
- `marko-run/` — Marko 6 + `@marko/run` port with route-local handlers and streamed layout data
- `nuxt/` — Nuxt 4 port with server middleware and Vue pages
- `nuxt-binding/` — Nuxt 4 port using Hydrogen's Vue binding layer

These examples are proof-of-concepts for how Hydrogen can adapt to any framework; official bindings for libraries outside of React are coming soon.

They exist to help us answer questions like:

- Does this API feel good in a real storefront slice?
- Where does the framework integration get awkward?
- What do agents need from the SDK, docs, and skills to generate a storefront reliably?
- Which patterns should be promoted into documentation or agent skills?

As the Hydrogen Developer Preview evolves, expect a lot of change and refinement to these examples, as we try and make each framework feel at home with Hydrogen. If you have ideas or feedback on how we can improve any of the integrations, let us know in the [discussions](https://github.com/Shopify/hydrogen/discussions)!

## Running them

From the repo root:

- `pnpm dev` — every example's dev server in parallel (ports auto-allocated, logs interleaved in the terminal).
- `pnpm dev:hub` — same, plus a browser UI (auto-opened) with status dots, scaled iframe thumbnails (click to pop out), and collapsible per-server log streams. Implemented in [`scripts/examples-dev.ts`](../scripts/examples-dev.ts).
- `pnpm --filter @shopify/hydrogen-example-<name> dev` — a single example.

## What examples are

- Small end-to-end experiments around Hydrogen primitives and APIs.
- Disposable validation targets while the API is still changing.
- Places to expose edge cases, integration friction, and missing documentation.
- Reference material for us as we design the SDK, docs, and skills.

## What examples are not

- They are not the canonical path for users or agents creating new storefronts.
- They are not starter kits.
- They are not templates we intend to maintain, version, and distribute.
- They are not a promise of the recommended app structure.

The expected creation path for real storefronts is: agent skills + docs generate a storefront tailored to the merchant, framework, and requirements.
