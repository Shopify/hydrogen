---
"@shopify/hydrogen": patch
---

`hydrogen setup` now installs `@shopify/hydrogen` from the `latest` dist-tag instead of `preview`, and the `hydrogen-setup` skill asks for `@shopify/hydrogen` 2026.10.0 or later instead of the `preview` tag. If you synced skills from a preview release, run `npx @shopify/hydrogen skills sync` after upgrading to pick up the updated skill.
