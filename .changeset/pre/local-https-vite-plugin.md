---
"@shopify/hydrogen": minor
---

Add `localHttps()` under `@shopify/hydrogen/vite` for portable local HTTPS development with Customer Account API flows. Frameworks that terminate HTTPS outside Vite can use `localHttps(...).api.getDevServerConfig()`.

Certificates can be provisioned by the plugin (after confirmation on `vite dev`), the `provisionLocalHttps()` helper, or the `hydrogen certs install` CLI command. Each path downloads a pinned, checksum-verified mkcert release for macOS, Linux, or Windows, installs the local certificate authority, and generates the certificate files. The plugin skips automatic provisioning in CI environments; the explicit paths remain available there. The paired `hydrogen certs uninstall` command removes Hydrogen's files and can remove the shared mkcert CA when passed `--remove-ca`.

When a local HTTPS server starts outside CI, the plugin uses Shopify CLI to link an unlinked project and push the callback, portless JavaScript origin, and logout URLs to the Customer Account API configuration. Shopify CLI must include `@shopify/cli-hydrogen` 13.0.4 or later. CI, missing CLI support, cancelled linking, and push failures fall back to printing the values for manual configuration without stopping the development server.

Framework templates and examples expose local HTTPS through the `dev:https` package script, which the Vite configuration detects through `npm_lifecycle_event`.
