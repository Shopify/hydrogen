# @shopify/remix-oxygen

## 2.0.11

### Patch Changes

- Bump remix version ([#2740](https://github.com/Shopify/hydrogen/pull/2740)) by [@wizardlyhel](https://github.com/wizardlyhel)

- Turn on Remix `v3_singleFetch` future flag ([#2708](https://github.com/Shopify/hydrogen/pull/2708)) by [@wizardlyhel](https://github.com/wizardlyhel)

## 2.0.10

### Patch Changes

- Bump vite, Remix versions and tailwind v4 alpha to beta ([#2696](https://github.com/Shopify/hydrogen/pull/2696)) by [@wizardlyhel](https://github.com/wizardlyhel)

## 2.0.9

### Patch Changes

- Bump package versions by [@wizardlyhel](https://github.com/wizardlyhel)

## 2.0.8

### Patch Changes

- Remove unstable re-exports from remix-oxygen package ([#2551](https://github.com/Shopify/hydrogen/pull/2551)) by [@wizardlyhel](https://github.com/wizardlyhel)

## 2.0.7

### Patch Changes

- Prevent infinite redirects when a double slash exists in the URL ([#2449](https://github.com/Shopify/hydrogen/pull/2449)) by [@blittle](https://github.com/blittle)

## 2.0.6

### Patch Changes

- Return a 400 BadRequest for HEAD and GET requests that include a body ([#2360](https://github.com/Shopify/hydrogen/pull/2360)) by [@blittle](https://github.com/blittle)

## 2.0.5

### Patch Changes

- Update `@shopify/oxygen-workers-types` to fix issues on Windows. ([#2252](https://github.com/Shopify/hydrogen/pull/2252)) by [@michenly](https://github.com/michenly)

## 2.0.4

### Patch Changes

- Fix compatibility of `/subrequest-profiler` with Vite. ([#1935](https://github.com/Shopify/hydrogen/pull/1935)) by [@frandiox](https://github.com/frandiox)

## 2.0.3

### Patch Changes

- Bump dev dependency ([#1688](https://github.com/Shopify/hydrogen/pull/1688)) by [@wizardlyhel](https://github.com/wizardlyhel)

## 2.0.2

### Patch Changes

- Change peer dependency of `@shopify/oxygen-workers-types` to allow for `^4.0.0` versions. ([#1494](https://github.com/Shopify/hydrogen/pull/1494)) by [@frandiox](https://github.com/frandiox)

- Fix how peer dependencies are resolved. ([#1489](https://github.com/Shopify/hydrogen/pull/1489)) by [@frandiox](https://github.com/frandiox)

## 2.0.1

### Patch Changes

- Change @remix-run/server-runtime to properly be a peer dependency ([#1484](https://github.com/Shopify/hydrogen/pull/1484)) by [@blittle](https://github.com/blittle)

## 2.0.0

### Major Changes

- Remove the function export `getBuyerIp`, which was deprecated in 2023-07. ([#1455](https://github.com/Shopify/hydrogen/pull/1455)) by [@frandiox](https://github.com/frandiox)

## 1.1.8

### Patch Changes

- Integrate the debug-network tooling with the new `--worker-unstable` runtime CLI flag. ([#1387](https://github.com/Shopify/hydrogen/pull/1387)) by [@frandiox](https://github.com/frandiox)

## 1.1.7

### Patch Changes

- Fix subrequest performance in development. ([#1411](https://github.com/Shopify/hydrogen/pull/1411)) by [@frandiox](https://github.com/frandiox)

## 1.1.6

### Patch Changes

- Update the Oxygen Remix adapter to make sure that stack traces are logged in production ([#1393](https://github.com/Shopify/hydrogen/pull/1393)) by [@blittle](https://github.com/blittle)

## 1.1.5

### Patch Changes

- Fix debug-network logger utility. Avoid logging debug-network errors multiple times. ([#1400](https://github.com/Shopify/hydrogen/pull/1400)) by [@frandiox](https://github.com/frandiox)

## 1.1.4

### Patch Changes

- (Unstable) server-side network request debug virtual route ([#1284](https://github.com/Shopify/hydrogen/pull/1284)) by [@wizardlyhel](https://github.com/wizardlyhel)

  1. Update your `server.ts` so that it also passes in the `waitUntil` and `env`.

     ```diff
       const handleRequest = createRequestHandler({
         build: remixBuild,
         mode: process.env.NODE_ENV,
     +    getLoadContext: () => ({session, storefront, env, waitUntil}),
       });
     ```

     If you are using typescript, make sure to update `remix.env.d.ts`

     ```diff
       declare module '@shopify/remix-oxygen' {
         export interface AppLoadContext {
     +     env: Env;
           cart: HydrogenCart;
           storefront: Storefront;
           session: HydrogenSession;
     +      waitUntil: ExecutionContext['waitUntil'];
         }
       }
     ```

  2. Run `npm run dev` and you should see terminal log information about a new virtual route that you can view server-side network requests at http://localhost:3000/debug-network

  3. Open http://localhost:3000/debug-network in a tab and your app another tab. When you navigate around your app, you should see server network requests being logged in the debug-network tab

## 1.1.3

### Patch Changes

- Update @shopify/oxygen-workers-types dependencies ([#1208](https://github.com/Shopify/hydrogen/pull/1208)) by [@juanpprieto](https://github.com/juanpprieto)

## 1.1.2

### Patch Changes

- Update to Remix v1.19.1. ([#1172](https://github.com/Shopify/hydrogen/pull/1172)) by [@frandiox](https://github.com/frandiox)

  See changes for [1.18](https://github.com/remix-run/remix/releases/tag/remix%401.18.0) and [1.19](https://github.com/remix-run/remix/releases/tag/remix%401.19.0).

## 1.1.1

### Patch Changes

- Update Remix to the latest version (`1.17.1`). ([#852](https://github.com/Shopify/hydrogen/pull/852)) by [@frandiox](https://github.com/frandiox)

  When updating your app, remember to also update your Remix dependencies to `1.17.1` in your `package.json` file:

  ```diff
  -"@remix-run/react": "1.15.0",
  +"@remix-run/react": "1.17.1",

  -"@remix-run/dev": "1.15.0",
  -"@remix-run/eslint-config": "1.15.0",
  +"@remix-run/dev": "1.17.1",
  +"@remix-run/eslint-config": "1.17.1",
  ```

## 1.1.0

### Minor Changes

- Updates default `powered-by` header to `Shopify, Hydrogen` ([#961](https://github.com/Shopify/hydrogen/pull/961)) by [@benjaminsehl](https://github.com/benjaminsehl)

## 1.0.7

### Patch Changes

- Fix release ([#926](https://github.com/Shopify/hydrogen/pull/926)) by [@blittle](https://github.com/blittle)

## 1.0.6

### Patch Changes

- Add a default `Powered-By: Shopify-Hydrogen` header. It can be disabled by passing `poweredByHeader: false` in the configuration object of `createRequestHandler`: ([#872](https://github.com/Shopify/hydrogen/pull/872)) by [@blittle](https://github.com/blittle)

  ```ts
  import {createRequestHandler} from '@shopify/remix-oxygen';

  export default {
    async fetch(request) {
      // ...
      const handleRequest = createRequestHandler({
        // ... other properties included
        poweredByHeader: false,
      });
      // ...
    },
  };
  ```

## 1.0.5

### Patch Changes

- Bump internal Remix dependencies to 1.15.0. ([#728](https://github.com/Shopify/hydrogen/pull/728)) by [@wizardlyhel](https://github.com/wizardlyhel)

  Recommendations to follow:

  - Upgrade all the Remix packages in your app to 1.15.0.
  - Enable Remix v2 future flags at your earliest convenience following [the official guide](https://remix.run/docs/en/1.15.0/pages/v2).

## 1.0.4

### Patch Changes

- Fix active cart session event in Live View ([#614](https://github.com/Shopify/hydrogen/pull/614)) by [@wizardlyhel](https://github.com/wizardlyhel)

  Introducing `getStorefrontHeaders` that collects the required Shopify headers for making a
  Storefront API call.

  - Make cart constants available as exports from `@shopify/hydrogen-react`
  - Deprecating `buyerIp` and `requestGroupId` props from `createStorefrontClient` from `@shopify/hydrogen`
  - Deprecating `getBuyerIp` function from `@shopify/remix-oxygen`

  ```diff
  + import {getStorefrontHeaders} from '@shopify/remix-oxygen';
  import {createStorefrontClient, storefrontRedirect} from '@shopify/hydrogen';

  export default {
    async fetch(
      request: Request,
      env: Env,
      executionContext: ExecutionContext,
    ): Promise<Response> {

      const {storefront} = createStorefrontClient({
        cache,
        waitUntil,
  -     buyerIp: getBuyerIp(request),
        i18n: {language: 'EN', country: 'US'},
        publicStorefrontToken: env.PUBLIC_STOREFRONT_API_TOKEN,
        privateStorefrontToken: env.PRIVATE_STOREFRONT_API_TOKEN,
        storeDomain: `https://${env.PUBLIC_STORE_DOMAIN}`,
        storefrontApiVersion: env.PUBLIC_STOREFRONT_API_VERSION || '2023-01',
        storefrontId: env.PUBLIC_STOREFRONT_ID,
  -     requestGroupId: request.headers.get('request-id'),
  +     storefrontHeaders: getStorefrontHeaders(request),
      });
  ```

## 1.0.3

### Patch Changes

- export V2_MetaFunction type ([#511](https://github.com/Shopify/hydrogen/pull/511)) by [@juanpprieto](https://github.com/juanpprieto)

## 1.0.2

### Patch Changes

- Add license files and readmes for all packages ([#463](https://github.com/Shopify/hydrogen/pull/463)) by [@blittle](https://github.com/blittle)

## 1.0.1

### Patch Changes

- Initial release
