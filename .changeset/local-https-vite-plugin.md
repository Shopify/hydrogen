---
"@shopify/hydrogen": minor
---

Add `localHttps()` under `@shopify/hydrogen/vite` for portable local HTTPS development with Customer Account API flows. Frameworks that terminate HTTPS outside Vite can use `localHttps(...).api.getDevServerConfig()`.

Certificates are provisioned automatically: the plugin (on `vite dev`), the `provisionLocalHttps()` helper, and the `hydrogen setup https` CLI command download a pinned, checksum-verified mkcert release for macOS, Linux, or Windows, install the local certificate authority, and generate the certificate files. The plugin skips automatic provisioning in CI environments; the explicit paths remain available there.
