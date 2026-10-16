---
'@shopify/cli-hydrogen': minor
'@shopify/create-hydrogen': minor
---
Add typed JSON project and account results with explicit initialization outcomes.

Partial setup failures now exit with code 1 in both `shopify hydrogen init` and `npm create @shopify/hydrogen`, including text mode. Linking with an unknown `--storefront` name also exits with an error.
