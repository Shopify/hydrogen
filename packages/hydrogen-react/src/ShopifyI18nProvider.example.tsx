import {ShopifyI18nProvider, useShop} from '@shopify/hydrogen-react';

export default function App() {
  return (
    <ShopifyI18nProvider countryIsoCode="CA" languageIsoCode="EN">
      <UsingUseShop />
    </ShopifyI18nProvider>
  );
}

export function UsingUseShop() {
  const shop = useShop();

  return (
    <>
      <div>{shop.languageIsoCode}</div>
      <div>{shop.countryIsoCode}</div>
    </>
  );
}
