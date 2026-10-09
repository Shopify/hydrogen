# Hydrogen

Hydrogen (`@shopify/hydrogen`) is Shopify's toolkit for building headless storefronts in the JavaScript framework you already use. It ships with agent skills that teach coding agents how to use it.

[Documentation](https://shopify.dev/docs/storefronts/headless) · [API reference](https://shopify.dev/docs/api/hydrogen/2026-10) · [Changelog](./packages/hydrogen/CHANGELOG.md)

> [!NOTE]
> This README covers Hydrogen 2026-10 or later. Hydrogen 2026-04 and earlier are on the [`2026-04` branch](https://github.com/Shopify/hydrogen/tree/2026-04), with docs in [Legacy Hydrogen](https://shopify.dev/docs/storefronts/headless/legacy). To migrate a storefront, follow [Migrate to the latest version of Hydrogen](https://shopify.dev/docs/storefronts/headless/migrate).

## What's included

- **Storefront API client**: typed `gql()` queries, caching, and typed errors. See [Data fetching](https://shopify.dev/docs/storefronts/headless/data-fetching).
- **Request handlers**: the routes a Shopify storefront needs, such as the Storefront API proxy, `/api/cart`, checkout and cart permalinks, URL redirects, and the MCP endpoints for agents. See [Request handlers](https://shopify.dev/docs/storefronts/headless/request-handlers).
- **Cart**: server handlers, HTML forms that work before JavaScript loads, and a store that shows line changes before the server responds. See [Cart](https://shopify.dev/docs/storefronts/headless/cart).
- **Products and collections**: variant selection, collection filters, sorting, and pagination. See [Products](https://shopify.dev/docs/storefronts/headless/products) and [Collections and search](https://shopify.dev/docs/storefronts/headless/collections-search).
- **Predictive search**: a search store with server handlers and form helpers. See [Collections and search](https://shopify.dev/docs/storefronts/headless/collections-search).
- **Money**: formats Shopify `MoneyV2` amounts for the buyer's locale and currency.
- **Markets**: country and language context for Shopify Markets. See [Markets](https://shopify.dev/docs/storefronts/headless/markets).
- **Analytics**: Shopify storefront analytics with consent handling. See [Analytics](https://shopify.dev/docs/storefronts/headless/analytics).
- **Shop Pay**: Shop Pay buttons. See [Shop Pay](https://shopify.dev/docs/storefronts/headless/shop-pay).
- **Customer accounts**: the Customer Account API client, login and logout handlers, and sessions. See [Customer accounts](https://shopify.dev/docs/storefronts/headless/customer-accounts).

## Get started

You need a Shopify store with Storefront API access from the [Headless channel](https://shopify.dev/docs/storefronts/headless/building-with-the-storefront-api/manage-headless-channels). Until you connect one, the template and the setup skill fall back to [mock.shop](https://mock.shop), a public Storefront API with demo data.

### Deploy a template

**React Router on Oxygen.** Shopify's starter template, [`templates/react-router`](./templates/react-router), deployed to [Oxygen](https://shopify.dev/docs/storefronts/headless/deploy/oxygen) from your Shopify admin.

<a href="https://admin.shopify.com/hydrogen/new?template=react-router"><img alt="Deploy to Oxygen" src=".github/images/deploy-to-oxygen.svg" width="182" height="46"></a>

**Next.js on Vercel.** [Vercel Shop](https://github.com/vercel/shop) is a Next.js storefront built on Hydrogen and maintained by Vercel.

<a href="https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fvercel%2Fshop&project-name=shop&repository-name=shop&demo-title=Vercel+Shop&demo-url=https%3A%2F%2Ftemplate.vercel.shop&stores=%5B%7B%22type%22%3A%22integration%22%2C%22integrationSlug%22%3A%22shopify%22%2C%22productSlug%22%3A%22shopify%22%2C%22protocol%22%3A%22other%22%7D%5D"><img alt="Deploy with Vercel" src="https://vercel.com/button" width="129" height="40"></a>

For a walkthrough of both templates, see [Deploy a template](https://shopify.dev/docs/storefronts/headless/getting-started/deploy-a-template).

### Add Hydrogen to your project

From your project's root directory, run:

```bash
npx @shopify/hydrogen@latest setup
```

`setup` installs `@shopify/hydrogen` with your project's package manager, and copies Hydrogen's agent skills into `.claude/skills` (read by Claude Code) and `.agents/skills` (read by Codex, Cursor, and OpenCode), matched to the installed version. In an empty directory, it offers to create a project from the React Router template.

Then ask your coding agent to build the storefront:

```text
Set up my store with Shopify.
```

The agent follows the `hydrogen-setup` skill. It adds a Storefront API client and request handlers, then builds a home page, collection and search pages, a product page, a cart page and cart drawer, an account page, and consent-gated analytics. It runs your typecheck after each step and smoke-tests the storefront at the end.

To wire Hydrogen in by hand instead, follow [Add Hydrogen to an existing project](https://shopify.dev/docs/storefronts/headless/getting-started/add-to-existing-project).

### After you upgrade Hydrogen

Skills describe the API of the installed version, so sync them after each upgrade:

```bash
npx @shopify/hydrogen skills sync
```

`npx @shopify/hydrogen skills check` exits non-zero when the skills are out of date, so you can run it in CI. See [Keeping skills in sync](./packages/hydrogen/README.md#keeping-skills-in-sync).

## How it works

Hydrogen has a framework-independent core, plus bindings for React and Vue:

| Entry point | Contains |
| --- | --- |
| `@shopify/hydrogen` | The core. It includes the Storefront API client, `gql`, request handlers, route templates, money formatting, analytics, Shop Pay, caching, and the stores for the cart, product form, collections, and predictive search. |
| `@shopify/hydrogen/react` | React components and hooks built on the core, such as `createCartComponents()`, `createProductComponents()`, `ShopifyScripts`, and `ShopPayButton`. |
| `@shopify/hydrogen/vue` | The same components for Vue, with composables in place of hooks. |

The package has three more entry points:

- `@shopify/hydrogen/customer-account`: the Customer Account API client and customer session helpers.
- `@shopify/hydrogen/vite`: a Vite plugin for trusted local HTTPS during development.
- `@shopify/hydrogen/ts-plugin`: a TypeScript plugin that flags unknown fields in `gql()` queries in your editor.

On the server, the request handlers run before your framework's router. `handleShopifyRoutes()` answers the routes that Hydrogen owns and passes every other request to your router. When your router returns a 404, `handleShopifyRedirects()` checks the store's URL redirects.

In the browser, state that changes while a customer is on the page lives in observable stores: the cart, the product form's selected variant, collection filters, and predictive search results. Each store has `getState()` and `subscribe(listener)`, and the listener receives the full state on every change. The React and Vue bindings wrap the stores in hooks and composables. The cart, collection, and predictive search hooks take a selector, so a component updates only when the selected value changes:

```tsx
import { createCartComponents } from "@shopify/hydrogen/react";
import type { cartHandlers } from "./cart-handlers"; // your cart server handlers

export const { CartProvider, useCart } = createCartComponents<typeof cartHandlers>();

function CartCount() {
  const totalQuantity = useCart((cart) => cart.data.totalQuantity);
  return <span>{totalQuantity}</span>;
}
```

Hydrogen emits and handles Shopify's [standard storefront events and actions](https://shopify.dev/docs/api/storefront-events-and-actions), the same ones that Liquid themes use. Apps can integrate with a Hydrogen storefront the same way they integrate with a theme, and the cart store applies `shopify:cart:*` events from any source, including apps and agents that call Standard Actions. Cart changes need Shopify's runtime scripts on the page: render `ShopifyScripts` in React or Vue, or use `renderShopifyScriptTags()` in other frameworks.

## Query the Storefront API

Create a Storefront API client for each request, in server code. `getBuyerIp()` is yours to implement: return the buyer's IP address from a header that your host sets.

```ts
import {
  createShopifyRequestContext,
  createStorefrontClient,
  gql,
} from "@shopify/hydrogen";

const storeDomain = process.env.PUBLIC_STORE_DOMAIN;
const privateStorefrontToken = process.env.PRIVATE_STOREFRONT_API_TOKEN;
if (!storeDomain || !privateStorefrontToken) {
  throw new Error("Set PUBLIC_STORE_DOMAIN and PRIVATE_STOREFRONT_API_TOKEN.");
}

const storefront = createStorefrontClient({
  type: "private",
  requestContext: createShopifyRequestContext({
    request,
    i18n: { country: "US", language: "EN" },
    buyerIp: getBuyerIp(request.headers),
  }),
  config: { storeDomain, privateStorefrontToken },
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

`data` is typed from the Storefront API schema that ships with Hydrogen. To check queries in your editor and in CI, see [GraphQL tooling](./packages/hydrogen/README.md#graphql-tooling).

## Frameworks and runtimes

Hydrogen works in any JavaScript framework that renders on the server. Frameworks without a packaged binding use the core directly.

| Framework | Uses | Starter or example |
| --- | --- | --- |
| React Router | `@shopify/hydrogen/react` | [`templates/react-router`](./templates/react-router) (starter) |
| Next.js | `@shopify/hydrogen/react` | [Vercel Shop](https://github.com/vercel/shop) (starter), [`examples/nextjs`](./examples/nextjs) |
| Nuxt | `@shopify/hydrogen/vue` | [`examples/nuxt`](./examples/nuxt) |
| Astro | `@shopify/hydrogen` | [`examples/astro`](./examples/astro) |
| SvelteKit | `@shopify/hydrogen` | [`examples/sveltekit`](./examples/sveltekit) |
| SolidStart | `@shopify/hydrogen` | [`examples/solid-start`](./examples/solid-start) |

The projects in [`examples/`](./examples) test Hydrogen across frameworks. They aren't starters and aren't versioned for reuse.

The core depends on web platform APIs (`fetch`, `Request`, `Response`, and Web Crypto) rather than on a specific runtime. It targets Oxygen, Node.js, Cloudflare Workers, Deno, and other runtimes that provide those APIs, including Vercel's. The template and examples in this repository run on Oxygen and Node.js. See [About deploying Hydrogen storefronts](https://shopify.dev/docs/storefronts/headless/deploy), and before you go live, work through the [production checklist](https://shopify.dev/docs/storefronts/headless/production-checklist).

## Agent skills

`setup` and `skills sync` copy these skills into your project. Each skill covers one part of a storefront:

- **Setup and verification**: `hydrogen-setup`, `hydrogen-smoke-test`
- **Data and requests**: `hydrogen-storefront-client`, `hydrogen-request-handlers`, `hydrogen-routing`, `hydrogen-markets`
- **Cart**: `hydrogen-cart-ui`, `hydrogen-cart-drawer`, `hydrogen-cart-metafields`
- **Products, collections, and search**: `hydrogen-variant-form`, `hydrogen-collection-browser`, `hydrogen-predictive-search`, `hydrogen-image`, `hydrogen-money`
- **Checkout, accounts, and analytics**: `hydrogen-shop-pay`, `hydrogen-customer-account`, `hydrogen-analytics`
- **Hosting and local development**: `hydrogen-oxygen`, `hydrogen-local-https`

Read them in [`packages/hydrogen/skills`](./packages/hydrogen/skills).

## Versioning

Hydrogen `2026.10.x` uses version `2026-10` of the Storefront API and the Customer Account API. Hydrogen 2026-04 and earlier are also published as `@shopify/hydrogen`, so a caret range such as `^2026.4.0` can resolve to 2026-10. To stay on a version, use a tilde range, such as `~2026.4.0`.

## Packages

| Package | Description |
| --- | --- |
| [`@shopify/hydrogen`](./packages/hydrogen) | The Hydrogen toolkit and its agent skills. |
| [`@shopify/mini-oxygen`](./packages/mini-oxygen) | A local Oxygen runtime and Vite plugin, for developing and previewing storefronts that deploy to Oxygen. |

## Help

Report bugs in [Issues](https://github.com/Shopify/hydrogen/issues/new/choose), and report security vulnerabilities through [Shopify's bug bounty program](https://hackerone.com/shopify).

## License

[MIT](./LICENSE.md)
