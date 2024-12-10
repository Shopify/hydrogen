import {useSelectedOptionInUrlParam} from '@shopify/hydrogen-react';

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

useSelectedOptionInUrlParam(selectedOption);

// URL will be updated to <original product url>?Color=Red&Size=Medium
