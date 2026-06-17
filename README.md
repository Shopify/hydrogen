<div align="center">

# Hydrogen

**Shopify's headless toolkit — framework‑agnostic, runtime‑agnostic, built for agents.**

Bring your own framework. Deploy to any runtime. Let your coding agent wire it up to Shopify.

</div>

---

> **🧪 Developer Preview** — Hydrogen is being rebuilt in the open. APIs will change and some pieces are still landing. Build with it, tell us what breaks, and help shape the release in [Discussions](https://github.com/Shopify/hydrogen/discussions).

The old Hydrogen was a framework you adopted whole. The new Hydrogen is a **toolkit** you bring to the framework you already use — a plain‑JavaScript core of Shopify storefront primitives, with thin bindings for React (and more on the way). We redesigned it in partnership with the Next.js team at Vercel.

You bring the framework. Hydrogen brings the commerce.

```js
import { createCartStore } from "@shopify/hydrogen";

const cart = createCartStore({ initialData });
cart.connect(); // stay in sync with cart updates from your UI, installed apps, and agents

// React to a change — no framework, no re-render gymnastics.
cart.subscribe((state) => {
  document.querySelector("#cart-count").textContent = String(state.data.totalQuantity);
});
```

## Why Hydrogen changed

Headless has always been about freedom — build your storefront your way. But the original Hydrogen asked you to adopt one framework (React Router) on one runtime (Oxygen). It was opinionated by design, built in an era before coding agents, and the most common question we heard was the one we couldn't answer well: *how do I use this with Next.js? With Nuxt? With the stack I already have?*

So we went back to the start. We pulled the commerce logic out of the framework and rewrote it as plain JavaScript — no framework, no runtime lock‑in. Everything that made Hydrogen good is still here; it just no longer dictates how you build.

What changed in the meantime: agents. You're not going to hand‑write a cart drawer or a variant selector — your coding agent is. So Hydrogen ships the skills that teach it how, behind an API small enough to fit in a prompt.

## How it's built

A plain‑JavaScript core holds all the logic — the Storefront API client, the cart, collections, search, and localization. Framework bindings are a thin layer on top that re‑expose the same core; the React package mostly maps hooks onto it. New framework or new runtime, the core doesn't move — only the thin binding around it does.

The parts of a storefront that change at runtime — cart contents, applied filters, the active market, search results — live in **observables**: a small, signals‑style reactive model. You subscribe with a selector, and your code runs only when that slice changes. In React that's a hook; anywhere else it's `.subscribe()`. No `useMemo` everywhere, no wasted re‑renders.

## Get started

Hydrogen adds to an existing project, so start with your framework's own CLI — here, Next.js:

```bash
npx create-next-app@latest
```

Then add Hydrogen from your project directory:

```bash
npx @shopify/hydrogen@preview setup
```

`setup` installs `@shopify/hydrogen` with your project's package manager and copies Hydrogen's agent skills into your project's skills directory — matched to the version you just installed.

Now ask your coding agent to build the storefront:

```text
You ›  Can you set up my store with Shopify?
```

It picks up the installed skills and wires commerce into your app:

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

You'll need Storefront API access for the store you're connecting — create one and manage credentials through the [Headless channel](https://shopify.dev/docs/storefronts/headless/building-with-the-storefront-api/manage-headless-channels).

## What the code looks like

Below is the kind of code the skills produce.

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

Queries written with `gql()` are type‑checked against the Storefront API schema — `data` is inferred, with no codegen step to babysit.

**The same cart, in React** — read one slice, re‑render only when it changes:

```tsx
import { createCartComponents } from "@shopify/hydrogen/react";
import type { cartHandlers } from "./cart-handlers";

export const { CartProvider, useCart, useCartForm } =
  createCartComponents<typeof cartHandlers>();

function CartCount() {
  const totalQuantity = useCart((cart) => cart.data.totalQuantity);
  return <span>{totalQuantity}</span>;
}
```

Cart amounts are always returned by Shopify — never compute currency on the client. When a value is updating, show pending UI rather than a stale number, and never block optimistic interactions like incrementing a line item.

## Standard events & actions

Hydrogen emits Shopify's [standard storefront events and actions](https://shopify.dev/docs/storefronts/themes/best-practices/standard-events-and-actions) — the same contract Liquid storefronts use. Because they're identical across both, apps can integrate with your headless store the same way they integrate with a theme, with no special‑casing, and agents can read state and update the cart through a known interface. Load the Standard Actions runtime once, and your cart drawer, installed apps, analytics, and agentic shopping flows all speak the same language.

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

You won't hand‑write most of this — your agent will. Setup copies these skills into your project so your coding agent always works from instructions that match your installed version. Each is a focused, framework‑aware guide:

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

## Frameworks & runtimes

React and vanilla JavaScript ship with packaged bindings today. Every other framework uses the same core primitives directly — and because the core only needs `fetch`, it deploys to any JavaScript runtime: Oxygen, Node, Vercel, Cloudflare Workers, or Deno.

The [`examples/`](./examples) directory ports the same storefront across frameworks, so you can see how the primitives fit:

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
packages/hydrogen/   the @shopify/hydrogen toolkit + packaged skills
examples/            framework ports (proof-of-concepts)
patches/             pnpm patches for the workspace
```

## Feedback

This is a developer preview, and your feedback shapes it directly. Found a rough edge, an awkward API, or a missing skill? Let us know in [Discussions](https://github.com/Shopify/hydrogen/discussions).

## License

[MIT](./LICENSE.md)
