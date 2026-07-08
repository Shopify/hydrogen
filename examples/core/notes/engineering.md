# Engineering & architecture conventions

Framework-agnostic engineering & architecture conventions for generated examples.

This file is the shared source of truth for cross-page, cross-framework craft rules. Per-framework skills bind these rules to framework APIs in their own references; do not fork the principles in page notes.

## F1. Streaming & non-blocking shell

Static chrome, breadcrumbs, headings, editorial hero copy, and skeletons render immediately. Data-heavy regions stream behind a framework-native boundary with a useful fallback; never block an entire route, shared layout, or above-the-fold shell on the slowest Storefront query. Per-user cart data must not be fetched in a server root layout path that poisons the shared shell.

Framework binding: Next.js uses App Router `loading.tsx`, `<Suspense>`, async server children, and non-blocking layouts; React Router returns the shell data first and streams the slow data with `<Suspense>` + `<Await>` (return unresolved promises from the loader — do not assume a `defer` export; `react-router@7.14` does not ship one).

## F2. Caching & Storefront clients split

Non-personalized catalog reads (home merchandising, products, collections, collection cards, SEO, sitemap data) are cacheable and tag-revalidated. Personalized reads (cart, customer, buyer-context-specific state) are request-scoped and uncached. If a Client Component needs Storefront data, use an explicit browser-safe public client. Do not make catalog pages unconditionally dynamic just because cart or request headers exist elsewhere.

Framework binding: Next.js splits request-scoped, shared-cache, and optional public clients with `use cache` / cache tags; React Router splits loader clients with Hydrogen's real cache primitives: `Cache.none()`, `Cache.short()`, `Cache.long()`, `createFetchWithCache()`, and `createRunWithCache()`.

## F3. Consume typed data, no `as`-cast / `unknown`-walk

Use the typed results returned by Hydrogen factories and typed GraphQL (`gql.tada`) directly. Do not re-declare weaker parallel shapes, `as`-cast cart lines, or walk typed cart/product data through `unknown` parsing helpers. If less data is desired, narrow the typed fragment/query and consume that type.

Framework binding: Next.js and React Router both consume typed Storefront API results and Hydrogen cart types at component boundaries instead of reshaping them by assertion.

## F4. Whole-site progressive enhancement

**Every page renders its primary content and its primary navigation server-side and stays usable with JavaScript disabled.** JavaScript *upgrades* interactions — drawers, live filtering, in-page variant swap, predictive search, optimistic cart updates — but it never gates content behind hydration and never removes the only path to a piece of content or navigation. A surface that only renders or only becomes reachable after JS runs is a regression, not an enhancement.

Concretely, with scripting disabled:

- **Content & navigation** render server-side on every page (home grids, PDP, PLP/search grids, collections index, footer, and a usable nav).
- **Forms and links are the baseline.** Browse/sort/filter/search use real `method="get"` forms (with a `<noscript>` submit where the control is normally JS-submitted), pagination/load-more degrade to a real `<a>`/`<Link>` (render-that-page, not append), and the cart is reachable via a real `/cart` link/form. JS enhances these in place — it must not replace the reachable fallback or double-wire the same action.
- **Interactions degrade, never disappear.** Overlays (cart drawer, mobile nav, predictive search, filter drawer) open via native Invoker Commands where supported and otherwise fall back to a real link/disclosure; same-product variant choices degrade to GET links that change the selected variant server-side; the only allowed pure-JS surface is one with no no-JS function (the consent banner — see Known-deferred).

**Cart sub-clause (formerly the whole rule):** the cart route is reachable through a real link or form, the cart provider is seeded from the server data path so the first server render is populated, and JavaScript may upgrade the trigger into a drawer/dialog interaction without replacing the reachable fallback or double-wiring the action.

Each surface's concrete no-JS contract lives in its page note under a **"Without JavaScript"** heading (`home.md`, `product.md`, `collection.md`, `search.md`, `predictive-search.md`, `cart.md`) plus the deliberate exclusion in `consent-banner.md`. Treat those as design requirements; skills own the framework code that satisfies them.

Framework binding: Next.js uses `next/link` / server components / `method="get"` forms (with deliberate real `<a>` / `<noscript>` fallbacks before hydration); React Router renders content and forms from loaders and uses `<Link>` / real form fallbacks that the enhanced islands upgrade. Neither framework should ship a surface whose only data source or only entry point is a client island.

## F5. Data-fetch economy, no cosmetic over-fetch

Do not fan out large Storefront connections to compute decorative labels. Counts, badges, and card subtitles must come from fields already needed for the page, from a cheap/coarse probe, or be omitted. A card fragment reused across home and list pages must not multiply an expensive connection across every card.

Framework binding: Next.js and React Router share the same card fragments/components; both keep card-level Storefront probes bounded and cacheable.

## F6. Safe HTML embedding

Structured data is rendered on the server and embedded through a single escaping helper named exactly `jsonLdScript()`. The helper serializes JSON-LD and escapes `<` / `</script>` (for example by replacing `<` with `\u003c`) before assigning script HTML. Canonical URLs and site origin come from a trusted environment variable such as `PUBLIC_SITE_ORIGIN`, not attacker-influenceable `x-forwarded-host` / `host` request headers.

Framework binding: Next.js emits JSON-LD from server components/metadata-adjacent helpers; React Router emits JSON-LD from route components/loader data using the same `jsonLdScript()` contract.

## F7. Client-boundary minimization

Keep static markup on the server: headings, breadcrumbs, descriptions, SEO/JSON-LD, product cards that do not need interactivity, and layout chrome should not become client code just because a nested control is interactive. Push client boundaries down to variant pickers, facet controls, cart drawer state, and other truly interactive islands.

Framework binding: Next.js minimizes `'use client'` files and composes server-rendered children around interactive islands; React Router keeps route markup server-rendered where possible and hydrates only focused components.

## F8. Actionable error boundaries

Errors preserve the page shell where the framework allows it and give shoppers a recovery path. Boundary UI shows a clear message, includes a retry/reset action, and surfaces an error digest or request identifier when available so support can correlate reports.

Framework binding: Next.js uses segment `error.tsx` / `global-error.tsx` with `error` plus `reset`; React Router uses route `ErrorBoundary` exports with retry navigation/revalidation and digest-aware messaging.

Guidance (not yet a hard gate): loaders/fetchers should distinguish a genuinely-missing resource (a legitimate 404 — the handle does not exist) from a partial/authorization error on an otherwise-renderable response. A blanket `if (!data?.product) throw 404` turns *any* Storefront error (including a request-level authorization error that nulls the whole operation, per F14) into a hard route failure. Prefer to log the response `errors` array and only 404 when the resource is truly absent, so a transient or partial error does not nuke a page that could still render. See F14 for the related rule that keeps scope-gated fields out of critical queries in the first place.

## F9. Analytics readiness — no polling

Analytics and consent configuration must be available to trackers before tracker effects publish. Do not rely on effect ordering, `setTimeout`, polling loops, or busy-wait retries to discover whether the analytics bus is initialized; initialize synchronously or pass a ready dependency explicitly.

Framework binding: Next.js configures trackers through server-provided client-safe constants before effects run; React Router passes loader/root data or module-level client-safe constants into trackers without an init race.

## F10. SEO baseline

Every generated storefront includes canonicals, a trusted `metadataBase` / site origin, Open Graph and Twitter metadata, Product JSON-LD with offer data on PDPs, and sitemap/robots routes. Product variant query params should not create duplicate canonical URLs.

Framework binding: Next.js uses `generateMetadata`, root `metadataBase`, `app/sitemap.ts`, and `app/robots.ts`; React Router uses route `meta()`, sitemap/robots routes, and server-rendered JSON-LD.

## F11. Env hygiene & server-only boundary

Read environment variables through a small guarded helper that tolerates non-Node contexts. Split client-safe constants from env/secret readers, and mark env/secret modules as server-only where the framework supports it. Private Storefront tokens never appear in browser bundles or `NEXT_PUBLIC`/public-prefixed config.

Framework binding: Next.js splits env readers into `server-only` modules and exports client-safe analytics/shop constants separately; React Router keeps secrets in server loader/action context and only serializes explicitly safe values.

## F12. Image discipline incl. responsive LCP hero

Images include intrinsic dimensions or stable aspect-ratio containers, useful alt text (or empty alt for decorative imagery), `sizes`, and responsive `srcset`/CDN transforms. The home editorial/Unsplash hero is the LCP image: it must be eager/high-priority and responsive, not a single oversized fixed URL. Catalog images use Shopify CDN transforms rather than raw `.url` output.

Framework binding: Next.js may use the hand-rolled Shopify image helper and explicit hero `srcSet`/`sizes`; React Router uses the same image discipline in components and Hydrogen-friendly image helpers.

## F13. DRY / no dead CTAs / no redundant casts/no throwaway `*_SHAPE` queries

Shared primitives stay shared: product cards, collection cards, breadcrumbs, dialog helpers, cart count formatting, and JSON-LD helpers are not duplicated per page. CTAs that look actionable point to real in-scope routes or are omitted. Avoid redundant casts and unexplained throwaway `*_SHAPE` queries; if a type-extraction helper is truly necessary, document why in one line.

Framework binding: Next.js and React Router both use shared app components/helpers and route-native links; neither ships dead hero CTAs, duplicated one-off utilities, or casts that only silence the compiler.

## F14. Optional / permission-gated data degrades gracefully

Optional / permission-gated Storefront data is an enhancement, never a hard dependency. Fields that can be denied by an access scope or be absent (`quantityAvailable`, gated metafields, B2B pricing, etc.) must be fetched in a **separate operation** from a route's critical query, fetched **non-blocking** (streamed, so first paint never waits on them), and must **degrade silently** when denied or absent — never breaking the route, the shared shell, or the cart. A request-level Storefront authorization error nulls the *entire* operation, so a scope-gated field cannot share an operation with critical data: one missing scope would otherwise null the whole product response and take down the PDP and the cart. Isolate such fields in a dedicated best-effort operation that never throws (returns empty/partial on missing scope, network, or GraphQL errors), cache an access-scope denial for the life of the worker isolate so the guaranteed-to-fail request stops re-issuing (self-healing on redeploy once granted), and render the dependent UI (e.g. the low-stock hint) only when the data is present. `availableForSale` is NOT scope-gated and stays in the critical query (sold-out still derives from it).

Framework binding: Next.js fetches the optional data in a separate async server component child wrapped in `<Suspense>` (or an equivalent non-blocking boundary); React Router fetches it via a best-effort helper and returns an unresolved promise from the loader, consumed with `<Suspense>` + `<Await>` (no `defer` — `react-router@7.14` does not ship one).

## Known-deferred

The **consent / cookie banner is intentionally JavaScript-only** and is the one deliberate exception to F4. It has no no-JS function: show/hide, persistence, and the Customer Privacy / analytics wiring all require client code, and with JS disabled there is no consent to capture and no analytics to gate. This exclusion is acceptable precisely because the banner gates nothing else — no content or navigation depends on it. See `notes/consent-banner.md` for the explicit statement of this exclusion.

CSP and custom security headers are intentionally out of scope for these examples. Real storefronts should add a deployment-specific CSP/security-header policy, but generated examples focus on portable framework code and safe JSON-LD escaping rather than prescribing a universal header set.
