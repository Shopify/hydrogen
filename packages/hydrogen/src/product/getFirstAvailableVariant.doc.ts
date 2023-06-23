import {ReferenceEntityTemplateSchema} from '@shopify/generate-docs';

const data: ReferenceEntityTemplateSchema = {
  name: 'getFirstAvailableVariant',
  category: 'utilities',
  isVisualComponent: false,
  related: [
    {
      name: 'VariantSelector',
      type: 'components',
      url: '/docs/api/hydrogen/2023-04/components/variantselector',
    },
    {
      name: 'getSelectedProductOptions',
      type: 'utilities',
      url: '/docs/api/hydrogen/2023-04/utilities/getselectedproductoptions',
    },
  ],
  description: `> Caution:
> This utility is in an unstable pre-release state and may have breaking changes in a future release.

The \`getFirstAvailableVariant\` returns the first variant that is available for purchase.`,
  type: 'component',
  defaultExample: {
    description: 'I am the default example',
    codeblock: {
      tabs: [
        {
          title: 'JavaScript',
          code: './getFirstAvailableVariant.example.jsx',
          language: 'jsx',
        },
        {
          title: 'TypeScript',
          code: './getFirstAvailableVariant.example.tsx',
          language: 'tsx',
        },
      ],
      title: 'Example code',
    },
  },
  definitions: [
    {
      title: 'Props',
      type: 'GetFirstAvailableVariant',
      description: '',
    },
  ],
};

export default data;
