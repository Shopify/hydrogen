---
'@shopify/mini-oxygen': patch
---

Keep the `https:` scheme in the request URL your worker receives when the Vite dev server runs over HTTPS. Previously MiniOxygen always passed an `http:` URL, so code that relies on `new URL(request.url).origin`, such as Customer Account OAuth, saw the wrong origin during local HTTPS development.
