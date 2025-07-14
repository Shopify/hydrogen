import {ReferenceEntityTemplateSchema} from '@shopify/generate-docs';

const data: ReferenceEntityTemplateSchema = {
  name: 'useNonce',
  category: 'hooks',
  isVisualComponent: false,
  related: [
    {
      name: 'createContentSecurityPolicy',
      type: 'utilities',
      url: '/docs/api/hydrogen/utilities/createcontentsecuritypolicy',
    },
    {
      name: 'Script',
      type: 'components',
      url: '/docs/api/hydrogen/components/script',
    },
  ],
  description: `The \`useNonce\` hook returns the [content security policy](/docs/custom-storefronts/hydrogen/content-security-policy) nonce. Use the hook to manually add a nonce to third party scripts. The \`Script\` component automatically does this for you. 

The nonce is only available during server-side rendering when used within a \`NonceProvider\` context. During client-side hydration or when called outside of a \`NonceProvider\`, it returns \`undefined\`. This is expected behavior as the nonce is only needed for server-rendered inline scripts.`,
  type: 'hook',
  defaultExample: {
    description: 'I am the default example',
    codeblock: {
      tabs: [
        {
          title: 'JavaScript',
          code: './useNonce.example.jsx',
          language: 'jsx',
        },
        {
          title: 'TypeScript',
          code: './useNonce.example.tsx',
          language: 'tsx',
        },
      ],
      title: 'Example code',
    },
  },
  definitions: [
    {
      title: 'Props',
      type: 'UseNonceGeneratedType',
      description: '',
    },
  ],
};

export default data;
