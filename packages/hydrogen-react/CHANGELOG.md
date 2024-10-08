# @shopify/hydrogen-react

## 2024.7.6

### Patch Changes

- Image component: support local assets in development ([#2573](https://github.com/Shopify/hydrogen/pull/2573)) by [@scottdixon](https://github.com/scottdixon)

## 2024.7.5

### Patch Changes

- Remove unstable re-exports from remix-oxygen package ([#2551](https://github.com/Shopify/hydrogen/pull/2551)) by [@wizardlyhel](https://github.com/wizardlyhel)

## 2024.7.4

### Patch Changes

- Emit a document event `shopifyCustomerPrivacyApiLoaded` when Customer Privacy API is ready and fix analytics events sending to Shopify. ([#2528](https://github.com/Shopify/hydrogen/pull/2528)) by [@wizardlyhel](https://github.com/wizardlyhel)

## 2024.7.3

### Patch Changes

- Update ProductPrice to use price instead of priceV2, and hide compareAt price if less than regular price ([#2461](https://github.com/Shopify/hydrogen/pull/2461)) by [@andershagbard](https://github.com/andershagbard)

- Prevent Image component from generating srcset with higher dimensions than source image ([#2469](https://github.com/Shopify/hydrogen/pull/2469)) by [@andershagbard](https://github.com/andershagbard)

## 2024.7.2

### Patch Changes

- Improve performance of currency formatting ([#2372](https://github.com/Shopify/hydrogen/pull/2372)) by [@blittle](https://github.com/blittle)

- Prevent sending analytics data to Shopify when Chrome-Lighthouse user agent is detected ([#2401](https://github.com/Shopify/hydrogen/pull/2401)) by [@wizardlyhel](https://github.com/wizardlyhel)

## 2024.7.1

### Patch Changes

- Add `sellingPlanId` support to `BuyNowButton`. ([#2254](https://github.com/Shopify/hydrogen/pull/2254)) by [@dvisockas](https://github.com/dvisockas)

## 2024.4.3

### Patch Changes

- Fix shopify cookie domain setting ([#2142](https://github.com/Shopify/hydrogen/pull/2142)) by [@wizardlyhel](https://github.com/wizardlyhel)

- Add a RichText component to easily render \`rich_text_field\` metafields. Thank you @bastienrobert for the original implementation. Example usage: ([#2144](https://github.com/Shopify/hydrogen/pull/2144)) by [@blittle](https://github.com/blittle)

  ```tsx
  import {RichText} from '@shopify/hydrogen-react';

  export function MainRichText({metaFieldData}: {metaFieldData: string}) {
    return (
      <RichText
        data={metaFieldData}
        components={{
          paragraph({node}) {
            return <p className="customClass">{node.children}</p>;
          },
        }}
      />
    );
  }
  ```

## 2024.4.2

### Patch Changes

- Ensure the `getShopifyDomain` method from the [`useShop` hook](https://shopify.dev/docs/api/hydrogen-react/2024-01/hooks/useshop#:~:text=%2D%20storefrontToken-,getShopifyDomain,-%28props%3F%3A) always includes the HTTPS protocol. ([#2079](https://github.com/Shopify/hydrogen/pull/2079)) by [@michenly](https://github.com/michenly)

## 2024.4.1

### Patch Changes

- Fix noteUpdate scalar to be required ([#2008](https://github.com/Shopify/hydrogen/pull/2008)) by [@blittle](https://github.com/blittle)

## 2024.4.0

### Patch Changes

- Introducing `<UNSTABLE_Analytics.Provider>` that also includes Shopify analytics, Customer Privacy API and Privacy banner ([#1789](https://github.com/Shopify/hydrogen/pull/1789)) by [@wizardlyhel](https://github.com/wizardlyhel)

- Fall back to "mock.shop" when no value is passed in `storeDomain` to `createStorefrontClient` in development. ([#1971](https://github.com/Shopify/hydrogen/pull/1971)) by [@frandiox](https://github.com/frandiox)

- Expose `cartReady` state from the cart context. ([#1885](https://github.com/Shopify/hydrogen/pull/1885)) by [@celsowhite](https://github.com/celsowhite)

## 2024.1.1

### Patch Changes

- Fix `useLoadScript` to avoid infinite re-renders when using its second parameter. ([#1775](https://github.com/Shopify/hydrogen/pull/1775)) by [@frandiox](https://github.com/frandiox)

## 2024.1.0

### Major Changes

- Upgrade to [Storefront API v2024-01](https://shopify.dev/docs/api/release-notes/2024-01#storefront-api-changes) ([#1642](https://github.com/Shopify/hydrogen/pull/1642)) by [@wizardlyhel](https://github.com/wizardlyhel)

### Patch Changes

- Fix `<model-viewer>`'s `onPause` event listener, with improved readability contributed by @sanjaiyan-dev ([#1669](https://github.com/Shopify/hydrogen/pull/1669)) by [@wizardlyhel](https://github.com/wizardlyhel)

- Add `React.forwardRef` to `Video` and `ExternalVideo` components ([#1415](https://github.com/Shopify/hydrogen/pull/1415)) by [@andershagbard](https://github.com/andershagbard)

## 2023.10.1

### Patch Changes

- Update all Node.js dependencies to version 18. (Not a breaking change, since Node.js 18 is already required by Remix v2.) ([#1543](https://github.com/Shopify/hydrogen/pull/1543)) by [@michenly](https://github.com/michenly)

- Skip private access token warning when using mock.shop. ([#1538](https://github.com/Shopify/hydrogen/pull/1538)) by [@frandiox](https://github.com/frandiox)

- Add an optional `channel` prop to the `ShopPayButton` component, which adds order attribution support for either the Headless or Hydrogen sales channel. ([#1447](https://github.com/Shopify/hydrogen/pull/1447)) by [@QuintonC](https://github.com/QuintonC)

## 2023.10.0

### Major Changes

- The Storefront API types included are now generated using `@graphql-codegen/typescript@4` ([changelog](https://github.com/dotansimha/graphql-code-generator/blob/master/packages/plugins/typescript/typescript/CHANGELOG.md#400)). This results in a breaking change if you were importing `Scalars` directly from `@shopify/hydrogen-react` or `@shopify/hydrogen`: ([#1108](https://github.com/Shopify/hydrogen/pull/1108)) by [@frandiox](https://github.com/frandiox)

  ```diff
   import type {Scalars} from '@shopify/hydrogen/storefront-api-types';

   type Props = {
  -  id: Scalars['ID']; // This was a string
  +  id: Scalars['ID']['input']; // Need to access 'input' or 'output' to get the string
   };
  ```

### Patch Changes

- Remove deprecated parameters and props (#1455 and #1435): ([#1435](https://github.com/Shopify/hydrogen/pull/1435)) by [@wizardlyhel](https://github.com/wizardlyhel)

  - `createStorefrontClient` parameters `buyerIp` and `requestGroupId`
  - `<Image>` props `loaderOptions` and `widths`

## 2023.7.6

### Patch Changes

- Fix template dist package due to CI error ([#1451](https://github.com/Shopify/hydrogen/pull/1451)) by [@wizardlyhel](https://github.com/wizardlyhel)

## 2023.7.5

### Patch Changes

- Add Language to CartProvider ([#1408](https://github.com/Shopify/hydrogen/pull/1408)) by [@Qubica](https://github.com/Qubica)

- Add attributes option to useLoadScript ([#1442](https://github.com/Shopify/hydrogen/pull/1442)) by [@wizardlyhel](https://github.com/wizardlyhel)

- Unlock `hydrogen-react` package.json exports to make it easier to use with NextJS and other frameworks. **Note**: Using Hydrogen internals is not officially supported, and those internal APIs could change at anytime outside our usual calendar versioning. ([#994](https://github.com/Shopify/hydrogen/pull/994)) by [@blittle](https://github.com/blittle)

## 2023.7.4

### Patch Changes

- Fix incorrect creation of cookie token that only happens on specific dates ([#1294](https://github.com/Shopify/hydrogen/pull/1294)) by [@wizardlyhel](https://github.com/wizardlyhel)

## 2023.7.3

### Patch Changes

- Hydrogen is now compatible with TypeScript v5. ([#1240](https://github.com/Shopify/hydrogen/pull/1240)) by [@frandiox](https://github.com/frandiox)

  If you have `typescript` as a dev dependency in your app, it is recommended to change its version as follows:

  ```diff
    "devDependencies": {
      ...
  -   "typescript": "^4.9.5",
  +   "typescript": "^5.2.2",
    },
  ```

  After installing the new version of TypeScript, you may need to update the version used in your IDE. For example, in VSCode, you can do this by clicking on the `{ }` icon in the bottom-right toolbar next to the language mode (generally, `{ } TypeScript JSX` when editing a `.tsx` file).

- Fix passing `ref` to the `<Image>` component. ([#1268](https://github.com/Shopify/hydrogen/pull/1268)) by [@frandiox](https://github.com/frandiox)

## 2023.7.2

### Patch Changes

- This change updates the implementation of the parseGid function so that it uses the builtin `URL` class to parse the gid. This enables the parts of the string, such as the search params, to be parsed as well ([#1185](https://github.com/Shopify/hydrogen/pull/1185)) by [@tatemz](https://github.com/tatemz)

- Image component docs typo - Contributed by @MilosMosovsky ([#1243](https://github.com/Shopify/hydrogen/pull/1243)) by [@wizardlyhel](https://github.com/wizardlyhel)

## 2023.7.1

### Patch Changes

- Fix demo-store analytics ([#1177](https://github.com/Shopify/hydrogen/pull/1177)) by [@wizardlyhel](https://github.com/wizardlyhel)

## 2023.7.0

## What’s new

⭐️ Check out our [blog post](https://hydrogen.shopify.dev/updates) with all the latest updates on Hydrogen, and what’s coming on the roadmap.

This major release includes support for the [2023-07 version](https://shopify.dev/docs/api/release-notes/2023-07#graphql-storefront-api-changes) of the Storefront API. This version doesn't include any breaking changes, but adds support for predictive search and local pickup options.

### Patch Changes

- Export useLoadScript ([#1080](https://github.com/Shopify/hydrogen/pull/1080)) by [@wizardlyhel](https://github.com/wizardlyhel)

- Fix long language code breaking useMoney hook - Contributed by @QuentinGibson ([#1132](https://github.com/Shopify/hydrogen/pull/1132)) by [@wizardlyhel](https://github.com/wizardlyhel)

- Throw error when `storeDomain` is not passed to `createStorefrontClient`. ([#1128](https://github.com/Shopify/hydrogen/pull/1128)) by [@frandiox](https://github.com/frandiox)

- Improve warning and error format for known Hydrogen messages in development. ([#1093](https://github.com/Shopify/hydrogen/pull/1093)) by [@frandiox](https://github.com/frandiox)

- Add discountCode.applicable in default Cart fragment ([#1040](https://github.com/Shopify/hydrogen/pull/1040)) by [@pnodet](https://github.com/pnodet)

## 2023.4.5

### Patch Changes

- Add JSDoc examples to <Money /> and useMoney ([#1021](https://github.com/Shopify/hydrogen/pull/1021)) by [@juanpprieto](https://github.com/juanpprieto)

## 2023.4.4

### Patch Changes

- A default `https://` protocol is now added automatically to `storeDomain` if missing. ([#985](https://github.com/Shopify/hydrogen/pull/985)) by [@frandiox](https://github.com/frandiox)

- Add support for [`mock.shop`](https://mock.shop/) as a `storeDomain`. ([#986](https://github.com/Shopify/hydrogen/pull/986)) by [@frandiox](https://github.com/frandiox)

- Fix `flattenConnection()`'s TypeScript types when working with `edges.node` ([#945](https://github.com/Shopify/hydrogen/pull/945)) by [@frehner](https://github.com/frehner)

- Make `storefrontApiVersion` parameter optional. By default, it will use the current version of Hydrogen as the Storefront API version. ([#984](https://github.com/Shopify/hydrogen/pull/984)) by [@frandiox](https://github.com/frandiox)

- Fix the `<CartProvider>` to by default pull localization from `<ShopifyProvider>`. You can still override the countryCode by passing a prop directly to `<CartProvider>`. Resovles https://github.com/Shopify/hydrogen/issues/622 ([#980](https://github.com/Shopify/hydrogen/pull/980)) by [@blittle](https://github.com/blittle)

- Fix `<ModelViewer>` to properly set className ([#966](https://github.com/Shopify/hydrogen/pull/966)) by [@blittle](https://github.com/blittle)

## 2023.4.3

### Patch Changes

- Fix release ([#926](https://github.com/Shopify/hydrogen/pull/926)) by [@blittle](https://github.com/blittle)

## 2023.4.2

### Patch Changes

- Fix issue where the `<BuyNowButton/>` would incorrectly redirect to checkout when React re-renders in certain situations. ([#827](https://github.com/Shopify/hydrogen/pull/827)) by [@tiwac100](https://github.com/tiwac100)

## 2023.4.1

### Patch Changes

- Adds `parseGid()` which is a helper function that takes in a [Shopify GID](https://shopify.dev/docs/api/usage/gids) and returns the `resource` and `id` from it. For example: ([#845](https://github.com/Shopify/hydrogen/pull/845)) by [@frehner](https://github.com/frehner)

  ```js
  import {parseGid} from '@shopify/hydrogen-react';

  const {id, resource} = parseGid('gid://shopify/Order/123');

  console.log(id); // 123
  console.log(resource); // Order
  ```

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

## 2023.1.8

### Patch Changes

- Fix `parseGid()` to return a query string if it was a part of the original GID. ([#723](https://github.com/Shopify/hydrogen/pull/723)) by [@wizardlyhel](https://github.com/wizardlyhel)

- Add the raw product returned from the Storefront API to also return from `useProduct()`: ([#735](https://github.com/Shopify/hydrogen/pull/735)) by [@blittle](https://github.com/blittle)

  ```ts
  function SomeComponent() {
    const {product} = useProduct();

    return (
      <div>
        <h2>{product.title}</h2>
        <h3>{product.description}</h3>
      </div>
    );
  }
  ```

## 2023.1.7

### Patch Changes

- `ShopPayButton` component now can receive a `storeDomain`. The component now does not require `ShopifyProvider`. ([#645](https://github.com/Shopify/hydrogen/pull/645)) by [@lordofthecactus](https://github.com/lordofthecactus)

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

## 2023.1.6

### Patch Changes

- 67da795: Fix issue with props on the `<CartLineQuantityAdjustButton />` being possibly overwritten.
- 0152f3d: Update internal deps
- 8302b55: (Internal) Migrate from `yarn` to `npm`
- 37d036f: Fixed an issue in which the Storefront Client had a check that was meant to only run on the client, but was also running on the server.

## 2023.1.5

### Patch Changes

- b8757bd: Fix the UMD global variable name from `storefrontkitreact` to `hydrogenreact`.
- 6225d33: Add a deprecation notice to `<CartLinePrice/>`:

  Use `Money` instead. To migrate, use the `priceType` prop that matches the corresponding property on the `CartLine` object:

  - `regular`: `cartLine.cost.totalAmount`
  - `compareAt`: `cartLine.cost.compareAtAmountPerQuantity`

  For example:

  ```jsx
  // before
  <CartLinePrice data={cartLine} priceType="regular" />
  // after
  <Money data={cartLine.cost.totalAmount} />
  ```

- 2bb8c81: Adding `<CartLineQuantity />` and `<CartLineQuantityAdjustButton />`

  The `<CartLineQuantity />` and `<CartLineQuantityAdjustButton />` components have been added / migrated over from Hydrogen v1.

  Additionally, fixed a bug when using `<CartLineQuantityAdjustButton />` that caused CartLine Attributes to be erased. CartLine Attributes should now be persisted when using that component.

  ## `useCartLine()` TypeScript types update

  `useCartLine()`'s TypeScript type originally returned a `CartLine`. It has now been updated to be `PartialDeep<CartLine>`, which makes all the properties optional instead of required. This matches with the rest of hydrogen-react in that we can't know or guarnatee what properties exist on certain objects so we reflect that state in the TypeScript types.

- eb1656f: Update docs

## 2023.1.4

### Major Changes

This is admittedly a strange release.

It has been decided to rename the repo back to `@shopify/hydrogen-react`, and with that we're abandoning the name `@shopify/storefront-kit-react`. Sorry about that, and hopefully it isn't too big of an inconvenience.

Additionally, the renaming offered an opportunity to introduce a couple of breaking changes that normally we wouldn't do in a `patch` release. This is the one and only time that we'll do this, so again, we apologize for the strangeness and inconvenience.

Depending on your upgrade path, here's a summary of the changes you need to be aware of:

- If upgrading from `@shopify/storefront-kit-react`
  - Please note the breaking changes below to [`<ShopifyProvider />`](#shopifyprovider) and [`useShop()`](#useshop)
  - Please note the breaking changes below to the Analytics components
- If upgrading from an older release of `@shopify/hydrogen-react`
  - Please note the breaking changes below to [`<ShopifyProvider />`](#shopifyprovider) and [`useShop()`](#useshop)
  - Analytics components were [added in 2023.1.2](#202312), and then were updated in this release
  - Please note the breaking changes in the [`2023.1.1`](#202311) release below

---

The detailed changelog now follows:

- 8d8ab13: ## Breaking Changes on Shopify analytics components

  - `useShopifyCookies` - if hasUserConsent is `false`, no cookies will be set
  - `sendShopifyAnalytics` - if `hasUserConsent` is false, no analytics will be sent
  - `ShopifyAppSource` got rename to `ShopifySalesChannel`
  - `getClientBrowserParameters` returns empty string for each field key if run on server
  - Added documents on analytics components

- 6184517: Added the following components and hooks, which have been a part of this package for a while but weren't actually able to be used/imported.

  - `<CartCost />`
  - `<CartLinePrice />`
  - `<CartLineProvider />`
  - `useCartLine()`

- 3309706: `<ShopifyProvider />` and `useShop()` have had a breaking update:

  ## `ShopifyProvider`

  - `<ShopifyProvider />` previously accepted a single `shopifyConfig` object as a prop; now, each of the keys in this object are their own separate props.
  - We also removed `country` and `language` as objects, and they are now strings with the names `countryIsoCode` and `languageIsoCode`, respectively.
  - The `locale` prop has been removed completely; this was a duplicative prop that was a combination of `countryIsoCode` and `languageIsoCode`, so it made no sense to have to include it as well.

  An example:

  ```tsx
  // previously:

  <ShopifyProvider
    shopifyConfig={{
      storeDomain: 'my-store',
      storefrontToken: 'abc123',
      storefrontApiVersion: '2022-10',
      country: {
        isoCode: 'CA',
      },
      language: {
        isoCode: 'EN',
      },
      locale: 'EN-CA',
    }}
  >
    {/* rest of your client-side app */}
  </ShopifyProvider>
  ```

  ```tsx
  // now

  <ShopifyProvider
    storeDomain="my-store"
    storefrontToken="abc123"
    storefrontApiVersion="2022-10"
    countryIsoCode="CA"
    languageIsoCode="EN"
  >
    {/* rest of your client-side app */}
  </ShopifyProvider>
  ```

  ## `useShop()`

  As noted above, `locale` was removed from the `<ShopifyProvider />` component, and `countryIsoCode` and `languageIsoCode` were renamed. Here's an example of how the return value of `useShop()` was affected

  ```tsx
  // before

  const {country, language, locale} = useShop();

  console.log(country.isoCode);
  console.log(language.isoCode);
  console.log(locale);
  ```

  ```tsx
  // after

  const {countryIsoCode, languageIsoCode} = useShop();

  console.log(countryIsoCode);
  console.log(languageIsoCode);
  console.log(`${languageIsoCode}-${countryIsoCode}`);
  ```

  Note that `locale` can be replicated by combining `languageIsoCode` and `countryIsoCode` with a hypthen (`-`) between them.

## 2023.1.3

### Patch Changes

- 736cc41: In the version 2023.1.1 "Breaking Changes" section, we said

  > The storefront client and ShopifyProvider now provide the `storeDomain` exactly as it is received; it's recommended that you pass the domain with the protocol and the fully-qualified domain name for your Storefront. For example: `https://hydrogen-test.myshopify.com`

  Unfortunately, the Storefront Client wasn't fully updated to actually do that. This update corrects this bug, but also means that you need to provide a full URL to your Storefront Domain (as was originally intended in our breaking change update).

## 2023.1.2

### Patch Changes

- 16b6b81: Shopify Analytics

  Methods:

  - `useShopifyCookies(hasUserConsent = true, domain = ''): void` - sets and refreshes Shopify cookies
  - `getShopifyCookie(cookieString: string): ShopifyCookie` - returns Shopify cookies
  - `sendShopifyAnalytics({eventName: AnalyticsEventName, payload: ShopifyAnalytics}, domain?): Promise<void>` - sends Shopify analytics
  - `getClientBrowserParameters(): ClientBrowserParameters` - returns commonly tracked client browser values

  Constants:

  - `AnalyticsEventName` - list of Shopify accepted analytics events
  - `AnalyticsPageType` - list of Shopify accepted page type names
  - `ShopifyAppSource` - list of Shopify accepted application source

  Types:

  - `ShopifyCookies`
  - `ClientBrowserParameters`
  - `ShopifyAnalytics` - generic type for `ShopifyPageView` and `ShopifyAddToCart`
  - `ShopifyAnalyticsPayload` - generic type for `ShopifyPageViewPayload` and `ShopifyAddToCartPayload`
  - `ShopifyPageView`
  - `ShopifyPageViewPayload`
  - `ShopifyAddToCart`
  - `ShopifyAddToCartPayload`
  - `ShopifyAnalyticsProduct`

## 2023.1.1

### Changes

- 9bff83c: Updated to Storefront API version `2023-01`

  ## Storefront API Changes

  The Storefront API changelog can be viewed [here](https://shopify.dev/api/release-notes/2023-01#graphql-storefront-api-changes). There are not any breaking changes in the Storefront API itself.

  ## Hydrogen React changes

  ### Breaking Changes

  - The default Cart query no longer uses `compareAtPriceV2` and `priceV2`; use `compareAtPrice` and `price` instead. The `V2` fields will be removed in an upcoming version of the Storefront API.
  - The storefront client and ShopifyProvider now provide the `storeDomain` exactly as it is received; it's recommended that you pass the domain with the protocol and the fully-qualified domain name for your Storefront. For example: `https://hydrogen-test.myshopify.com`
  - `parseMetafield`'s implementation has been updated and vastly improved so that it is correctly parsing all the metafield types.

    - The parsed metafield will now be found on the `parsedValue` property. For example:

      ```ts
      const metafield = parseMetafield(rawMetafield);

      console.log(metafield.parsedValue);
      ```

    - Additionally, a new TypeScript type called `ParsedMetafield` is provided to help the `parseMetafield` function return the correct TypeScript types, by passing the type of metafield into the `ParsedMetafield` type. For example:

      ```ts
      const metafield =
        parseMetafield<ParsedMetafield['boolean']>(rawMetafield);

      // parsedValue is a boolean
      if (metafield.parsedValue === true) {
      }
      ```

  - The `<Metafield/>` component has been removed; use `parseMetafield().parsedValue` to have control over what you want to render

  ### Other Changes

  - The TypeScript types for the returned value of `flattenConnection()` should now be friendlier: if you are using a `PartialDeep` object, you'll still get a `PartialDeep` object in return; if you're NOT using a `PartialDeep` object, then the returned type will not be wrapped in `PartialDeep`.

## 2022.10.8

### Patch Changes

- c1359eb: Actually add content to the READMEs so that they're seen when published to NPM.

## 2022.10.7

### Patch Changes

- 3d3d123: This is the final release of the package called "Hydrogen-UI." This package will be renamed to "storefront-kit", and will be published as `@shopify/storefront-kit-react`.

  See you in the new package!

## 2022.10.6

### Patch Changes

- f570f72: Added the `price` and `compareAtPrice` fields to our `defaultCartFragment`, which is used to get the Cart fields in the `<CartProvider />` component.

  The above fields should be identical to `priceV2` and `compareAtPriceV2`, with the exception that these `V2` fields are being deprecated in a future version of the Storefront API.

  We'll keep both for now, to help deveopers upgrade without issues, and then remove the `V2` versions in a future breaking update.

- 203abf9: Fix bad path for `require()` statements in non-Node environments.
- de1429e: CartProvider small internal fix to the last valid card and previous stored cart.

## 2022.10.5

### Patch Changes

- b1989c9: Fix issue with `package.json`'s `main` and `module` fields that were not updated to point to the new output directory structure.
- a776e01: Update the TypeScript types for `<Money/>` so that the default rendered element is a `"div"`.
- f1ffd57: Show storefront development warnings only once.

## 2022.10.4

### Patch Changes

- 6a3a0b3: Add `CartLinePrice` component
- ad4aca4: Update TypeScript types for `<MediaFile/>` so that `mediaOptions`'s properties are all optional instead of required.
- 669809a: `<ShopifyProvider/>` and `useShop()` updates:

  - Added a function `getShopifyDomain()` which will return a fully-qualified domain URL for your Shopify backend. For example:

    ```ts
    const {getShopifyDomain} = useShop();
    console.log(getShopifyDomain());
    // 'https://test.myshopify.com'
    ```

    This matches the function that was added to `createStorefrontClient()`.

  - ShopifyProvider's `storeDomain` prop can now accept the Shopify backend subdomain, matching how `createStorefrontClient()`'s `storeDomain` prop. ShopifyProvider still accepts a full domain, but that will be removed in a future breaking change.

  ```tsx
  // preferred
  <ShopifyProvider shopifyConfig={{storeDomain: 'shop'}}></ShopifyProvider>

  // still works, but will be removed in the future
  <ShopifyProvider shopifyConfig={{storeDomain: 'shop.myshopify.com'}}></ShopifyProvider>
  ```

## 2022.10.3

### Patch Changes

- ccfbbbd: Adds the functions `getStorefrontApiUrl()` and `getPublicTokenHeaders()` to the object returned by `useShop()` (and provided by `<ShopifyProvider/>`).

  For example:

  ```ts
  const {storefrontId, getPublicTokenHeaders, getStorefrontApiUrl} = useShop();

  fetch(getStorefrontApiUrl(), {
    headers: getPublicTokenHeaders({contentType: 'json'})
    body: {...}
  })
  ```

- 0683765: Adds CartLines components and hooks.

  - The `CartLineProvider` component creates a context for using a cart line.
  - The `useCartLine` hook provides access to the cart line object. It must be a descendent of a `CartProvider` component.

- 94fdddd: Provide a mapping of Storefront API's custom scalars to their actual types, for use with GraphQL CodeGen.

  For example:

  ```ts
  import {storefrontApiCustomScalars} from '@shopify/hydrogen-react';

  const config: CodegenConfig = {
    // Use the schema that's bundled with @shopify/hydrogen-react
    schema: './node_modules/@shopify/hydrogen-react/storefront.schema.json',
    generates: {
      './gql/': {
        preset: 'client',
        plugins: [],
        config: {
          // Use the custom scalar definitions that @shopify/hydrogen-react provides to improve the custom scalar types
          scalars: storefrontApiCustomScalars,
        },
      },
    },
  };
  ```

- 676eb75: Adds additional builds for Node-specific targets, to help ensure that server-side code was getting compiled for server-side runtimes, instead of browser-side code for server-side runtimes.
- 2dc6ac4: Add a new utility helper for getting the myshopify domain for the site:

  ```ts
  const client = createStorefrontClient(...);
  client.getShopifyDomain() === `https://testing.myshopify.com`;
  ```

## 2022.10.2

### Patch Changes

- d31be71: Added <CartCheckoutButton /> that redirects to the CheckoutUrl when clicked.
- 8005144: Adds the AddToCartButton component. This component renders a button that adds an item to the cart when pressed.
- f1cb723: Adds BuyNowButton that adds an item to the cart and redirects the customer to checkout.
- a34f44d: Add `<CartCost/>` component
- 1ccbd1c: Introducing the new `metafieldParser()` function and `ParsedMetafield` type.

  ## `metafieldParser()`

  `metafieldParser()` is a temporary name; it will be renamed to `parseMetafield()` in a future release.

  The `metafieldParser()` function is an improvement and enhancement upon the existing `parseMetafield()` and `parseMetafieldValue()` functions. `metafieldParser()` now supports all Metafield types as outlined in the [Storefront API](https://shopify.dev/apps/metafields/types) documentation, including the list types!

  The parsed value can be found on the newly-added `parsedValue` property of the returned object from `metafieldParser()`. For example:

  ```js
  const parsed = metafieldParser(metafield);

  console.log(parsed.parsedValue);
  ```

  `parseMetafieldValue()` has been marked as deprecated and will be removed in a future version of Hydrogen-UI.

  ## The `ParsedMetafield` type

  For TypeScript developers, we also introduce the new `ParsedMetafield` type to help improve your experience. The `ParsedMetafield` type is an object in which the keys map to the type that will be returned from `metafieldParser()`. For example:

  ```ts
  ParsedMetafield['boolean'];
  // or
  ParsedMetafield['list.collection'];
  ```

  When used in conjunction with `metafieldParser()`, it will help TypeScript to understand what the returned object's `parsedValue` type is:

  ```ts
  const parsed = metafieldParser<ParsedMetafield['boolean']>(booleanMetafield)

  // type of `parsedValue` is `boolean | null`
  if(parsed.parsedValue) {
    ...
  }
  ```

  or

  ```ts
  const parsed = metafieldParser<ParsedMetafield['list.collection']>(
    listCollectionMetafield,
  );

  // type of `parsedValue` is `Array<Collection> | null`
  parsed.parsedValue?.map((collection) => {
    console.log(collection?.name);
  });
  ```

- f7a3932: Update the TS types for MediaFile to allow className and other HTML attributes

## 2022.10.1

### Patch Changes

- 71b78b0: Initial release of version `2022-10`!

## 2022.7.1

### Patch Changes

- 702df8f: Fixed issue with TypeScript not being able to find the typings for `@shopify/hydrogen-react/storefront-api-types`
- b9c3940: Add `<CartProvider/>` and releated hooks & types.

  Component:

  - `<CartProvider/>`

  Hooks:

  - `useCart()`
  - `useCartFetch()`
  - `useInstantCheckout()`

  Types:

  - `CartState`
  - `CartStatus`
  - `Cart`
  - `CartWithActions`
  - `CartAction`

  Also updated `flattenConnection()` to better handle a `null` or `undefined` argument.
