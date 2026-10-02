---
"skeleton": patch
"@shopify/cli-hydrogen": patch
"@shopify/create-hydrogen": patch
---

Allow end-to-end tests to toggle the privacy banner on deployed storefronts

The skeleton's privacy banner can now be enabled for a page load by sending an `e2e_privacy_banner=1` cookie. This lets automated end-to-end tests (including scheduled synthetic checks that run against deployed storefronts) exercise both banner states without a dev server. The cookie is inert unless explicitly set.
