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
- `/search` — product search with the same filtering
- `/cart` — cart with Shop Pay (also the no-JS fallback for the cart drawer)
- `/account` — Customer Account sign-in, log out, and order history

## What it demonstrates

- Server `loader`s as the data path; each route owns its GraphQL query (typed via
  `gql.tada`).
- A real cart: storefront client + request handlers + `/api/cart` + an accessible
  cart drawer wired to Shopify Standard Actions.
- A shared layout (header with mobile nav, footer, optional announcement bar).
- Analytics + a consent banner.
- Customer Accounts: Hydrogen's `/account/login`, `/account/authorize`,
  `/account/refresh`, and `/account/logout` handlers, backed by a signed cookie
  session (`app/lib/session.ts`). Needs a real store, `SHOP_ID`,
  `PUBLIC_CUSTOMER_ACCOUNT_API_CLIENT_ID`, `SESSION_SECRET`, and HTTPS.
- The design tokens in `app/tokens.css` and SVG icons in `public/icons/`.

## Run it

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

**Account widget** — the header renders Shopify's
[`<shopify-account>`](https://shopify.dev/docs/api/storefront-web-components/components/shopify-account)
component only when all of these hold:

- real-store mode (`PUBLIC_STORE_DOMAIN` + `PRIVATE_STOREFRONT_API_TOKEN`);
- Customer Accounts are configured (`SHOP_ID`,
  `PUBLIC_CUSTOMER_ACCOUNT_API_CLIENT_ID`, `SESSION_SECRET`) and the request is
  HTTPS (`npm run dev:https` locally);
- a **public** Storefront API token is set:

```bash
# .env
PUBLIC_STOREFRONT_API_TOKEN=   # public token; it is serialised into the HTML
```

In the Shopify admin, open the Hydrogen app, select your storefront and go to
**Storefront settings > Storefront API**. The component needs the
`unauthenticated_read_customers`, `unauthenticated_read_content` and
`unauthenticated_read_product_listings` permissions. Never use
`PRIVATE_STOREFRONT_API_TOKEN` here. If any requirement is missing — including
plain HTTP or `mock.shop` mode — the header shows a link to `/account` instead
and the account script is not loaded.

To verify the widget locally:

1. Set the real-store, Customer Account, and `PUBLIC_STOREFRONT_API_TOKEN` values
   in `.env`.
2. Run `npm run dev:https` and open <https://local.tryhydrogen.dev:5173>.
3. View the page source: the header contains a `<shopify-account>` element and
   the head contains `<script id="shopify-account">`.
4. Stop the server, run `npm run dev`, and open the plain-HTTP URL it prints.
   The page source has neither; the header links to `/account`.

**Warning:** if both tokens are set but `PUBLIC_STORE_DOMAIN` is not, the widget
targets the default `hydrogen-preview.myshopify.com` with your public token. Set
`PUBLIC_STORE_DOMAIN` to your store's domain.

Opening and interacting with the account sheet requires JavaScript.

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
