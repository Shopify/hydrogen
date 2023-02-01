import {ReferenceEntityTemplateSchema} from '@shopify/generate-docs';

const data: ReferenceEntityTemplateSchema = {
  name: 'BuyNowButton',
  category: 'components',
  isVisualComponent: false,
  related: [],
  description: `The \`BuyNowButton\` component renders a button that adds an item to the cart and redirects the customer to checkout.\n\nMust be a child of a \`CartProvider\` component.
  `,
  type: 'component',
  defaultExample: {
    description: 'I am the default example',
    codeblock: {
      tabs: [
        {
          title: 'JavaScript',
          code: './BuyNowButton.example.jsx',
          language: 'jsx',
        },
        {
          title: 'TypeScript',
          code: './BuyNowButton.example.tsx',
          language: 'tsx',
        },
      ],
      title: 'Example code',
    },
  },
  definitions: [
    {
      title: 'Props',
      type: 'BuyNowButtonProps',
      description: '',
    },
  ],
};

export default data;
