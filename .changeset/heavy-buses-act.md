---
'@shopify/cli-hydrogen': patch
---

When using the new Worker runtime for development (with `h2 dev --worker-unstable`), the behavior around serving assets to the browser is now similar to production:

- Assets are served from a different localhost port that the app itself to simulate any possible CORS or CSP issue that could affect in production.
- Assets are served under a nested path, which simulates how assets are served from the CDN in production. This should help find any issues related to the path of the assets earlier, like accessing images in the `public` directory from a CSS file.
