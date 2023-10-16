# @shopify/mini-oxygen

## 2.2.3

### Patch Changes

- Increase the request body size limit to 100mb when running locally. ([#1421](https://github.com/Shopify/hydrogen/pull/1421)) by [@frandiox](https://github.com/frandiox)

## 2.2.2

### Patch Changes

- 8863d40: Update @types/connect from 3.4.35 to 3.4.36

## 2.2.1

### Patch Changes

- fc405c0: Fix error stack traces when using `script` option. The sourcemap for the script is loaded using the path passed in `workerFile`.
- df9af93: Add `request-id` header to requests like in Oxygen production.

## 2.2.0

### Minor Changes

- 11a5d6c: - Add a `globalFetch` option to allow for custom fetch implementations.
  - Allow returning responses from the `onRequest` hook to intercept requests. This allows for custom handling of requests in a Node.js environment without going into the app sandbox. When returning a response from `onRequest`, the `onResponse` hook will not be called.
  - Pass a `defaultDispatcher` function as the second parameter to the `onRequest` hook. Calling this function will dispatch the request to the app sandbox as usual and return the response within the context of the hook. This is useful to wrap each request handling in AsyncLocalStorage.

## 2.1.3

### Patch Changes

- defd46c: Update @miniflare/\* from 2.14.0 to 2.14.1
- 6e55835: Update vitest from 0.34.2 to 0.34.3
- caf5b81: Update typescript from 5.1.6 to 5.2.2
- bf27739: Update @miniflare/cache from 2.14.0 to 2.14.1
- e8b1e07: Update eslint from 8.47.0 to 8.48.0

## 2.1.2

### Patch Changes

- 600fa5f: Update @types/source-map-support from 0.5.6 to 0.5.7
- 1a2e508: When the port provided is not available, use the next available port instead of a random one.

## 2.1.1

### Patch Changes

- 189af3d: Update eslint-config-prettier from 8.10.0 to 9.0.0
- 9683ef6: Update @shopify/eslint-plugin from 42.1.0 to 43.0.0
- 907b6f2: Add the nonce found in response headers to the auto-reload script.

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

- 33dc296: - Mini Oxygen can no longer be used in a standalone fashion
  - It is now built as ESM module
  - Support for the JSON based configuration file is dropped and as such the `oxygen-gen-config` command no longer exists
  - The `preview` function has been renamed to `startServer`
  - `startServer` is now a named export

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
