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
      storefrontApiVersion: '2025-04',
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

  it('handles Customer Account API MoneyV2 with USDC currency', () => {
    // Test that useMoney works with Customer Account API's MoneyV2
    // which may have currency codes not in Storefront API (e.g., USDC)
    const customerMoney = {
      amount: '100.00',
      currencyCode: 'USDC' as const,
    };
    const {result} = renderHook(() => useMoney(customerMoney));

    expect(result.current).toMatchObject({
      amount: '100.00',
      currencyCode: 'USDC',
      currencyName: 'USDC',
      currencySymbol: 'USDC',
      localizedString: '100.00 USDC',
      original: {
        amount: '100.00',
        currencyCode: 'USDC',
      },
      withoutTrailingZeros: '100 USDC',
      withoutTrailingZerosAndCurrency: '100',
    });
  });

  it('handles both Storefront and Customer Account MoneyV2 types', () => {
    // Test with a standard Storefront API currency
    const {result: storefrontResult} = renderHook(() =>
      useMoney({
        amount: '50.00',
        currencyCode: 'USD',
      }),
    );

    expect(storefrontResult.current.currencyCode).toBe('USD');
    expect(storefrontResult.current.amount).toBe('50.00');

    // Test with a Customer Account API specific currency
    const {result: customerResult} = renderHook(() =>
      useMoney({
        amount: '75.00',
        currencyCode: 'EUR',
      }),
    );

    expect(customerResult.current.currencyCode).toBe('EUR');
    expect(customerResult.current.amount).toBe('75.00');
  });
});
