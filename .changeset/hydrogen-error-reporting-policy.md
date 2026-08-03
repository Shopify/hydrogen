---
"@shopify/hydrogen": minor
---

Add `configureLogging` / `HydrogenLogger` logging contract.

Default console log prefixes are standardized to `[hydrogen:<level>:<scope>]` via a central logging module; ad-hoc `console.*` call sites are migrated to scoped loggers. Apps can configure a `HydrogenLogger`-compatible sink once with `configureLogging({logger, level})`; the logger receives `(message, context?)` for `trace`, `debug`, `info`, `warn`, `error`, and `fatal`. The built-in console sink remains the default, and serialized inline scripts continue to write to the console because they run outside the app bundle. `no-console` lint now enforces the policy across `packages/hydrogen/src`.
