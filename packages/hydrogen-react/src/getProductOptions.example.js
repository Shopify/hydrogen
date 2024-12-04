import {getProductOptions} from '@shopify/hydrogen-react';

// Make sure you are querying for the following fields:
// - product.handle
// - product.encodedVariantExistence
// - product.encodedVariantAvailability
// - product.options.name
// - product.options.optionValues.name
// - product.options.optionValues.firstSelectableVariant
// - product.selectedOrFirstAvailableVariant
// - product.adjacentVariants
//
// For any fields that are ProductVariant type, make sure to query for:
// - variant.product.handle
// - variant.selectedOptions.name
// - variant.selectedOptions.value

const product = {/* Result from querying the SFAPI for a product */};

const productOptions = getProductOptions(product);

// For example, we have a product with the following option
// Color: Red, Blue
// Size: Small, Large

// Output of productOption
[
  {
    name: 'Color',
    optionValues: [
      {
        name: 'Red',
        handle: 'awesome-product',
        variantUriQuery: '?Color=Red&Size=Small',
        variant: {},  // variant information for this option
        selected: true,
        exists: true,
        available: true,
        isDifferentProduct: false,
      },
      {
        name: 'Blue',
        handle: 'awesome-product',
        variantUriQuery: '?Color=Blue&Size=Small',
        variant: {},  // variant information for this option
        selected: false,
        exists: true,
        available: true,
        isDifferentProduct: false,
      }
    ],
  },
  {
    name: 'Size',
    optionValues: [
      {
        name: 'Small',
        handle: 'awesome-product',
        variantUriQuery: '?Color=Red&Size=Small',
        variant: {},  // variant information for this option
        selected: true,
        exists: true,
        available: true,
        isDifferentProduct: false,
      },
      {
        name: 'Large',
        handle: 'awesome-product',
        variantUriQuery: '?Color=Red&Size=Large',
        variant: {},  // variant information for this option
        selected: false,
        exists: true,
        available: true,
        isDifferentProduct: false,
      }
    ],
  }
]
