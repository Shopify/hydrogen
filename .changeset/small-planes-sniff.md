---
'@shopify/cli-hydrogen': patch
'@shopify/hydrogen': patch
---

Removed magic routes and `.hydrogen` template routes. See `rfc/obsolete-routing.md` for details of what used to be in the package but has now been removed.

`/__health` still exists for the moment, though at some point it will probably be removed as well.
