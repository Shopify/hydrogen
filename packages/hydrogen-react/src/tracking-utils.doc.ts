import {ReferenceEntityTemplateSchema} from '@shopify/generate-docs';

const data: ReferenceEntityTemplateSchema = {
  name: 'getTrackingValues',
  category: 'utilities',
  isVisualComponent: false,
  related: [
    {
      subtitle: 'Hook',
      name: 'useShopifyCookies',
      url: '/api/hydrogen-react/hooks/useShopifyCookies',
      type: 'tool',
    },
    {
      subtitle: 'Utility',
      name: 'getShopifyCookies',
      url: '/api/hydrogen-react/utilities/getShopifyCookies',
      type: 'gear',
    },
  ],
  description:
    'Retrieves user session tracking values for analytics and marketing from the browser environment. It reads from `server-timing` headers in Storefront API responses and falls back to deprecated cookies for backward compatibility.',
  type: 'utility',
  defaultExample: {
    description: 'I am the default example',
    codeblock: {
      tabs: [
        {
          title: 'JavaScript',
          code: './tracking-utils.example.jsx',
          language: 'jsx',
        },
        {
          title: 'TypeScript',
          code: './tracking-utils.example.tsx',
          language: 'tsx',
        },
      ],
      title: 'Example code',
    },
  },
  definitions: [
    {
      title: 'getTrackingValues',
      type: 'GetTrackingValuesGeneratedType',
      description:
        'Returns an object containing `uniqueToken`, `visitToken`, and `consent` values.',
    },
  ],
};

export default data;
