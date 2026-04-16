---
'@shopify/hydrogen-react': patch
'@shopify/hydrogen': patch
---

Fixed the `ProductProvider` example code (both TS and JS): restored the missing `return` in the `.map()` callback so option buttons render, and removed a stray semicolon that rendered as visible text.
