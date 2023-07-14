import {ReferenceEntityTemplateSchema} from '@shopify/generate-docs';

const data: ReferenceEntityTemplateSchema = {
  name: 'useVariantUrl',
  category: 'hooks',
  isVisualComponent: false,
  related: [
    {
      name: 'VariantSelector',
      type: 'components',
      url: '/docs/api/hydrogen/2023-04/components/variantselector',
    },
    {
      name: 'getSelectedProductOptions',
      type: 'utilities',
      url: '/docs/api/hydrogen/2023-04/utilities/getselectedproductoptions',
    },
  ],
  description: `The \`useVariantUrl\` hook helps you know the URL to navigate to a given product handle with selected options.`,
  type: 'component',
  defaultExample: {
    description: 'I am the default example',
    codeblock: {
      tabs: [
        {
          title: 'JavaScript',
          code: './useVariantUrl.example.jsx',
          language: 'jsx',
        },
        {
          title: 'TypeScript',
          code: './useVariantUrl.example.tsx',
          language: 'tsx',
        },
      ],
      title: 'Example code',
    },
  },
  definitions: [
    {
      title: 'Props',
      type: 'UseVariantUrlGeneratedType',
      description: '',
    },
  ],
};

export default data;
