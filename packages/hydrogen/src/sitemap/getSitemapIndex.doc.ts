import {ReferenceEntityTemplateSchema} from '@shopify/generate-docs';

const data: ReferenceEntityTemplateSchema = {
  name: 'getSitemapIndex',
  category: 'utilities',
  isVisualComponent: false,
  related: [
    {
      name: 'getSitemap',
      type: 'utilities',
      url: '/api/hydrogen/utilities/getSitemap',
    },
  ],
  description: `> Caution:\n> This component is in an unstable pre-release state and may have breaking changes in a future release.\n\nGenerate a sitemap index that links to separate child sitemaps for different resource types. Returns a standard Response object.`,
  type: 'utility',
  defaultExample: {
    description: 'I am the default example',
    codeblock: {
      tabs: [
        {
          title: 'JavaScript',
          code: './getSitemapIndex.example.jsx',
          language: 'js',
        },
        {
          title: 'TypeScript',
          code: './getSitemapIndex.example.tsx',
          language: 'ts',
        },
      ],
      title: 'Example code',
    },
  },
  definitions: [
    {
      title: 'getSitemapIndex',
      type: 'GetSitemapIndexGeneratedType',
      description: '',
    },
  ],
};

export default data;
