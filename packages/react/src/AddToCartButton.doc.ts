import {ReferenceEntityTemplateSchema} from '@shopify/generate-docs';

const data: ReferenceEntityTemplateSchema = {
  name: 'AddToCartButton',
  category: 'components',
  isVisualComponent: false,
  related: [],
  description: `The \`AddToCartButton\` component renders a button that adds an item to the cart when pressed.\n\nIt must be a descendent of the \`CartProvider\` component.`,
  type: 'component',
  defaultExample: {
    description: 'I am the default example',
    codeblock: {
      tabs: [
        {
          title: 'JavaScript',
          code: './AddToCartButton.example.jsx',
          language: 'jsx',
        },
        {
          title: 'TypeScript',
          code: './AddToCartButton.example.tsx',
          language: 'tsx',
        },
      ],
      title: 'Example code',
    },
  },
  definitions: [
    {
      title: 'Props',
      type: 'AddToCartButtonPropsForDocs',
      description: '',
    },
  ],
};

export default data;
