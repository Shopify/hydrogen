# @shopify/mini-oxygen

## 2.1.0

### Minor Changes

- c8fa291: move typescript to devDependencies

### Patch Changes

- 21481d0: Update inquirer from 9.2.9 to 9.2.10
- 9eba0a6: Update eslint from 8.46.0 to 8.47.0
- 9da7e5c: Update prettier from 3.0.1 to 3.0.2
- 86c1273: Update vitest from 0.34.1 to 0.34.2
- 8ac4d8f: Avoid server crash on unhandled promises.

## 2.0.2

### Patch Changes

- e174b07: Update vitest from 0.33.0 to 0.34.1
- ba984f0: Update eslint-config-prettier from 8.9.0 to 8.10.0
- 9e3e87b: Update prettier from 3.0.0 to 3.0.1
- 151daa6: Add a new `script` option as an alternative to `workerFile`. This option is used to pass the worker code directly instead of a file path. The `reload` methods also supports `script` to manually reload the worker code.
  Expose `MiniOxygenOptions` type.
- c23dcbe: Expose the internal `createMiniOxygen` function to create a MiniOxygen instance without starting a server.
  The function `startServer` has not changed.

## 2.0.1

### Patch Changes

- 4ab2a98: Update eslint-config-prettier from 8.8.0 to 8.9.0
- d9cb363: Update inquirer from 9.2.8 to 9.2.9
- d86b580: Update eslint from 8.45.0 to 8.46.0

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
