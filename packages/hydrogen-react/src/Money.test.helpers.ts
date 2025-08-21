import {
  MoneyV2,
  UnitPriceMeasurement,
  UnitPriceMeasurementMeasuredUnit,
} from './storefront-api-types.js';
import {MoneyV2 as CustomerMoneyV2} from './customer-account-api-types.js';
import {faker} from '@faker-js/faker';

export function getPrice(price: Partial<MoneyV2> = {}): MoneyV2 {
  return {
    currencyCode: price.currencyCode ?? 'CAD',
    amount: price.amount ?? faker.finance.amount(),
  };
}

// Helper for Customer Account API MoneyV2 which may have different currency codes
export function getCustomerPrice(
  price: Partial<CustomerMoneyV2> = {},
): CustomerMoneyV2 {
  return {
    currencyCode: price.currencyCode ?? 'USDC', // Use USDC as example of Customer-only currency
    amount: price.amount ?? faker.finance.amount(),
  };
}

export function getUnitPriceMeasurement(
  unitPriceMeasurement: Partial<UnitPriceMeasurement> = {},
): UnitPriceMeasurement {
  const measuredTypeToUnitMap: {
    WEIGHT: UnitPriceMeasurementMeasuredUnit[];
    VOLUME: UnitPriceMeasurementMeasuredUnit[];
    LENGTH: UnitPriceMeasurementMeasuredUnit[];
    AREA: UnitPriceMeasurementMeasuredUnit[];
    DIMENSION: UnitPriceMeasurementMeasuredUnit[];
  } = {
    WEIGHT: ['MG', 'G', 'KG', 'LB', 'OZ'],
    VOLUME: ['ML', 'CL', 'L', 'M3', 'FLOZ', 'PT', 'QT', 'GAL'],
    LENGTH: ['MM', 'CM', 'M', 'IN', 'FT', 'YD'],
    AREA: ['M2', 'FT2'],
    DIMENSION: ['ITEM'],
  };
  const measuredType = faker.helpers.arrayElement<
    keyof typeof measuredTypeToUnitMap
  >(['WEIGHT', 'VOLUME', 'AREA', 'LENGTH', 'DIMENSION']);
  const quantityUnit = faker.helpers.arrayElement(
    measuredTypeToUnitMap[measuredType],
  );
  const referenceUnit = faker.helpers.arrayElement(
    measuredTypeToUnitMap[measuredType],
  );

  return {
    measuredType: unitPriceMeasurement.measuredType ?? measuredType,
    quantityUnit: unitPriceMeasurement.quantityUnit ?? quantityUnit,
    quantityValue: unitPriceMeasurement.quantityValue ?? faker.number.float(),
    referenceUnit: unitPriceMeasurement.referenceUnit ?? referenceUnit,
    referenceValue: unitPriceMeasurement.referenceValue ?? faker.number.int(),
  };
}
