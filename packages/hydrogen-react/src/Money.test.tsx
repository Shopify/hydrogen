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

  describe('unit price measurement formatting', () => {
    it('renders complete formatted price with imperial weight units', () => {
      const money = getPrice({
        currencyCode: 'USD',
        amount: '10.99',
      });

      const lbMeasurement = getUnitPriceMeasurement({
        referenceUnit: 'LB',
      });
      const {rerender} = render(
        <Money data={money} measurement={lbMeasurement} />,
        {
          wrapper: ({children}) => (
            <ShopifyProvider {...getShopifyConfig()}>
              {children}
            </ShopifyProvider>
          ),
        },
      );

      expect(screen.getByText('$10.99/LB')).toBeInTheDocument();

      const ozMoney = getPrice({
        currencyCode: 'USD',
        amount: '0.69',
      });
      const ozMeasurement = getUnitPriceMeasurement({
        referenceUnit: 'OZ',
      });
      rerender(
        <ShopifyProvider {...getShopifyConfig()}>
          <Money data={ozMoney} measurement={ozMeasurement} />
        </ShopifyProvider>,
      );

      expect(screen.getByText('$0.69/OZ')).toBeInTheDocument();
    });

    it('renders complete formatted price with metric weight units', () => {
      const money = getPrice({
        currencyCode: 'EUR',
        amount: '25.50',
      });

      const kgMeasurement = getUnitPriceMeasurement({
        referenceUnit: 'KG',
      });
      render(<Money data={money} measurement={kgMeasurement} />, {
        wrapper: ({children}) => (
          <ShopifyProvider {...getShopifyConfig()}>{children}</ShopifyProvider>
        ),
      });

      expect(screen.getByText('€25.50/KG')).toBeInTheDocument();
    });

    it('renders complete formatted price with imperial volume units', () => {
      const money = getPrice({
        currencyCode: 'USD',
        amount: '5.00',
      });

      const galMeasurement = getUnitPriceMeasurement({
        referenceUnit: 'GAL',
      });
      render(<Money data={money} measurement={galMeasurement} />, {
        wrapper: ({children}) => (
          <ShopifyProvider {...getShopifyConfig()}>{children}</ShopifyProvider>
        ),
      });

      expect(screen.getByText('$5.00/GAL')).toBeInTheDocument();
    });

    it('renders complete formatted price with metric volume units', () => {
      const money = getPrice({
        currencyCode: 'EUR',
        amount: '3.75',
      });

      const literMeasurement = getUnitPriceMeasurement({
        referenceUnit: 'L',
      });
      render(<Money data={money} measurement={literMeasurement} />, {
        wrapper: ({children}) => (
          <ShopifyProvider {...getShopifyConfig()}>{children}</ShopifyProvider>
        ),
      });

      expect(screen.getByText('€3.75/L')).toBeInTheDocument();
    });

    it('renders complete formatted price with length units', () => {
      // Imperial
      const ftMoney = getPrice({
        currencyCode: 'USD',
        amount: '15.00',
      });
      const ftMeasurement = getUnitPriceMeasurement({
        referenceUnit: 'FT',
      });
      const {rerender} = render(
        <Money data={ftMoney} measurement={ftMeasurement} />,
        {
          wrapper: ({children}) => (
            <ShopifyProvider {...getShopifyConfig()}>
              {children}
            </ShopifyProvider>
          ),
        },
      );

      expect(screen.getByText('$15.00/FT')).toBeInTheDocument();

      // Metric
      const mMoney = getPrice({
        currencyCode: 'EUR',
        amount: '12.00',
      });
      const mMeasurement = getUnitPriceMeasurement({
        referenceUnit: 'M',
      });
      rerender(
        <ShopifyProvider {...getShopifyConfig()}>
          <Money data={mMoney} measurement={mMeasurement} />
        </ShopifyProvider>,
      );

      expect(screen.getByText('€12.00/M')).toBeInTheDocument();
    });

    it('renders complete formatted price with area units', () => {
      // Imperial
      const ft2Money = getPrice({
        currencyCode: 'USD',
        amount: '20.00',
      });
      const ft2Measurement = getUnitPriceMeasurement({
        referenceUnit: 'FT2',
      });
      const {rerender} = render(
        <Money data={ft2Money} measurement={ft2Measurement} />,
        {
          wrapper: ({children}) => (
            <ShopifyProvider {...getShopifyConfig()}>
              {children}
            </ShopifyProvider>
          ),
        },
      );

      expect(screen.getByText('$20.00/FT2')).toBeInTheDocument();

      // Metric
      const m2Money = getPrice({
        currencyCode: 'EUR',
        amount: '18.50',
      });
      const m2Measurement = getUnitPriceMeasurement({
        referenceUnit: 'M2',
      });
      rerender(
        <ShopifyProvider {...getShopifyConfig()}>
          <Money data={m2Money} measurement={m2Measurement} />
        </ShopifyProvider>,
      );

      expect(screen.getByText('€18.50/M2')).toBeInTheDocument();
    });

    it('renders complete formatted price with ITEM unit', () => {
      const money = getPrice({
        currencyCode: 'USD',
        amount: '2.00',
      });

      const itemMeasurement = getUnitPriceMeasurement({
        referenceUnit: 'ITEM',
      });
      render(<Money data={money} measurement={itemMeasurement} />, {
        wrapper: ({children}) => (
          <ShopifyProvider {...getShopifyConfig()}>{children}</ShopifyProvider>
        ),
      });

      expect(screen.getByText('$2.00/ITEM')).toBeInTheDocument();
    });

    it('handles decimal places correctly with unit measurements', () => {
      const measurement = getUnitPriceMeasurement({
        referenceUnit: 'LB',
      });

      const {rerender} = render(
        <Money
          data={{amount: '10.00', currencyCode: 'USD'}}
          measurement={measurement}
        />,
        {
          wrapper: ({children}) => (
            <ShopifyProvider {...getShopifyConfig()}>
              {children}
            </ShopifyProvider>
          ),
        },
      );
      expect(screen.getByText('$10.00/LB')).toBeInTheDocument();

      rerender(
        <ShopifyProvider {...getShopifyConfig()}>
          <Money
            data={{amount: '10.00', currencyCode: 'USD'}}
            measurement={measurement}
            withoutTrailingZeros
          />
        </ShopifyProvider>,
      );
      expect(screen.getByText('$10/LB')).toBeInTheDocument();

      rerender(
        <ShopifyProvider {...getShopifyConfig()}>
          <Money
            data={{amount: '10.50', currencyCode: 'USD'}}
            measurement={measurement}
          />
        </ShopifyProvider>,
      );
      expect(screen.getByText('$10.50/LB')).toBeInTheDocument();

      rerender(
        <ShopifyProvider {...getShopifyConfig()}>
          <Money
            data={{amount: '10.50', currencyCode: 'USD'}}
            measurement={measurement}
            withoutTrailingZeros
          />
        </ShopifyProvider>,
      );
      expect(screen.getByText('$10.5', {exact: false})).toBeInTheDocument();
      expect(screen.getByText('/LB', {exact: false})).toBeInTheDocument();
    });

    it('handles withoutCurrency prop with unit measurements', () => {
      const measurement = getUnitPriceMeasurement({
        referenceUnit: 'KG',
      });

      const {rerender} = render(
        <Money
          data={{amount: '25.99', currencyCode: 'USD'}}
          measurement={measurement}
          withoutCurrency
        />,
        {
          wrapper: ({children}) => (
            <ShopifyProvider {...getShopifyConfig()}>
              {children}
            </ShopifyProvider>
          ),
        },
      );
      expect(screen.getByText('25.99/KG')).toBeInTheDocument();

      // Both withoutCurrency and withoutTrailingZeros
      rerender(
        <ShopifyProvider {...getShopifyConfig()}>
          <Money
            data={{amount: '25.00', currencyCode: 'USD'}}
            measurement={measurement}
            withoutCurrency
            withoutTrailingZeros
          />
        </ShopifyProvider>,
      );
      expect(screen.getByText('25/KG')).toBeInTheDocument();
    });

    it('renders custom separators with full price formatting', () => {
      const measurement = getUnitPriceMeasurement({
        referenceUnit: 'LB',
      });

      const {rerender} = render(
        <Money
          data={{amount: '10.00', currencyCode: 'USD'}}
          measurement={measurement}
          measurementSeparator=" per "
        />,
        {
          wrapper: ({children}) => (
            <ShopifyProvider {...getShopifyConfig()}>
              {children}
            </ShopifyProvider>
          ),
        },
      );
      expect(screen.getByText('$10.00 per LB')).toBeInTheDocument();

      rerender(
        <ShopifyProvider {...getShopifyConfig()}>
          <Money
            data={{amount: '5.50', currencyCode: 'EUR'}}
            measurement={measurement}
            measurementSeparator=" - "
          />
        </ShopifyProvider>,
      );
      expect(screen.getByText('€5.50 - LB')).toBeInTheDocument();

      rerender(
        <ShopifyProvider {...getShopifyConfig()}>
          <Money
            data={{amount: '8.00', currencyCode: 'USD'}}
            measurement={measurement}
            measurementSeparator=""
          />
        </ShopifyProvider>,
      );
      expect(screen.getByText('$8.00LB')).toBeInTheDocument();
    });

    it('handles edge cases with very small and large amounts', () => {
      const smallMoney = getPrice({
        currencyCode: 'USD',
        amount: '0.01',
      });
      const ozMeasurement = getUnitPriceMeasurement({
        referenceUnit: 'OZ',
      });
      const {rerender} = render(
        <Money data={smallMoney} measurement={ozMeasurement} />,
        {
          wrapper: ({children}) => (
            <ShopifyProvider {...getShopifyConfig()}>
              {children}
            </ShopifyProvider>
          ),
        },
      );
      expect(screen.getByText('$0.01/OZ')).toBeInTheDocument();

      const largeMoney = getPrice({
        currencyCode: 'USD',
        amount: '1000.00',
      });
      const lbMeasurement = getUnitPriceMeasurement({
        referenceUnit: 'LB',
      });
      rerender(
        <ShopifyProvider {...getShopifyConfig()}>
          <Money data={largeMoney} measurement={lbMeasurement} />
        </ShopifyProvider>,
      );
      expect(screen.getByText('$1,000.00/LB')).toBeInTheDocument();

      const veryLargeMoney = getPrice({
        currencyCode: 'USD',
        amount: '999999.99',
      });
      rerender(
        <ShopifyProvider {...getShopifyConfig()}>
          <Money data={veryLargeMoney} measurement={lbMeasurement} />
        </ShopifyProvider>,
      );
      expect(screen.getByText('$999,999.99/LB')).toBeInTheDocument();
    });

    it('renders different currencies with appropriate units', () => {
      // CAD with imperial units
      const cadMoney = getPrice({
        currencyCode: 'CAD',
        amount: '10.00',
      });
      const lbMeasurement = getUnitPriceMeasurement({
        referenceUnit: 'LB',
      });
      const {rerender} = render(
        <Money data={cadMoney} measurement={lbMeasurement} />,
        {
          wrapper: ({children}) => (
            <ShopifyProvider {...getShopifyConfig()}>
              {children}
            </ShopifyProvider>
          ),
        },
      );
      expect(screen.getByText('CA$10.00/LB')).toBeInTheDocument();

      // CAD with metric units
      const kgMeasurement = getUnitPriceMeasurement({
        referenceUnit: 'KG',
      });
      rerender(
        <ShopifyProvider {...getShopifyConfig()}>
          <Money data={cadMoney} measurement={kgMeasurement} />
        </ShopifyProvider>,
      );
      expect(screen.getByText('CA$10.00/KG')).toBeInTheDocument();
    });
  });
});
