import {ReferenceEntityTemplateSchema} from '@shopify/generate-docs';

const data: ReferenceEntityTemplateSchema = {
  name: 'getAdjacentAndFirstAvailableVariants',
  category: 'utilities',
  isVisualComponent: false,
  related: [
    {
      name: 'getProductOptions',
      type: 'gear',
      url: '/api/hydrogen-react/utilities/getproductoptions',
    },
    {
      name: 'mapSelectedProductOptionToObject',
      type: 'gear',
      url: '/api/hydrogen-react/utilities/mapselectedproductoptiontoobject',
    },
  ],
  description:
    'Finds all the variants provided by `adjacentVariants`, `options.optionValues.firstAvailableVariant`, and `selectedOrFirstAvailableVariant` and return them in a single array. This function will remove any duplicated variants found.',
  type: 'utility',
  defaultExample: {
    description: 'I am the default example',
    codeblock: {
      tabs: [
        {
          title: 'getAdjacentAndFirstAvailableVariants example',
          code: './getProductOptions.getAdjacentAndFirstAvailableVariants.example.js',
          language: 'js',
        },
      ],
      title: 'getAdjacentAndFirstAvailableVariants.js',
    },
  },
  definitions: [],
};

export default data;
