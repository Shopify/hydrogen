import {ReferenceEntityTemplateSchema} from '@shopify/generate-docs';

const data: ReferenceEntityTemplateSchema = {
  name: 'mapSelectedProductOptionToObject',
  category: 'utilities',
  isVisualComponent: false,
  related: [
    {
      name: 'getProductOptions',
      type: 'gear',
      url: '/api/hydrogen-react/utilities/getproductoptions',
    },
    {
      name: 'getAdjacentAndFirstAvailableVariants',
      type: 'gear',
      url: '/api/hydrogen-react/utilities/getadjacentandfirstavailablevariants',
    },
    {
      name: 'useSelectedOptionInUrlParam',
      type: 'gear',
      url: '/api/hydrogen-react/utilities/useselectedoptioninurlparam',
    },
  ],
  description:
    'Converts the product selected option into an `Object<key, value>` format for building URL query params',
  type: 'utility',
  defaultExample: {
    description: 'I am the default example',
    codeblock: {
      tabs: [
        {
          title: 'mapSelectedProductOptionToObject example',
          code: './getProductOptions.mapSelectedProductOptionToObject.example.js',
          language: 'js',
        },
      ],
      title: 'mapSelectedProductOptionToObject.js',
    },
  },
  definitions: [],
};

export default data;
