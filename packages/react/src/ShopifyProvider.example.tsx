import {ShopifyProvider, useShop} from '@shopify/storefront-kit-react';

export default function App() {
  return (
    <ShopifyProvider
      storeDomain="my-store"
      storefrontToken="abc123"
      storefrontApiVersion="2022-10"
      countryIsoCode="CA"
      languageIsoCode="EN"
    >
      <UsingUseShop />
    </ShopifyProvider>
  );
}

export function UsingUseShop() {
  const shop = useShop();

  return (
    <>
      <div>{shop.storeDomain}</div>
      <div>{shop.storefrontToken}</div>
      <div>{shop.storefrontApiVersion}</div>
    </>
  );
}
