---
'@shopify/cli-hydrogen': patch
---

Clean up messaging around unlinked storefronts when running CLI commands

- When you run `env list`, `env pull`, or `deploy` against a storefront that isn't linked, it will show a warning message instead of an error message.
- If you don't have a storefront to link to on Admin, we will just ask you to create a storefront instead of displaying an option list of size 1.
- If you deleted a storefront on Admin, we will try to relink your storefront when running `env list`, `env pull`, or `deploy`.
