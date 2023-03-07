import {ReferenceEntityTemplateSchema} from '@shopify/generate-docs';

const data: ReferenceEntityTemplateSchema = {
  name: 'ShopPayButton',
  category: 'components',
  isVisualComponent: false,
  related: [],
  description: `The \`ShopPayButton\` component renders a button that redirects to the Shop Pay checkout. It renders a [\`<shop-pay-button>\`](https://shopify.dev/custom-storefronts/tools/web-components) custom element, for which it will lazy-load the source code automatically.`,
  type: 'component',
  defaultExample: {
    description: '<ShopPayButton> without <ShopifyProvider>',
    codeblock: {
      tabs: [
        {
          title: 'JavaScript',
          code: './ShopPayButton.example.jsx',
          language: 'jsx',
        },
        {
          title: 'TypeScript',
          code: './ShopPayButton.example.tsx',
          language: 'tsx',
        },
      ],
      title: '<ShopPayButton> without <ShopifyProvider>',
    },
  },
  examples: {
    description: '',
    examples: [
      {
        description:
          'If `<ShopifyProvider>` context provider is used in your app, you can use the `<ShopPayButton>` without supplying a `storeDomain` prop',
        codeblock: {
          tabs: [
            {
              title: 'JavaScript',
              code: './ShopPayButton2.example.jsx',
              language: 'jsx',
            },
            {
              title: 'TypeScript',
              code: './ShopPayButton2.example.tsx',
              language: 'tsx',
            },
          ],
          title: '<ShopPayButton> with <ShopifyProvider>',
        },
      },
    ],
  },
  definitions: [
    {
      title: 'Props',
      type: 'ShopPayButtonProps',
      description: '',
    },
  ],
};

export default data;
