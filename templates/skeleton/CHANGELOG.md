# skeleton

## 1.0.2

### Patch Changes

- Use new parameters introduced in Storefront API v2024-01 to fix redirection to the product's default variant when there are unknown query params in the URL. ([#1642](https://github.com/Shopify/hydrogen/pull/1642)) by [@wizardlyhel](https://github.com/wizardlyhel)

  ```diff
  -   selectedVariant: variantBySelectedOptions(selectedOptions: $selectedOptions) {
  +   selectedVariant: variantBySelectedOptions(selectedOptions: $selectedOptions, ignoreUnknownOptions: true, caseInsensitiveMatch: true) {
        ...ProductVariant
      }
  ```

- Update the GraphQL config in `.graphqlrc.yml` to use the more modern `projects` structure: ([#1577](https://github.com/Shopify/hydrogen/pull/1577)) by [@frandiox](https://github.com/frandiox)

  ```diff
  -schema: node_modules/@shopify/hydrogen/storefront.schema.json
  +projects:
  + default:
  +    schema: 'node_modules/@shopify/hydrogen/storefront.schema.json'
  ```

  This allows you to add additional projects to the GraphQL config, such as third party CMS schemas.

  Also, you can modify the document paths used for the Storefront API queries. This is useful if you have a large codebase and want to exclude certain files from being used for codegen or other GraphQL utilities:

  ```yaml
  projects:
    default:
      schema: 'node_modules/@shopify/hydrogen/storefront.schema.json'
      documents:
        - '!*.d.ts'
        - '*.{ts,tsx,js,jsx}'
        - 'app/**/*.{ts,tsx,js,jsx}'
  ```

- Improve resiliency of `HydrogenSession` ([#1583](https://github.com/Shopify/hydrogen/pull/1583)) by [@blittle](https://github.com/blittle)

- Update `@shopify/cli` dependency in `package.json`: ([#1579](https://github.com/Shopify/hydrogen/pull/1579)) by [@frandiox](https://github.com/frandiox)

  ```diff
  -   "@shopify/cli": "3.51.0",
  +   "@shopify/cli": "3.52.0",
  ```

- - Update example and template Remix versions to `^2.5.1` ([#1639](https://github.com/Shopify/hydrogen/pull/1639)) by [@wizardlyhel](https://github.com/wizardlyhel)

  - Enable Remix future flags:
    - [`v3_fetcherPersist`](https://remix.run/docs/en/main/hooks/use-fetchers#additional-resources)
    - [`v3_relativeSplatpath`](https://remix.run/docs/en/main/hooks/use-resolved-path#splat-paths)

- Updated dependencies [[`810f48cf`](https://github.com/Shopify/hydrogen/commit/810f48cf5d55f0cfcac6e01fe481db8c76e77cd2), [`8c477cb5`](https://github.com/Shopify/hydrogen/commit/8c477cb565c3e018bf4e13bad01804c21611fb8a), [`42ac4138`](https://github.com/Shopify/hydrogen/commit/42ac4138553c7e1a438b075c4f9cb781edffebc4), [`0241b7d2`](https://github.com/Shopify/hydrogen/commit/0241b7d2dcb887d259ce9033aca356d391bc07df), [`6a897586`](https://github.com/Shopify/hydrogen/commit/6a897586bd0908db90736921d11e4b6bdf29c912), [`0ff63bed`](https://github.com/Shopify/hydrogen/commit/0ff63bed840f5b8a5eb9968b67bd9a5a57099253), [`6bc1d61c`](https://github.com/Shopify/hydrogen/commit/6bc1d61c17a9c9be13f52338d2ab940e64e73495), [`eb0f4bcc`](https://github.com/Shopify/hydrogen/commit/eb0f4bccb57966a00ecb2b88d17dd694599da340), [`400bfee6`](https://github.com/Shopify/hydrogen/commit/400bfee6836a51c6ab5e4804e8b1e9ad48856dcb), [`a69c21ca`](https://github.com/Shopify/hydrogen/commit/a69c21caa15dfedb88afd50f262f17bf86f74836), [`970073e7`](https://github.com/Shopify/hydrogen/commit/970073e78258880505e0de563136b5379d5d24af), [`772118ca`](https://github.com/Shopify/hydrogen/commit/772118ca6aefbd47841fffc6ce42856c2dc779bd), [`335375a6`](https://github.com/Shopify/hydrogen/commit/335375a6b1a512f70e169a82bc87a8392dc8c92c), [`335371ce`](https://github.com/Shopify/hydrogen/commit/335371ceb6e1bd5aebb6104f131d3f22798a245f), [`94509b75`](https://github.com/Shopify/hydrogen/commit/94509b750afefd686971198ed86277e2c70f3176), [`36d6fa2c`](https://github.com/Shopify/hydrogen/commit/36d6fa2c4fa54ff79f06ef17aa41f60478977bc0), [`3e7b6e8a`](https://github.com/Shopify/hydrogen/commit/3e7b6e8a3bf66bad7fc0f9c224f1c163dbe3e288), [`cce65795`](https://github.com/Shopify/hydrogen/commit/cce6579580f849bec9a28cf575f7130ba3627f6b), [`9e3d88d4`](https://github.com/Shopify/hydrogen/commit/9e3d88d498efaa20fe23de9837e0f444180bc787), [`ca1161b2`](https://github.com/Shopify/hydrogen/commit/ca1161b29ad7b4d0838953782fb114d5fe82193a), [`92840e51`](https://github.com/Shopify/hydrogen/commit/92840e51820e5c7822f731affd3f591c0099be10), [`952fedf2`](https://github.com/Shopify/hydrogen/commit/952fedf27b869164550954d1c15f53b32ec02675), [`1bc053c9`](https://github.com/Shopify/hydrogen/commit/1bc053c94ba1be14ddc28be9eb70be7219b295d1)]:
  - @shopify/hydrogen@2024.1.0
  - @shopify/cli-hydrogen@7.0.0
  - @shopify/remix-oxygen@2.0.3

## 1.0.1

### Patch Changes

- Sync up environment variable names across all example & type files. ([#1542](https://github.com/Shopify/hydrogen/pull/1542)) by [@michenly](https://github.com/michenly)

- Remove error boundary from robots.txt file in the Skeleton template ([#1492](https://github.com/Shopify/hydrogen/pull/1492)) by [@andrewcohen](https://github.com/andrewcohen)

- Use the worker runtime by default when running the `dev` or `preview` commands. ([#1525](https://github.com/Shopify/hydrogen/pull/1525)) by [@frandiox](https://github.com/frandiox)

  Enable it in your project by adding the `--worker` flag to your package.json scripts:

  ```diff
  "scripts": {
    "build": "shopify hydrogen build",
  - "dev": "shopify hydrogen dev --codegen",
  + "dev": "shopify hydrogen dev --worker --codegen",
  - "preview": "npm run build && shopify hydrogen preview",
  + "preview": "npm run build && shopify hydrogen preview --worker",
    ...
  }
  ```

- Update to the latest version of `@shopify/oxygen-workers-types`. ([#1494](https://github.com/Shopify/hydrogen/pull/1494)) by [@frandiox](https://github.com/frandiox)

  In TypeScript projects, when updating to the latest `@shopify/remix-oxygen` adapter release, you should also update to the latest version of `@shopify/oxygen-workers-types`:

  ```diff
  "devDependencies": {
    "@remix-run/dev": "2.1.0",
    "@remix-run/eslint-config": "2.1.0",
  - "@shopify/oxygen-workers-types": "^3.17.3",
  + "@shopify/oxygen-workers-types": "^4.0.0",
    "@shopify/prettier-config": "^1.1.2",
    ...
  },
  ```

- Update internal dependencies for bug resolution. ([#1496](https://github.com/Shopify/hydrogen/pull/1496)) by [@vincentezw](https://github.com/vincentezw)

  Update your `@shopify/cli` dependency to avoid duplicated sub-dependencies:

  ```diff
    "dependencies": {
  -   "@shopify/cli": "3.50.2",
  +   "@shopify/cli": "3.51.0",
    }
  ```

- Update all Node.js dependencies to version 18. (Not a breaking change, since Node.js 18 is already required by Remix v2.) ([#1543](https://github.com/Shopify/hydrogen/pull/1543)) by [@michenly](https://github.com/michenly)

- 🐛 fix undefined menu error ([#1533](https://github.com/Shopify/hydrogen/pull/1533)) by [@michenly](https://github.com/michenly)

- Add `@remix-run/server-runtime` dependency. ([#1489](https://github.com/Shopify/hydrogen/pull/1489)) by [@frandiox](https://github.com/frandiox)

  Since Remix is now a peer dependency of `@shopify/remix-oxygen`, you need to add `@remix-run/server-runtime` to your dependencies, with the same version as the rest of your Remix dependencies.

  ```diff
  "dependencies": {
    "@remix-run/react": "2.1.0"
  + "@remix-run/server-runtime": "2.1.0"
    ...
  }
  ```

- Updated dependencies [[`b2a350a7`](https://github.com/Shopify/hydrogen/commit/b2a350a754ea2d29bc267c260dc298a02f8f4470), [`9b4f4534`](https://github.com/Shopify/hydrogen/commit/9b4f453407338874bd8f1a1f619b607670e021d0), [`74ea1dba`](https://github.com/Shopify/hydrogen/commit/74ea1dba9af37a146882df7ed9674be5659862b5), [`2be9ce82`](https://github.com/Shopify/hydrogen/commit/2be9ce82fd4a5121f1772bbb7349e96ed530e84e), [`a9b8bcde`](https://github.com/Shopify/hydrogen/commit/a9b8bcde96c22cedef7d87631d429199810b4a7a), [`bca112ed`](https://github.com/Shopify/hydrogen/commit/bca112ed7db49e533fe49898b663fa0dd318e6ba), [`848c6260`](https://github.com/Shopify/hydrogen/commit/848c6260a2db3a9cb0c86351f0f7128f61e028f0), [`d53b4ed7`](https://github.com/Shopify/hydrogen/commit/d53b4ed752eb0530622a666ea7dcf4b40239cafa), [`961fd8c6`](https://github.com/Shopify/hydrogen/commit/961fd8c630727784f77b9f693d2e8ff8601969fc), [`2bff9fc7`](https://github.com/Shopify/hydrogen/commit/2bff9fc75916fa95f9a9279d069408fb7a33755c), [`c8e8f6fd`](https://github.com/Shopify/hydrogen/commit/c8e8f6fd233e52cf5570b1904af710d6b907aae5), [`8fce70de`](https://github.com/Shopify/hydrogen/commit/8fce70de32bd61ee86a6d895ac43cc1f78f1bf49), [`f90e4d47`](https://github.com/Shopify/hydrogen/commit/f90e4d4713c6c1fc1e921a7ecd08e95fe5da1744), [`e8cc49fe`](https://github.com/Shopify/hydrogen/commit/e8cc49feff18f5ee72d5f6965ff2094addc23466)]:
  - @shopify/cli-hydrogen@6.1.0
  - @shopify/remix-oxygen@2.0.2
  - @shopify/hydrogen@2023.10.3

## 1.0.0

### Major Changes

- The Storefront API 2023-10 now returns menu item URLs that include the `primaryDomainUrl`, instead of defaulting to the Shopify store ID URL (example.myshopify.com). The skeleton template requires changes to check for the `primaryDomainUrl`: by [@blittle](https://github.com/blittle)

  1. Update the `HeaderMenu` component to accept a `primaryDomainUrl` and include
     it in the internal url check

  ```diff
  // app/components/Header.tsx

  + import type {HeaderQuery} from 'storefrontapi.generated';

  export function HeaderMenu({
    menu,
  +  primaryDomainUrl,
    viewport,
  }: {
    menu: HeaderProps['header']['menu'];
  +  primaryDomainUrl: HeaderQuery['shop']['primaryDomain']['url'];
    viewport: Viewport;
  }) {

    // ...code

    // if the url is internal, we strip the domain
    const url =
      item.url.includes('myshopify.com') ||
      item.url.includes(publicStoreDomain) ||
  +   item.url.includes(primaryDomainUrl)
        ? new URL(item.url).pathname
        : item.url;

     // ...code

  }
  ```

  2. Update the `FooterMenu` component to accept a `primaryDomainUrl` prop and include
     it in the internal url check

  ```diff
  // app/components/Footer.tsx

  - import type {FooterQuery} from 'storefrontapi.generated';
  + import type {FooterQuery, HeaderQuery} from 'storefrontapi.generated';

  function FooterMenu({
    menu,
  +  primaryDomainUrl,
  }: {
    menu: FooterQuery['menu'];
  +  primaryDomainUrl: HeaderQuery['shop']['primaryDomain']['url'];
  }) {
    // code...

    // if the url is internal, we strip the domain
    const url =
      item.url.includes('myshopify.com') ||
      item.url.includes(publicStoreDomain) ||
  +   item.url.includes(primaryDomainUrl)
        ? new URL(item.url).pathname
        : item.url;

     // ...code

    );
  }
  ```

  3. Update the `Footer` component to accept a `shop` prop

  ```diff
  export function Footer({
    menu,
  + shop,
  }: FooterQuery & {shop: HeaderQuery['shop']}) {
    return (
      <footer className="footer">
  -      <FooterMenu menu={menu} />
  +      <FooterMenu menu={menu} primaryDomainUrl={shop.primaryDomain.url} />
      </footer>
    );
  }
  ```

  4. Update `Layout.tsx` to pass the `shop` prop

  ```diff
  export function Layout({
    cart,
    children = null,
    footer,
    header,
    isLoggedIn,
  }: LayoutProps) {
    return (
      <>
        <CartAside cart={cart} />
        <SearchAside />
        <MobileMenuAside menu={header.menu} shop={header.shop} />
        <Header header={header} cart={cart} isLoggedIn={isLoggedIn} />
        <main>{children}</main>
        <Suspense>
          <Await resolve={footer}>
  -          {(footer) => <Footer menu={footer.menu}  />}
  +          {(footer) => <Footer menu={footer.menu} shop={header.shop} />}
          </Await>
        </Suspense>
      </>
    );
  }
  ```

### Patch Changes

- If you are calling `useMatches()` in different places of your app to access the data returned by the root loader, you may want to update it to the following pattern to enhance types: ([#1289](https://github.com/Shopify/hydrogen/pull/1289)) by [@frandiox](https://github.com/frandiox)

  ```ts
  // root.tsx

  import {useMatches} from '@remix-run/react';
  import {type SerializeFrom} from '@shopify/remix-oxygen';

  export const useRootLoaderData = () => {
    const [root] = useMatches();
    return root?.data as SerializeFrom<typeof loader>;
  };

  export function loader(context) {
    // ...
  }
  ```

  This way, you can import `useRootLoaderData()` anywhere in your app and get the correct type for the data returned by the root loader.

- Updated dependencies [[`81400439`](https://github.com/Shopify/hydrogen/commit/814004397c1d17ef0a53a425ed28a42cf67765cf), [`a6f397b6`](https://github.com/Shopify/hydrogen/commit/a6f397b64dc6a0d856cb7961731ee1f86bf80292), [`3464ec04`](https://github.com/Shopify/hydrogen/commit/3464ec04a084e1ceb30ee19874dc1b9171ce2b34), [`7fc088e2`](https://github.com/Shopify/hydrogen/commit/7fc088e21bea47840788cb7c60f873ce1f253128), [`867e0b03`](https://github.com/Shopify/hydrogen/commit/867e0b033fc9eb04b7250baea97d8fd49d26ccca), [`ad45656c`](https://github.com/Shopify/hydrogen/commit/ad45656c5f663cc1a60eab5daab4da1dfd0e6cc3), [`f24e3424`](https://github.com/Shopify/hydrogen/commit/f24e3424c8e2b363b181b71fcbd3e45f696fdd3f), [`66a48573`](https://github.com/Shopify/hydrogen/commit/66a4857387148b6a104df5783314c74aca8aada0), [`0ae7cbe2`](https://github.com/Shopify/hydrogen/commit/0ae7cbe280d8351126e11dc13f35d7277d9b2d86), [`8198c1be`](https://github.com/Shopify/hydrogen/commit/8198c1befdfafb39fbcc88d71f91d21eae252973), [`ad45656c`](https://github.com/Shopify/hydrogen/commit/ad45656c5f663cc1a60eab5daab4da1dfd0e6cc3)]:
  - @shopify/hydrogen@2023.10.0
  - @shopify/remix-oxygen@2.0.0
  - @shopify/cli-hydrogen@6.0.0
