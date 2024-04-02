import {ReferenceEntityTemplateSchema} from '@shopify/generate-docs';

const data: ReferenceEntityTemplateSchema = {
  name: 'useCustomerPrivacy',
  category: 'hooks',
  isVisualComponent: false,
  related: [],
  description:
    'A hook that loads the [Customer Privacy API](/docs/api/customer-privacy).\n\nYou can get the customer privacy instance with `getCustomerPrivacy()` or `getCustomerPrivacyRequired()`.',
  type: 'hook',
  defaultExample: {
    description: 'This is the default example',
    codeblock: {
      tabs: [
        {
          title: 'JavaScript',
          code: './useCustomerPrivacy.example.jsx',
          language: 'js',
        },
        {
          title: 'TypeScript',
          code: './useCustomerPrivacy.example.tsx',
          language: 'ts',
        },
      ],
      title: 'example',
    },
  },
  definitions: [
    {
      title: '',
      type: 'UseCustomerPrivacyGeneratedType',
      description: '',
    },
  ],
  examples: {
    description: 'Example usage with `unstable_useAnalytics`:',
    exampleGroups: [
      {
        title: 'getCustomerPrivacy',
        examples: [
          {
            description: 'Returns the value of `window.Shopify.customerPrivacy` if it exists.',
            codeblock: {
              title: '',
              tabs: [
                {
                  title: 'JavaScript',
                  code: './useCustomerPrivacy.get.example.jsx',
                  language: 'js',
                },
              ],
            },
          },
        ],
      },
      {
        title: 'getCustomerPrivacyRequired',
        examples: [
          {
            description:
              "Returns `window.Shopify.customerPrivacy` and throws error if it doesn't exists.",
            codeblock: {
              title: '',
              tabs: [
                {
                  title: 'JavaScript',
                  code: './useCustomerPrivacy.getRequired.example.jsx',
                  language: 'js',
                },
              ],
            },
          },
        ],
      },
    ],
  },
};

export default data;
