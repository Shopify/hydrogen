---
'@shopify/cli-hydrogen': minor
---

Added a new `shortcut` command that creates a global `h2` alias for the Hydrogen CLI:

```sh
$> npx shopify hydrogen shortcut
```

After that, you can run commands using the new alias:

```sh
$> h2 generate route home
$> h2 g r home # Same as the above
$> h2 check routes
```
