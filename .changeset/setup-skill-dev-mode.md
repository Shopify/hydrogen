---
"@shopify/hydrogen": patch
---

The `hydrogen-setup` skill now checks `/graphiql`, the route Hydrogen serves in development, instead of `/api/graphiql`, which doesn't exist. It also explains that development mode comes from the `development` export condition, which a Node server without a bundler must set with `--conditions=development`. Its framework table lists Remix 3.
