---
'demo-store': patch
'@shopify/cli-hydrogen': patch
'@shopify/create-hydrogen': patch
---

Move unstable apis to stable

- CLI codegen option updates from `--codegen-unstable` to `--codegen`
- Move `createCartHandler`'s `customMethods__unstable` to stable
