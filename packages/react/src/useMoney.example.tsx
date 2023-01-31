import {useMoney, ShopifyProvider} from '@shopify/storefront-kit-react';
import type {MoneyV2} from '@shopify/storefront-kit-react/storefront-api-types';

export function App() {
  return (
    // @ts-expect-error missing values for shopifyConfig
    <ShopifyProvider shopifyConfig={{locale: 'en'}}>
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
