# @shopify/hydrogen

## 2023.7.10

### Patch Changes

- Ensure `storefrontRedirect` fallback only redirects to relative URLs. ([#1399](https://github.com/Shopify/hydrogen/pull/1399)) by [@frandiox](https://github.com/frandiox)

## 2023.7.9

### Patch Changes

- Allow generic inference in standalone usage of WithCache type - Contributed by @chinanderm ([#1363](https://github.com/Shopify/hydrogen/pull/1363)) by [@wizardlyhel](https://github.com/wizardlyhel)

- Cart Optimistic UI helpers ([#1366](https://github.com/Shopify/hydrogen/pull/1366)) by [@wizardlyhel](https://github.com/wizardlyhel)

- Fix storefront sub request cache key ([#1375](https://github.com/Shopify/hydrogen/pull/1375)) by [@wizardlyhel](https://github.com/wizardlyhel)

- Fix the Pagination component to use forwardRefs for the NextLink and PreviousLink render props ([#1362](https://github.com/Shopify/hydrogen/pull/1362)) by [@blittle](https://github.com/blittle)

## 2023.7.8

### Patch Changes

- The `error.cause` property throw from the Storefront client is now stringified. ([#1184](https://github.com/Shopify/hydrogen/pull/1184)) by [@frandiox](https://github.com/frandiox)

- Fix Hydrogen's Storefront API client to not throw unhandled promise exceptions. This is because Remix is guaranteed to handle exceptions from the loader and fixing it prevents Hydrogen from crashing when deployed to some runtimes on unhandled promise exceptions. ([#1318](https://github.com/Shopify/hydrogen/pull/1318)) by [@blittle](https://github.com/blittle)

- Relax prop validation on the `getSelectedProductOptions` and `getSelectedProductOptions` utilities to look for member props instead of checking with `instanceof`. ([#1327](https://github.com/Shopify/hydrogen/pull/1327)) by [@blittle](https://github.com/blittle)

## 2023.7.7

### Patch Changes

- Supress the hydration warning in the new `<Script>` component when `nonce` values differ between the server and client, which is expected. ([#1312](https://github.com/Shopify/hydrogen/pull/1312)) by [@frandiox](https://github.com/frandiox)

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

## 2023.7.6

### Patch Changes

- Updated dependencies [[`345f06a2`](https://github.com/Shopify/hydrogen/commit/345f06a27886eceaf1ea6b75971c1130b059e2db)]:
  - @shopify/hydrogen-react@2023.7.4

## 2023.7.5

### Patch Changes

- Fix the Pagination component to reset internal state when the URL changes (not including Pagination params). ([#1291](https://github.com/Shopify/hydrogen/pull/1291)) by [@blittle](https://github.com/blittle)

  We also now validate the connection prop to include a `pageInfo` object with the following properties:

  1. `hasNextPage`
  1. `hasPreviousPage`
  1. `endCursor`
  1. `startCursor`

  Previously our templates had a bug where `startCursor` was not included. Upgrading means the app will error
  until you update your query to include it:

  ```diff
   query CollectionDetails {
     collection(handle: $handle) {
       ...
       pageInfo {
         hasPreviousPage
         hasNextPage
         hasNextPage
         endCursor
  +      startCursor
       }
     }
   }

  ```

## 2023.7.4

### Patch Changes

- Fix hydration errors and stale data within the Pagination component ([#1283](https://github.com/Shopify/hydrogen/pull/1283)) by [@blittle](https://github.com/blittle)

- Add custom product paths to the `VariantSelector` component: ([#1271](https://github.com/Shopify/hydrogen/pull/1271)) by [@blittle](https://github.com/blittle)

  ```tsx
  <VariantSelector handle="snowboard" productPath="shop" options={options}>
    {/* ... */}
  </VariantSelector>
  ```

- Add functionality for creating a Content Security Policy. See the [guide on Content Security Policies](https://shopify.dev/docs/custom-storefronts/hydrogen/content-security-policy) for more details. ([#1235](https://github.com/Shopify/hydrogen/pull/1235)) by [@blittle](https://github.com/blittle)

- Updated dependencies [[`06516ee9`](https://github.com/Shopify/hydrogen/commit/06516ee91f20153902c2b8ef79c0f6690ba385bb), [`423acee2`](https://github.com/Shopify/hydrogen/commit/423acee243c62e49a865ff2cd82735991aca1d8f)]:
  - @shopify/hydrogen-react@2023.7.3

## 2023.7.3

### Patch Changes

- Exported the type `CookieOptions` from `cartSetIdDefault` ([#1153](https://github.com/Shopify/hydrogen/pull/1153)) by [@remcolakens](https://github.com/remcolakens)

- Updated dependencies [[`e9e1736a`](https://github.com/Shopify/hydrogen/commit/e9e1736ace6bd981e8109e38402eb405f7c865c1), [`1a0e858d`](https://github.com/Shopify/hydrogen/commit/1a0e858d94ea7d14f3f37ca32d288b33436038b0)]:
  - @shopify/hydrogen-react@2023.7.2

## 2023.7.2

### Patch Changes

- Surface storefront api response errors ([#1205](https://github.com/Shopify/hydrogen/pull/1205)) by [@wizardlyhel](https://github.com/wizardlyhel)

- Updated dependencies [[`d80c4ada`](https://github.com/Shopify/hydrogen/commit/d80c4ada051dd5530c12720cb7d8e8c6dda19c98)]:
  - @shopify/hydrogen-react@2023.7.1

## 2023.7.1

### Patch Changes

- Update to Remix v1.19.1. ([#1172](https://github.com/Shopify/hydrogen/pull/1172)) by [@frandiox](https://github.com/frandiox)

  See changes for [1.18](https://github.com/remix-run/remix/releases/tag/remix%401.18.0) and [1.19](https://github.com/remix-run/remix/releases/tag/remix%401.19.0).

## 2023.7.0

## What’s new

⭐️ Check out our [blog post](https://hydrogen.shopify.dev/updates) with all the latest updates on Hydrogen, and what’s coming on the roadmap.

The latest version of Hydrogen comes with new and updated components and utilities that can help you speed up your build:

- An updated server-side [Cart component](https://shopify.dev/docs/custom-storefronts/hydrogen/cart) with built-in abstractions to handle most common cart operations, including adding, updating, or deleting line items, applying discounts, and more.
- A drop-in [`<Pagination/>` component](https://shopify.dev/docs/custom-storefronts/hydrogen/data-fetching/pagination) to make it easier to handle large product collections.
- A new [`<VariantSelector/>` component](https://shopify.dev/docs/custom-storefronts/hydrogen/cart/variant-selector) that makes it faster to build progressively enhanced product forms.
- Improved support for predictive search and local pickup options through Storefront API version [2023-07](https://shopify.dev/docs/api/release-notes/2023-07#graphql-storefront-api-changes).

### Breaking Changes

- `createWithCache` is now stable. All imports need to be updated: ([#1151](https://github.com/Shopify/hydrogen/pull/1151)) by [@blittle](https://github.com/blittle)

  ```diff
  - import {createWithCache_unstable} from '@shopify/hydrogen';
  + import {createWithCache} from '@shopify/hydrogen';
  ```

- `Pagination` and `getPaginationVariables` are now stable. ([#1129](https://github.com/Shopify/hydrogen/pull/1129)) by [@blittle](https://github.com/blittle)

  All imports to each should be updated:

  ```diff
  - import {Pagiatinon__unstable, getPaginationVariables__unstable} from '@shopify/hydrogen';
  + import {Pagiatinon, getPaginationVariables} from '@shopify/hydrogen';
  ```

### Patch Changes

- Function and component for cart management: ([#786](https://github.com/Shopify/hydrogen/pull/786)) by [@wizardlyhel](https://github.com/wizardlyhel)

  - `createCartHandler` - Creates an object instance that simplifies cart operations such as add/update/remove from cart.
  - `CartForm` - A form component that helps you sets up form inputs for cart handler.

  **Documentation:**

  - Updated [how-to guides](https://shopify.dev/docs/custom-storefronts/hydrogen/cart)
  - [`createCartHandler`](https://shopify.dev/docs/api/hydrogen/2023-04/utilities/createcarthandler)
  - [`CartForm`](https://shopify.dev/docs/api/hydrogen/2023-04/components/cartform)

- Export useLoadScript ([#1080](https://github.com/Shopify/hydrogen/pull/1080)) by [@wizardlyhel](https://github.com/wizardlyhel)

- Throw error when `storeDomain` is not passed to `createStorefrontClient`. ([#1128](https://github.com/Shopify/hydrogen/pull/1128)) by [@frandiox](https://github.com/frandiox)

- Improve warning and error format for known Hydrogen messages in development. ([#1093](https://github.com/Shopify/hydrogen/pull/1093)) by [@frandiox](https://github.com/frandiox)

- Add an example using the new [Customer Account API](https://shopify.dev/docs/api/customer) ([#1126](https://github.com/Shopify/hydrogen/pull/1126)) by [@blittle](https://github.com/blittle)

- Corrected the `$attributes` type in `CART_ATTRIBUTES_UPDATE_MUTATION` to match the expected one ([#1117](https://github.com/Shopify/hydrogen/pull/1117)) by [@remcolakens](https://github.com/remcolakens)

- Fix cache key by url encode the sub request keys ([#1105](https://github.com/Shopify/hydrogen/pull/1105)) by [@wizardlyhel](https://github.com/wizardlyhel)

Add a `<VariantSelector>` component to make building product forms easier. Also added the `getSelectedProductOptions` helper function. See the [guide on using the VariantSelector](https://shopify.dev/docs/custom-storefronts/hydrogen/cart/variant-selector). ([#1027](https://github.com/Shopify/hydrogen/pull/1027)) by [@blittle](https://github.com/blittle)

- Updated dependencies [[`c39411e0`](https://github.com/Shopify/hydrogen/commit/c39411e0454750697d580a1ef4858800c494980f), [`0d2e5ffb`](https://github.com/Shopify/hydrogen/commit/0d2e5ffb68096f1dc48ade8793e6ef53088af6da), [`4bee03df`](https://github.com/Shopify/hydrogen/commit/4bee03df3cc8203510f6b05522c1268aa5e5f2f4), [`11ab64a8`](https://github.com/Shopify/hydrogen/commit/11ab64a88966dd7b90522f15836abfff6f5d595f), [`7a7456a5`](https://github.com/Shopify/hydrogen/commit/7a7456a5ab073559aef37f043e8aa47570639b96)]:
  - @shopify/hydrogen-react@2023.4.6

## 2023.4.6

### Patch Changes

- Updated dependencies [[`b8f41ad7`](https://github.com/Shopify/hydrogen/commit/b8f41ad7174056f304301022a2aa77cecfdf0824)]:
  - @shopify/hydrogen-react@2023.4.5

## 2023.4.5

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

## 2023.4.4

### Patch Changes

- Fix redirects to respond with a 301 ([#946](https://github.com/Shopify/hydrogen/pull/946)) by [@blittle](https://github.com/blittle)

- A default `https://` protocol is now added automatically to `storeDomain` if missing. ([#985](https://github.com/Shopify/hydrogen/pull/985)) by [@frandiox](https://github.com/frandiox)

- Fix `flattenConnection()`'s TypeScript types when working with `edges.node` ([#945](https://github.com/Shopify/hydrogen/pull/945)) by [@frehner](https://github.com/frehner)

- Make `storefrontApiVersion` parameter optional. By default, it will use the current version of Hydrogen as the Storefront API version. ([#984](https://github.com/Shopify/hydrogen/pull/984)) by [@frandiox](https://github.com/frandiox)

- Skip reading and writing cache in sub-requests when the strategy is CacheNone. ([#964](https://github.com/Shopify/hydrogen/pull/964)) by [@frandiox](https://github.com/frandiox)

- Fix `<ModelViewer>` to properly set className ([#966](https://github.com/Shopify/hydrogen/pull/966)) by [@blittle](https://github.com/blittle)

- Add a `/admin` route that redirects to the Shopify admin. This redirect can be disabled by passing `noAdminRedirect: true` to `storefrontRedirect`: ([#989](https://github.com/Shopify/hydrogen/pull/989)) by [@blittle](https://github.com/blittle)

  ```ts
  storefrontRedirect({
    redirect,
    response,
    storefront,
    noAdminRedirect: true,
  });
  ```

- Updated dependencies [[`7b4afea2`](https://github.com/Shopify/hydrogen/commit/7b4afea29a050f9c77482540e321d9bc60351b2e), [`32515232`](https://github.com/Shopify/hydrogen/commit/32515232aa03077b542f5fcf95f38a715af09327), [`7d6a1a7c`](https://github.com/Shopify/hydrogen/commit/7d6a1a7cd3adb6ee0cf4cf242b72d5650509639b), [`442f602a`](https://github.com/Shopify/hydrogen/commit/442f602a45902beeb188575a85151f45b8be23ca), [`b9ab8eb7`](https://github.com/Shopify/hydrogen/commit/b9ab8eb70f1506ab7516804ea69ecb9a693c420a), [`93a7c3c6`](https://github.com/Shopify/hydrogen/commit/93a7c3c65fc10c8b1a16cee5fa57ad932d278dc8)]:
  - @shopify/hydrogen-react@2023.4.4

## 2023.4.3

### Patch Changes

- Fix release ([#926](https://github.com/Shopify/hydrogen/pull/926)) by [@blittle](https://github.com/blittle)

- Updated dependencies [[`7aaa4e86`](https://github.com/Shopify/hydrogen/commit/7aaa4e86739e22b2d9a517e2b2cfc20110c87acd)]:
  - @shopify/hydrogen-react@2023.4.3

## 2023.4.2

### Patch Changes

- Add support for generated types from the new unstable codegen feature in the CLI. ([#707](https://github.com/Shopify/hydrogen/pull/707)) by [@frandiox](https://github.com/frandiox)

- Add a `<Pagination__unstable>` component and `getPaginationVariables__unstable` helper to make rendering large lists from the Storefront API easy. This is an initial unstable release and we expect to finalize the API by the 2023-07 release. See the [`<Pagination>` component documentation](https://shopify.dev/docs/api/hydrogen/2023-04/components/pagination). ([#755](https://github.com/Shopify/hydrogen/pull/755)) by [@cartogram](https://github.com/cartogram)

- Updated dependencies [[`2e1e4590`](https://github.com/Shopify/hydrogen/commit/2e1e45905444ab04fe1fe308ecd2bd00a0e8fce1)]:
  - @shopify/hydrogen-react@2023.4.2

## 2023.4.1

### Patch Changes

- Adds `parseGid()` which is a helper function that takes in a [Shopify GID](https://shopify.dev/docs/api/usage/gids) and returns the `resource` and `id` from it. For example: ([#845](https://github.com/Shopify/hydrogen/pull/845)) by [@frehner](https://github.com/frehner)

  ```js
  import {parseGid} from '@shopify/hydrogen-react';

  const {id, resource} = parseGid('gid://shopify/Order/123');

  console.log(id); // 123
  console.log(resource); // Order
  ```

- Avoid warning about missing `buyerIp` when using private access tokens in development. ([#836](https://github.com/Shopify/hydrogen/pull/836)) by [@frandiox](https://github.com/frandiox)

- Updated dependencies [[`0a009a3b`](https://github.com/Shopify/hydrogen/commit/0a009a3ba06dadd8f9d799575d7f88590f82a966)]:
  - @shopify/hydrogen-react@2023.4.1

## 2023.4.0

### Major Changes

- Releases `2023-04` ([#754](https://github.com/Shopify/hydrogen/pull/754)) by [@lordofthecactus](https://github.com/lordofthecactus)

- Updates Hydrogen to [Storefront 2023-04 API release](https://shopify.dev/docs/api/release-notes/2023-04).

- Updates types from `CartLineConnection` to `BaseCartLineConnection`.

- Deprecates `CartLinePrice` from `@shopify/hydrogen-react` use `Money` instead:

  ```diff
  - import {CartLinePrice} from '@shopify/hydrogen-react';
  + import {Money} from '@shopify/hydrogen-react';
  ```

  ```diff
  - <CartLinePrice line={line} />
  + <Money data={line.priceV2} />
  ```

  [Check the docs for using `Money` 💵.](https://shopify.dev/docs/api/hydrogen-react/2023-04/components/money)

- Adds a new `Image` component, replacing the existing one. While your existing implementation won't break, props `widths` and `loaderOptions` are now deprecated disregarded, with a new `aspectRatio` prop added. ([#787](https://github.com/Shopify/hydrogen/pull/787)) by [@benjaminsehl](https://github.com/benjaminsehl)

  ### Migrating to the new `Image`

  The new `Image` component is responsive by default, and requires less configuration to ensure the right image size is being rendered on all screen sizes.

  **Before**

  ```jsx
  <Image
    data={image}
    widths={[400, 800, 1200]}
    width="100px"
    sizes="90vw"
    loaderOptions={{
      scale: 2,
      crop: 'left',
    }}
  />
  ```

  **After**

  ```jsx
  <Image data={image} sizes="90vw" crop="left" aspectRatio="3/2" />
  ```

  Note that `widths` and `loaderOptions` have now been deprecated, declaring `width` is no longer necessary, and we’ve added an `aspectRatio` prop:

  - `widths` is now calculated automatically based on a new `srcSetOptions` prop (see below for details).
  - `loaderOptions` has been removed in favour of declaring `crop` and `src` as props. `width` and `height` should only be set as props if rendering a fixed image size, with `width` otherwise defaulting to `100%`, and the loader calculating each dynamically.
  - `aspectRatio` is calculated automatically using `data.width` and `data.height` (if available) — but if you want to present an image with an aspect ratio other than what was uploaded, you can set using the format `Int/Int` (e.g. `3/2`, [see MDN docs for more info](https://developer.mozilla.org/en-US/docs/Web/CSS/aspect-ratio), note that you must use the _fraction_ style of declaring aspect ratio, decimals are not supported); if you've set an `aspectRatio`, we will default the crop to be `crop: center` (in the example above we've specified this to use `left` instead).

  ### Examples

  <!-- Simplest possible usage -->

  #### Basic Usage

  ```jsx
  <Image data={data} />
  ```

  This would use all default props, which if exhaustively declared would be the same as typing:

  ```jsx
  <Image
    data={data}
    crop="center"
    decoding="async"
    loading="lazy"
    width="100%"
    sizes="100vw"
    srcSetOptions={{
      interval: 15,
      startingWidth: 200,
      incrementSize: 200,
      placeholderWidth: 100,
    }}
  />
  ```

  An alternative way to write this without using `data` would be to use the `src`, `alt`, and `aspectRatio` props. For example:

  ```jsx
  <Image
    src={data.url}
    alt={data.altText}
    aspectRatio={`${data.width}/${data.height}`}
  />
  ```

  Assuming `data` had the following shape:

  ```json
  {
    "url": "https://cdn.shopify.com/s/files/1/0551/4566/0472/products/Main.jpg",
    "altText": "alt text",
    "width": "4000",
    "height": "4000"
  }
  ```

  All three above examples would result in the following HTML:

  ```html
  <img
    srcset="https://cdn.shopify.com/s/files/1/0551/4566/0472/products/Main.jpg?width=300&height=300&crop=center 300w, … *13 additional sizes* … https://cdn.shopify.com/s/files/1/0551/4566/0472/products/Main.jpg?width=3000&height=3000&crop=center 3000w"
    src="https://cdn.shopify.com/s/files/1/0551/4566/0472/products/Main.jpg?width=100&height=100&crop=center"
    alt="alt text"
    sizes="100vw"
    loading="lazy"
    decoding="async"
    width="100px"
    height="100px"
    style="aspect-ratio: 4000 / 4000;"
  />
  ```

  #### Fixed-size Images

  When using images that are meant to be a fixed size, like showing a preview image of a product in the cart, instead of using `aspectRatio`, you'll instead declare `width` and `height` manually with fixed values. For example:

  ```jsx
  <Image data={data} width={80} height={80} />
  ```

  Instead of generating 15 images for a broad range of screen sizes, `Image` will instead only generate 3, for various screen pixel densities (1x, 2x, and 3x). The above example would result in the following HTML:

  ```html
  <img
    srcset="
      https://cdn.shopify.com/s/files/1/0551/4566/0472/products/Main.jpg?width=80&height=80&crop=center   1x,
      https://cdn.shopify.com/s/files/1/0551/4566/0472/products/Main.jpg?width=160&height=160&crop=center 2x,
      https://cdn.shopify.com/s/files/1/0551/4566/0472/products/Main.jpg?width=240&height=240&crop=center 3x
    "
    src="https://cdn.shopify.com/s/files/1/0551/4566/0472/products/Main.jpg?width=80&height=80"
    alt="alt text"
    loading="lazy"
    width="80px"
    height="80px"
    style="aspect-ratio: 80 / 80;"
  />
  ```

  If you don't want to have a fixed aspect ratio, and instead respect whatever is returned from your query, the following syntax can also be used:

  ```jsx
  <Image data={data} width="5rem" />
  ```

  Which would result in the same HTML as above, however the generated URLs inside the `src` and `srcset` attributes would not have `height` or `crop` parameters appended to them, and the generated `aspect-ratio` in `style` would be `4000 / 4000` (if using the same `data` values as our original example).

  #### Custom Loaders

  If your image isn't coming from the Storefront API, but you still want to take advantage of the `Image` component, you can pass a custom `loader` prop, provided the CDN you're working with supports URL-based transformations.

  The `loader` is a function which expects a `params` argument of the following type:

  ```ts
  type LoaderParams = {
    /** The base URL of the image */
    src?: ImageType['url'];
    /** The URL param that controls width */
    width?: number;
    /** The URL param that controls height */
    height?: number;
    /** The URL param that controls the cropping region */
    crop?: Crop;
  };
  ```

  Here is an example of using `Image` with a custom loader function:

  ```jsx
  const customLoader = ({src, width, height, crop}) => {
    return `${src}?w=${width}&h=${height}&gravity=${crop}`;
  };

  export default function CustomImage(props) {
    <Image loader={customLoader} {...props} />;
  }

  // In Use:

  <CustomImage data={customCDNImageData} />;
  ```

  If your CDN happens to support the same semantics as Shopify (URL params of `width`, `height`, and `crop`) — the default loader will work a non-Shopify `src` attribute.

  An example output might look like: `https://mycdn.com/image.jpeg?width=100&height=100&crop=center`

  ### Additional changes

  - Added the `srcSetOptions` prop used to create the image URLs used in `srcset`. It’s an object with the following keys and defaults:

    ```js
    srcSetOptions = {
      intervals: 15, // The number of sizes to generate
      startingWidth: 200, // The smalles image size
      incrementSize: 200, // The increment by to increase for each size, in pixesl
      placeholderWidth: 100, // The size used for placeholder fallback images
    };
    ```

  - Added an export for `IMAGE_FRAGMENT`, which can be imported from Hydrogen and used in any Storefront API query, which will fetch the required fields needed by the component.

  - Added an export for `shopifyLoader` for using Storefront API responses in conjunction with alternative frameworks that already have their own `Image` component, like Next.js

### Patch Changes

- Updated dependencies [[`82b6af7`](https://github.com/Shopify/hydrogen/commit/82b6af71cafe1f88c24630178e61cd09e5a59f5e), [`361879e`](https://github.com/Shopify/hydrogen/commit/361879ee11dfe8f1ee916b022165b1e7f0e45964)]:
  - @shopify/hydrogen-react@2023.4.0

## 2023.1.7

### Patch Changes

- Bump internal Remix dependencies to 1.15.0. ([#728](https://github.com/Shopify/hydrogen/pull/728)) by [@wizardlyhel](https://github.com/wizardlyhel)

  Recommendations to follow:

  - Upgrade all the Remix packages in your app to 1.15.0.
  - Enable Remix v2 future flags at your earliest convenience following [the official guide](https://remix.run/docs/en/1.15.0/pages/v2).

- Add an experimental `createWithCache_unstable` utility, which creates a function similar to `useQuery` from Hydrogen v1. Use this utility to query third-party APIs and apply custom cache options. ([#600](https://github.com/Shopify/hydrogen/pull/600)) by [@frandiox](https://github.com/frandiox)

  To setup the utility, update your `server.ts`:

  ```js
  import {
    createStorefrontClient,
    createWithCache_unstable,
    CacheLong,
  } from '@shopify/hydrogen';

  // ...

    const cache = await caches.open('hydrogen');
    const withCache = createWithCache_unstable({cache, waitUntil});

    // Create custom utilities to query third-party APIs:
    const fetchMyCMS = (query) => {
      // Prefix the cache key and make it unique based on arguments.
      return withCache(['my-cms', query], CacheLong(), () => {
        const cmsData = await (await fetch('my-cms.com/api', {
          method: 'POST',
          body: query
        })).json();

        const nextPage = (await fetch('my-cms.com/api', {
          method: 'POST',
          body: cmsData1.nextPageQuery,
        })).json();

        return {...cmsData, nextPage}
      });
    };

    const handleRequest = createRequestHandler({
      build: remixBuild,
      mode: process.env.NODE_ENV,
      getLoadContext: () => ({
        session,
        waitUntil,
        storefront,
        env,
        fetchMyCMS,
      }),
    });
  ```

  **Note:** The utility is unstable and subject to change before stabalizing in the 2023.04 release.

- Updated dependencies [[`85ae63a`](https://github.com/Shopify/hydrogen/commit/85ae63ac37e5c4200919d8ae6c861c60effb4ded), [`5e26503`](https://github.com/Shopify/hydrogen/commit/5e2650374441fb5ae4840215fefdd5d547a378c0)]:
  - @shopify/hydrogen-react@2023.1.8

## 2023.1.6

### Patch Changes

- Add new `loader` API for setting seo tags within route module ([#591](https://github.com/Shopify/hydrogen/pull/591)) by [@cartogram](https://github.com/cartogram)

- `ShopPayButton` component now can receive a `storeDomain`. The component now does not require `ShopifyProvider`. ([#645](https://github.com/Shopify/hydrogen/pull/645)) by [@lordofthecactus](https://github.com/lordofthecactus)

- 1. Update Remix to 1.14.0 ([#599](https://github.com/Shopify/hydrogen/pull/599)) by [@blittle](https://github.com/blittle)

  1. Add `Cache-Control` defaults to all the demo store routes

- Added `robots` option to SEO config that allows users granular control over the robots meta tag. This can be set on both a global and per-page basis using the handle.seo property. ([#572](https://github.com/Shopify/hydrogen/pull/572)) by [@cartogram](https://github.com/cartogram)

  Example:

  ```ts
  export handle = {
    seo: {
      robots: {
        noIndex: false,
        noFollow: false,
      }
    }
  }
  ```

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

- Updated dependencies [[`c78f441`](https://github.com/Shopify/hydrogen/commit/c78f4410cccaf99d93b2a4e4fbd877fcaa2c1bce), [`7fca5d5`](https://github.com/Shopify/hydrogen/commit/7fca5d569be1d6749fdfa5ada6723d8186f0d775)]:
  - @shopify/hydrogen-react@2023.1.7

## 2023.1.5

### Patch Changes

- Fix the latest tag ([#562](https://github.com/Shopify/hydrogen/pull/562)) by [@blittle](https://github.com/blittle)

## 2023.1.4

### Patch Changes

- Fix template imports to only reference `@shopify/hydrogen`, not `@shopify/hydrogen-react` ([#523](https://github.com/Shopify/hydrogen/pull/523)) by [@blittle](https://github.com/blittle)

## 2023.1.3

### Patch Changes

- Send Hydrogen version in Storefront API requests. ([#471](https://github.com/Shopify/hydrogen/pull/471)) by [@frandiox](https://github.com/frandiox)

- Fix default Storefront type in LoaderArgs. ([#496](https://github.com/Shopify/hydrogen/pull/496)) by [@frandiox](https://github.com/frandiox)

## 2023.1.2

### Patch Changes

- Add license files and readmes for all packages ([#463](https://github.com/Shopify/hydrogen/pull/463)) by [@blittle](https://github.com/blittle)

## 2023.1.1

### Patch Changes

- Initial release
