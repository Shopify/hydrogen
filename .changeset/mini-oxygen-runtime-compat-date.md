---
"@shopify/mini-oxygen": minor
---

The Oxygen Vite plugin now uses the newest compatibility date its bundled Workers runtime supports, in both local development and the `oxygen.json` written for deployments, so local development and production run the same Workers behaviour.

Previously the date came from your installed Hydrogen version, for example `2026-10-01` for Hydrogen 2026.10. The date now changes when you update `@shopify/mini-oxygen`, not when you update Hydrogen. This release uses `2026-07-30`.

If you're on Hydrogen 2026.10 and don't set `compatibilityDate`, your production date moves back from `2026-10-01` to `2026-07-30`. To keep a specific date, set `compatibilityDate` explicitly. It still takes precedence in `oxygen.json`. Local development runs it too, or warns and runs the runtime's date if the runtime doesn't support it yet.
