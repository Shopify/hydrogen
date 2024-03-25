import {ReferenceEntityTemplateSchema} from '@shopify/generate-docs';

const data: ReferenceEntityTemplateSchema = {
  name: 'getSeoMeta',
  category: 'utilities',
  isVisualComponent: false,
  related: [],
  description: `Generate a Remix meta array based on the seo property used by the \`Seo\` component. Use it to help generate SEO return data from your meta funcitons. Learn more about [how SEO works in Hydrogen](https://shopify.dev/docs/custom-storefronts/hydrogen/seo).`,
  type: 'utility',
  defaultExample: {
    description: 'I am the default example',
    codeblock: {
      tabs: [
        {
          title: 'JavaScript',
          code: './getSeoMeta.example.jsx',
          language: 'js',
        },
        {
          title: 'TypeScript',
          code: './getSeoMeta.example.tsx',
          language: 'ts',
        },
      ],
      title: 'Example code',
    },
  },
  definitions: [
    {
      title: 'Parameters',
      type: 'SeoConfig',
      description: '',
    },
    {
      title: 'Returns',
      type: 'GetSeoMetaReturn',
      description: '',
    },
  ],
};

export default data;
