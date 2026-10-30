# Hydrogen React Router template

[![Deploy to Oxygen](../../.github/images/deploy-to-oxygen.svg)](https://admin.shopify.com/hydrogen/new?template=react-router)

A React Router 7 (framework mode, SSR) storefront built on
[`@shopify/hydrogen`](https://www.npmjs.com/package/@shopify/hydrogen) and the
Oxygen runtime through Vite and Mini Oxygen. It's a starting point you can clone
and build your store on top of — five pages on a shared layout, with a real cart,
analytics, and a consent banner wired up.

## Pages

- `/` — home (editorial hero, new arrivals, shop by category)
- `/products/:handle` — product detail (gallery, variants, add to cart, Shop Pay)
- `/collections` — all collections
- `/collections/:handle` — collection with filters, sort, and pagination
- `/search` — product search with the same filtering (also the no-JS fallback for the
  predictive search drawer)
- `/cart` — cart with Shop Pay (also the no-JS fallback for the cart drawer)
- `/account` — Customer Account sign-in, log out, and order history

## What it demonstrates

- Server `loader`s as the data path; each route owns its GraphQL query (typed via
  `gql.tada`).
- A real cart: storefront client + request handlers + `/api/cart` + an accessible
  cart drawer wired to Shopify Standard Actions.
- A shared layout (header with mobile nav, footer, optional announcement bar).
- Predictive search: Hydrogen's `/api/predictive-search` handler + an accessible
  search drawer that suggests products as you type and falls back to the
  `/search` page without JavaScript.
- Analytics + a consent banner.
- Customer Accounts: Hydrogen's `/account/login`, `/account/authorize`,
  `/account/refresh`, and `/account/logout` handlers, backed by a signed cookie
  session (`app/lib/session.ts`). Needs a real store, `SHOP_ID`,
  `PUBLIC_CUSTOMER_ACCOUNT_API_CLIENT_ID`, `SESSION_SECRET`, and HTTPS.
- The design tokens in `app/tokens.css` and SVG icons in `public/icons/`.

## Run it

Requires Node.js 22 (22.12 or later) or Node.js 24.

```bash
npm install
```

**Zero-config demo** — runs against `mock.shop` (a public mock Storefront API, no
account or token needed):

```bash
cp .env.example .env
# uncomment MOCK_SHOP=1 in .env
npm run dev
```

`mock.shop` is a catalog of fictional stores, each on its own host. The default at
`mock.shop` sells apparel basics; the directory at
[mock.shop/llms.txt](https://mock.shop/llms.txt) lists every other store with what it
sells. To build against one of them, set `PUBLIC_STORE_DOMAIN` to its host (for
example `pets.mock.shop`) and leave the token empty.

**Against a real store** — link a Hydrogen storefront and pull its environment
variables into `.env`, then run normally:

```bash
npx shopify hydrogen link       # skip if the project is already linked
npx shopify hydrogen env pull   # writes the storefront's variables to .env
npm run dev                     # Vite/Mini Oxygen loads .env into the worker environment
```

Oxygen creates `PUBLIC_STORE_DOMAIN`, `PUBLIC_STOREFRONT_ID`, and
`PRIVATE_STOREFRONT_API_TOKEN` for a linked storefront, so you don't copy them by
hand. If `env pull` reports secret values it couldn't pull, set those in `.env`. To
use an existing **private** Storefront API token without linking, copy `.env.example`
to `.env` and set `PUBLIC_STORE_DOMAIN` and `PRIVATE_STOREFRONT_API_TOKEN`.
`PUBLIC_STOREFRONT_ID` is optional; providing it enables Shopify analytics for real
stores.

Customer Account OAuth requires trusted local HTTPS. Run:

```bash
npm run dev:https
```

Open <https://local.tryhydrogen.dev:5173>.

The local HTTPS plugin provisions and reuses a trusted certificate under `~/.shopify/hydrogen/certs/` (on first run, it may prompt to install the local certificate authority), links an unlinked Hydrogen storefront, and pushes the Customer Account callback, JavaScript origin, and logout URLs. See the `hydrogen-local-https` skill for CI and manual fallback behavior.

Mode is **auto-detected**: when a `PRIVATE_STOREFRONT_API_TOKEN` is present the
app talks to the real store (`PUBLIC_STORE_DOMAIN`, falling back to the default in
`app/lib/shop.ts`); with none it falls back to the `mock.shop` demo, so a fresh
deploy always renders. **On Oxygen, a linked storefront injects these env vars
automatically** — the deployed site connects to your store with no extra config
(and shows the `mock.shop` demo until it's linked). `MOCK_SHOP=1` forces mock, and so
does a `mock.shop` host in `PUBLIC_STORE_DOMAIN`.
(`mock.shop` and the Hydrogen Preview store are different data sources.)

## Announcement bar (optional)

Add entries to `ANNOUNCEMENTS` in `app/components/AnnouncementBar.tsx`. An empty
list hides the bar. Each entry's `content` is a React element, so it can include links:

```tsx
import { Link } from "react-router";

const ANNOUNCEMENTS: Announcement[] = [
  {
    content: (
      <p>
        Discover our <Link to="/collections" className="underline">latest collections</Link>.
      </p>
    ),
  },
];
```

You can connect metafields or a CMS later with your own data loading and rendering.
No specific metafield format is required.

## Storefront rate limits

When the Storefront API rate limits a page loader, this template returns HTTP `429`, not `500`.
The response keeps a valid `Retry-After` value and disables caching. It doesn't retry the
request or show the upstream error body.

The template makes three changes. Keep all three when you change the template, and make all three
when you copy this behavior to another app:

1. Each Storefront page loader uses the wrapper from `@shopify/hydrogen`. Without the wrapper, the
   loader still returns `500`.

   ```ts
   import { withStorefrontRateLimit } from "@shopify/hydrogen";

   export const loader = withStorefrontRateLimit(async ({ context }: Route.LoaderArgs) => {
     const { data } = await context.get(storefrontClientContext).graphql(QUERY);
     return data;
   });
   ```

2. React Router drops the headers of a thrown response. So the root middleware in `app/root.tsx`
   passes the response status as well:

   ```ts
   requestContext.applyResponseHeaders(response.headers, response.status);
   ```

3. The root middleware calls the method on the request context of the Storefront API client that
   the loaders use: `const requestContext = storefrontClient.requestContext`.

After a Storefront API rate limit, the method adds `Cache-Control: no-store` and the valid
`Retry-After` value to the `429` page response and to client-navigation `.data` responses. Routes
don't need a `headers` export. Without the status argument, or with a different request context,
the response stays `429` but loses `Retry-After` and `no-store`.

React Router doesn't report thrown responses to `handleError`. So the wrapper logs the original
error at `error` level through Hydrogen's logger. To send these entries to your error reporting,
pass your logger to `configureLogging`.

The `/api/cart` and `/api/predictive-search` routes from `handleShopifyRoutes` don't need the
wrapper. They return `429` with a valid `Retry-After` value on their own. A cart form that the
browser submits before hydration gets a plain-text `429` page with the message.

Other HTTP errors and network failures keep their existing error handling. GraphQL `THROTTLED`
results use the `errors` field of the result and aren't HTTP `429` errors. Only work that the
loader awaits can change its status. Give deferred promises a local fallback, such as
`<Await errorElement>`: a failure after streaming starts can't change a `200` response to `429`.

## Scripts

| Script | Does |
| --- | --- |
| `npm run dev` | Start the Vite dev server with Mini Oxygen. |
| `npm run dev:https` | Start the Vite dev server with trusted local HTTPS. |
| `npm run build` | Production React Router build for Oxygen. |
| `npm run preview` | Build and preview locally with Vite and Mini Oxygen. |
| `npm run deploy` | Deploy to Oxygen with the Shopify CLI. |
| `npm run typecheck` | React Router typegen + TypeScript + Hydrogen GraphQL checks. |

## Where to start

- Swap the store in `app/lib/shop.ts` + `.env`.
- Routes live in `app/routes/`; shared UI in `app/components/`; data/query helpers
  in `app/lib/`.
- The design is yours to change — `app/tokens.css` holds the design tokens; the
  components use them via semantic classes.

## License

MIT — see [LICENSE](./LICENSE).
