import {isOptionValueCombinationInEncodedVariant} from './optionValueDecoder.js';
import type {
  Product,
  ProductOption,
  ProductOptionValue,
  ProductVariant,
  SelectedOption,
} from './storefront-api-types';

export type RecursivePartial<T> = {
  [P in keyof T]?: RecursivePartial<T[P]>;
};
type ProductOptionsMapping = Record<string, Record<string, number>>;
type ProductOptionValueState = {
  variant: ProductVariant;
  handle: string;
  variantUriQuery: string;
  selected: boolean;
  exists: boolean;
  available: boolean;
  isDifferentProduct: boolean;
};
type MappedProductOptionValue = ProductOptionValue & ProductOptionValueState;

/**
 * Creates a mapping of product options to their index for matching encoded values
 * For example, a product option of
 *  [
 *    \{
 *      name: 'Color',
 *      optionValues: [\{name: 'Red'\}, \{name: 'Blue'\}]
 *    \},
 *    \{
 *      name: 'Size',
 *      optionValues: [\{name: 'Small'\}, \{name: 'Medium'\}, \{name: 'Large'\}]
 *    \}
 *  ]
 * Would return
 *  \{
 *    'Color': \{Red: 0, Blue: 1\},
 *    'Size': \{Small: 0, Medium: 1, Large: 2\}
 *  \}
 */
function mapProductOptions(options: ProductOption[]): ProductOptionsMapping {
  return Object.assign(
    {},
    ...options.map((option: ProductOption) => {
      return {
        [option.name]: Object.assign(
          {},
          ...(option?.optionValues
            ? option.optionValues.map((value, index) => {
                return {[value.name]: index};
              })
            : []),
        ),
      } as Record<string, number>;
    }),
  );
}

/**
 * Converts the product option into an Object\<key, value\> for building query params
 * For example, a selected product option of
 *  [
 *    \{
 *      name: 'Color',
 *      value: 'Red',
 *    \},
 *    \{
 *      name: 'Size',
 *      value: 'Medium',
 *    \}
 *  ]
 * Would return
 *  \{
 *    Color: 'Red',
 *    Size: 'Medium',
 *  \}
 */
export function mapSelectedProductOptionToObject(
  options: Pick<SelectedOption, 'name' | 'value'>[],
): Record<string, string> {
  return Object.assign(
    {},
    ...options.map((key) => {
      return {[key.name]: key.value};
    }),
  ) as Record<string, string>;
}

/**
 * Returns the JSON stringify result of mapSelectedProductOptionToObject
 */
function mapSelectedProductOptionToObjectAsString(
  options: Pick<SelectedOption, 'name' | 'value'>[],
): string {
  return JSON.stringify(mapSelectedProductOptionToObject(options));
}

/**
 * Encode the selected product option as a key for mapping to the encoded variants
 * For example, a selected product option of
 *  [
 *    \{
 *      name: 'Color',
 *      value: 'Red',
 *    \},
 *    \{
 *      name: 'Size',
 *      value: 'Medium',
 *    \}
 *  ]
 * Would return
 *  JSON.stringify(\{
 *    Color: 'Red',
 *    Size: 'Medium',
 *  \})
 */
function encodeSelectedProductOptionAsKey(
  selectedOption:
    | Pick<SelectedOption, 'name' | 'value'>[]
    | Record<string, string>,
): string {
  if (Array.isArray(selectedOption)) {
    return JSON.stringify(
      Object.assign(
        {},
        ...selectedOption.map((option) => ({[option.name]: option.value})),
      ),
    );
  } else {
    return JSON.stringify(selectedOption);
  }
}

/**
 * Build the encoding array for the given selected options. For example, if we have
 * the following productOptionMappings:
 *
 *  \{
 *    'Color': \{Red: 0, Blue: 1\},
 *    'Size': \{Small: 0, Medium: 1, Large: 2\}
 *  \}
 *
 * A selectedOption of
 *
 * \{
 *    Color: 'Red',
 *    Size: 'Medium',
 * \}
 *
 * `buildEncodingArrayFromSelectedOptions` will produce
 *
 * [0,1]
 *
 * If in the case where a selected option doesn't exists in the mapping array, for example:
 *
 * \{
 *    Color: 'Red',
 *    Fabric: 'Cotton',
 *    Size: 'Medium',
 * \}
 *
 * `buildEncodingArrayFromSelectedOptions` will still produce
 *
 *  [0,1]
 *
 * This can be caused by when we do not have all the product
 * option information for the loading optimistic variant
 */
function buildEncodingArrayFromSelectedOptions(
  selectedOption: Record<string, string>,
  productOptionMappings: ProductOptionsMapping,
): Array<number> {
  const encoding = Object.keys(selectedOption).map((key) => {
    return productOptionMappings[key]
      ? productOptionMappings[key][selectedOption[key]]
      : null;
  });
  return encoding.filter((code) => code !== null);
}

/**
 * Takes an array of product variants and maps them to an object with the encoded selected option values as the key.
 * For example, a product variant of
 * [
 *  \{
 *    id: 1,
 *    selectedOptions: [
 *      \{name: 'Color', value: 'Red'\},
 *      \{name: 'Size', value: 'Small'\},
 *    ],
 *  \},
 *  \{
 *    id: 2,
 *    selectedOptions: [
 *      \{name: 'Color', value: 'Red'\},
 *      \{name: 'Size', value: 'Medium'\},
 *    ],
 *  \}
 * ]
 * Would return
 * \{
 *    '[0,0]': \{id: 1, selectedOptions: [\{name: 'Color', value: 'Red'\}, \{name: 'Size', value: 'Small'\}]\},
 *    '[0,1]': \{id: 2, selectedOptions: [\{name: 'Color', value: 'Red'\}, \{name: 'Size', value: 'Medium'\}]\},
 * \}
 */
function mapVariants(
  variants: ProductVariant[],
): Record<string, ProductVariant> {
  return Object.assign(
    {},
    ...variants.map((variant) => {
      const variantKey = encodeSelectedProductOptionAsKey(
        variant.selectedOptions || [],
      );
      return {[variantKey]: variant};
    }),
  ) as Record<string, ProductVariant>;
}

export type MappedProductOptions = Omit<ProductOption, 'optionValues'> & {
  optionValues: MappedProductOptionValue[];
};

const PRODUCT_INPUTS = [
  'options',
  'selectedOrFirstAvailableVariant',
  'adjacentVariants',
];

const PRODUCT_INPUTS_EXTRA = [
  'handle',
  'encodedVariantExistence',
  'encodedVariantAvailability',
];

function logErrorAndReturnFalse(key: string): boolean {
  console.error(
    `[h2:error:getProductOptions] product.${key} is missing. Make sure you query for this field from the Storefront API.`,
  );
  return false;
}

export function checkProductParam(
  product: RecursivePartial<Product>,
  checkAll = false,
): Product {
  let validParam = true;
  const productKeys = Object.keys(product);

  // Check product input
  (checkAll
    ? [...PRODUCT_INPUTS, ...PRODUCT_INPUTS_EXTRA]
    : PRODUCT_INPUTS
  ).forEach((key) => {
    if (!productKeys.includes(key)) {
      validParam = logErrorAndReturnFalse(key);
    }
  });

  // Check for nested options requirements
  if (product.options) {
    const firstOption = product?.options[0];

    if (checkAll && !firstOption?.name) {
      validParam = logErrorAndReturnFalse('options.name');
    }

    // Check for options.optionValues
    if (product?.options[0]?.optionValues) {
      let firstOptionValues = product.options[0].optionValues[0];

      // Check for options.optionValues.name
      if (checkAll && !firstOptionValues?.name) {
        validParam = logErrorAndReturnFalse('options.optionValues.name');
      }

      // It is possible for firstSelectableVariant to be null
      firstOptionValues = product.options[0].optionValues.filter(
        (value) => !!value?.firstSelectableVariant,
      )[0];

      // Check for options.optionValues.firstSelectableVariant
      if (firstOptionValues?.firstSelectableVariant) {
        // check product variant
        validParam = checkProductVariantParam(
          firstOptionValues.firstSelectableVariant,
          'options.optionValues.firstSelectableVariant',
          validParam,
          checkAll,
        );
      }
    } else {
      validParam = logErrorAndReturnFalse('options.optionValues');
    }
  }

  // Check for nested selectedOrFirstAvailableVariant requirements
  if (product.selectedOrFirstAvailableVariant) {
    validParam = checkProductVariantParam(
      product.selectedOrFirstAvailableVariant,
      'selectedOrFirstAvailableVariant',
      validParam,
      checkAll,
    );
  }

  // Check for nested adjacentVariants requirements
  if (!!product.adjacentVariants && product.adjacentVariants[0]) {
    validParam = checkProductVariantParam(
      product.adjacentVariants[0],
      'adjacentVariants',
      validParam,
      checkAll,
    );
  }

  return (validParam ? product : {}) as Product;
}

function checkProductVariantParam(
  variant: RecursivePartial<ProductVariant>,
  key: string,
  currentValidParamState: boolean,
  checkAll: boolean,
): boolean {
  let validParam = currentValidParamState;

  if (checkAll && !variant.product?.handle) {
    validParam = logErrorAndReturnFalse(`${key}.product.handle`);
  }
  if (variant.selectedOptions) {
    const firstSelectedOption = variant.selectedOptions[0];
    if (!firstSelectedOption?.name) {
      validParam = logErrorAndReturnFalse(`${key}.selectedOptions.name`);
    }
    if (!firstSelectedOption?.value) {
      validParam = logErrorAndReturnFalse(`${key}.selectedOptions.value`);
    }
  } else {
    validParam = logErrorAndReturnFalse(`${key}.selectedOptions`);
  }

  return validParam;
}

/**
 * Finds all the variants provided by adjacentVariants, options.optionValues.firstAvailableVariant,
 * and selectedOrFirstAvailableVariant and return them in a single array
 */
export function getAdjacentAndFirstAvailableVariants(
  product: RecursivePartial<Product>,
): ProductVariant[] {
  // Checks for valid product input
  const checkedProduct = checkProductParam(product);

  if (!checkedProduct.options) return [];

  const availableVariants: Record<string, ProductVariant> = {};
  checkedProduct.options.map((option) => {
    option.optionValues?.map((value) => {
      if (value.firstSelectableVariant) {
        const variantKey = mapSelectedProductOptionToObjectAsString(
          value.firstSelectableVariant.selectedOptions,
        );
        availableVariants[variantKey] = value.firstSelectableVariant;
      }
    });
  });

  checkedProduct.adjacentVariants.map((variant) => {
    const variantKey = mapSelectedProductOptionToObjectAsString(
      variant.selectedOptions,
    );
    availableVariants[variantKey] = variant;
  });

  const selectedVariant = checkedProduct.selectedOrFirstAvailableVariant;
  if (selectedVariant) {
    const variantKey = mapSelectedProductOptionToObjectAsString(
      selectedVariant.selectedOptions,
    );
    availableVariants[variantKey] = selectedVariant;
  }

  return Object.values(availableVariants);
}

/**
 * Returns a product options array with its relevant information
 * about the variant
 */
export function getProductOptions(
  product: RecursivePartial<Product>,
): MappedProductOptions[] {
  // Checks for valid product input
  const checkedProduct = checkProductParam(product, true);

  if (!checkedProduct.options) return [];

  const {
    options,
    selectedOrFirstAvailableVariant: selectedVariant,
    adjacentVariants,
    encodedVariantExistence,
    encodedVariantAvailability,
    handle: productHandle,
  } = checkedProduct;

  // The available product options is dictated by the selected options of the current variant:
  // Filter out un-used options (Happens on parent combined listing product)
  const selectedOptionKeys = selectedVariant?.selectedOptions.map(
    (option) => option.name,
  );
  const filteredOptions = options.filter((option) => {
    return selectedOptionKeys && selectedOptionKeys.indexOf(option.name) >= 0;
  });

  // Get a mapping of product option names to their index for matching encoded values
  const productOptionMappings = mapProductOptions(options);

  // Get the adjacent variants mapped to the encoded selected option values
  const variants = mapVariants(
    selectedVariant ? [selectedVariant, ...adjacentVariants] : adjacentVariants,
  );

  // Get the key:value version of selected options for building url query params
  const selectedOptions = mapSelectedProductOptionToObject(
    selectedVariant ? selectedVariant.selectedOptions : [],
  );

  const productOptions = filteredOptions.map((option, optionIndex) => {
    return {
      ...option,
      optionValues: option.optionValues.map((value) => {
        const targetOptionParams = {...selectedOptions}; // Clones the selected options

        // Modify the selected option value to the current option value
        targetOptionParams[option.name] = value.name;

        // Encode the new selected option values as a key for mapping to the product variants
        const targetKey = encodeSelectedProductOptionAsKey(
          targetOptionParams || [],
        );
        const encodingKey = buildEncodingArrayFromSelectedOptions(
          targetOptionParams || [],
          productOptionMappings,
        );

        // Top-down option check for existence and availability
        const topDownKey = encodingKey.slice(0, optionIndex + 1);
        const exists = isOptionValueCombinationInEncodedVariant(
          topDownKey,
          encodedVariantExistence || '',
        );
        const available = isOptionValueCombinationInEncodedVariant(
          topDownKey,
          encodedVariantAvailability || '',
        );

        // Get the variant for the current option value if exists, else use the first selectable variant
        const variant: ProductVariant =
          variants[targetKey] || value.firstSelectableVariant;

        // Build the query params for this option value
        let variantOptionParam = {};
        if (variant) {
          variantOptionParam = mapSelectedProductOptionToObject(
            variant.selectedOptions || [],
          );
        }
        const searchParams = new URLSearchParams(variantOptionParam);
        const handle = variant?.product?.handle || productHandle;

        return {
          ...value,
          variant,
          handle,
          variantUriQuery: searchParams.toString(),
          selected: selectedOptions[option.name] === value.name,
          exists,
          available,
          isDifferentProduct: handle !== productHandle,
        };
      }),
    };
  });

  return productOptions;
}
