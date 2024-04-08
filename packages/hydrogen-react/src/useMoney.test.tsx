import {describe, expect, it} from 'vitest';
import {renderHook} from '@testing-library/react';
import {ShopifyProvider, ShopifyProviderProps} from './ShopifyProvider.js';
import {useMoney} from './useMoney.js';

describe(`useMoney`, () => {
  it('returns an object with all of the details about the money', () => {
    const {result} = renderHook(() =>
      useMoney({
        amount: '19.99',
        currencyCode: 'USD',
      }),
    );

    expect(result.current).toEqual({
      amount: '19.99',
      currencyCode: 'USD',
      currencyName: 'US dollars',
      currencyNarrowSymbol: '$',
      currencySymbol: '$',
      localizedString: '$19.99',
      original: {
        amount: '19.99',
        currencyCode: 'USD',
      },
      parts: [
        {type: 'currency', value: '$'},
        {type: 'integer', value: '19'},
        {type: 'decimal', value: '.'},
        {type: 'fraction', value: '99'},
      ],
      withoutTrailingZeros: '$19.99',
      withoutTrailingZerosAndCurrency: '19.99',
    });
  });

  it(`removes trailing zeros when necessary`, () => {
    const {result} = renderHook(() =>
      useMoney({
        amount: '19.00',
        currencyCode: 'USD',
      }),
    );

    expect(result.current).toEqual({
      amount: '19.00',
      currencyCode: 'USD',
      currencyName: 'US dollars',
      currencyNarrowSymbol: '$',
      currencySymbol: '$',
      localizedString: '$19.00',
      original: {
        amount: '19.00',
        currencyCode: 'USD',
      },
      parts: [
        {type: 'currency', value: '$'},
        {type: 'integer', value: '19'},
        {type: 'decimal', value: '.'},
        {type: 'fraction', value: '00'},
      ],
      withoutTrailingZeros: '$19',
      withoutTrailingZerosAndCurrency: '19',
    });
  });

  it(`does not fail when language ISO code is more than 2 characters`, () => {
    const SHOPIFY_CONFIG: ShopifyProviderProps = {
      storeDomain: 'https://notashop.myshopify.com',
      storefrontToken: 'abc123',
      storefrontApiVersion: '2024-04',
      countryIsoCode: 'BR',
      languageIsoCode: 'PT_PT',
    };

    const {result} = renderHook(
      () =>
        useMoney({
          amount: '19.00',
          currencyCode: 'USD',
        }),
      {
        wrapper: ({children}) => (
          <ShopifyProvider
            {...SHOPIFY_CONFIG}
            storeDomain="https://notashop.myshopify.com"
          >
            {children}
          </ShopifyProvider>
        ),
      },
    );

    expect(result.current).toEqual({
      amount: '19,00 ',
      currencyCode: 'USD',
      currencyName: 'dólares dos Estados Unidos',
      currencyNarrowSymbol: '$',
      currencySymbol: 'US$',
      localizedString: '19,00 US$',
      original: {
        amount: '19.00',
        currencyCode: 'USD',
      },
      parts: [
        {
          type: 'integer',
          value: '19',
        },
        {
          type: 'decimal',
          value: ',',
        },
        {
          type: 'fraction',
          value: '00',
        },
        {
          type: 'literal',
          value: ' ',
        },
        {
          type: 'currency',
          value: 'US$',
        },
      ],
      withoutTrailingZeros: '19 US$',
      withoutTrailingZerosAndCurrency: '19',
    });
  });
});
