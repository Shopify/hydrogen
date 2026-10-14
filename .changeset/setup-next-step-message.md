---
"@shopify/hydrogen": patch
---

`hydrogen setup` now ends a fresh install with `Setup is ready. Next: ask your agent to use the hydrogen-setup skill.` so the console points at the agent skill that finishes scaffolding. Runs that only resync skills on an existing install print no extra message.
