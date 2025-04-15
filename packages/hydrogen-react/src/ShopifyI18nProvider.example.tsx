import {ShopifyI18nProvider, useShop} from '@shopify/hydrogen-react';

export default function App() {
  return (
    <ShopifyI18nProvider country="CA" language="EN">
      <UsingUseShop />
    </ShopifyI18nProvider>
  );
}

export function UsingUseShop() {
  const shop = useShop();

  return (
    <>
      <div>{shop.language}</div>
      <div>{shop.country}</div>
    </>
  );
}
