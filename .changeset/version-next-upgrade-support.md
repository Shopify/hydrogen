---
'@shopify/cli-hydrogen': minor
---

Add --version=next support for unpublished version upgrades

The upgrade command now supports the `--version=next` flag, letting developers test unreleased Hydrogen versions

## Usage

Upgrade to the next versions of @shopify/hydrogen and @shopify/mini-oxygen:

```bash
npx shopify hydrogen upgrade --version=next
```
