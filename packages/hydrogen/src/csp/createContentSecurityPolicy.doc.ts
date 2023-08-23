import {ReferenceEntityTemplateSchema} from '@shopify/generate-docs';

const data: ReferenceEntityTemplateSchema = {
  name: 'createContentSecurityPolicy',
  category: 'utilities',
  isVisualComponent: false,
  related: [],
  description: `Create a content security policy to secure your application. The default content security policy includes exclusions for cdn.shopify.com and a script nonce.`,
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
