import {mapSelectedProductOptionToObject} from '@shopify/hydrogen-react';

const selectedOption = [
  {
    name: 'Color',
    value: 'Red',
  },
  {
    name: 'Size',
    value: 'Medium',
  },
];

const optionsObject = mapSelectedProductOptionToObject(selectedOption);

// Output of optionsObject
// {
//   Color: 'Red',
//   Size: 'Medium',
// }

const searchParams = new URLSearchParams(optionsObject);
searchParams.toString(); // '?Color=Red&Size=Medium'
