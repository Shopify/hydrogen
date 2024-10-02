import {decodeOptionValues} from '@shopify/hydrogen-react';

const encodedOptionValues = 'v1_0:0-2,1:3';

const decodedOptionValues = decodeOptionValues(encodedOptionValues);

// Returns
console.log(decodedOptionValues);
// {
//   [0,0],
//   [0,1],
//   [0,2],
//   [1,3]
// }
