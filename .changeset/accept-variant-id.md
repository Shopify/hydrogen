---
'@shopify/hydrogen': minor
---

Accept Liquid-style `?variant=<numeric id>` links on product pages.

- `handleShopifyRoutes({routeTemplates})` now 302-redirects `?variant=` product URLs to the canonical option-params URL (`/products/x?variant=123` → `/products/x?Color=Red&Size=M`), resolving the variant through the Storefront API, following combined-listing variants to their own product page, and stripping unknown or deleted variant ids. When both `variant` and option params are present, the variant wins.
- `buildProductSelectionSearchParams({style?, selectedOptions, variant?, optionNames, base?})` builds selection link search params, scrubbing stale option and `variant` params while preserving unrelated ones. `style: "variant"` emits a shareable `?variant=<numeric id>` link, falling back to option params when no variant is resolved.
- `getSelectedProductOptions` now treats the `variant` search param as reserved and never returns it as an option.
- Registered route redirects can now set an explicit `status` restricted to `301 | 302 | 303 | 307 | 308`.
