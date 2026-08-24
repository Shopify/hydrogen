---
'@shopify/cli-hydrogen': patch
---

Show an actionable error when a project dependency fails to load its native binding — for example `rolldown` (used by Vite 8 and rolldown-vite) when its `@rolldown/binding-*` binary is missing from `node_modules` — instead of crashing with a raw stack trace.
