---
'@shopify/cli-hydrogen': patch
---

Fix `hydrogen dev` with `--port 0` when using `--customer-account-push`. Port 0 (OS-assigned) caused cloudflared to target `localhost:0` while Vite resolved to a concrete port internally. The port is now resolved upfront via `findPort` so both cloudflared and Vite bind to the same origin.
