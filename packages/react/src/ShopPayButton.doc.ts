import {ReferenceEntityTemplateSchema} from '@shopify/generate-docs';

const data: ReferenceEntityTemplateSchema = {
  name: 'ShopPayButton',
  category: 'components',
  isVisualComponent: false,
  related: [],
  description: `The \`ShopPayButton\` component renders a button that redirects to the Shop Pay checkout.
    It renders a [\`<shop-pay-button>\`](https://shopify.dev/custom-storefronts/tools/web-components) custom element, for which it will lazy-load the source code automatically.
    It relies on the \`<ShopProvider>\` context provider.`,
  type: 'component',
  defaultExample: {
    description: 'I am the default example',
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
      title: 'Example code',
    },
  },
  definitions: [
    {
      title: 'Props',
      type: 'ShopPayButtonProps',
      description: 'interface description',
    },
  ],
};

export default data;
