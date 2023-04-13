'use strict';
Object.defineProperty(exports, '__esModule', {value: true});
const data = {
  name: 'getShopifyCookies',
  category: 'utilities',
  isVisualComponent: false,
  related: [
    {
      subtitle: 'Hook',
      name: 'useShopifyCookies',
      url: '/api/hydrogen-react/hooks/useShopifyCookies',
      type: 'tool',
    },
  ],
  description: 'Parses cookie string and returns Shopify cookies.',
  type: 'utility',
  defaultExample: {
    description: 'I am the default example',
    codeblock: {
      tabs: [
        {
          title: 'JavaScript',
          code: './get-shopify-cookies.example.jsx',
          language: 'jsx',
        },
        {
          title: 'TypeScript',
          code: './get-shopify-cookies.example.tsx',
          language: 'tsx',
        },
      ],
      title: 'Example code',
    },
  },
  definitions: [
    {
      title: 'getShopifyCookies',
      type: 'GetShopifyCookiesGeneratedType',
      description:
        "If the Shopify cookies doesn't exist, this method will return empty string for each missing cookie.",
    },
    {
      title: 'ShopifyCookies',
      type: 'ShopifyCookies',
      description: 'Shopify cookies names',
    },
  ],
};
exports.default = data;
