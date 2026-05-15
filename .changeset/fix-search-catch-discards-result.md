---
'skeleton': patch
'@shopify/cli-hydrogen': patch
'@shopify/create-hydrogen': patch
---

Fixed search route error handling so search errors are gracefully handled with a fallback instead of causing unhandled rejections.
