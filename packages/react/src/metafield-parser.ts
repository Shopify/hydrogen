import type {
  Collection,
  GenericFile,
  Metafield as MetafieldBaseType,
  MoneyV2,
  Page,
  Product,
  ProductVariant,
} from './storefront-api-types.js';
import type {PartialDeep, Simplify} from 'type-fest';
import {parseJSON} from './Metafield.js';
import {flattenConnection} from './flatten-connection.js';

/**
 * A temporary function that will be renamed to `parseMetafield()` in a future release.
 *
 * A function that uses `metafield.type` to parse the Metafield's `value` or `reference` or `references` (depending on the `type`) and put it in `metafield.parsedValue`
 *
 * TypeScript developers can use the type `ParsedMetafields` from this package to get the returned object's type correct. For example:
 *
 * ```
 * metafieldParser<ParsedMetafields['boolean']>({type: 'boolean', value: 'false'}
 * ```
 */
export function metafieldParser<ReturnGeneric>(
  metafield: PartialDeep<MetafieldBaseType, {recurseIntoArrays: true}>
): ReturnGeneric {
  if (!metafield.type) {
    const noTypeError = `metafieldParser(): The 'type' field is required in order to parse the Metafield.`;
    if (__HYDROGEN_DEV__) {
      throw new Error(noTypeError);
    } else {
      console.error(`${noTypeError} Returning 'parsedValue' of 'null'`);
      return {
        ...metafield,
        parsedValue: null,
      } as ReturnGeneric;
    }
  }

  switch (metafield.type) {
    case 'boolean':
      return {
        ...metafield,
        parsedValue: metafield.value === 'true',
      } as ReturnGeneric;

    case 'collection_reference':
    case 'file_reference':
    case 'page_reference':
    case 'product_reference':
    case 'variant_reference':
      return {
        ...metafield,
        parsedValue: metafield.reference,
      } as ReturnGeneric;

    case 'color':
    case 'multi_line_text_field':
    case 'single_line_text_field':
    case 'url':
      return {
        ...metafield,
        parsedValue: metafield.value,
      } as ReturnGeneric;

    // TODO: 'money' should probably be parsed even further to like `useMoney()`, but that logic needs to be extracted first so it's not a hook
    case 'dimension':
    case 'money':
    case 'json':
    case 'rating':
    case 'volume':
    case 'weight':
    case 'list.color':
    case 'list.dimension':
    case 'list.number_integer':
    case 'list.number_decimal':
    case 'list.rating':
    case 'list.single_line_text_field':
    case 'list.url':
    case 'list.volume':
    case 'list.weight': {
      let parsedValue = null;
      try {
        parsedValue = parseJSON(metafield.value ?? '');
      } catch (err) {
        const parseError = `metafieldParser(): attempted to JSON.parse the 'metafield.value' property, but failed.`;
        if (__HYDROGEN_DEV__) {
          throw new Error(parseError);
        } else {
          console.error(`${parseError} Returning 'null' for 'parsedValue'`);
        }
        parsedValue = null;
      }
      return {
        ...metafield,
        parsedValue,
      } as ReturnGeneric;
    }

    case 'date':
    case 'date_time':
      return {
        ...metafield,
        parsedValue: new Date(metafield.value ?? ''),
      } as ReturnGeneric;

    case 'list.date':
    case 'list.date_time': {
      const jsonParseValue = parseJSON(metafield?.value ?? '') as string[];
      return {
        ...metafield,
        parsedValue: jsonParseValue.map((dateString) => new Date(dateString)),
      } as ReturnGeneric;
    }

    case 'number_decimal':
    case 'number_integer':
      return {
        ...metafield,
        parsedValue: Number(metafield.value),
      } as ReturnGeneric;

    case 'list.collection_reference':
    case 'list.file_reference':
    case 'list.page_reference':
    case 'list.product_reference':
    case 'list.variant_reference':
      return {
        ...metafield,
        parsedValue: flattenConnection(metafield.references ?? undefined),
      } as ReturnGeneric;

    default: {
      const typeNotFoundError = `metafieldParser(): the 'metafield.type' you passed in is not supported. Your type: "${metafield.type}". If you believe this is an error, please open an issue on GitHub.`;
      if (__HYDROGEN_DEV__) {
        throw new Error(typeNotFoundError);
      } else {
        console.error(
          `${typeNotFoundError}  Returning 'parsedValue' of 'null'`
        );
        return {
          ...metafield,
          parsedValue: null,
        } as ReturnGeneric;
      }
    }
  }
}

// taken from https://shopify.dev/apps/metafields/types
export const allMetafieldTypesArray = [
  'boolean',
  'collection_reference',
  'color',
  'date',
  'date_time',
  'dimension',
  'file_reference',
  'json',
  'money',
  'multi_line_text_field',
  'number_decimal',
  'number_integer',
  'page_reference',
  'product_reference',
  'rating',
  'single_line_text_field',
  'url',
  'variant_reference',
  'volume',
  'weight',
  // list metafields
  'list.collection_reference',
  'list.color',
  'list.date',
  'list.date_time',
  'list.dimension',
  'list.file_reference',
  'list.number_integer',
  'list.number_decimal',
  'list.page_reference',
  'list.product_reference',
  'list.rating',
  'list.single_line_text_field',
  'list.url',
  'list.variant_reference',
  'list.volume',
  'list.weight',
] as const;

/** A union of all the supported `metafield.type`s */
export type MetafieldTypeTypes = typeof allMetafieldTypesArray[number];

/**
 * A mapping of a Metafield's `type` to the TypeScript type that is returned from `metafieldParser()`
 * For example, when using `metafieldParser()`, the type will be correctly returned when used like the following:
 *
 * ```
 * const parsedMetafield = metafieldParser<ParsedMetafields['boolean']>(metafield);`
 * ```
 * `parsedMetafield.parsedValue`'s type is now `boolean`
 */
export type ParsedMetafields<ExtraTypeGeneric = void> = {
  /** A Metafield that's been parsed, with a `parsedValue` of `boolean` */
  boolean: Simplify<BooleanParsedMetafield>;
  /** A Metafield that's been parsed, with a `parsedValue` of a `Collection` object (as defined by the Storefront API) */
  collection_reference: Simplify<CollectionParsedRefMetafield>;
  /** A Metafield that's been parsed, with a `parsedValue` of type `string` */
  color: Simplify<ColorParsedMetafield>;
  /** A Metafield that's been parsed, with a `parsedValue` of type `Date` */
  date: Simplify<DatesParsedMetafield>;
  /** A Metafield that's been parsed, with a `parsedValue` of type `Date` */
  date_time: Simplify<DatesParsedMetafield>;
  /** A Metafield that's been parsed, with a `parsedValue` of type `Measurement` */
  dimension: Simplify<MeasurementParsedMetafield>;
  /** A Metafield that's been parsed, with a `parsedValue` of a `GenericFile` object (as defined by the Storefront API) */
  file_reference: Simplify<FileRefParsedMetafield>;
  /**
   * A Metafield that's been parsed, with a `parsedValue` of type `unknown`, unless you pass in the type as a generic. For example:
   *
   * ```
   * ParsedMetafields<MyJsonType>['json']
   * ```
   */
  json: Simplify<JsonParsedMetafield<ExtraTypeGeneric>>;
  /** A Metafield that's been parsed, with a `parsedValue` of type `Money` */
  money: Simplify<MoneyParsedMetafield>;
  /** A Metafield that's been parsed, with a `parsedValue` of type `string` */
  multi_line_text_field: Simplify<TextParsedMetafield>;
  /** A Metafield that's been parsed, with a `parsedValue` of type `number` */
  number_decimal: Simplify<NumberParsedMetafield>;
  /** A Metafield that's been parsed, with a `parsedValue` of type `number` */
  number_integer: Simplify<NumberParsedMetafield>;
  /** A Metafield that's been parsed, with a `parsedValue` of a `Page` object (as defined by the Storefront API) */
  page_reference: Simplify<PageParsedRefMetafield>;
  /** A Metafield that's been parsed, with a `parsedValue` of a `Product` object (as defined by the Storefront API) */
  product_reference: Simplify<ProductParsedRefMetafield>;
  /** A Metafield that's been parsed, with a `parsedValue` of type `Rating` */
  rating: Simplify<RatingParsedMetafield>;
  /** A Metafield that's been parsed, with a `parsedValue` of type `string` */
  single_line_text_field: Simplify<TextParsedMetafield>;
  /** A Metafield that's been parsed, with a `parsedValue` of type `string` */
  url: Simplify<TextParsedMetafield>;
  /** A Metafield that's been parsed, with a `parsedValue` of a `ProductVariant` object (as defined by the Storefront API) */
  variant_reference: Simplify<VariantParsedRefMetafield>;
  /** A Metafield that's been parsed, with a `parsedValue` of type `Measurement` */
  volume: Simplify<MeasurementParsedMetafield>;
  /** A Metafield that's been parsed, with a `parsedValue` of type `Measurement` */
  weight: Simplify<MeasurementParsedMetafield>;
  // list metafields
  /** A Metafield that's been parsed, with a `parsedValue` of an array of `Collection` objects (as defined by the Storefront API) */
  'list.collection_reference': Simplify<CollectionListParsedRefMetafield>;
  /** A Metafield that's been parsed, with a `parsedValue` of an array of strings */
  'list.color': Simplify<ColorListParsedMetafield>;
  /** A Metafield that's been parsed, with a `parsedValue` of an array of Date objects */
  'list.date': Simplify<DatesListParsedMetafield>;
  /** A Metafield that's been parsed, with a `parsedValue` of an array of Date objects */
  'list.date_time': Simplify<DatesListParsedMetafield>;
  /** A Metafield that's been parsed, with a `parsedValue` of an array of `Measurement` objects */
  'list.dimension': Simplify<MeasurementListParsedMetafield>;
  /** A Metafield that's been parsed, with a `parsedValue` of an array of `GenericFile` objects (as defined by the Storefront API) */
  'list.file_reference': Simplify<FileListParsedRefMetafield>;
  /** A Metafield that's been parsed, with a `parsedValue` of an array of numbers */
  'list.number_integer': Simplify<NumberListParsedMetafield>;
  /** A Metafield that's been parsed, with a `parsedValue` of an array of numbers */
  'list.number_decimal': Simplify<NumberListParsedMetafield>;
  /** A Metafield that's been parsed, with a `parsedValue` of an array of `Page` objects (as defined by the Storefront API) */
  'list.page_reference': Simplify<PageListParsedRefMetafield>;
  /** A Metafield that's been parsed, with a `parsedValue` of an array of `Product` objects (as defined by the Storefront API) */
  'list.product_reference': Simplify<ProductListParsedRefMetafield>;
  /** A Metafield that's been parsed, with a `parsedValue` of an array of `Rating`s */
  'list.rating': Simplify<RatingListParsedMetafield>;
  /** A Metafield that's been parsed, with a `parsedValue` of an array of strings */
  'list.single_line_text_field': Simplify<TextListParsedMetafield>;
  /** A Metafield that's been parsed, with a `parsedValue` of an array of strings */
  'list.url': Simplify<TextListParsedMetafield>;
  /** A Metafield that's been parsed, with a `parsedValue` of an array of `ProductVariant` objects (as defined by the Storefront API) */
  'list.variant_reference': Simplify<VariantListParsedRefMetafield>;
  /** A Metafield that's been parsed, with a `parsedValue` of an array of `Measurement`s */
  'list.volume': Simplify<MeasurementListParsedMetafield>;
  /** A Metafield that's been parsed, with a `parsedValue` of an array of `Measurement`s */
  'list.weight': Simplify<MeasurementListParsedMetafield>;
};

interface ParsedBase extends MetafieldBaseType {
  type: MetafieldTypeTypes;
  parsedValue: unknown;
}

interface BooleanParsedMetafield extends ParsedBase {
  type: 'boolean';
  parsedValue: boolean | null;
}
type CollectionParsedRefMetafield = MetafieldBaseType & {
  type: 'collection_reference';
  parsedValue: Collection | null;
};
type ColorParsedMetafield = MetafieldBaseType & {
  type: 'color';
  parsedValue: string | null;
};
type DatesParsedMetafield = MetafieldBaseType & {
  type: 'date' | 'date_time';
  parsedValue: Date | null;
};

type MeasurementParsedMetafield = MetafieldBaseType & {
  type: 'dimension' | 'weight' | 'volume';
  parsedValue: Measurement | null;
};

type FileRefParsedMetafield = MetafieldBaseType & {
  type: 'file_reference';
  parsedValue: GenericFile | null;
};

type JsonParsedMetafield<JsonTypeGeneric = void> = MetafieldBaseType & {
  type: 'json';
  parsedValue: JsonTypeGeneric extends void ? unknown : JsonTypeGeneric | null;
};

type MoneyParsedMetafield = MetafieldBaseType & {
  type: 'money';
  parsedValue: MoneyV2 | null;
};

type TextParsedMetafield = MetafieldBaseType & {
  type: 'single_line_text_field' | 'multi_line_text_field' | 'url';
  parsedValue: string | null;
};

type NumberParsedMetafield = MetafieldBaseType & {
  type: 'number_decimal' | 'number_integer';
  parsedValue: number | null;
};

type PageParsedRefMetafield = MetafieldBaseType & {
  type: 'page_reference';
  parsedValue: Page | null;
};

type ProductParsedRefMetafield = MetafieldBaseType & {
  type: 'product_reference';
  parsedValue: Product | null;
};

type RatingParsedMetafield = MetafieldBaseType & {
  type: 'rating';
  parsedValue: Rating | null;
};

type VariantParsedRefMetafield = MetafieldBaseType & {
  type: 'variant_reference';
  parsedValue: ProductVariant | null;
};

type CollectionListParsedRefMetafield = MetafieldBaseType & {
  type: 'list.collection_reference';
  parsedValue: Array<Collection> | null;
};

type ColorListParsedMetafield = MetafieldBaseType & {
  type: 'list.color';
  parsedValue: Array<string> | null;
};

type DatesListParsedMetafield = MetafieldBaseType & {
  type: 'list.date' | 'list.date_time';
  parsedValue: Array<Date> | null;
};

type MeasurementListParsedMetafield = MetafieldBaseType & {
  type: 'list.dimension' | 'list.weight' | 'list.volume';
  parsedValue: Array<Measurement> | null;
};

type FileListParsedRefMetafield = MetafieldBaseType & {
  type: 'list.file_reference';
  parsedValue: Array<GenericFile> | null;
};

type TextListParsedMetafield = MetafieldBaseType & {
  type: 'list.single_line_text_field' | 'list.url';
  parsedValue: Array<string> | null;
};

type NumberListParsedMetafield = MetafieldBaseType & {
  type: 'list.number_decimal' | 'list.number_integer';
  parsedValue: Array<number> | null;
};

type PageListParsedRefMetafield = MetafieldBaseType & {
  type: 'list.page_reference';
  parsedValue: Array<Page> | null;
};

type ProductListParsedRefMetafield = MetafieldBaseType & {
  type: 'list.product_reference';
  parsedValue: Array<Product> | null;
};

type RatingListParsedMetafield = MetafieldBaseType & {
  type: 'list.rating';
  parsedValue: Array<Rating> | null;
};

type VariantListParsedRefMetafield = MetafieldBaseType & {
  type: 'list.variant_reference';
  parsedValue: Array<ProductVariant> | null;
};

export type Measurement = {
  unit: string;
  value: number;
};

export interface Rating {
  value: number;
  scale_min: number;
  scale_max: number;
}
