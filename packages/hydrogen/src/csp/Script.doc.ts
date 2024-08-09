import {ReferenceEntityTemplateSchema} from '@shopify/generate-docs';

const data: ReferenceEntityTemplateSchema = {
  name: 'Script',
  category: 'components',
  isVisualComponent: false,
  related: [
    {
      name: 'createContentSecurityPolicy',
      type: 'utilities',
      url: '/docs/api/hydrogen/2024-07/utilities/createcontentsecuritypolicy',
    },
    {
      name: 'useNonce',
      type: 'hooks',
      url: '/docs/api/hydrogen/2024-07/hooks/usenonce',
    },
  ],
  description: `Use the \`Script\` component to add third-party scripts to your app. It automatically adds a nonce attribute from your [content security policy](/docs/custom-storefronts/hydrogen/content-security-policy). If you load a script that directly modifies the DOM, you are likely to have hydration errors. Use the \`waitForHydration\` prop to load the script after the page hydrates.`,
  type: 'component',
  defaultExample: {
    description: 'I am the default example',
    codeblock: {
      tabs: [
        {
          title: 'JavaScript',
          code: './Script.example.jsx',
          language: 'jsx',
        },
        {
          title: 'TypeScript',
          code: './Script.example.tsx',
          language: 'tsx',
        },
      ],
      title: 'Example code',
    },
  },
  definitions: [
    {
      title: 'Props',
      type: 'ScriptProps',
      description: '',
    },
  ],
};

export default data;
