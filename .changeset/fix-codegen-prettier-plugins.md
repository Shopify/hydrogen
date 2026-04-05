---
'@shopify/cli-hydrogen': patch
---

Fix codegen failing when Prettier plugins (e.g. `prettier-plugin-tailwindcss`, `prettier-plugin-organize-imports`) are configured in the project's `.prettierrc`. Prettier plugins are now excluded from the resolved config used for formatting generated files.
