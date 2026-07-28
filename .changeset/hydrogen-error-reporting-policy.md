---
"@shopify/hydrogen": minor
---

Add `configureLogging` / `HydrogenLogger` logging contract and document the error-reporting policy.

Runtime log prefixes are standardized to `[hydrogen:<level>:<scope>]` via a central logging module; ad-hoc `console.*` call sites are migrated to scoped loggers. `no-console` lint now enforces the policy across `packages/hydrogen/src`. The full taxonomy and contract live in the repo's `error-reporting` skill (`skills/error-reporting/SKILL.md`).
