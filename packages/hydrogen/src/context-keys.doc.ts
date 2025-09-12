import {ReferenceEntityTemplateSchema} from '@shopify/generate-docs';

const data: ReferenceEntityTemplateSchema = {
  name: 'hydrogenContext',
  category: 'utilities',
  isVisualComponent: false,
  related: [
    {
      name: 'createHydrogenContext',
      type: 'utilities',
      url: '/docs/api/hydrogen/2025-07/utilities/createhydrogencontext',
    },
  ],
  description: `
    A grouped export of all Hydrogen context keys for use with React Router's \`context.get()\` pattern. This enables type-safe access to Hydrogen services in loaders, actions, and middleware.

    The proxy-based implementation in \`createHydrogenContext\` supports both direct property access and the \`context.get()\` pattern, giving you flexibility in how you access Hydrogen services.
  `,
  type: 'object',
  defaultExample: {
    description: 'Using hydrogenContext with context.get() in a loader',
    codeblock: {
      tabs: [
        {
          title: 'JavaScript',
          code: './context-keys.example.js',
          language: 'js',
        },
        {
          title: 'TypeScript',
          code: './context-keys.example.ts',
          language: 'ts',
        },
      ],
      title: 'Using hydrogenContext',
    },
  },
  definitions: [],
};

export default data;
