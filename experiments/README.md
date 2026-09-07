# Experiments

These projects are development experiments for exercising Hydrogen across frameworks. They are useful for validating APIs, framework integrations, docs, and skills, but they are not starter kits or supported templates. Canonical starter sources live in [`templates/`](../templates/).

## Experiments

- `astro/` — Astro 6 with `@astrojs/node` SSR and frontmatter data fetching.
- `nuxt/` — Nuxt 3 using Hydrogen's Vue binding layer.
- `solid-start/` — SolidStart v1 with `query`, `createAsync`, and signal-driven product state.
- `sveltekit/` — SvelteKit 2 and Svelte 5 with server `load`.
- `tanstack-start/` — TanStack Start (React 19) with a global request middleware, server functions as the data path, and server routes.
- `hydrogen/` — mirror of the Hydrogen Skeleton template, kept for parity with Hydrogen classic and its E2E suite.

Shared infrastructure:

- `core/` — frozen, framework-agnostic storefront design source with reference HTML and Tailwind tokens.
- `shared/` — configuration and request helpers shared by the framework experiments.

The framework projects are built from the `core/` design source. They exist to answer practical questions:

- Does this API feel good in a real storefront slice?
- Where does a framework integration get awkward?
- What do agents need from the SDK, docs, and skills to generate a storefront reliably?
- Which patterns should move into documentation or agent skills?

## Running experiments

From the repository root:

- `pnpm dev` — run all workspace experiments and templates in parallel.
- `pnpm dev:hub` — run the experiments with automatically allocated ports and open the browser hub with status, previews, and logs.
- `pnpm --filter @shopify/hydrogen-experiment-<name> dev` — run one project.
- `pnpm --filter @shopify/hydrogen-experiment-<name> dev:https` — run an account-enabled project on `https://local.tryhydrogen.dev:5173` when it provides a `dev:https` script. The Hydrogen project uses `--customer-account-push` instead of local certificates.

The local HTTPS plugin provisions certificates automatically the first time a `dev:https` script starts. It downloads a pinned, checksum-verified [mkcert](https://github.com/FiloSottile/mkcert) release, installs the local certificate authority (this may prompt for your password), and creates trusted `local.tryhydrogen.dev` certificates under `~/.shopify/hydrogen/certs/` so Customer Account OAuth can redirect to `https://local.tryhydrogen.dev:5173/account/authorize`.

Per-project HTTPS quirks:

- Nuxt and SolidStart may need the command restarted once after first-run provisioning so their outer dev servers can load the certificate files.
- TanStack Start runs on Vite's own dev server and needs no restart.
- The Next.js template provisions its own development certificate and does not use the Hydrogen certificates.

## What experiments are

- Small end-to-end experiments around Hydrogen primitives and APIs.
- Disposable validation targets while APIs and framework integrations are changing.
- Places to expose edge cases, integration friction, and missing documentation.
- Reference material for designing the SDK, docs, and skills.

## What experiments are not

- Canonical app structures.
- Starter kits that we intend to version and distribute.
- A promise that every framework integration shown here is production-ready.

The React Router and Next.js starter sources live under [`templates/`](../templates/) and are prepared for standalone distribution through the Hydrogen release flow.

## Guidelines for adding experiments

- Optimize for learning, not polish.
- Keep each project focused on one API or integration question.
- Prefer small, complete slices over broad demo apps.
- Make assumptions explicit in the project or its README.
- Promote durable patterns into docs or skills instead of treating the project as the product.
- Delete or rewrite projects that stop teaching us something.
