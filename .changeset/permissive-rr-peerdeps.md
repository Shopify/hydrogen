---
'@shopify/hydrogen': patch
'@shopify/cli-hydrogen': patch
---

Widen React Router peer dependencies from exact versions to caret ranges (`^7.12.0`). This allows Hydrogen projects to use newer React Router minor versions without peer dependency conflicts, particularly with npm's strict resolver. Hydrogen only uses stable public APIs from React Router, so minor version updates are backwards-compatible.
