import {decodeEncodedVariant} from '@shopify/hydrogen-react';

// product.options = [
//   {
//     name: 'Color',
//     optionValues: [
//       {name: 'Red'},
//       {name: 'Blue'},
//       {name: 'Green'},
//     ]
//   },
//   {
//     name: 'Size',
//     optionValues: [
//       {name: 'S'},
//       {name: 'M'},
//       {name: 'L'},
//     ]
//   }
// ]

const encodedVariantAvailability = 'v1_0:0-2,1:2,';

const decodedVariantAvailability = decodeEncodedVariant(
  encodedVariantAvailability,
);

// decodedVariantAvailability
// {
//   [0,0],    // Red, S
//   [0,1],    // Red, M
//   [0,2],    // Red, L
//   [1,2]     // Blue, L
// }
