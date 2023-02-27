import {useMoney, ShopifyProvider} from '@shopify/hydrogen-react';
import type {MoneyV2} from '@shopify/hydrogen-react/storefront-api-types';

export function App() {
  return (
    // @ts-expect-error intentionally missing the rest of the props
    <ShopifyProvider countryIsoCode="US" languageIsoCode="EN">
      <UsingMoney />
    </ShopifyProvider>
  );
}

function UsingMoney() {
  const myMoney = {amount: '100', currencyCode: 'USD'} satisfies MoneyV2;
  const money = useMoney(myMoney);
  return (
    <>
      <div>Localized money: {money.localizedString}</div>
      <div>Money without trailing zeros: {money.withoutTrailingZeros}</div>
    </>
  );
}
