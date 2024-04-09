import {ReferenceEntityTemplateSchema} from '@shopify/generate-docs';

const data: ReferenceEntityTemplateSchema = {
  name: 'Seo',
  category: 'components',
  isVisualComponent: false,
  related: [],
  description: `The \`<Seo />\` component renders SEO meta tags in the document \`head\`. Add the \`<Seo />\` to your \`root.jsx\` before the \`<Meta />\` and \`<Link />\` components. SEO metadata is set on a per-route basis using Remix [loader functions](https://remix.run/docs/en/v1/guides/data-loading). Learn more about [how SEO works in Hydrogen](https://shopify.dev/docs/custom-storefronts/hydrogen/seo).
  
  **Note: the Seo component is deprecated** - Use [getSeoMeta](/docs/api/hydrogen/utilities/getseometa) to migrate.`,
  type: 'component',
  defaultExample: {
    description: 'I am the default example',
    codeblock: {
      tabs: [
        {
          title: 'JavaScript',
          code: './seo.example.jsx',
          language: 'js',
        },
        {
          title: 'TypeScript',
          code: './seo.example.tsx',
          language: 'ts',
        },
      ],
      title: 'Example code',
    },
  },
  definitions: [
    {
      title: 'Props',
      type: 'SeoProps',
      description: '',
    },
  ],
};

export default data;
