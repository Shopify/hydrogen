import {ReferenceEntityTemplateSchema} from '@shopify/generate-docs';

const data: ReferenceEntityTemplateSchema = {
  name: 'CartLineQuantity',
  category: 'components',
  isVisualComponent: false,
  related: [
    {
      name: 'useCartLine',
      type: 'gear',
      url: '/api/hydrogen-react/hooks/useCartLine',
    },
    {
      name: 'CartLineQuantityAdjustButton',
      type: 'component',
      url: '/api/hydrogen-react/components/CartLineQuantityAdjustButton',
    },
  ],
  description: `
    The \`<CartLineQuantity/>\` component renders a \`span\` (or another element / component that can be customized by the \`as\` prop) with the cart line's quantity.\n\nIt must be a descendent of a \`<CartLineProvider/>\` component, and uses the \`useCartLine()\` hook internally.
  `,
  type: 'component',
  defaultExample: {
    description: 'I am the default example',
    codeblock: {
      tabs: [
        {
          title: 'JavaScript',
          code: './CartLineQuantity.example.jsx',
          language: 'jsx',
        },
        {
          title: 'TypeScript',
          code: './CartLineQuantity.example.tsx',
          language: 'tsx',
        },
      ],
      title: 'Example code',
    },
  },
  definitions: [
    {
      title: 'Props',
      type: 'CartLineQuantityBaseProps',
      description: '',
    },
  ],
};

export default data;
