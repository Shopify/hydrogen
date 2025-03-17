import {faker} from '@faker-js/faker';
import type {Metafield as MetafieldType} from './storefront-api-types.js';
import type {PartialDeep} from 'type-fest';
import {
  type MetafieldTypeTypes,
  allMetafieldTypesArray,
} from './parse-metafield.js';

export function getRawMetafield(
  metafield: PartialDeep<MetafieldType, {recurseIntoArrays: true}> & {
    type?: MetafieldTypeTypes;
  } = {},
): PartialDeep<MetafieldType, {recurseIntoArrays: true}> & {
  type: MetafieldTypeTypes;
} {
  const type: MetafieldTypeTypes =
    metafield.type == null
      ? faker.helpers.arrayElement(allMetafieldTypesArray)
      : metafield.type;

  return {
    __typename: 'Metafield',
    createdAt: metafield.createdAt ?? faker.date.recent().toString(),
    description: metafield.description ?? faker.word.words(),
    id: metafield.id ?? faker.word.words(),
    key: metafield.key ?? `${faker.word.noun()}.${faker.word.noun()}`,
    namespace: metafield.namespace ?? faker.word.noun(),
    type,
    updatedAt: metafield.updatedAt ?? faker.date.recent().toString(),
    value: metafield.value ?? getMetafieldValue(type),
    reference: metafield.reference,
    references: metafield.references,
  };
}

export function getMetafieldValue(type: MetafieldTypeTypes) {
  switch (type) {
    case 'single_line_text_field':
      return faker.word.words();
    case 'multi_line_text_field':
      return `${faker.word.words()}\n${faker.word.words()}\n${faker.word.words()}`;
    case 'number_integer':
      return faker.number.int().toString();
    case 'number_decimal':
      return faker.number.float().toString();
    case 'date':
    case 'date_time':
      return faker.date.anytime().toString();
    case 'url':
      return faker.internet.url();
    case 'json': {
      const jsonType = Math.abs(faker.number.int()) % 6;
      switch (jsonType) {
        case 0:
          return faker.datatype.boolean().toString();
        case 1:
          return 'null';
        case 2:
          return faker.number.float().toString();
        case 3:
          return faker.string.alpha();
        case 4:
          return JSON.stringify([faker.string.alpha(), faker.number.int()]);
        case 5:
          return JSON.stringify({
            [faker.string.alpha()]: faker.string.alpha(),
            [faker.string.alpha()]: faker.string.alpha(),
          });
        default:
          throw new Error('Unhandled case.');
      }
    }
    case 'boolean':
      return faker.datatype.boolean().toString();
    case 'color':
      return faker.internet.color();
    case 'weight':
      return JSON.stringify({
        value: faker.number.int(),
        unit: faker.helpers.arrayElement(['kg', 'g', 'lb', 'oz']),
      });
    case 'volume':
      return JSON.stringify({
        value: faker.number.int(),
        unit: faker.helpers.arrayElement([
          'ml',
          'l',
          'us_gal',
          'us_oz',
          'cl',
          'm3',
          'us_pt',
          'us_qt',
          'imp_pt',
          'imp_fl_oz',
          'imp_qt',
          'imp_gal',
        ]),
      });
    case 'dimension':
      return JSON.stringify({
        value: faker.number.int(),
        unit: faker.helpers.arrayElement(['mm', 'cm', 'm', 'in', 'ft', 'yd']),
      });
    case 'rating': {
      const max = faker.number.int({min: 5, max: 10});
      const min = faker.number.int({min: 1, max: 4});
      return JSON.stringify({
        scale_max: max,
        scale_min: min,
        value: faker.number.float({min, max, fractionDigits: 4}),
      });
    }
    default: {
      return faker.word.words();
    }
  }
}
