import {ReferenceEntityTemplateSchema} from '@shopify/generate-docs';

const data: ReferenceEntityTemplateSchema = {
  name: 'useShopifyCookies',
  category: 'hooks',
  isVisualComponent: false,
  related: [
    {
      subtitle: 'Utility',
      name: 'sendShopifyAnalytics',
      url: '/api/hydrogen-react/utilities/sendShopifyAnalytics',
      type: 'gear',
    },
    {
      subtitle: 'Utility',
      name: 'getClientBrowserParameters',
      url: '/api/hydrogen-react/utilities/getclientbrowserparameters',
      type: 'gear',
    },
    {
      subtitle: 'Utility',
      name: 'getTrackingValues',
      url: '/api/hydrogen-react/utilities/getTrackingValues',
      type: 'gear',
    },
  ],
  description:
    'Sets Shopify user and session cookies and refreshes the expiry time. Returns `true` when cookies are ready.',
  type: 'hooks',
  defaultExample: {
    description: 'I am the default example',
    codeblock: {
      tabs: [
        {
          title: 'JavaScript',
          code: './useShopifyCookies.example.jsx',
          language: 'jsx',
        },
        {
          title: 'TypeScript',
          code: './useShopifyCookies.example.tsx',
          language: 'tsx',
        },
      ],
      title: 'Example code',
    },
  },
  definitions: [
    {
      title: 'useShopifyCookies',
      type: 'UseShopifyCookiesGeneratedType',
      description:
        'Manages Shopify cookies. If `hasUserConsent` option is false, deprecated cookies will be removed. Returns `true` when cookies are ready.',
    },
  ],
};

export default data;
