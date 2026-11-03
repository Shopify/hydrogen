---
"@shopify/mini-oxygen": minor
---

Upgrade Miniflare from v3 to v4, so local development runs on a 2026 Workers runtime instead of one from March 2025.

Before, MiniOxygen quietly ran every worker with the March 2025 compatibility date, whatever date you set or Hydrogen inferred. It now runs the date you ask for. If the bundled runtime doesn't support that date yet, MiniOxygen runs the newest date it does support and prints a warning. The `compatibility_date` written to `oxygen.json` for deployments is unchanged. You can remove any `compatibilityDate` override that was only there to make local development start.

If the Workers runtime fails to start, MiniOxygen now shows the runtime's own error message instead of a generic one. In `vite dev`, a failed start fails that request and the next request retries, instead of stopping the dev server.

MiniOxygen re-exports `Request`, `Response`, and `fetch` from Miniflare. Those are now undici 7 classes instead of undici 5.
