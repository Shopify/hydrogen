---
"@shopify/hydrogen": minor
---

Add `localHttps()` under `@shopify/hydrogen/vite` for portable local HTTPS development with Customer Account API flows. Frameworks that terminate HTTPS outside Vite can use `localHttps(...).api.getDevServerConfig()`.

Certificates can be provisioned by the plugin (after confirmation on `vite dev`), the `provisionLocalHttps()` helper, or the `hydrogen certs install` CLI command. Each path downloads a pinned, checksum-verified mkcert release for macOS, Linux, or Windows, installs the local certificate authority, and generates the certificate files. The plugin skips automatic provisioning in CI environments; the explicit paths remain available there.
