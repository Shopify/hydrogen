import {ReferenceEntityTemplateSchema} from '@shopify/generate-docs';

const data: ReferenceEntityTemplateSchema = {
  name: 'createContentSecurityPolicy',
  category: 'utilities',
  isVisualComponent: false,
  related: [
    {
      name: 'useNonce',
      type: 'hooks',
      url: '/docs/api/hydrogen/2023-10/hooks/usenonce',
    },
    {
      name: 'Script',
      type: 'components',
      url: '/docs/api/hydrogen/2023-10/components/script',
    },
  ],
  description: `Create a [content security policy](/docs/custom-storefronts/hydrogen/content-security-policy) to secure your application. The default content security policy includes exclusions for cdn.shopify.com and a script nonce.`,
  type: 'utility',
  defaultExample: {
    description: 'I am the default example',
    codeblock: {
      tabs: [
        {
          title: 'JavaScript',
          code: './createContentSecurityPolicy.example.jsx',
          language: 'jsx',
        },
        {
          title: 'TypeScript',
          code: './createContentSecurityPolicy.example.tsx',
          language: 'tsx',
        },
      ],
      title: 'Example code',
    },
  },
  definitions: [
    {
      title: 'Props',
      type: 'CreateContentSecurityPolicyGeneratedType',
      description: '',
    },
  ],
};

export default data;
