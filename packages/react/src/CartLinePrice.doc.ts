import {ReferenceEntityTemplateSchema} from '@shopify/generate-docs';

const data: ReferenceEntityTemplateSchema = {
  name: 'CartLinePrice',
  category: 'components',
  isVisualComponent: false,
  related: [
    {
      name: 'Money',
      type: 'component',
      url: '/api/react-storefront-kit/components/money',
    },
  ],
  description: `
    The \`CartLinePrice\` component renders a \`Money\` component for the cart line merchandise's price or compare at price.
  `,
  type: 'component',
  defaultExample: {
    description: 'I am the default example',
    codeblock: {
      tabs: [
        {
          title: 'JavaScript',
          code: './CartLinePrice.example.jsx',
          language: 'jsx',
        },
        {
          title: 'TypeScript',
          code: './CartLinePrice.example.tsx',
          language: 'tsx',
        },
      ],
      title: 'Example code',
    },
  },
  definitions: [
    {
      title: 'Props',
      type: 'CartLinePriceProps',
      description: '',
    },
  ],
};

export default data;
