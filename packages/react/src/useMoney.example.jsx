import {useMoney, ShopifyProvider} from '@shopify/storefront-kit-react';

export function App() {
  return (
    <ShopifyProvider languageIsoCode="EN" countryIsoCode="US">
      <UsingMoney />
    </ShopifyProvider>
  );
}

function UsingMoney() {
  const myMoney = {amount: '100', currencyCode: 'USD'};
  const money = useMoney(myMoney);
  return (
    <>
      <div>Localized money: {money.localizedString}</div>
      <div>Money without trailing zeros: {money.withoutTrailingZeros}</div>
    </>
  );
}
