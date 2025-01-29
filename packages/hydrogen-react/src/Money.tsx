import {type ReactNode} from 'react';
import {I18NData, useMoney, useMoneyI18n, UseMoneyValue} from './useMoney.js';
import type {MoneyV2, UnitPriceMeasurement} from './storefront-api-types.js';
import type {PartialDeep} from 'type-fest';

export interface MoneyPropsBase<ComponentGeneric extends React.ElementType> {
  /** An HTML tag or React Component to be rendered as the base element wrapper. The default is `div`. */
  as?: ComponentGeneric;
  /** An object with fields that correspond to the Storefront API's [MoneyV2 object](https://shopify.dev/api/storefront/reference/common-objects/moneyv2). */
  data: PartialDeep<MoneyV2, {recurseIntoArrays: true}>;
  /** Whether to remove the currency symbol from the output. */
  withoutCurrency?: boolean;
  /** Whether to remove trailing zeros (fractional money) from the output. */
  withoutTrailingZeros?: boolean;
  /** A [UnitPriceMeasurement object](https://shopify.dev/api/storefront/2025-01/objects/unitpricemeasurement). */
  measurement?: PartialDeep<UnitPriceMeasurement, {recurseIntoArrays: true}>;
  /** Customizes the separator between the money output and the measurement output. Used with the `measurement` prop. Defaults to `'/'`. */
  measurementSeparator?: ReactNode;
}

// This article helps understand the typing here https://www.benmvp.com/blog/polymorphic-react-components-typescript/ Ben is the best :)
export type MoneyProps<ComponentGeneric extends React.ElementType> =
  MoneyPropsBase<ComponentGeneric> &
    (ComponentGeneric extends keyof React.JSX.IntrinsicElements
      ? Omit<
          React.ComponentPropsWithoutRef<ComponentGeneric>,
          keyof MoneyPropsBase<ComponentGeneric>
        >
      : React.ComponentPropsWithoutRef<ComponentGeneric>);

export type MoneyI18nProps<ComponentGeneric extends React.ElementType> =
  MoneyProps<ComponentGeneric> & {
    i18n: I18NData;
  };

type MoneyPropsWithoutData<ComponentGeneric extends React.ElementType> = Omit<
  MoneyProps<ComponentGeneric>,
  'data'
>;

type MoneyInternalProps<ComponentGeneric extends React.ElementType> =
  MoneyPropsWithoutData<ComponentGeneric> & {
    money: UseMoneyValue;
  };

/**
 * The `Money` component renders a string of the Storefront API's
 * [MoneyV2 object](https://shopify.dev/api/storefront/reference/common-objects/moneyv2)
 * according to the `locale` in the `ShopifyProvider` component.
 * &nbsp;
 * @see {@link https://shopify.dev/api/hydrogen/components/money}
 * @example basic usage, outputs: $100.00
 * ```ts
 * <Money data={{amount: '100.00', currencyCode: 'USD'}} />
 * ```
 * &nbsp;
 *
 * @example without currency, outputs: 100.00
 * ```ts
 * <Money data={{amount: '100.00', currencyCode: 'USD'}} withoutCurrency />
 * ```
 * &nbsp;
 *
 * @example without trailing zeros, outputs: $100
 * ```ts
 * <Money data={{amount: '100.00', currencyCode: 'USD'}} withoutTrailingZeros />
 * ```
 * &nbsp;
 *
 * @example with per-unit measurement, outputs: $100.00 per G
 * ```ts
 * <Money
 *   data={{amount: '100.00', currencyCode: 'USD'}}
 *   measurement={{referenceUnit: 'G'}}
 *   measurementSeparator=" per "
 * />
 * ```
 */
export function Money<ComponentGeneric extends React.ElementType = 'div'>({
  data,
  ...passthroughProps
}: MoneyProps<ComponentGeneric>): JSX.Element {
  if (!isMoney(data)) {
    throw new Error(
      `<Money/> needs a valid 'data' prop that has 'amount' and 'currencyCode'`,
    );
  }
  const moneyObject = useMoney(data);

  return <MoneyInternal money={moneyObject} {...passthroughProps} />;
}

/**
 * The `MoneyI18n` component renders a string of the Storefront API's
 * [MoneyV2 object](https://shopify.dev/api/storefront/reference/common-objects/moneyv2)
 * according to the `i18n` localization data passed as props.
 * &nbsp;
 * @see {@link https://shopify.dev/api/hydrogen/components/moneyi18n}
 * @example basic usage, outputs: $100.00
 * ```ts
 * <MoneyI18n data={{amount: '100.00', currencyCode: 'USD'}} i18n={{languageIsoCode: "EN", countryIsoCode: "US"}} />
 * ```
 * &nbsp;
 *
 * @example without currency, outputs: 100.00
 * ```ts
 * <Money data={{amount: '100.00', currencyCode: 'USD'}} withoutCurrency />
 * ```
 * &nbsp;
 *
 * @example without trailing zeros, outputs: $100
 * ```ts
 * <Money data={{amount: '100.00', currencyCode: 'USD'}} withoutTrailingZeros />
 * ```
 * &nbsp;
 *
 * @example with per-unit measurement, outputs: $100.00 per G
 * ```ts
 * <Money
 *   data={{amount: '100.00', currencyCode: 'USD'}}
 *   measurement={{referenceUnit: 'G'}}
 *   measurementSeparator=" per "
 * />
 * ```
 */
export function MoneyI18n<ComponentGeneric extends React.ElementType = 'div'>(
  props: MoneyI18nProps<ComponentGeneric>,
): JSX.Element {
  const {data, ...i18nProps} = props;
  const {i18n, ...passthroughProps} = i18nProps;

  if (!isMoney(data)) {
    throw new Error(
      `<Money/> needs a valid 'data' prop that has 'amount' and 'currencyCode'`,
    );
  }
  const moneyObject = useMoneyI18n(data, i18n);

  return <MoneyInternal money={moneyObject} {...passthroughProps} />;
}

function MoneyInternal<ComponentGeneric extends React.ElementType>({
  as,
  withoutCurrency,
  withoutTrailingZeros,
  measurement,
  measurementSeparator = '/',
  money,
  ...passthroughProps
}: MoneyInternalProps<ComponentGeneric>): JSX.Element {
  const Wrapper = as ?? 'div';

  let output = money.localizedString;

  if (withoutCurrency || withoutTrailingZeros) {
    if (withoutCurrency && !withoutTrailingZeros) {
      output = money.amount;
    } else if (!withoutCurrency && withoutTrailingZeros) {
      output = money.withoutTrailingZeros;
    } else {
      // both
      output = money.withoutTrailingZerosAndCurrency;
    }
  }

  return (
    <Wrapper {...passthroughProps}>
      {output}
      {measurement && measurement.referenceUnit && (
        <>
          {measurementSeparator}
          {measurement.referenceUnit}
        </>
      )}
    </Wrapper>
  );
}

// required in order to narrow the money object down and make TS happy
function isMoney(
  maybeMoney: PartialDeep<MoneyV2, {recurseIntoArrays: true}>,
): maybeMoney is MoneyV2 {
  return (
    typeof maybeMoney.amount === 'string' &&
    !!maybeMoney.amount &&
    typeof maybeMoney.currencyCode === 'string' &&
    !!maybeMoney.currencyCode
  );
}
