---
"@shopify/cli-hydrogen": patch
---

Fix upgrade notice showing incorrect old versions when current version is missing from changelog. The `shopify hydrogen dev` command now correctly displays available upgrades using semver comparison when the current version doesn't exist in changelog.json.
