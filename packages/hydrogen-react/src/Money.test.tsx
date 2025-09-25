import {describe, expect, it} from 'vitest';

import {render, screen} from '@testing-library/react';
import {Money} from './Money.js';
import {ShopifyProvider} from './ShopifyProvider.js';
import {getShopifyConfig} from './ShopifyProvider.test.js';
import {
  getPrice,
  getCustomerPrice,
  getUnitPriceMeasurement,
} from './Money.test.helpers.js';

describe('<Money />', () => {
  it('renders a formatted money string', () => {
    const money = getPrice({currencyCode: 'USD'});
    render(<Money data={money} />, {
      wrapper: ({children}) => (
        <ShopifyProvider {...getShopifyConfig()}>{children}</ShopifyProvider>
      ),
    });

    expect(screen.getByText(`$${money.amount}`)).toBeInTheDocument();
  });

  it('handles different currency codes', () => {
    const money = getPrice({
      currencyCode: 'EUR',
    });
    render(<Money data={money} />, {
      wrapper: ({children}) => (
        <ShopifyProvider {...getShopifyConfig()}>{children}</ShopifyProvider>
      ),
    });

    expect(screen.getByText(money.amount, {exact: false})).toBeInTheDocument();
  });

  it('allows pass-through props to the wrapping component', () => {
    const money = getPrice();
    render(<Money data={money} className="money" />, {
      wrapper: ({children}) => (
        <ShopifyProvider {...getShopifyConfig()}>{children}</ShopifyProvider>
      ),
    });

    expect(screen.getByText(money.amount, {exact: false})).toHaveClass('money');
  });

  it(`validates props when a different Element  is passed to the 'as' prop`, () => {
    const money = getPrice();

    render(<Money data={money} as="button" disabled />, {
      wrapper: ({children}) => (
        <ShopifyProvider {...getShopifyConfig()}>{children}</ShopifyProvider>
      ),
    });

    const element = screen.getByRole('button', {
      name: new RegExp(money.amount),
    });

    expect(element).toHaveAttribute('disabled');
  });

  it(`removes trailing zeros when the prop is passed`, () => {
    const money = getPrice({
      currencyCode: 'EUR',
      amount: '19.00',
    });
    render(<Money data={money} withoutTrailingZeros />, {
      wrapper: ({children}) => (
        <ShopifyProvider {...getShopifyConfig()}>{children}</ShopifyProvider>
      ),
    });

    expect(screen.queryByText(`€${money.amount}`)).not.toBeInTheDocument();
    expect(screen.getByText(`€${19}`)).toBeInTheDocument();
  });

  it(`removes the currency symbol when the prop is passed`, () => {
    const money = getPrice({
      currencyCode: 'EUR',
    });
    render(<Money data={money} withoutCurrency />, {
      wrapper: ({children}) => (
        <ShopifyProvider {...getShopifyConfig()}>{children}</ShopifyProvider>
      ),
    });

    expect(screen.queryByText(`€${money.amount}`)).not.toBeInTheDocument();
    expect(screen.getByText(money.amount)).toBeInTheDocument();
  });

  it(`removes the currency symbol and trailing zeros when the props are both passed`, () => {
    const money = getPrice({
      currencyCode: 'EUR',
      amount: '19.00',
    });
    render(<Money data={money} withoutCurrency withoutTrailingZeros />, {
      wrapper: ({children}) => (
        <ShopifyProvider {...getShopifyConfig()}>{children}</ShopifyProvider>
      ),
    });

    expect(screen.queryByText(`€${money.amount}`)).not.toBeInTheDocument();
    expect(screen.queryByText(money.amount)).not.toBeInTheDocument();
    expect(screen.getByText('19')).toBeInTheDocument();
  });

  it(`allows a 'measurement' prop`, () => {
    const money = getPrice({
      currencyCode: 'EUR',
      amount: '19.00',
    });

    const measurement = getUnitPriceMeasurement();
    render(<Money data={money} measurement={measurement} />, {
      wrapper: ({children}) => (
        <ShopifyProvider {...getShopifyConfig()}>{children}</ShopifyProvider>
      ),
    });

    expect(
      screen.getByText(`/${measurement.referenceUnit ?? ''}`, {exact: false}),
    ).toBeInTheDocument();
  });

  it(`allows a 'measurement' prop with 'measurementSeparator' as a component`, () => {
    const money = getPrice({
      currencyCode: 'EUR',
      amount: '19.00',
    });

    const measurement = getUnitPriceMeasurement();
    const MeasurementSeparator = () => <br />;

    const {container} = render(
      <Money
        data={money}
        measurement={measurement}
        measurementSeparator={<MeasurementSeparator />}
      />,
      {
        wrapper: ({children}) => (
          <ShopifyProvider {...getShopifyConfig()}>{children}</ShopifyProvider>
        ),
      },
    );

    expect(container.querySelector('br')).toBeInTheDocument();
    expect(
      screen.getByText(measurement.referenceUnit ?? '', {exact: false}),
    ).toBeInTheDocument();
  });

  it(`allows a 'measurement' prop with 'measurementSeparator' as a string`, () => {
    const money = getPrice({
      currencyCode: 'EUR',
      amount: '19.00',
    });

    const measurement = getUnitPriceMeasurement();
    const MeasurementSeparator = '-';

    render(
      <Money
        data={money}
        measurement={measurement}
        measurementSeparator={MeasurementSeparator}
      />,
      {
        wrapper: ({children}) => (
          <ShopifyProvider {...getShopifyConfig()}>{children}</ShopifyProvider>
        ),
      },
    );

    expect(
      screen.getByText(
        `${MeasurementSeparator}${measurement.referenceUnit ?? ''}`,
        {
          exact: false,
        },
      ),
    ).toBeInTheDocument();
  });

  it('handles Customer Account API MoneyV2 with different currency codes (e.g., USDC)', () => {
    // Test that Money component accepts MoneyV2 from Customer Account API
    // which may have currency codes not present in Storefront API
    const money = getCustomerPrice({
      currencyCode: 'USDC',
      amount: '100.00',
    });

    render(<Money data={money} />, {
      wrapper: ({children}) => (
        <ShopifyProvider {...getShopifyConfig()}>{children}</ShopifyProvider>
      ),
    });

    // USDC should render with currency code appended since it's not supported by Intl.NumberFormat
    expect(screen.getByText('100.00 USDC')).toBeInTheDocument();
  });

  it('handles both Storefront and Customer Account MoneyV2 types interchangeably', () => {
    // Verify that the component works with both API types
    const storefrontMoney = getPrice({currencyCode: 'USD', amount: '50.00'});
    const customerMoney = getCustomerPrice({
      currencyCode: 'EUR',
      amount: '75.00',
    });

    const {rerender} = render(<Money data={storefrontMoney} />, {
      wrapper: ({children}) => (
        <ShopifyProvider {...getShopifyConfig()}>{children}</ShopifyProvider>
      ),
    });

    expect(screen.getByText('50.00', {exact: false})).toBeInTheDocument();

    // Re-render with Customer Account API data
    rerender(
      <ShopifyProvider {...getShopifyConfig()}>
        <Money data={customerMoney} />
      </ShopifyProvider>,
    );

    expect(screen.getByText('75.00', {exact: false})).toBeInTheDocument();
  });
});
