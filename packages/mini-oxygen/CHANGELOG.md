# @shopify/mini-oxygen

## 2.0.0

### Major Changes

- Mini Oxygen can no longer be used in a standalone fashion
- It is now built as ESM module
- Support for the JSON based configuration file is dropped and as such the `oxygen-gen-config` command no longer exists

## 1.7.0

### Minor Changes

- Add reload method that sets new env vars and reloads Miniflare.
- 8572625: Add compatability date to match production version of Oxygen

## 1.6.0

- Change minioxygen's events route to avoid conflicts with actual routes. ([PR](https://github.com/Shopify/mini-oxygen/pull/436))

## 1.5.0

- Dependency updates
- Re add hooks that were accidently removed. ([PR](https://github.com/Shopify/mini-oxygen/pull/416))
- Added ability to set oxygen headers along with default values for them ([PR](https://github.com/Shopify/mini-oxygen/pull/417))

## 1.4.0

- Allows mini-oxygen to proxy requests to a HTTP proxy server. ([PR](https://github.com/Shopify/mini-oxygen/pull/275))

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
