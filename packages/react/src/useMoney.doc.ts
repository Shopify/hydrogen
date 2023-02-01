import {ReferenceEntityTemplateSchema} from '@shopify/generate-docs';

const data: ReferenceEntityTemplateSchema = {
  name: 'useMoney',
  category: 'hooks',
  isVisualComponent: false,
  related: [
    {
      name: 'Money',
      type: 'component',
      url: '/api/react-storefront-kit/components/money',
    },
  ],
  description: `
    The \`useMoney\` hook takes a [MoneyV2 object](https://shopify.dev/api/storefront/reference/common-objects/moneyv2) and returns a
    default-formatted string of the amount with the correct currency indicator, along with some of the parts provided by
    [Intl.NumberFormat](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat).
    Uses \`locale\` from \`<ShopifyProvider/>\`.
  `,
  type: 'hook',
  defaultExample: {
    description: 'I am the default example',
    codeblock: {
      tabs: [
        {
          title: 'JavaScript',
          code: './useMoney.example.jsx',
          language: 'jsx',
        },
        {
          title: 'TypeScript',
          code: './useMoney.example.tsx',
          language: 'tsx',
        },
      ],
      title: 'Example code',
    },
  },
  definitions: [
    {
      title: 'Props',
      type: 'UseMoneyGeneratedType',
      description: '',
    },
  ],
};

export default data;
