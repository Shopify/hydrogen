---
'@shopify/cli-hydrogen': patch
---

Make sourcemaps to default be turned on. They were off to prevent sourcemaps leaking server code to the client. Oxygen now makes sure to not serve the sourcemaps, so it's okay to generate them. Also, when sourcemaps are present, we hope to enable sourcemapped stack traces in error logs on Oxygen.
