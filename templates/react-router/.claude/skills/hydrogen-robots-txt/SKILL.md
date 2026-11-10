---
name: hydrogen-robots-txt
description: >
  Guide for serving robots.txt from a Hydrogen storefront. Use when adding,
  modifying, or reviewing robots.txt, crawler allow/disallow rules, the Sitemap
  directive, or crawl policy for cart, account, checkout, search, collection
  sort/filter, and Hydrogen endpoint URLs.
metadata:
  source: "@shopify/hydrogen"
  version: "2026.10.3"
  hash: "sha256:5463a19add44158852ab4c23505760baf8e70c23ee1ffbb0f8e6411a41047740"
---

# Hydrogen robots.txt

A headless storefront serves its own `robots.txt`. Hydrogen ships no helper for it. Without one, `/robots.txt` falls through to the framework's 404 page, and crawlers treat a missing robots.txt as permission to crawl everything: carts, account pages, checkout handoffs, and every sort and filter combination of every collection.

robots.txt is not access control. Well-behaved crawlers honor it; nothing else has to. Account pages, API endpoints, and cart data must stay protected by authentication and server-side checks.

## Default Rules

Start from this file and adjust it to the app's routes (see "Adjust To The App").

```
User-agent: *
Disallow: /admin
Disallow: /cart
Disallow: /account
Disallow: /checkout
Disallow: /buy/
Disallow: /api/
Disallow: /__shopify
Disallow: /search
Disallow: /collections/*sort_by*
Disallow: /collections/*filter*&*filter*

# Google AdsBot ignores the "*" group and follows only groups that name it.
User-agent: adsbot-google
Disallow: /cart
Disallow: /account
Disallow: /checkout
Disallow: /search
```

| Rule | Why |
| --- | --- |
| `/admin` | `handleShopifyRedirects` redirects it to the Shopify admin. |
| `/cart` | Buyer-specific. The prefix also covers cart permalinks (`/cart/{variantId}:{quantity}`) and AJAX cart URLs (`/cart.js`, `/cart/add.js`). |
| `/account` | Customer account pages and the login, logout, and OAuth handlers. |
| `/checkout`, `/buy/` | Checkout redirect and UCP buy permalinks. They redirect into Shopify checkout and aren't content. |
| `/api/` | Storefront API proxy, registered handlers such as `/api/cart`, and the agent endpoints `/api/mcp` and `/api/ucp/mcp`. Agents discover those through `/.well-known/ucp`, which stays reachable. |
| `/__shopify` | The generic Shopify API proxy. |
| `/search` | Search result pages are thin, unbounded duplicates of catalog pages. |
| `/collections/*sort_by*` | Every sort order duplicates the collection. |
| `/collections/*filter*&*filter*` | Blocks URLs with two or more `filter.*` params, which includes a price range with both a minimum and a maximum. Single-filter pages stay crawlable so they can work as landing pages. Use canonical tags, not robots.txt, to control duplicates among them. |

AdsBot gets its own short list because it ignores the `*` group and needs to reach ad landing pages, which can be sorted or filtered collection URLs.

## Adjust To The App

- **Keep reachable:** `/.well-known/` (the UCP business profile and Apple Pay domain verification), and every product, collection, page, blog, and article route.
- **Path-prefixed markets:** when routes carry a locale prefix such as `/en-ca/`, repeat the page rules for each prefix the app serves (`Disallow: /en-ca/cart`, `Disallow: /en-ca/account`, `Disallow: /en-ca/search`). AJAX cart URLs accept a locale prefix too. Don't write `/*/cart` or `/*/search`: `*` matches across slashes, so `/*/cart` also blocks `/products/cart-organizer`. The collection rules can use `/*/collections/*sort_by*` and `/*/collections/*filter*&*filter*`, because the query parameter in the pattern keeps them from matching product pages.
- **Custom route templates:** when `routeTemplates` moves a Shopify route, such as collections at `/c/:handle`, rewrite the matching rules to the app's pathnames. Add a rule only for a path the app actually serves.
- **Other listings:** if the app serves blog tag URLs that combine tags with `+` (`/blogs/news/tag1+tag2`), add `Disallow: /blogs/*+*`, `/blogs/*%2B*`, and `/blogs/*%2b*`.
- **Sitemap:** add `Sitemap: <origin>/sitemap.xml` only when the app serves a sitemap. The URL must be absolute, so build it from the request origin. A `Sitemap:` line that points at a 404 shows up as an error in search consoles.

## Serve It

Return `200` with `Content-Type: text/plain; charset=utf-8` and a public `Cache-Control`, such as `public, max-age=86400`. Make sure no catch-all route shadows it.

| Framework | Route |
| --- | --- |
| React Router | A resource route with only a `loader` that returns a `Response`, registered as `route("robots.txt", "routes/robots.ts")`, or `app/routes/[robots.txt].ts` with file-based routes. |
| Next.js App Router | `app/robots.ts` returning `MetadataRoute.Robots`, with one `rules` entry for `*` and one for `adsbot-google`. Next.js sends it with `public, max-age=0, must-revalidate`; for a longer cache, use a route handler at `app/robots.txt/route.ts` instead. |
| Nuxt | `server/routes/robots.txt.ts` with `defineEventHandler`, setting the content type. |
| SvelteKit | `src/routes/robots.txt/+server.ts` exporting `GET`. |
| Astro | `src/pages/robots.txt.ts` exporting `GET`. |
| SolidStart | `src/routes/robots.txt.ts` exporting `GET`. |

Middleware that runs on every request can still touch this response. When the Hydrogen request context applies response headers, it switches the response to private caching if the response carries `Set-Cookie` or the request used the customer session or Customer Account API. Don't read or write the session in the robots route. If the check below shows `Set-Cookie` or private caching, serve `/robots.txt` in the server entry, before the framework router and its middleware.

## Verify

```bash
curl -sD - http://localhost:<port>/robots.txt
```

- [ ] Status is `200` and `Content-Type` is `text/plain`, not the framework's HTML 404 page
- [ ] `Cache-Control` is public and no `Set-Cookie` header is present
- [ ] Every path rule matches a route or handler the app serves, and no rule blocks `/.well-known/`
- [ ] A `Sitemap:` line is present only when the sitemap URL returns 200
