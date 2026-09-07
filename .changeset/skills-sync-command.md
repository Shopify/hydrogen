---
"@shopify/hydrogen": minor
---

Add `hydrogen skills sync` to keep packaged agent skills aligned with the installed `@shopify/hydrogen` version. Each copied `SKILL.md` records the package version and a content hash under frontmatter `metadata`. Rerunning the command after an upgrade overwrites unmodified skills, adds new ones, removes skills the package no longer ships, and leaves locally modified skills alone unless `--force` is passed. `hydrogen setup` runs the same sync after installing the package, so it no longer fails when skills already exist.
