---
'@shopify/hydrogen': patch
---

Stop the analytics and consent bootstrap from breaking hydration.

- `Analytics.Provider` now applies its post-hydration state updates (the deferred shop and cart resolutions, and the analytics `onReady` callback) inside `startTransition`. Previously these urgent updates could land while a streamed Suspense boundary below the provider was still dehydrated, which made React discard that boundary's server HTML and client-render it (recoverable error #418).
- `useCustomerPrivacy` no longer throws when `window.Shopify` (or `window.privacyBanner`) has already been defined as a non-configurable property by a browser extension or a theme-era app. The property watchers now degrade to reading the consent APIs once the consent script has settled, instead of letting `TypeError: Cannot redefine property: Shopify` escape into the router error boundary and take down the page.
