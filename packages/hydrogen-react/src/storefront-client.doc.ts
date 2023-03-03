import {ReferenceEntityTemplateSchema} from '@shopify/generate-docs';

const data: ReferenceEntityTemplateSchema = {
  name: 'createStorefrontClient',
  category: 'utilities',
  isVisualComponent: false,
  related: [
    {
      name: 'ShopifyProvider',
      type: 'component',
      url: '/api/hydrogen-react/components/shopify-provider',
    },
  ],
  description: `
    The \`createStorefrontClient()\` function creates helpers that enable you to quickly query the Shopify Storefront API.\n\nWhen used on the server, it is recommended to use the \`privateStorefrontToken\` prop. When used on the client, it is recommended to use the \`publicStorefrontToken\` prop or consider using \`<ShopifyProvider/>\` instead.
  `,
  type: 'utility',
  defaultExample: {
    description: 'I am the default example',
    codeblock: {
      tabs: [
        {
          title: 'Client Example in NextJS',
          code: './storefront-client.example.js',
          language: 'js',
        },
      ],
      title: 'Example code',
    },
  },
  definitions: [
    {
      title: 'Props',
      type: 'CreateStorefrontClientGeneratedType',
      description: '',
    },
  ],
};

export default data;
