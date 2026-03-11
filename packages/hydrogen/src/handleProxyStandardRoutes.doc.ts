import {ReferenceEntityTemplateSchema} from '@shopify/generate-docs';

const data: ReferenceEntityTemplateSchema = {
  name: 'handleProxyStandardRoutes',
  category: 'utilities',
  isVisualComponent: false,
  related: [
    {
      name: 'createStorefrontClient',
      type: 'utilities',
      url: '/docs/api/hydrogen/utilities/createstorefrontclient',
    },
    {
      name: 'createRequestHandler',
      type: 'utilities',
      url: '/docs/api/hydrogen/utilities/createrequesthandler',
    },
  ],
  description: `Proxies Hydrogen's standard Storefront API routes outside React Router. Pass a Request together with a Storefront client, and return the proxied Response directly when this function returns one. When it returns \`undefined\`, continue with your app's normal request handling.`,
  type: 'utility',
  defaultExample: {
    description: 'I am the default example',
    codeblock: {
      tabs: [
        {
          title: 'JavaScript',
          code: './handleProxyStandardRoutes.example.js',
          language: 'js',
        },
        {
          title: 'TypeScript',
          code: './handleProxyStandardRoutes.example.ts',
          language: 'ts',
        },
      ],
      title: 'Example code',
    },
  },
  definitions: [],
};

export default data;
