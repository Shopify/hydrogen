---
"@shopify/hydrogen": minor
---

Add `hydrogen skills sync` to keep packaged agent skills aligned with the installed `@shopify/hydrogen` version. Skills are always written to both `.claude/skills` and `.agents/skills`, covering Claude Code, Codex, Cursor, and OpenCode without configuration. Each copied `SKILL.md` records the package version and a content hash under frontmatter `metadata`. Rerunning the command after an upgrade overwrites unmodified skills, adds new ones, removes skills the package no longer ships, and leaves locally modified skills alone unless `--force` is passed. If you edited a skill the package no longer ships, you are asked before it is removed; without a terminal (for example in CI) it is kept and a warning is printed. `hydrogen setup` runs the same sync after installing the package and accepts the same `--force`, so rerunning it over previously synced skills now updates them instead of failing. Preview templates ship their skills with the same metadata, so `skills sync` works on deployed templates too.

Projects that ran `hydrogen setup` before this version have skills without the metadata block. Run `npx @shopify/hydrogen skills sync --force` once to adopt them; later syncs then manage them normally. Skills from those earlier copies whose names are no longer shipped are not recognised and should be deleted by hand.
