import {
  metafieldParser,
  type ParsedMetafields,
  type Measurement,
  type Rating,
} from './metafield-parser.js';
import {getRawMetafield} from './Metafield.test.helpers.js';
import {expectType} from 'ts-expect';
import type {
  Collection,
  GenericFile,
  MoneyV2,
  Page,
  Product,
  ProductVariant,
} from './storefront-api-types.js';
import {faker} from '@faker-js/faker';

/**
 * The tests in this file are written in the format `parsed.parsedValue? === ''` instead of `(parsed.parsedValue).toEqual()`
 * The advantage of doing it this way for this test suite is that it helps ensure that the TS types are correct for the returned value
 * In most other situations, the second way is probably better though
 */
describe(`metafieldParser`, () => {
  describe(`base metafields`, () => {
    it(`boolean`, () => {
      const meta = getRawMetafield({
        type: 'boolean',
        value: 'false',
      });
      const parsed = metafieldParser<ParsedMetafields['boolean']>(meta);
      expect(parsed.parsedValue === false).toBe(true);
      expectType<null | boolean>(parsed?.parsedValue);
    });

    it(`collection_reference`, () => {
      const parsed = metafieldParser<ParsedMetafields['collection_reference']>({
        type: 'collection_reference',
        reference: {
          __typename: 'Collection',
        },
      });
      expect(parsed?.parsedValue?.__typename === 'Collection').toBe(true);
      expectType<null | Collection>(parsed?.parsedValue);
    });

    it(`color`, () => {
      const parsed = metafieldParser<ParsedMetafields['color']>({
        type: 'color',
        value: '#f0f0f0',
      });
      expect(parsed?.parsedValue === '#f0f0f0').toBe(true);
      expectType<null | string>(parsed?.parsedValue);
    });

    it(`date`, () => {
      const dateStamp = '2022-10-13';
      const parsed = metafieldParser<ParsedMetafields['date']>({
        type: 'date',
        value: dateStamp,
      });
      expect(
        parsed?.parsedValue?.toString() === new Date(dateStamp).toString()
      ).toBe(true);
      expectType<null | Date>(parsed?.parsedValue);
    });

    it(`date_time`, () => {
      const dateStamp = '2022-10-13';
      const parsed = metafieldParser<ParsedMetafields['date_time']>({
        type: 'date_time',
        value: dateStamp,
      });
      expect(
        parsed?.parsedValue?.toString() === new Date(dateStamp).toString()
      ).toBe(true);
      expectType<null | Date>(parsed?.parsedValue);
    });

    it(`dimension`, () => {
      const parsed = metafieldParser<ParsedMetafields['dimension']>({
        type: 'dimension',
        value: JSON.stringify({unit: 'mm', value: 2}),
      });
      expect(parsed?.parsedValue?.unit === 'mm').toBe(true);
      expect(parsed?.parsedValue?.value === 2).toBe(true);
      expectType<null | Measurement>(parsed?.parsedValue);
    });

    it(`file_reference`, () => {
      const parsed = metafieldParser<ParsedMetafields['file_reference']>({
        type: 'file_reference',
        reference: {
          __typename: 'GenericFile',
        },
      });
      expect(parsed.parsedValue?.__typename === 'GenericFile').toBe(true);
      expectType<null | GenericFile>(parsed?.parsedValue);
    });

    it(`json`, () => {
      type MyJson = {
        test: string;
        bool: boolean;
        deep: {
          numb: number;
        };
      };

      const myJson = {
        type: 'json',
        value: JSON.stringify({test: 'testing', bool: false, deep: {numb: 7}}),
      };

      // without an extra generic, we just mark it as "unknown"
      const parsed = metafieldParser<ParsedMetafields['json']>(myJson);
      // note that with "unknown", you have to cast it as something
      expect((parsed?.parsedValue as {test: string})?.test === 'testing').toBe(
        true
      );
      expectType<null | unknown>(parsed?.parsedValue);

      // with an extra generic, we can use that as the type instead
      const parsedOtherType =
        metafieldParser<ParsedMetafields<MyJson>['json']>(myJson);
      expect(parsedOtherType.type === 'json').toBe(true);
      expect(parsedOtherType.parsedValue?.test === 'testing').toBe(true);
      expect(parsedOtherType.parsedValue?.bool === false).toBe(true);
      expect(parsedOtherType.parsedValue?.deep?.numb === 7).toBe(true);
      expectType<null | MyJson>(parsedOtherType.parsedValue);
    });

    it(`money`, () => {
      const parsed = metafieldParser<ParsedMetafields['money']>({
        type: 'money',
        value: JSON.stringify({amount: '12', currencyCode: 'USD'}),
      });
      expect(parsed?.parsedValue?.amount === '12').toBe(true);
      expect(parsed?.parsedValue?.currencyCode === 'USD').toBe(true);
      expectType<null | MoneyV2>(parsed?.parsedValue);
    });

    it(`multi_line_text_field`, () => {
      const parsed = metafieldParser<ParsedMetafields['multi_line_text_field']>(
        {
          type: 'multi_line_text_field',
          value: 'blah\nblah\nblah',
        }
      );
      expect(parsed?.parsedValue === 'blah\nblah\nblah').toBe(true);
      expectType<null | string>(parsed?.parsedValue);
    });

    it(`single_line_text_field`, () => {
      const parsed = metafieldParser<
        ParsedMetafields['single_line_text_field']
      >({
        type: 'single_line_text_field',
        value: 'blah',
      });
      expect(parsed?.parsedValue === 'blah').toBe(true);
      expectType<null | string>(parsed?.parsedValue);
    });

    it(`url`, () => {
      const parsed = metafieldParser<ParsedMetafields['url']>({
        type: 'url',
        value: 'https://www.shopify.com',
      });
      expect(parsed?.parsedValue === 'https://www.shopify.com').toBe(true);
      expectType<null | string>(parsed?.parsedValue);
    });

    it(`number_decimal`, () => {
      const parsed = metafieldParser<ParsedMetafields['number_decimal']>({
        type: 'number_decimal',
        value: '2.2',
      });
      expect(parsed?.parsedValue === 2.2).toBe(true);
      expectType<null | number>(parsed?.parsedValue);
    });

    it(`number_integer`, () => {
      const parsed = metafieldParser<ParsedMetafields['number_integer']>({
        type: 'number_integer',
        value: '2',
      });
      expect(parsed?.parsedValue === 2).toBe(true);
      expectType<null | number>(parsed?.parsedValue);
    });

    it(`page_reference`, () => {
      const parsed = metafieldParser<ParsedMetafields['page_reference']>({
        type: 'page_reference',
        reference: {
          __typename: 'Page',
        },
      });
      expect(parsed.parsedValue?.__typename === 'Page').toBe(true);
      expectType<null | Page>(parsed?.parsedValue);
    });

    it(`product_reference`, () => {
      const parsed = metafieldParser<ParsedMetafields['product_reference']>({
        type: 'product_reference',
        reference: {
          __typename: 'Product',
        },
      });
      expect(parsed.parsedValue?.__typename === 'Product').toBe(true);
      expectType<null | Product>(parsed?.parsedValue);
    });

    it(`rating`, () => {
      const parsed = metafieldParser<ParsedMetafields['rating']>({
        type: 'rating',
        value: JSON.stringify({value: 3, scale_min: 1, scale_max: 5}),
      });
      expect(parsed?.parsedValue?.value === 3).toBe(true);
      expect(parsed?.parsedValue?.scale_min === 1).toBe(true);
      expect(parsed?.parsedValue?.scale_max === 5).toBe(true);
      expectType<null | Rating>(parsed?.parsedValue);
    });

    it(`variant_reference`, () => {
      const parsed = metafieldParser<ParsedMetafields['variant_reference']>({
        type: 'variant_reference',
        reference: {
          __typename: 'ProductVariant',
        },
      });
      expect(parsed.parsedValue?.__typename === 'ProductVariant').toBe(true);
      expectType<null | ProductVariant>(parsed?.parsedValue);
    });

    it(`volume`, () => {
      const parsed = metafieldParser<ParsedMetafields['volume']>({
        type: 'volume',
        value: JSON.stringify({unit: 'us_pt', value: 2}),
      });
      expect(parsed?.parsedValue?.unit === 'us_pt').toBe(true);
      expect(parsed?.parsedValue?.value === 2).toBe(true);
      expectType<null | Measurement>(parsed?.parsedValue);
    });

    it(`weight`, () => {
      const parsed = metafieldParser<ParsedMetafields['weight']>({
        type: 'weight',
        value: JSON.stringify({unit: 'lbs', value: 2}),
      });
      expect(parsed?.parsedValue?.unit === 'lbs').toBe(true);
      expect(parsed?.parsedValue?.value === 2).toBe(true);
      expectType<null | Measurement>(parsed?.parsedValue);
    });
  });

  describe(`list metafields`, () => {
    it(`list.collection_reference`, () => {
      const parsed = metafieldParser<
        ParsedMetafields['list.collection_reference']
      >({
        type: 'list.collection_reference',
        references: {
          nodes: [
            {
              __typename: 'Collection',
              id: '0',
            },
            {
              __typename: 'Collection',
              id: '1',
            },
          ],
        },
      });
      parsed.parsedValue?.forEach((coll, index) => {
        expect(coll.__typename === 'Collection').toBe(true);
        expect(index.toString() === coll.id).toBe(true);
      });
      expectType<null | Collection[]>(parsed?.parsedValue);
    });

    it(`list.color`, () => {
      const listOfColors = [faker.color.rgb(), faker.color.rgb()];
      const parsed = metafieldParser<ParsedMetafields['list.color']>({
        type: 'list.color',
        value: JSON.stringify(listOfColors),
      });
      parsed.parsedValue?.forEach((color, index) => {
        expect(color === listOfColors[index]).toBe(true);
      });
      expectType<null | string[]>(parsed?.parsedValue);
    });

    it(`list.date`, () => {
      const listOfDates = ['2022-10-24', '2022-10-25'];
      const listOfParsedDates = listOfDates.map((date) => new Date(date));
      const parsed = metafieldParser<ParsedMetafields['list.date']>({
        type: 'list.date',
        value: JSON.stringify(listOfDates),
      });
      parsed.parsedValue?.forEach((date, index) => {
        // worried about flakiness here with comparing dates, and having that be consistent in tests
        expect(
          date.getUTCDate() === listOfParsedDates[index].getUTCDate()
        ).toBe(true);
      });
      expectType<null | Date[]>(parsed?.parsedValue);
    });

    it(`list.date_time`, () => {
      const listOfDates = ['2022-10-04T22:30:00Z', '2022-10-05T22:30:00Z'];
      const listOfParsedDates = listOfDates.map((date) => new Date(date));
      const parsed = metafieldParser<ParsedMetafields['list.date']>({
        type: 'list.date',
        value: JSON.stringify(listOfDates),
      });
      parsed.parsedValue?.forEach((date, index) => {
        // worried about flakiness here with comparing dates, and having that be consistent in tests
        expect(
          date.toISOString() === listOfParsedDates[index].toISOString()
        ).toBe(true);
      });
      expectType<null | Date[]>(parsed?.parsedValue);
    });

    it(`list.dimension`, () => {
      const listDimensions = [
        {unit: 'mm', value: faker.datatype.number()},
        {unit: 'mm', value: faker.datatype.number()},
      ];
      const parsed = metafieldParser<ParsedMetafields['list.dimension']>({
        type: 'list.dimension',
        value: JSON.stringify(listDimensions),
      });
      parsed.parsedValue?.forEach((dimension, index) => {
        expect(dimension.unit === listDimensions[index].unit).toBe(true);
        expect(dimension.value === listDimensions[index].value).toBe(true);
      });
      expectType<null | Measurement[]>(parsed?.parsedValue);
    });

    it(`list.file_reference`, () => {
      const parsed = metafieldParser<ParsedMetafields['list.file_reference']>({
        type: 'list.file_reference',
        references: {
          nodes: [
            {
              __typename: 'GenericFile',
              id: '0',
            },
            {
              __typename: 'GenericFile',
              id: '1',
            },
          ],
        },
      });
      parsed.parsedValue?.forEach((coll, index) => {
        expect(coll.__typename === 'GenericFile').toBe(true);
        expect(index.toString() === coll.id).toBe(true);
      });
      expectType<null | GenericFile[]>(parsed?.parsedValue);
    });

    it(`list.number_integer`, () => {
      const listOfNumbers = [faker.datatype.number(), faker.datatype.number()];
      const parsed = metafieldParser<ParsedMetafields['list.number_integer']>({
        type: 'list.number_integer',
        value: JSON.stringify(listOfNumbers),
      });
      parsed.parsedValue?.forEach((number, index) => {
        expect(number === listOfNumbers[index]).toBe(true);
      });
      expectType<null | number[]>(parsed?.parsedValue);
    });

    it(`list.number_decimal`, () => {
      const listOfNumbers = [faker.datatype.float(), faker.datatype.float()];
      const parsed = metafieldParser<ParsedMetafields['list.number_decimal']>({
        type: 'list.number_decimal',
        value: JSON.stringify(listOfNumbers),
      });
      parsed.parsedValue?.forEach((number, index) => {
        expect(number === listOfNumbers[index]).toBe(true);
      });
      expectType<null | number[]>(parsed?.parsedValue);
    });

    it(`list.page_reference`, () => {
      const parsed = metafieldParser<ParsedMetafields['list.page_reference']>({
        type: 'list.page_reference',
        references: {
          nodes: [
            {
              __typename: 'Page',
              id: '0',
            },
            {
              __typename: 'Page',
              id: '1',
            },
          ],
        },
      });
      parsed.parsedValue?.forEach((coll, index) => {
        expect(coll.__typename === 'Page').toBe(true);
        expect(index.toString() === coll.id).toBe(true);
      });
      expectType<null | Page[]>(parsed?.parsedValue);
    });

    it(`list.product_reference`, () => {
      const parsed = metafieldParser<
        ParsedMetafields['list.product_reference']
      >({
        type: 'list.product_reference',
        references: {
          nodes: [
            {
              __typename: 'Product',
              id: '0',
            },
            {
              __typename: 'Product',
              id: '1',
            },
          ],
        },
      });
      parsed.parsedValue?.forEach((coll, index) => {
        expect(coll.__typename === 'Product').toBe(true);
        expect(index.toString() === coll.id).toBe(true);
      });
      expectType<null | Product[]>(parsed?.parsedValue);
    });

    it(`list.rating`, () => {
      const listOfRatings: Rating[] = [
        {scale_min: 0, scale_max: 5, value: faker.datatype.number()},
        {scale_min: 0, scale_max: 5, value: faker.datatype.number()},
      ];
      const parsed = metafieldParser<ParsedMetafields['list.rating']>({
        type: 'list.rating',
        value: JSON.stringify(listOfRatings),
      });
      parsed.parsedValue?.forEach((rating, index) => {
        expect(rating.value === listOfRatings[index].value).toBe(true);
      });
      expectType<null | Rating[]>(parsed?.parsedValue);
    });

    it(`list.single_line_text_field`, () => {
      const listOfStrings = [faker.random.words(), faker.random.words()];
      const parsed = metafieldParser<
        ParsedMetafields['list.single_line_text_field']
      >({
        type: 'list.single_line_text_field',
        value: JSON.stringify(listOfStrings),
      });
      parsed.parsedValue?.forEach((strng, index) => {
        expect(strng === listOfStrings[index]).toBe(true);
      });
      expectType<null | string[]>(parsed?.parsedValue);
    });

    it(`list.url`, () => {
      const listOfStrings = [faker.internet.url(), faker.internet.url()];
      const parsed = metafieldParser<ParsedMetafields['list.url']>({
        type: 'list.url',
        value: JSON.stringify(listOfStrings),
      });
      parsed.parsedValue?.forEach((strng, index) => {
        expect(strng === listOfStrings[index]).toBe(true);
      });
      expectType<null | string[]>(parsed?.parsedValue);
    });

    it(`list.variant_reference`, () => {
      const parsed = metafieldParser<
        ParsedMetafields['list.variant_reference']
      >({
        type: 'list.variant_reference',
        references: {
          nodes: [
            {
              __typename: 'ProductVariant',
              id: '0',
            },
            {
              __typename: 'ProductVariant',
              id: '1',
            },
          ],
        },
      });
      parsed.parsedValue?.forEach((coll, index) => {
        expect(coll.__typename === 'ProductVariant').toBe(true);
        expect(index.toString() === coll.id).toBe(true);
      });
      expectType<null | ProductVariant[]>(parsed?.parsedValue);
    });

    it(`list.volume`, () => {
      const volumes: Measurement[] = [
        {unit: 'us_pt', value: 2},
        {unit: 'us_pt', value: 2},
      ];
      const parsed = metafieldParser<ParsedMetafields['list.volume']>({
        type: 'volume',
        value: JSON.stringify(volumes),
      });

      parsed.parsedValue?.forEach((vol, index) => {
        expect(vol?.unit === volumes[index].unit).toBe(true);
        expect(vol?.value === volumes[index].value).toBe(true);
      });
      expectType<null | Measurement[]>(parsed?.parsedValue);
    });

    it(`list.weight`, () => {
      const weights: Measurement[] = [
        {unit: 'lbs', value: 2},
        {unit: 'lbs', value: 2},
      ];
      const parsed = metafieldParser<ParsedMetafields['list.weight']>({
        type: 'volume',
        value: JSON.stringify(weights),
      });

      parsed.parsedValue?.forEach((vol, index) => {
        expect(vol?.unit === weights[index].unit).toBe(true);
        expect(vol?.value === weights[index].value).toBe(true);
      });
      expectType<null | Measurement[]>(parsed?.parsedValue);
    });
  });
});
