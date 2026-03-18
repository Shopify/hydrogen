---
'@shopify/cli-hydrogen': patch
---

Fix multi-version upgrades to accumulate intermediate dependency bumps across all versions between source and target; apply `--legacy-peer-deps` for npm to resolve ERESOLVE conflicts during upgrade
