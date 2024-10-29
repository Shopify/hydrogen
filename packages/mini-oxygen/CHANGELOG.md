# @shopify/mini-oxygen

## 3.1.0

### Minor Changes

- [**Breaking change**] by [@wizardlyhel](https://github.com/wizardlyhel)

  Support worker compatibility date that aligns with SFAPI release.

  Starting from this major version, on each deploy to Oxygen, Hydrogen will be on Cloudflare worker compatibility date `2024-10-01`. Onwards, Hydrogen will update worker compatibility date on every SFAPI release.

  There is no specific project update that needs to be done in order to get this feature. However, please ensure your project is working properly in an Oxygen deployment when updating to this Hydrogen version. ([#2380](https://github.com/Shopify/hydrogen/pull/2380))

## 3.0.6

### Patch Changes

- Update internal version of the worker runtime. ([#2567](https://github.com/Shopify/hydrogen/pull/2567)) by [@frandiox](https://github.com/frandiox)

## 3.0.5

### Patch Changes

- Prevent infinite redirects when a double slash exists in the URL ([#2449](https://github.com/Shopify/hydrogen/pull/2449)) by [@blittle](https://github.com/blittle)

- Add oxygen-buyer-postal-code and oxygen-buyer-metro-code headers ([#2429](https://github.com/Shopify/hydrogen/pull/2429)) by [@jgodson](https://github.com/jgodson)

## 3.0.4

### Patch Changes

- Security updates ([#2263](https://github.com/Shopify/hydrogen/pull/2263)) by [@dependabot](https://github.com/apps/dependabot)

## 3.0.3

### Patch Changes

- Update server in development when entry point (`<root>/server.js`) changes. ([#2153](https://github.com/Shopify/hydrogen/pull/2153)) by [@frandiox](https://github.com/frandiox)

- Improve errors when a CJS dependency needs to be added to Vite's ssr.optimizeDeps.include. ([#2106](https://github.com/Shopify/hydrogen/pull/2106)) by [@frandiox](https://github.com/frandiox)

## 3.0.2

### Patch Changes

- Fix issue where `undici` dependency couldn't be found in some situations. ([#2065](https://github.com/Shopify/hydrogen/pull/2065)) by [@frandiox](https://github.com/frandiox)

- Fix HMR when changing files imported into routes. ([#2077](https://github.com/Shopify/hydrogen/pull/2077)) by [@frandiox](https://github.com/frandiox)

## 3.0.1

### Patch Changes

- Fixed compatibility with Node 21. ([#2003](https://github.com/Shopify/hydrogen/pull/2003)) by [@frandiox](https://github.com/frandiox)

- Fix an SSR HMR issue related to hanging promises during development. ([#2019](https://github.com/Shopify/hydrogen/pull/2019)) by [@frandiox](https://github.com/frandiox)

## 3.0.0

### Major Changes

- The default runtime exported from `@shopify/mini-oxygen` is now based on workerd. ([#1891](https://github.com/Shopify/hydrogen/pull/1891)) by [@frandiox](https://github.com/frandiox)

  The previous Node.js sandbox runtime has been moved to the `@shopify/mini-oxygen/node` export.

  Example usage:

  ```js
  import {createMiniOxygen} from '@shopify/mini-oxygen';

  const miniOxygen = createMiniOxygen({
    workers: [
      {
        name: 'main',
        modules: true,
        script: `export default {
          async fetch() {
            const response = await fetch("https://hydrogen.shopify.dev");
            return response;
          }
        }`,
      },
    ],
  });

  const response = await miniOxygen.dispatchFetch('http://placeholder');
  console.log(await response.text());

  await miniOxygen.dispose();
  ```

### Minor Changes

- Export new Vite plugin from `@shopify/mini-oxygen/vite`. It integrates Vite with MiniOxygen by running the application code within a worker. ([#1935](https://github.com/Shopify/hydrogen/pull/1935)) by [@frandiox](https://github.com/frandiox)

## 2.2.5

### Patch Changes

- Fix step-debugging when running in the Node.js sandbox ([#1501](https://github.com/Shopify/hydrogen/pull/1501)) by [@frandiox](https://github.com/frandiox)

## 2.2.4

### Patch Changes

- Update all Node.js dependencies to version 18. (Not a breaking change, since Node.js 18 is already required by Remix v2.) ([#1543](https://github.com/Shopify/hydrogen/pull/1543)) by [@michenly](https://github.com/michenly)

- Fix how peer dependencies are resolved. ([#1489](https://github.com/Shopify/hydrogen/pull/1489)) by [@frandiox](https://github.com/frandiox)

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
