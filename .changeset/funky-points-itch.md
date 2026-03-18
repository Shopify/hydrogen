---
'@shopify/cli-hydrogen': patch
---

Fixed `h2 upgrade` to correctly handle dependency removals when upgrading across multiple versions. Dependencies removed in intermediate releases are now properly removed even when jumping versions.
