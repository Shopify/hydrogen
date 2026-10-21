---
"@shopify/hydrogen": patch
---

The `hydrogen-setup` account-page step and the `hydrogen-smoke-test` account checks now point at the `hydrogen-local-https` skill when a real login needs a registered HTTPS origin. Because agent shells usually run with `CI` set and no TTY, they tell agents to ask the user to run `dev:https` in a real terminal, which serves trusted HTTPS and registers the Customer Account URLs. They note that `npx hydrogen certs install` only provisions certificate files. If the user can't run `dev:https`, agents fall back to the signed-out checks and say so.
