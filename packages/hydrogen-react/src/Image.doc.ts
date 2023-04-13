import {ReferenceEntityTemplateSchema} from '@shopify/generate-docs';

const data: ReferenceEntityTemplateSchema = {
  name: 'Image',
  category: 'components',
  isVisualComponent: false,
  related: [
    {
      name: 'MediaFile',
      type: 'component',
      url: '/api/hydrogen-react/components/mediafile',
    },
  ],
  description:
    "The `Image` component renders an image for the Storefront API's\n[Image object](https://shopify.dev/api/storefront/reference/common-objects/image) by using the `data` prop. You can [customize this component](https://shopify.dev/api/hydrogen/components#customizing-hydrogen-components) using passthrough props.\n\nImages default to being responsive automativally (`width: 100%, height: auto`), and expect an `aspectRatio` prop, which ensures your image doesn't create any layout shift. For fixed-size images, you can set `width` to an exact value, and a `srcSet` with 1x, 2x, and 3x DPI variants will automatically be generated for you.",
  type: 'component',
  defaultExample: {
    description: 'I am the default example',
    codeblock: {
      tabs: [
        {
          title: 'JavaScript',
          code: './Image.example.jsx',
          language: 'jsx',
        },
        {
          title: 'TypeScript',
          code: './Image.example.tsx',
          language: 'tsx',
        },
      ],
      title: 'Example code',
    },
  },
  definitions: [
    {
      title: 'Props',
      type: 'ShopifyImageBaseProps',
      description: '',
    },
  ],
};

export default data;
