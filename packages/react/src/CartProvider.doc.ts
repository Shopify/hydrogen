import {ReferenceEntityTemplateSchema} from '@shopify/generate-docs';

const data: ReferenceEntityTemplateSchema = {
  name: 'CartProvider',
  category: 'components',
  isVisualComponent: false,
  related: [
    {
      name: 'useCart',
      type: 'hooks',
      url: '/api/react-storefront-kit/hooks/useCart',
    },
  ],
  description: `
    The \`CartProvider\` component synchronizes the state of the Storefront API Cart and a customer's cart, and allows you to more easily manipulate the cart by adding, removing, and updating it. It could be placed at the root of your app so that your whole app is able to use the \`useCart()\` hook anywhere.\n\nThere are props that trigger when a call to the Storefront API is made, such as \`onLineAdd={}\` when a line is added to the cart. There are also props that trigger when a call to the Storefront API is completed, such as \`onLineAddComplete={}\` when the fetch request for adding a line to the cart completes.
  `,
  type: 'component',
  defaultExample: {
    description: 'I am the default example',
    codeblock: {
      tabs: [
        {
          title: 'JavaScript',
          code: './CartProvider.example.jsx',
          language: 'jsx',
        },
        {
          title: 'TypeScript',
          code: './CartProvider.example.tsx',
          language: 'tsx',
        },
      ],
      title: 'Example code',
    },
  },
  definitions: [
    {
      title: 'Props',
      type: 'CartProviderProps',
      description: '',
    },
  ],
};

export default data;
