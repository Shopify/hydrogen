# Examples

## Examples in this repo

- `core/` — frozen, framework-agnostic storefront design source (five-page reference HTML + Tailwind tokens, no app JS). Framework examples are hand-built from this baseline.
- `shared/` — common example configuration and request helpers
- `react-router/` — React Router v7 port with server loaders
- `nextjs/` — Next.js 16 (App Router) port with server components
- `hydrogen/` — Hydrogen port with React Router server loaders and Oxygen-style request context
- `sveltekit/` — SvelteKit 2 + Svelte 5 (runes) port with server `load`
- `astro/` — Astro 6 port with `@astrojs/node` SSR and frontmatter data fetching
- `solid-start/` — SolidStart v1 port with `query` + `createAsync` and signal-driven product page state
- `nuxt/` — Nuxt 4 port with server middleware and Vue pages
- `nuxt-binding/` — Nuxt 4 port using Hydrogen's Vue binding layer

These examples are internal proof-of-concepts and testbeds for Hydrogen APIs as they evolve.

They exist to help us answer questions like:

- Does this API feel good in a real storefront slice?
- Where does the framework integration get awkward?
- What do agents need from the SDK, docs, and skills to generate a storefront reliably?
- Which patterns should be promoted into documentation or agent skills?

## Running them

From the repo root:

- `pnpm dev` — every example's dev server in parallel (ports auto-allocated, logs interleaved in the terminal).
- `pnpm dev:hub` — same, plus a browser UI (auto-opened) with status dots, scaled iframe thumbnails (click to pop out), and collapsible per-server log streams. Implemented in [`scripts/examples-dev.ts`](../scripts/examples-dev.ts).
- `pnpm --filter @shopify/hydrogen-example-<name> dev` — a single example.
- `pnpm https:setup` then `pnpm --filter @shopify/hydrogen-example-<name> https:dev` — run an account-enabled framework example on `https://localtest.me:5173` when that example provides an `https:dev` script. The Hydrogen example uses `--customer-account-push` instead of local certs.

`pnpm https:setup` requires `mkcert` to be installed locally and trusted by your OS/browser.

On macOS, install it with Homebrew:

```sh
brew install mkcert
```

Then run the repo setup command from the repository root:

```sh
pnpm https:setup
```

This installs the local certificate authority and creates trusted certificates for `localtest.me`
under `.cert/`. The account-enabled examples use those certificates so Customer Account OAuth
can redirect back to `https://localtest.me:5173/account/authorize`.

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

## Guidelines for adding examples

- Optimize for learning, not polish.
- Keep each example focused on one API question or integration scenario.
- Prefer small, complete slices over broad demo apps.
- Make assumptions explicit in the example or its README.
- If an example reveals a durable pattern, promote that pattern into docs or skills instead of treating the example as the product.
- If an example stops teaching us something, delete or rewrite it.
