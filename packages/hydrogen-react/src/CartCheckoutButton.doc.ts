import {ReferenceEntityTemplateSchema} from '@shopify/generate-docs';

const data: ReferenceEntityTemplateSchema = {
  name: 'CartCheckoutButton',
  category: 'components',
  isVisualComponent: false,
  related: [],
  description: `The \`CartCheckoutButton\` component renders a button that redirects to the checkout URL for the cart.\n\nMust be a descendent of a \`CartProvider\` component.
  `,
  type: 'component',
  defaultExample: {
    description: 'I am the default example',
    codeblock: {
      tabs: [
        {
          title: 'JavaScript',
          code: './CartCheckoutButton.example.jsx',
          language: 'jsx',
        },
        {
          title: 'TypeScript',
          code: './CartCheckoutButton.example.tsx',
          language: 'tsx',
        },
      ],
      title: 'Example code',
    },
  },
  definitions: [
    {
      title: 'Props',
      type: 'CartCheckoutButtonPropsForDocs',
      description: '',
    },
  ],
};

export default data;
