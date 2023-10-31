# skeleton

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
