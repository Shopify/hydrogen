import {ReferenceEntityTemplateSchema} from '@shopify/generate-docs';

const data: ReferenceEntityTemplateSchema = {
  name: 'ExternalVideo',
  category: 'components',
  isVisualComponent: true,
  // put a name in for 'image', and it will look in the docs/screenshots/ folder automatically.
  // image: "",
  related: [
    {
      name: 'MediaFile',
      type: 'component',
      url: 'api/hydrogen/components/product-variant/mediafile',
    },
  ],
  description:
    "The `ExternalVideo` component renders an embedded video for the Storefront API's [ExternalVideo object](https://shopify.dev/api/storefront/reference/products/externalvideo).",
  type: 'component',
  defaultExample: {
    description: 'I am the default example',
    codeblock: {
      tabs: [
        {
          title: 'JavaScript',
          code: './ExternalVideo.example.jsx',
          language: 'jsx',
        },
        {
          title: 'TypeScript',
          code: './ExternalVideo.example.tsx',
          language: 'tsx',
        },
      ],
      title: 'ExternalVideo example',
    },
  },
  definitions: [
    {
      title: 'Props',
      type: 'ExternalVideoProps',
      description:
        'Takes in the same props as a native `<iframe>` element, except for `src`.',
    },
  ],
};

export default data;
