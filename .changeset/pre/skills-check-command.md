---
"@shopify/hydrogen": minor
---

Add `hydrogen skills check`, which exits non-zero when the project's synced skills do not match the installed `@shopify/hydrogen`, or were never synced. It prints the summary `skills sync` would act on and writes nothing. The default `--mode=error` gates CI; `--mode=warn` prints the same message and exits zero for dev scripts.
