# PRD: Country/Currency Selector — `localization` Utility + Skill

| | |
|---|---|
| **Status** | Draft |
| **Owner** | Andrew Nguyen |
| **Target** | `@shopify/hydrogen` (preview architecture) |
| **Deliverables** | `core/localization` module, React/Vue bindings, `country-selector` skill, consumer integrations |

---

## 1. Summary

Storefront developers on every Hydrogen stack today hand-roll the same ~5 files to let buyers
switch country (and therefore currency) and language: a static country list, a
`getLocaleFromRequest` utility, a resource route, a form/selector component, and a form-handling
action that updates the cart and redirects. This PRD proposes a first-class **`localization`
domain module** in `@shopify/hydrogen` that absorbs that boilerplate behind a small, portable,
progressively enhance-able API — plus an agent **skill** that teaches AI coding agents to wire it
into any framework correctly (markup, a11y, URL strategy, and server wiring).

The design intentionally mirrors the proven Liquid/Horizon mental model
(`{% form 'localization' %}` → POST → redirect) so it works with zero JavaScript, then layers
client-side enhancement on top.

---

## 2. Background

### 2.1 Prior art reviewed

| Source | What it does | What we take / reject |
|---|---|---|
| **Horizon Liquid theme** (`snippets/localization-form.liquid`) | Native `<form>` POST with `country_code`/`language_code` inputs; a web component enhances with search filter, popular countries, currency labels, aria-live/combobox semantics | **Take:** the progressive-enhancement layering, the form contract, all a11y patterns. **Reject:** nothing — this is the gold standard UX |
| **Pack blueprint theme** (`CountrySelector.tsx`) | Lazy-loads `localization.availableCountries` from a resource route when scrolled into view; updates cart `buyerIdentity`; redirects to path-prefixed locale | **Take:** dynamic country list from SFAPI, lazy loading, cart sync. **Reject:** JS-required rendering (no zero-JS fallback), hand-rolled locale↔path mapping |
| **Hydrogen classic docs/cookbook** (markets recipes) | Static `countries.js` + `getLocaleFromRequest` + `/locale` action + `cartBuyerIdentityUpdate` + redirect | **Take:** the PE-friendly form→action→redirect flow. **Reject:** static country file (maintenance burden), per-app boilerplate |
| **This repo (`preview`)** | `core/<domain>/` modules (queries / store / form / server-handlers / url) + thin `react`/`vue` bindings; `CallableRouteHandler` mounted via `handleShopifyRoutes`; `i18n` required on request context; `$country`/`$language` auto-injected via `@inContext` | **Take:** everything — the new module must follow these exact conventions |

### 2.2 Why now

- The preview architecture already requires `i18n: {country, language, pathPrefix}` on every
  request context and auto-injects `@inContext` variables — but provides **no utility to resolve
  or change** that i18n value. Every app writes its own (`examples/hydrogen/app/lib/i18n.ts` is
  the current hand-rolled example).
- A Horizon maintainer comment in `localization-form.liquid` explicitly wishes for a richer
  localization API surface ("it might make sense for us to just be able to get
  `localization.available_currencies`…") — signal that even Liquid themes are underserved.
- Agent-driven storefront generation (a core goal of `examples/`) needs a deterministic,
  documented recipe: a skill backed by a real API beats regenerating bespoke selector code.

---

## 2.3 Dependencies

- **PR [#3913](https://github.com/Shopify/hydrogen/pull/3913)** ("Add cart customer identity sync
  hooks") — adds `cartBuyerIdentityUpdateMutation` to `core/cart/queries.ts`, a generic
  `CartBuyerIdentityInput` mutation. The localization POST handler imports this mutation to update
  `countryCode` on the buyer identity. Must merge before the POST handler (FR-3) can land.

---

## 3. Problem statement

**Buyers** need to view a storefront in their country's currency and language.
**Developers** need to offer that with minimal code, in any framework, without breaking SEO,
accessibility, or no-JS usage.
**Agents** need a reliable recipe to generate this feature without inventing architecture.

Today, none of these are served by `@shopify/hydrogen` (preview): there is no localization
domain module, no locale-from-URL utility, no selector form contract, and no skill.

---

## 4. Goals

1. **Progressively enhance-able**: country/language switching fully works with JavaScript
   disabled; JS only improves the experience.
2. **Portable**: one framework-neutral core API consumable from vanilla JS, React, Vue, and any
   SSR framework in `examples/` (attribute objects + observable store + fetch-able endpoints).
3. **Maximally Shopify-native**: powered by the Storefront API `localization` query,
   `@inContext`, Shopify Markets configuration, and cart `buyerIdentityUpdate` — no static
   country data files (names/currencies/symbols always come live from SFAPI), no third-party
   i18n libraries. The optional `supportedLocales` list (FR-1) is routing configuration — ISO
   code pairs describing which URLs the app serves — not country data.
4. **Minimal developer complexity**: a working selector requires
   (a) one `createLocalizationServerHandlers()` call registered in the existing
   `handleShopifyRoutes` array, (b) one `matchLocaleFromRequest()` call feeding the request
   context, and (c) markup built from provided form attributes. No new routing concepts.
5. **Agent-ready**: a skill that produces correct, accessible implementations across frameworks.

### Non-goals

- Translating app-owned UI strings (i18n copy libraries are out of scope; SFAPI content
  translation via `@inContext(language:)` is in scope automatically).
- Geo-IP-based automatic redirection (may consume this module later; not in v1).
- Subdomain/top-level-domain URL strategies as a batteries-included path (supported only via an
  override hook in v1; see §7.4).
- Admin API usage of any kind.
- A styled/opinionated UI component. We ship contracts + reference markup, not a design system.

---

## 5. Users

| User | Need |
|---|---|
| **Buyer** | Switch country/currency/language quickly; keep their cart; land on the equivalent page; screen-reader and keyboard accessible; works on slow/failed JS |
| **Storefront developer** | Add the feature in minutes in their framework of choice; customize markup freely; never maintain country lists |
| **AI agent** | Deterministic skill: wiring steps, markup patterns, validation checklist |
| **Merchant** | Selector always reflects live Shopify Markets settings; cart currency stays consistent through checkout |

---

## 6. Functional requirements

Priorities: **P0** = required for v1, **P1** = fast follow, **P2** = future.

### FR-1 Locale resolution & persistence redirect (P0)

**Matching (pure, synchronous):**

- `matchLocaleFromRequest(request, config)` returns `{country, language, pathPrefix}` from a URL
  using the subfolder scheme (`/{language}-{country}` lowercase; default locale has empty
  prefix). `config` is the shared `LocalizationConfig` — `{defaultLocale, supportedLocales}` —
  one immutable object passed identically to matching, the server handlers, and selector data
  filtering, so routing and the selector can never disagree. `matchLocalePathname(path, config)`
  is the same contract for callers holding a path rather than a `Request` (e.g. resolving the
  source locale of a form's redirect target).
- **The URL is the only input that affects the result.** Rendering is therefore a pure function
  of the URL: the same URL always resolves to the same locale, keeping pages CDN-cacheable and
  SEO-deterministic. Session state never influences matching.
- Output feeds `createShopifyRequestContext({i18n})` directly — no adapter code, no `await`.
- Unknown/malformed prefixes resolve to the default locale (the app's catch-all 404 handling
  stays responsible for invalid paths — parity with `($locale).tsx` behavior stays possible).
- Round-trips with `getLocalizedPath` (FR-4): `match(toUrl(x)) === x` for all supported locales,
  unconditionally (no session state to mock in property tests).
- **`supportedLocales` semantics** (matching runs synchronously before a storefront client
  exists, so it can never validate against live Markets data — the URL space must be
  deterministic without I/O). The field is **required**; both values are deliberate choices:
  - **Explicit list → strict mode (the default posture)**: only listed `{country, language}`
    pairs parse; everything else resolves to the default locale. The same config object is
    passed to the server handlers (FR-3) so the selector never offers a locale the router
    won't serve — define once, pass everywhere.
  - **`"all"` → permissive mode (explicit opt-in)**: any prefix whose codes are valid members
    of the generated `CountryCode`/`LanguageCode` enums parses as a locale (universal Shopify
    code sets — static but universal, zero per-store maintenance). Nonsense codes (e.g.,
    `/qq-qq`) resolve to the default locale. This is the Liquid-parity mode: markets added in
    admin route immediately without a deploy. The trade-off is that every valid code pair
    becomes a routable, cacheable URL variant, so canonical/hreflang tags are the app's
    responsibility — which is why permissive can never be reached by omitting config
    (review feedback, PR #3959).

**Persistence redirect (async, opt-in):**

- `getLocaleRedirect(request, {config, i18n, sessionManager, resolveLocaleUrl?})` returns a
  `302` redirect `Response` to the buyer's saved locale under its path prefix, or `null` to
  continue.
- Redirects **only** when all of: the request is a page navigation (GET/HEAD and either
  `Sec-Fetch-Mode: navigate` or an `Accept` including `text/html` — the fallback exists
  because fetch-based proxy hops rewrite forbidden `Sec-Fetch-*` headers), the path is
  unprefixed, a session locale exists (written by the POST handler in FR-3), that locale is
  still in `config.supportedLocales` (stale locales from removed markets are ignored), and it
  differs from the resolved default. Prefixed URLs are never redirected — **the URL always
  wins** — so shared links behave deterministically and redirect loops are unrepresentable by
  construction (helper only maps unprefixed → prefixed).
- Redirect responses carry `Cache-Control: private, no-store` so shared caches never serve one
  buyer's locale redirect to another. Rendered pages stay publicly cacheable (see matching).
- Fully optional: apps without session persistence skip the helper and pay zero cost; locale
  then persists via URL prefixes alone (in-site navigation, history, bookmarks, search results).
  The only degradation is that re-entry via an unprefixed URL renders the default locale.

### FR-2 Localization data (P0)

- Default GraphQL document querying `localization`:
  current `country {isoCode name currency {isoCode symbol}}`, current `language {isoCode
  endonymName}`, `availableCountries` (with per-country `currency` and `availableLanguages`),
  and `market {handle}`.
- `makeLocalizationQueries({fragments})` follows the existing fragment-override pattern
  (`makePredictiveSearchQueries`) for custom fields.
- Works against both a real store and `mock.shop`.

### FR-3 Server handlers (P0)

`createLocalizationServerHandlers(options?)` returns `CallableRouteHandler`s that register via
the existing `handleShopifyRoutes({handlers: [...]})` array:

- **GET `/localization`** — JSON payload of available countries/languages + market metadata,
  with public cache headers (default `max-age=3600, stale-while-revalidate=86400`, configurable
  via options). Staleness expectation: merchants changing Markets config may see up to 1 hour
  delay; document this in the skill. Powers lazy loading (Pack pattern) and the vanilla store.
  - **Locale-anonymous payload**: deliberately excludes the active locale — the response must
    be identical for every buyer at a given URL, or shared caches would serve one buyer's
    locale to another. The page already knows its own locale from SSR (see FR-6 seeding).
  - Optional `country`/`language` **query params** are forwarded to `@inContext` (e.g., for
    translated country names). The cache key is the full URL, so per-locale variants cache
    independently and public caching stays sound. Without params, the handler executes under
    the default locale — deterministic, since the endpoint URL is unprefixed and matching is
    URL-only (FR-1).
  - With an explicit `supportedLocales` list (FR-1), the payload is the **intersection** of
    live `availableCountries` with the list (with `"all"`, live data passes through — Markets
    is already the source of truth); a warning is logged when live Markets data includes
    countries outside the list (drift detection).
- **POST `/localization`** — form contract:
  - Fields: `country` (required, ISO code), `language` (optional, ISO code), `redirectTo`
    (optional, same-origin path+search to return to).
  - Validates submitted codes against the live `localization` query (intersected with
    `supportedLocales` when configured) — invalid input returns a structured error result,
    never a crash.
  - Updates cart `buyerIdentity.countryCode` via `cartBuyerIdentityUpdateMutation` (imported
    from `core/cart/queries.ts`, available after PR #3913 merges) when a cart exists. The cart id
    is discovered through `getCartIdFromCookie` from `core/cart/cookie.ts`. The localization
    handler issues the mutation directly — no new cart action is needed. Cart update failure is a
    **soft error**: the redirect proceeds regardless, and the error is surfaced via the existing
    `error-reporting` pattern so the next page load can retry or inform the buyer.
  - Writes `{country, language}` to the session (`LOCALIZATION_SESSION_KEY`), consumed by
    `getLocaleRedirect` (FR-1). The write is **best-effort**: `ShopifyRouteHandlerContext`
    requires a `sessionManager`, but it may be a no-op implementation — write failure is a soft
    error (same policy as cart sync) and the redirect proceeds regardless.
  - Commits the session (`sessionManager.commit?.()`) and merges the resulting headers into the
    redirect result — route response construction does not auto-commit sessions, so the handler
    must do this itself for the write to persist.
  - Responds `303 See Other` to the equivalent page under the target locale's path prefix
    (via FR-4), sanitizing `redirectTo` to same-origin relative paths only.
- Both handlers accept the same context shape as existing handlers
  (`{request, storefrontClient, ...}`) and support a custom `path` option.
- The endpoint path, field names, and session key are exported constants (no magic strings for
  consumers).

### FR-4 URL utilities (P0)

- `getLocalizedPath(path, {fromPathPrefix, toPathPrefix})` — strips one prefix, applies another,
  preserving search/hash. Built on the existing `normalizePathPrefix`.
- Used by handlers (redirects), stores (client navigation), and app link components
  (locale-aware `<a href>` generation).

### FR-5 Form register (P0)

- `createLocalizationFormRegister()` + `getLocalizationFormAttributes()` following
  `createCartFormRegister`:
  - form-level attributes (`method="post"`, `action` = endpoint path),
  - `register("country")` / `register("language")` → select/input name+value attributes,
  - `register("redirectTo", {value})` → hidden input attributes,
  - submit intent attributes, including a `hidden`-when-enhanced submit variant (Horizon
    pattern: visible without JS, hidden once the store auto-submits on change).
- Attribute objects are plain data: spreadable in JSX/Vue/Svelte templates, or applied with
  `setAttribute` in vanilla JS.

### FR-6 Client store (P0)

`createLocalizationStore(options?)` on `createObservable`, mirroring
`createPredictiveSearchStore`:

- **State**: `{current: {country, language, currency, pathPrefix}, available: Country[],
  status: "idle" | "loading" | "ready" | "error", error: string | null}`.
  - `current` is **seeded from store options** (server-rendered values), never inferred from
    the GET response — the endpoint payload is locale-anonymous (FR-3).
- **Actions**:
  - `load()` — lazily fetch the GET endpoint (callers decide the trigger, e.g. visibility),
    appending the current locale as query params for translated country names (FR-3).
  - `select({country, language?})` — submit the change and perform a **full document
    navigation** to the localized URL. Deliberate: every rendered price changes with country,
    so a document navigation is the correct enhancement, not SPA state patching. The store
    debounces rapid calls (e.g., keyboard scrolling through countries) — only the last
    selection within a short window triggers navigation.
  - `filter(term)` — client-side country filtering (name + ISO code + alias matching, e.g.
    "uk" → United Kingdom), powering the Horizon search-filter enhancement.
- Injectable `fetch` for tests/non-browser runtimes (existing store convention).

### FR-7 Framework bindings (P0: React, Vue)

- `react/localization.tsx` — `useLocalization()` hook exposing store state + actions
  (mirrors `react/cart.tsx` patterns, SSR-safe).
- `vue/localization.ts` — equivalent composable.
- Vanilla JS requires no binding: form register + store suffice (proven by `examples/core`).

### FR-8 Skill: `skills/country-selector/` (P0)

- `SKILL.md` (with symlink in `.agents/skills/` per repo convention) covering:
  1. When to apply the skill (trigger phrases: country selector, currency selector, market
     switcher, localization).
  2. Server wiring steps (a single shared `supportedLocales` config passed to both matching
     and handlers, handlers registration, `matchLocaleFromRequest` → request context, optional
     `getLocaleRedirect` for cross-visit persistence).
  3. Markup construction from form attributes, with the zero-JS baseline first.
  4. Enhancement wiring per framework (React hook, Vue composable, vanilla store).
  5. URL strategy selection and the `resolveLocaleUrl` escape hatch.
  6. A11y requirements checklist (§9) and validation steps (§11).
- `reference/` directory: annotated reference markup (combobox filter, popular countries,
  currency labels, `aria-current`) and per-framework recipes. Core stays framework-agnostic, so
  framework URL quirks are normalized at the integration boundary and documented per recipe —
  e.g., the React Router recipe must strip the single-fetch `.data` pathname suffix before
  calling `matchLocaleFromRequest`, or data requests resolve to the default locale.
- **`mock.shop` guidance**: when the localization query returns a single country (typical of
  `mock.shop`), the skill should detect this and render a dev-mode explanation (e.g., "Connect
  a real store to see available countries") instead of a single-item dropdown that looks broken.
- **Cart/locale drift note**: the cart cookie persists independently of the session, so a
  returning buyer entering at an unprefixed URL (without the redirect helper) may briefly see
  default-locale prices while their cart's `buyerIdentity.countryCode` still reflects a prior
  selection. Not an error — the cart re-syncs on the next selector use — but the skill must
  document it.

### FR-9 Consumer integrations (P0 unless noted)

- `templates/react-router`: wire handlers + selector into header/footer (additive).
- `examples/hydrogen`: replace hand-rolled `app/lib/i18n.ts` with the package utility.
- `examples/core/reference/_partials`: vanilla reference partial for the frozen design source.
- P1: nuxt, sveltekit, solid-start, astro examples.

### FR-10 Locale-aware linking helper (P1)

- Small helper to prefix internal hrefs with the active `pathPrefix`
  (companion to FR-4), so app nav links keep the buyer in their locale.

---

## 7. Design

### 7.1 Naming

The domain is **`localization`** — matching the SFAPI `localization` query and Liquid's
`{% form 'localization' %}`. "Country selector" names the *skill/UI*, since that's the phrase
developers and agents search for.

### 7.2 Currency is derived, never selected

In Shopify Markets, currency follows the country's market. The API therefore exposes `currency`
as read-only metadata on each country (for option labels like "Canada (CAD $)") and offers no
currency-selection input. An invalid currency state is unrepresentable — errors defined out of
existence.

### 7.3 Progressive enhancement layers

**Layer 0 — zero JS (must always work):**

```html
<form method="post" action="/localization">
  <input type="hidden" name="redirectTo" value="/collections/shoes?sort=price" />
  <select name="country">…</select>
  <select name="language">…</select>
  <button type="submit">Update</button>
</form>
```

Server validates → updates cart buyer identity → `303` redirect to the localized equivalent
page. Identical mental model to Liquid themes.

**Layer 1 — enhanced (store attaches):**

- Hide the submit button; auto-submit on selection change.
- Lazily `load()` the full country list (render only the current locale server-side if desired).
- Country search filter with alias matching; popular-countries grouping.
- `aria-live` result counts and combobox semantics (§9).
- Navigation still document-level (see FR-6 rationale).

### 7.4 URL strategy and locale persistence

- **Default (v1)**: subfolder path prefixes — `/{language}-{country}` lowercase, default locale
  unprefixed. Matches `ShopifyRequestContext.i18n.pathPrefix`, the docs recipes, and
  `examples/hydrogen`.
- **Persistence**: two-layer approach — (1) URL path prefix is the primary mechanism and the
  only one that affects rendering (covers shared links, bookmarks, SEO), (2) the POST handler
  stores the buyer's last selection in the session, and the opt-in `getLocaleRedirect` helper
  302-redirects unprefixed entries to the saved locale's prefixed URL. The session never
  changes what a URL renders — it only changes *which URL the buyer lands on*. No new cookie
  required — reuses the existing session cookie infrastructure. Trade-off: returning buyers
  entering at an unprefixed URL pay one redirect hop (same cost Liquid storefronts pay).
  Without a real session manager, that hop simply never happens and unprefixed re-entry renders
  the default locale; everything else is identical.
- **Escape hatch**: `resolveLocaleUrl({locale, path}) => URL` option on the server handlers and
  store for subdomain/domain-per-market setups. One override point; everything else unchanged.

### 7.5 Module layout

```
packages/hydrogen/src/core/localization/
  constants.ts        # endpoint path, form field names, session key, cache defaults
  queries.ts          # default query + makeLocalizationQueries
  get-localization.ts # queryLocalization({storefrontClient})
  locale-matching.ts  # matchLocaleFromRequest, getLocalizedPath (pure, sync)
  locale-redirect.ts  # getLocaleRedirect (opt-in session persistence redirect)
  form.ts             # form register + attributes
  server-handlers.ts  # createLocalizationServerHandlers (get/post)
  store.ts            # createLocalizationStore
  index.ts            # public exports
packages/hydrogen/src/react/localization.tsx
packages/hydrogen/src/vue/localization.ts
skills/country-selector/{SKILL.md, reference/}
.agents/skills/country-selector → ../../skills/country-selector
```

### 7.6 Shopify surface leverage (traceability)

| Capability | Shopify offering |
|---|---|
| Country/language/currency lists | SFAPI `localization` query (reflects Markets settings live) |
| Contextual pricing/content | `@inContext(country, language)` — already auto-injected from `requestContext.i18n` |
| Cart currency consistency | `cartBuyerIdentityUpdate` mutation |
| Market metadata | `localization.market` / `country.market` |
| Caching | Long-lived cache headers on the GET endpoint, consistent with existing proxy header helpers |

---

## 8. Non-functional requirements

- **NFR-1 Zero-JS parity**: every capability of Layer 0 must be verified with JS disabled (e2e).
- **NFR-2 SSR-safety**: stores/bindings must not touch browser globals at module scope; SSR
  render of the selector must be deterministic.
- **NFR-3 Bundle discipline**: core module is tree-shakeable; apps not using localization pay
  zero bytes. Store code is client-safe and dependency-free beyond `createObservable`.
- **NFR-4 Security**: `redirectTo` restricted to same-origin relative paths; submitted codes
  validated against the live localization query; no open redirects.
- **NFR-5 Type safety**: ISO codes typed via generated `storefront-api-types`
  (`ShopifyCountryCode`/`ShopifyLanguageCode` `Extract<>` types already in
  `request-context.ts`); runtime boundary validation for form input **and** for the session
  locale read by `getLocaleRedirect` (`getSessionItem` returns `unknown` — malformed session
  data must degrade to "no redirect", never throw); Zod or equivalent local parsing consistent
  with repo conventions — repo currently hand-parses; follow `server-handlers` precedent.
- **NFR-6 Error policy**: follow the `error-reporting` skill — structured route error results
  for invalid input; throw only for programmer errors (e.g., invalid options).
- **NFR-7 Caching**: GET endpoint cacheable; POST never cached; `getLocaleRedirect` responses
  are `private, no-store` (session-dependent); rendered pages remain a pure function of the URL
  and stay publicly cacheable; personalized-response marking via existing request-context
  mechanisms where applicable.

---

## 9. Accessibility requirements (from Horizon parity)

- Selector operable entirely by keyboard; visible focus states are the app's concern, semantics
  are ours.
- Filter input uses combobox semantics: `role="combobox"`, `aria-controls`/`aria-owns` on the
  results list, `aria-autocomplete="list"`, `aria-haspopup="listbox"`.
- Country options expose `role="option"`, `aria-current`/selected state on the active locale.
- Result counts announced via a visually hidden `aria-live="polite"` region on filter.
- Language `<select>` labelled; language option text rendered in its own language
  (`endonymName`) with a `lang` attribute per option.
- No-results state present and announced.
- Reference markup in the skill encodes all of the above so agents can't omit them.

---

## 10. Developer experience (target usage)

```ts
// app/lib/i18n.ts — the shared LocalizationConfig, defined once
export const LOCALIZATION_CONFIG: LocalizationConfig = {
  defaultLocale: { country: "US", language: "EN" },
  supportedLocales: [
    { country: "US", language: "EN" },
    { country: "CA", language: "EN" },
    { country: "CA", language: "FR" },
  ], // or "all": route any Markets-backed locale without a deploy (explicit opt-in)
};
export const localizationHandlers = createLocalizationServerHandlers(LOCALIZATION_CONFIG);

// root middleware — one array entry added
handleShopifyRoutes({ ..., handlers: [cartHandlers, localizationHandlers] });

// request context — replaces hand-rolled getLocaleFromRequest (sync, URL-only)
const i18n = matchLocaleFromRequest(request, LOCALIZATION_CONFIG);

// optional: cross-visit persistence — 302 to the buyer's saved locale on unprefixed entry
const localeRedirect = await getLocaleRedirect(request, {
  config: LOCALIZATION_CONFIG,
  i18n,
  sessionManager,
});
if (localeRedirect) return localeRedirect;

// React component
const { current, available, status, load, select, register, formAttributes } = useLocalization();
```

Acceptance heuristic: a developer who has already wired cart handlers should add a working
Layer-0 selector by touching **three places** (handler file, handlers array, markup) and no
routing files.

---

## 11. Testing & validation

Per repo TDD convention — tests written first, colocated:

- **Unit** (`*.test.ts`): URL round-tripping (FR-1/FR-4 property: match∘toUrl = identity),
  form register outputs, handler validation/redirect/cart-sync branches (mocked storefront
  client), **no-cart graceful degradation** (redirect-only, no cart mutation attempted),
  **cart-update soft failure** (redirect succeeds, error surfaced), `getLocaleRedirect`
  branches (prefixed URL → `null` even with a session locale; no/default session locale →
  `null`; unprefixed + session locale → 302 with private cache headers; no-loop property: the
  helper's output URL never triggers another redirect), **session-write soft failure** (no-op
  session manager → 303 still succeeds), **session commit headers present on the POST redirect
  response**, matching semantics (permissive enum-validated mode vs strict `supportedLocales`
  mode), **GET payload excludes the active locale** and forwards locale query params to
  `@inContext`, POST validation against the live/supported intersection, store lifecycle
  (load/select/filter, injected fetch), redirect sanitization.
- **Type tests** (`*.type-test.ts`): register overloads, handler option inference,
  fragment-override typing.
- **Binding tests**: React hook SSR + subscription behavior (mirror `cart.test.tsx`);
  Vue composable equivalents.
- **E2E** (`storefront-e2e`, headless Playwright):
  1. JS disabled: select country → submit → lands on prefixed URL, prices in new currency.
  2. JS enabled: change select → auto-navigation, cart currency updated, filter works.
  3. `redirectTo` preservation of path + query.
- **Skill validation**: run the skill against at least one framework example end-to-end and
  verify the generated integration passes the same e2e assertions.

---

## 12. Success criteria

- `examples/hydrogen`'s bespoke `lib/i18n.ts` is deleted in favor of the package utility with
  no behavior regression.
- Layer-0 e2e passes with JavaScript disabled across template + examples.
- The skill, applied by an AI coding agent, given only "add a country selector", produces a
  passing integration in the react-router template that passes all e2e assertions on at least
  3 of 5 attempts without manual correction.
- A developer adds localization to a working cart-enabled app by modifying exactly 3 locations:
  handler registration, request context, and template markup — verified by the skill's
  validation checklist and the react-router template diff.

---

## 13. Risks & mitigations

| Risk | Mitigation |
|---|---|
| `mock.shop` has limited Markets data → weak local demo | Detect and fall back gracefully (single-country list still renders); document in skill |
| Apps with subdomain/domain market URLs can't use default scheme | `resolveLocaleUrl` hook (v1) + documented recipe; promote to first-class strategy if demand appears (P2) |
| Cart cookie coupling: buyer-identity sync needs the cart id | Import `cartBuyerIdentityUpdateMutation` from `core/cart/queries.ts` (PR #3913) and `getCartIdFromCookie` from `core/cart/cookie.ts`; degrade to redirect-only when no cart exists (soft error) |
| Locale-prefixed route matching differs per framework | Skill documents per-framework routing (`($locale)` optional segments, etc.); core stays routing-agnostic via `pathPrefix` |
| SEO regressions (duplicate content across prefixes) | Skill includes `hreflang`/canonical guidance sourced from existing standard-routes/sitemap support (P1 helper if needed) |
| Scope creep into geo-detection/auto-redirect | Explicit non-goal; module exposes the primitives a later feature would need |
| `supportedLocales` drifts from live Markets config (market added in admin, not in app config) | Handlers intersect live data with the list; drift warning logged in all environments (FR-3); skill validation step compares the two |

---

## 14. Resolved decisions

1. **Language is in scope for v1.** Every FR (1–8) already includes language. Cutting it would
   change URL format, form contract, store state, and skill content. Including it costs little;
   excluding then re-adding later forces migration. This matches Liquid parity and SFAPI support.
2. **Locale persistence: URL prefix primary + opt-in session redirect helper (no new cookie;
   session never influences rendering).** `matchLocaleFromRequest` is synchronous and URL-only,
   so the same URL always renders the same locale — full-page/CDN caching and SEO stay intact,
   and the bootstrap ordering problem (session managers are created asynchronously, often after
   locale resolution) never arises. Cross-visit persistence is a separate, composable concern:
   the POST handler writes `{country, language}` to the session, and the opt-in
   `getLocaleRedirect` helper 302-redirects unprefixed entries to the saved locale's prefixed
   URL. It never renders session content in place, and prefixed URLs always win, making
   redirect loops and session-varying page content unrepresentable. This mirrors how Liquid
   storefronts persist locale (redirect, not in-place render) without introducing a new cookie
   — `sessionManager` is already available in the `handleShopifyRoutes` context for customer
   account sessions. Shopify's native locale cookie (set on `.myshopify.com`) cannot be reused
   in headless — it's a third-party domain, increasingly blocked by browsers.
3. **404 policy: core resolves to default; skill mandates the guard pattern.** Core stays
   routing-agnostic by resolving unknown/malformed prefixes to the default locale. The skill
   (FR-8) must strongly recommend and include the `($locale)` guard pattern in reference markup
   as a "Recommended Pattern" (not optional), because without it every path prefix is a valid
   URL, creating SEO duplicate-content risk.
4. **`supportedLocales` is routing config, not country data (Goal 3 clarified).**
   `matchLocaleFromRequest` runs synchronously before a storefront client exists, so it cannot
   validate prefixes against live Markets data — and shouldn't: the set of URLs an app serves
   is an app decision that must be deterministic without I/O, like routes. The field is
   required: an explicit list → strict narrowing, with the same config passed to the handlers
   so selector offerings and routable URLs cannot diverge; `"all"` → explicit opt-in permissive
   mode validating codes against the universal generated ISO enums (Liquid-parity market
   launches without a deploy, at the cost of app-owned canonical/hreflang hygiene). Permissive
   was originally the no-config default; review feedback on PR #3959 established that minting
   indexable URL variants must never happen by accident. "No static country data files"
   (Goal 3) forbids display data (names/currencies/symbols) — that always comes live from
   SFAPI.
5. **The GET endpoint is locale-anonymous and URL-keyed.** Its payload excludes the active
   locale so the response is identical for every buyer at a given URL — public caching can
   never leak one buyer's locale to another. Pages learn their locale from SSR; the client
   store is seeded via options (FR-6). Locale-dependent fields (translated country names) are
   requested via query params, keeping the cache key honest (the full URL).

### Open questions (remaining)

1. **Naming sign-off**: `localization` domain + `country-selector` skill.
2. **Consumer scope for v1**: react-router template + hydrogen example + core reference partial
   (P0) vs. all framework examples (currently P1).

---

## 15. Implementation order

1. `locale-matching.ts` (`matchLocaleFromRequest`, `getLocalizedPath`) — TDD, pure functions first.
2. `locale-redirect.ts` (`getLocaleRedirect`) — reads what the POST handler will write.
3. `queries.ts` + `get-localization.ts`.
4. `server-handlers.ts` (GET, then POST with cart sync + session write/commit + redirect).
5. `form.ts` register.
6. `store.ts`.
7. React binding → Vue binding.
8. Template + example integrations, e2e coverage.
9. Skill authoring (last — informed by what integration actually required).
