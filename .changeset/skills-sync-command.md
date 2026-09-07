---
"@shopify/hydrogen": minor
---

Add `hydrogen skills sync` to keep packaged agent skills aligned with the installed `@shopify/hydrogen` version. Each copied `SKILL.md` records the package version and a content hash under frontmatter `metadata`. Rerunning the command after an upgrade overwrites unmodified skills, adds new ones, removes skills the package no longer ships, and leaves locally modified skills alone unless `--force` is passed. `hydrogen setup` runs the same sync after installing the package, so rerunning it over previously synced skills now updates them instead of failing. Preview templates ship their skills with the same metadata, so `skills sync` works on deployed templates too.

Projects that ran `hydrogen setup` before this version have skills without the metadata block. Run `npx @shopify/hydrogen skills sync --force` once to adopt them; later syncs then manage them normally. Skills from those earlier copies whose names are no longer shipped are not recognised and should be deleted by hand.
