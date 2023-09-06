import {ReferenceEntityTemplateSchema} from '@shopify/generate-docs';

const data: ReferenceEntityTemplateSchema = {
  name: 'useNonce',
  category: 'hooks',
  isVisualComponent: false,
  related: [
    {
      name: 'createContentSecurityPolicy',
      type: 'utilities',
      url: '/docs/api/hydrogen/2023-07/utilities/createcontentsecuritypolicy',
    },
    {
      name: 'Script',
      type: 'components',
      url: '/docs/api/hydrogen/2023-07/components/script',
    },
  ],
  description: `The \`useNonce\` hook returns the [content security policy](/docs/custom-storefronts/hydrogen/content-security-policy) nonce. Use the hook to manually add a nonce to third party scripts. The \`Script\` component automatically does this for you. Note, the nonce should never be available in the client, and should always return undefined in the browser.`,
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
