import {ReferenceEntityTemplateSchema} from '@shopify/generate-docs';

const data: ReferenceEntityTemplateSchema = {
  name: 'getClientBrowserParameters',
  category: 'utilities',
  isVisualComponent: false,
  related: [
    {
      subtitle: 'Utility',
      name: 'sendShopifyAnalytics',
      url: '/api/react-storefront-kit/utilities/sendShopifyAnalytics',
      type: 'gear',
    },
    {
      subtitle: 'Utility',
      name: 'useShopifyCookies',
      url: '/api/react-storefront-kit/utilities/useShopifyCookies',
      type: 'gear',
    },
  ],
  description: 'Gathers client browser values commonly used for analytics',
  type: 'utility',
  defaultExample: {
    description: 'I am the default example',
    codeblock: {
      tabs: [
        {
          title: 'JavaScript',
          code: './get-client-browser-parameters.example.jsx',
          language: 'jsx',
        },
        {
          title: 'TypeScript',
          code: './get-client-browser-parameters.example.tsx',
          language: 'tsx',
        },
      ],
      title: 'Example code',
    },
  },
  definitions: [
    {
      title: 'getClientBrowserParameters',
      type: 'GetClientBrowserParametersGeneratedType',
      description:
        'If executed on server, this method will return empty string for each field.',
    },
  ],
};

export default data;
