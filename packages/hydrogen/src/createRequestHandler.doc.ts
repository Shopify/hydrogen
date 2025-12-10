import {ReferenceEntityTemplateSchema} from '@shopify/generate-docs';

const data: ReferenceEntityTemplateSchema = {
  name: 'createRequestHandler',
  category: 'utilities',
  isVisualComponent: false,
  related: [
    {
      name: 'createHydrogenContext',
      type: 'utilities',
      url: '/docs/api/hydrogen/utilities/createhydrogencontext',
    },
    {
      name: 'createStorefrontClient',
      type: 'utilities',
      url: '/docs/api/hydrogen/utilities/createstorefrontclient',
    },
  ],
  description: `Creates a request handler for Hydrogen apps. It wraps React Router's request handler and adds Hydrogen-specific functionality such as proxying Storefront API requests, collecting tracking information for analytics, and forwarding cookies to the browser.`,
  type: 'utility',
  defaultExample: {
    description: 'I am the default example',
    codeblock: {
      tabs: [
        {
          title: 'JavaScript',
          code: './createRequestHandler.example.js',
          language: 'js',
        },
        {
          title: 'TypeScript',
          code: './createRequestHandler.example.ts',
          language: 'ts',
        },
      ],
      title: 'Example code',
    },
  },
  definitions: [
    {
      title: 'createRequestHandler(options)',
      type: 'CreateRequestHandlerOptionsForDocs',
      description: '',
    },
  ],
};

export default data;
