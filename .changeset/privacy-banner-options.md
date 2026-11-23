---
"@shopify/hydrogen": patch
---

Allow headless storefronts to pass their public Storefront API token, root domains, locale, and country to `window.privacyBanner.showBanner()` and `showPreferences()` without a type assertion. Calls without options remain supported.
