import {ReferenceEntityTemplateSchema} from '@shopify/generate-docs';

const data: ReferenceEntityTemplateSchema = {
  name: 'useSelectedOptionInUrlParam',
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
  ],
  description:
    'Sets the url params to the selected option.',
  type: 'utility',
  defaultExample: {
    description: 'I am the default example',
    codeblock: {
      tabs: [
        {
          title: 'useSelectedOptionInUrlParam example',
          code: './useSelectedOptionInUrlParam.example.js',
          language: 'js',
        },
      ],
      title: 'Example',
    },
  },
  definitions: [],
};

export default data;
