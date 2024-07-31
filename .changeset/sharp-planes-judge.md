---
'@shopify/hydrogen': patch
---

Add a `waitForHydration` prop to the `Script` component to delay loading until after hydration. This fixes third-party scripts that modify the DOM and cause hydration errors.

Note: `nonce` is not supported when using `waitForHydration`. Instead you need to add the domain of the script directly to your [Content Securitiy Policy directives](https://shopify.dev/docs/storefronts/headless/hydrogen/content-security-policy#step-3-customize-the-content-security-policy).
