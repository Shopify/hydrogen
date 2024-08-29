import {decodeOptionValues} from './productOptionValueDecoder';
import type {ProductOption, ProductOptionValue, ProductVariant, Scalars, SelectedOption } from '@shopify/hydrogen-react/storefront-api-types';;


type ProductOptionsMapping = Record<string, number>;

/**
 * Creates a mapping of product options to their index for matching encoded values
 * For example, a product option of
 *  [
 *    {
 *      name: 'Color',
 *      optionValues: [{name: 'Red'}, {name: 'Blue'}]
 *    },
 *    {
 *      name: 'Size',
 *      optionValues: [{name: 'Small'}, {name: 'Medium'}, {name: 'Large'}]
 *    }
 *  ]
 * Would return
 *  [
 *    {Red: 0, Blue: 1},
 *    {Small: 0, Medium: 1, Large: 2}
 *  ]
 * @param options
 * @returns
 */
function mapProductOptions(options: ProductOption[]): ProductOptionsMapping[] {
  return options.map((option) => {
    return Object.assign({}, ...option.optionValues.map((value, index) => {
      return {[value.name]: index}
    }));
  });
}

/**
 * Decodes the encoded option values into a key for mapping to the product options
 * @param encodedOptionValues
 * @returns
 */
function decodeOptionValuesAsKey(encodedOptionValues: string) {
  const decodedOptionValues = decodeOptionValues(encodedOptionValues);
  return decodedOptionValues.map((optionSet) => {
    return JSON.stringify(optionSet);
  });
}

/**
 * Converts the product option into an Object<key, value> for building query params
 * For example, a selected product option of
 *  [
 *    {
 *      name: 'Color',
 *      value: 'Red',
 *    },
 *    {
 *      name: 'Size',
 *      value: 'Medium',
 *    }
 *  ]
 * Would return
 *  {
 *    Color: 'Red',
 *    Size: 'Medium',
 *  }
 */
function mapSelectedProductOptionToObject(options: Pick<SelectedOption, "name" | "value">[]) {
  return Object.assign({}, ...options.map((key) => {
    return {[key.name]: key.value};
  }));
}

/**
 * Encode the selected product option as a key for mapping to the encoded variants
 * For example, a selected product option of
 *  [
 *    {
 *      name: 'Color',
 *      value: 'Red',
 *    },
 *    {
 *      name: 'Size',
 *      value: 'Medium',
 *    }
 *  ]
 * Would return
 *  [0,1]
 *
 * Also works with the result of mapSelectedProductOption. For example:
 *  {
 *    Color: 'Red',
 *    Size: 'Medium',
 *  }
 * Would return
 *  [0,1]
 *
 * @param selectedOption - The selected product option
 * @param productOptionMappings - The result of product option mapping from mapProductOptions
 * @returns
 */
function encodeSelectedProductOptionAsKey(selectedOption: Pick<SelectedOption, "name" | "value">[] | Record<string, string>, productOptionMappings: ProductOptionsMapping[]) {
  if (Array.isArray(selectedOption)) {
    return JSON.stringify(selectedOption.map((key, index) => {
      return productOptionMappings[index][key.value];
    }));
  } else {
    return JSON.stringify(Object.keys(selectedOption).map((key, index) => {
      return productOptionMappings[index][selectedOption[key]];
    }));
  }
}

/**
 * Takes an array of product variants and maps them to an object with the encoded selected option values as the key.
 * For example, a product variant of
 * [
 *  {
 *    id: 1,
 *    selectedOptions: [
 *      {name: 'Color', value: 'Red'},
 *      {name: 'Size', value: 'Small'},
 *    ],
 *  },
 *  {
 *    id: 2,
 *    selectedOptions: [
 *      {name: 'Color', value: 'Red'},
 *      {name: 'Size', value: 'Medium'},
 *    ],
 *  }
 * ]
 * Would return
 * {
 *    '[0,0]': {id: 1, selectedOptions: [{name: 'Color', value: 'Red'}, {name: 'Size', value: 'Small'}]},
 *    '[0,1]': {id: 2, selectedOptions: [{name: 'Color', value: 'Red'}, {name: 'Size', value: 'Medium'}]},
 * }
 * @param variants
 * @param productOptionMappings
 * @returns
 */
function mapAdjacentVariants(variants: ProductVariant[], productOptionMappings: ProductOptionsMapping[]) {
  return Object.assign({}, ...variants.map((variant) => {
    const variantKey = encodeSelectedProductOptionAsKey(variant.selectedOptions || [], productOptionMappings);
    return {[variantKey]: variant};;
  }));
}

type MappedProductOptionValue = ProductOptionValue & {
  variant: ProductVariant;
  handle: string;
  variantUriQuery: string;
  selected: boolean;
  exists: boolean;
  available: boolean;
  isDifferentProduct: boolean;
}

export type MappedProductOptions = Omit<ProductOption, 'optionValues'> & {
  optionValues: MappedProductOptionValue[];
}

export function getProductOptions({
  productHandle,
  options,
  selectedVariant,
  adjacentVariants,
  encodedVariantExistence,
}: {
  productHandle: string;
  options: ProductOption[];
  selectedVariant: ProductVariant;
  adjacentVariants: ProductVariant[];
  encodedVariantExistence: string;
}): MappedProductOptions[] {
  // Get a mapping of product option names to their index for matching encoded values
  const productOptionMappings = mapProductOptions(options);

  // Get the adjacent variants mapped to the encoded selected option values
  const variants = mapAdjacentVariants([
    selectedVariant,
    ...adjacentVariants,
  ], productOptionMappings);

  // Get the key:value version of selected options for building url query params
  const selectedOptions = mapSelectedProductOptionToObject(selectedVariant.selectedOptions || []);

  // Decode the encoded variant existence
  const decodedVariantExistence = decodeOptionValuesAsKey(encodedVariantExistence);

  return options.map((option) => {
    return {
      ...option,
      optionValues: option.optionValues.map((value) => {
        const targetOptionParams = {...selectedOptions};  // Clones the selected options

        // Modify the selected option value to the current option value
        targetOptionParams[option.name] = value.name;

        // Encode the new selected option values as a key for mapping to the product variants
        const targetKey = encodeSelectedProductOptionAsKey(targetOptionParams || [], productOptionMappings);

        // Get the variant for the current option value
        const variant: ProductVariant = variants[targetKey];

        // Build the query params for the current option value
        const searchParams = new URLSearchParams(targetOptionParams);
        const handle = variant?.product?.handle;


        return {
          ...value,
          variant,
          handle,
          variantUriQuery: searchParams.toString(),
          selected: selectedOptions[option.name] === value.name,
          exists: decodedVariantExistence.includes(targetKey),
          available: variant?.availableForSale || false,
          isDifferentProduct: handle ? handle !== productHandle : false,
        };
      }),
    };
  });

}
