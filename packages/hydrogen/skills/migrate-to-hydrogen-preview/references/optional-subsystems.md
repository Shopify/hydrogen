# Optional subsystems: detect, then migrate or skip

Read this at the "Optional subsystems" step of the outline. The migration outline is the mandatory base. Most other functionality is store-specific — **detect it in the classic-Hydrogen source, migrate it with the matching step, otherwise skip it and say so.** Each check is a cheap grep against the old app; do not assume a store has (or lacks) a feature.

**Order matters — later subsystems consume earlier ones. Do them in this sequence:**

1. **Localization / i18n / multi-market** — detect: `@inContext`, a root `localization` query, `pathPrefix`, a country/language selector, `I18nBase`. Migrate first because it produces the currency + accepted-language that the analytics `shop` payload needs.
2. **Customer Accounts / auth** — detect: `createCustomerAccountClient`, `/account*` routes, login/logout, a `customerAccount` context. Migrate via the library (see the OAuth-path and HTTPS-origin traps in `references/customer-account.md`).
3. **Analytics + consent — one unit, do not split, and do it after localization.** Detect: `Analytics.Provider` / `useAnalytics` / `getShopAnalytics`, a `dataLayer` / GTM / GA snippet, *or* any consent / cookie-banner / customer-privacy config. Consent is a **load-bearing** input to `<ShopifyScripts consent={…}>`, not a sibling feature: Shopify Customer Privacy gates what reaches analytics **destinations** (raw subscribers observe events pre-consent; destinations get a consent-allowed replay only), so wiring analytics without the consent config means destinations go dark while the build stays green. Migrate the two together, and after localization so the i18n inputs the `shop` payload needs are settled. See `references/analytics.md` for the port itself.

**Lower-coupling checks (migrate the ones the source has, any order, after the above):**

- **Search + predictive search** — detect: a `predictiveSearch` query or a `/search` route.
- **Subscriptions / selling plans** — detect: `sellingPlanGroups`, `sellingPlanAllocation`.
- **B2B** — detect: `buyerIdentity` company fields, `companyLocationId`, `buyer` context.
- **Content routes** — detect: `/blogs`, `/pages`, `/policies` routes and their `article`/`page`/`shopPolicy` queries.
- **SEO / sitemap / robots** — detect: a `seo` export, `sitemap.xml` / `robots.txt` routes, JSON-LD. (Sitemap helpers aren't in the library core — see `references/sitemap-and-seo.md`.)
- **Gift cards** — detect: `appliedGiftCards`, gift-card cart mutations.
- **URL redirects** — detect: a custom redirect map or `handleShopifyRedirects` usage.
- **Product recommendations** — detect: `productRecommendations` query.

Any custom third-party integration the store wrote itself (review widgets, marketing scripts, a page builder) is just app code — it migrates like any other component/route, with no Hydrogen-specific handling.

**Report every skip explicitly.** For each subsystem not detected, state "not present in source, skipped" in the migration summary. A silent omission reads identically to "migrated" and is exactly how a whole subsystem (analytics funnel, an account flow, sitemaps) goes missing unnoticed — the same no-silent-drop discipline the analytics and pagination traps in `references/` demand.
