<div align="center">

# Hydrogen

**The Shopify headless toolkit — now framework‑agnostic, runtime‑agnostic, and built for agents.**

</div>

---

Hydrogen has been rewritten from the ground up.

Simpler than ever. Optimized for agents. And now **framework‑agnostic** and **runtime‑agnostic** — meaning you can bring it to any framework, on any platform.

We redesigned Hydrogen in partnership with the Next.js team at Vercel.

> **🧪 Developer Preview** — Hydrogen is in active development. APIs may change, and some features are still landing. Build with it, tell us what breaks, and help shape the release: [open a discussion](https://github.com/Shopify/hydrogen/discussions).

## What changed

The old Hydrogen was a full-stack framework designed to go hand-in-hand with React Router 7. We designed it to bring flexibility and control to developers, without forcing them to re-think the fundamentals. But headless commerce has always been about choice — and with the rise of agents, it's now easier than ever to build a headless store on Shopify.

But there are a few things that agents still get wrong, where re-inventing the wheel is just a waste of tokens and a risk of hurting your conversion rate.

So we redesigned Hydrogen from the ground up, in partnership with Vercel, to be a lightweight, framework-agnostic commerce toolkit that can deploy to any JS runtime.

- **Framework‑agnostic** — The core is plain JavaScript. Use it with Next.js, React Router, SvelteKit, Astro, SolidStart, Nuxt, or anything that runs server code. React bindings ship today; Vue, Svelte, and Remix 3 bindings are coming soon.
- **Runtime‑agnostic** — Anywhere you can call `fetch`, Hydrogen runs. Oxygen, Vercel, Cloudflare Workers, Node, Deno — your choice.
- **Agent‑native** — Hydrogen ships with a suite of **agent skills**, versioned to the package you install. They teach your coding agent how to wire Shopify into the stack you already have.

You bring the framework. Hydrogen brings the commerce.

## How it works

Hydrogen no longer dictates your app's structure. Instead:

1. **Scaffold a project** with your framework's own CLI.
2. **Add Hydrogen.** The setup command installs the SDK and copies its agent skills into your project.
3. **Ask your agent** to build the storefront. The skills guide it through the Storefront API client, request handlers, cart, product and collection pages, analytics, and Shop Pay — all idiomatic to your framework.

## Get started

### 1. Scaffold a new project

Use the CLI for whichever framework you want to build on. In this example, we'll use Next.js:

```bash
npx create-next-app@latest
```

### 2. Add Hydrogen

From your project directory:

```bash
npx @shopify/hydrogen@preview setup
```

This installs `@shopify/hydrogen` with your project's package manager and copies Hydrogen's agent skills into your project's skills directory — matched to the version you just installed.

### 3. Ask your agent to set up your store

Open your favorite coding agent and ask:

```text
You ›  Can you set up my store with Shopify?
```

Your agent picks up the installed skills and wires the storefront into your app:

```text
Hydrogen skills detected — setting up your storefront.

  ✓ Detected Next.js (App Router)
  ✓ Storefront API client            app/lib/storefront.ts
  ✓ Request handlers (cart, SFAPI)   proxy.ts
  ✓ Home, collection & product pages app/…
  ✓ Cart drawer + line‑item forms    app/components/…
  ✓ First‑party analytics + consent  app/lib/analytics.ts

Set PUBLIC_STORE_DOMAIN and PRIVATE_STOREFRONT_API_TOKEN, then run your dev server.
```

That's it. Below is the kind of code the skills produce.

## What the code looks like

**A typed Storefront API client** — works anywhere you can `fetch`:

```ts
import {
  createStorefrontClient,
  createStorefrontRequestContext,
  gql,
} from "@shopify/hydrogen";

const storefront = createStorefrontClient({
  type: "private",
  config: {
    storeDomain: process.env.PUBLIC_STORE_DOMAIN,
    privateStorefrontToken: process.env.PRIVATE_STOREFRONT_API_TOKEN,
    requestContext: createStorefrontRequestContext(request),
  },
});

const { data } = await storefront.graphql(
  gql(`
    query Home {
      products(first: 3) {
        nodes { handle title }
      }
    }
  `),
);
```

Queries written with `gql()` are fully typed against the Storefront API schema — `data` is inferred, no codegen step to babysit.

**A cart that's reactive in React**:

```tsx
import { createCartComponents } from "@shopify/hydrogen/react";
import type { cartHandlers } from "./cart-handlers";

export const { CartProvider, useCart, useCartForm } =
  createCartComponents<typeof cartHandlers>();

// Re-renders only when totalQuantity changes.
function CartCount() {
  const totalQuantity = useCart((cart) => cart.data.totalQuantity);
  return <span>{totalQuantity}</span>;
}
```

**…or reactive without a framework at all**:

```js
import { createCartStore } from "@shopify/hydrogen";

const cart = createCartStore({ initialData });
cart.connect(); // listen for cart mutations from your UI, apps, and agents

cart.subscribe((state) => {
  document.querySelector("#cart-count").textContent = String(
    state.data.totalQuantity,
  );
});
```

## What's included

- **Typed Storefront API client** — `gql()` queries inferred straight from the schema
- **Cart** — server handlers, optimistic line‑item forms, and a reactive store
- **Product & collection primitives** — variant selection, options, filtering, pagination
- **Money formatting** — locale‑ and currency‑correct, never computed on the client
- **First‑party analytics** — Shopify storefront events with consent handling built in
- **Shop Pay** — accelerated checkout buttons
- **Request handlers** — proxy the Storefront API, cart, redirects, and standard storefront events & actions

> **Coming soon:** customer accounts, predictive search, and packaged bindings for Vue, Svelte, and Remix 3.

## Agent skills

Setup copies these skills into your project so your coding agent always works from instructions that match your installed version. Each skill is a focused, framework‑aware guide:

| Skill | What it covers |
| --- | --- |
| `hydrogen-setup` | End‑to‑end storefront setup orchestrator |
| `hydrogen-storefront-client` | Typed Storefront API client & `gql()` queries |
| `hydrogen-request-handlers` | Wiring `handleShopifyRoutes` / `handleShopifyRedirects` |
| `hydrogen-cart-ui` | Cart route & progressive line‑item forms |
| `hydrogen-cart-drawer` | Accessible cart drawer + Standard Actions |
| `hydrogen-collection-browser` | Collection & search browsing, filters, sort |
| `hydrogen-variant-form` | Product detail page & variant selection |
| `hydrogen-money` | Currency‑correct money formatting |
| `hydrogen-shop-pay` | Shop Pay buttons |
| `hydrogen-markets` | Localization with Shopify Markets |
| `hydrogen-analytics` | Storefront analytics & consent |
| `hydrogen-smoke-test` | Runtime verification of the wired storefront |

Browse them in [`packages/hydrogen/skills`](./packages/hydrogen/skills).

## Examples

The [`examples/`](./examples) directory contains end‑to‑end ports of the same storefront across frameworks:

| Example | Stack |
| --- | --- |
| `nextjs/` | Next.js 16 (App Router) |
| `react-router/` | React Router v7, server loaders |
| `sveltekit/` | SvelteKit 2 + Svelte 5 (runes) |
| `astro/` | Astro 6 SSR |
| `solid-start/` | SolidStart v1 |
| `nuxt/` | Nuxt 4 |
| `hydrogen/` | Hydrogen + Oxygen‑style request context |

> **These are proof‑of‑concepts, not starter kits.** They exist to validate the API across frameworks and surface integration friction — they aren't templates we version or distribute. The canonical path to a real storefront is **agent skills + docs**, generating code tailored to your store, framework, and requirements.

Run them all from the repo root:

```bash
pnpm install
pnpm dev        # every example in parallel
pnpm dev:hub    # …plus a browser dashboard with live thumbnails
```

## Repository layout

```
packages/hydrogen/   the @shopify/hydrogen SDK + packaged skills
examples/            framework ports (proof-of-concepts)
patches/             pnpm patches for the workspace
```

## Feedback

This is a developer preview, and your feedback shapes it directly. Found a rough edge, an awkward API, or a missing skill? Let us know in [Discussions](https://github.com/Shopify/hydrogen/discussions).

## License

[MIT](./LICENSE.md)
