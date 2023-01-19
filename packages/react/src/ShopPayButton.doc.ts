import {ReferenceEntityTemplateSchema} from '@shopify/generate-docs';

const data: ReferenceEntityTemplateSchema = {
  name: 'ShopPayButton',
  category: 'components',
  isVisualComponent: false,
  related: [
    {
      name: 'CartShopPayButton',
      type: 'component',
      url: 'api/hydrogen/components/cart/cartshoppaybutton',
    },
  ],
  description:
    'The `ShopPayButton` component renders a button that redirects to the Shop Pay checkout. You can [customize this component](https://shopify.dev/api/hydrogen/components#customizing-hydrogen-components) using passthrough props.',
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
