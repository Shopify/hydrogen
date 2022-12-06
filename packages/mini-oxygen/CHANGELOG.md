# @shopify/mini-oxygen

## 1.3.1

### Patch Changes

- 0530ad2: Downgrade get-port to a non esm version

## 0.2.0

### Minor Changes

- c6b07bd: The `ui` object is deprecated in favor of a single `log` function. The deprecated object had one accepted method, `say`, that handled logging, so this change simplifies the interface.

  The `ui.say` was a relic from the first version of the Hydrogen CLI package (now removed in favor of the Shopify CLI) and we no longer need to abide by the restrictions imposed by that dependent package.

### Patch Changes

- b7a00c2: - Enables streams constructor compatibility.
  - Upgrades Miniflare dependencies to 2.8.2.
