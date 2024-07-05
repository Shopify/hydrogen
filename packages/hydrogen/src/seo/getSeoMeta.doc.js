const data = {
  name: 'getSeoMeta',
  category: 'utilities',
  isVisualComponent: false,
  related: [],
  description: `Generate a [Remix meta array](https://remix.run/docs/en/main/route/meta) from one or more SEO configuration objects. Pass SEO configuration for the parent route(s) and the current route to preserve meta data for all active routes. Similar to [\`Object.assign()\`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/assign), each property is overwritten based on the object order. The exception is \`jsonLd\`, which is preserved so that each route has it's own independent jsonLd meta data. Learn more about [how SEO works in Hydrogen](https://shopify.dev/docs/custom-storefronts/hydrogen/seo).`,
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
      title: 'getSeoMeta',
      type: 'GetSeoMetaTypeForDocs',
      description: '',
    },
  ],
};
export default data;
