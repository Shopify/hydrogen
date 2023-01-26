import {ReferenceEntityTemplateSchema} from '@shopify/generate-docs';

const data: ReferenceEntityTemplateSchema = {
  name: 'CartLineProvider',
  category: 'components',
  isVisualComponent: false,
  related: [
    {
      name: 'useCartLine',
      type: 'hooks',
      url: '/api/react-storefront-kit/hooks/useCartLine',
    },
  ],
  description: `
    The \`CartLineProvider\` component creates a context for using a cart line.
  `,
  type: 'component',
  defaultExample: {
    description: 'I am the default example',
    codeblock: {
      tabs: [
        {
          title: 'JavaScript',
          code: './CartLineProvider.example.jsx',
          language: 'jsx',
        },
        {
          title: 'TypeScript',
          code: './CartLineProvider.example.tsx',
          language: 'tsx',
        },
      ],
      title: 'Example code',
    },
  },
  definitions: [
    {
      title: 'Props',
      type: 'CartLineProviderProps',
      description: '',
    },
  ],
};

export default data;
