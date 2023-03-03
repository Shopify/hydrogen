import {ReferenceEntityTemplateSchema} from '@shopify/generate-docs';

const data: ReferenceEntityTemplateSchema = {
  name: 'CartLinePrice',
  category: 'components',
  isVisualComponent: false,
  related: [
    {
      name: 'Money',
      type: 'component',
      url: '/api/hydrogen-react/components/money',
    },
  ],
  description: `
    \`@deprecated\` Use \`Money\` instead.\n\nTo migrate, use the \`priceType\` prop that matches the corresponding property on the \`CartLine\` object:\n\n- \`regular\`: \`cartLine.cost.totalAmount\`\n\n- \`compareAt\`: \`cartLine.cost.compareAtAmountPerQuantity\`\n\nFor example\n\nBefore:\n\n\`<CartLinePrice data={cartLine} priceType="regular" />\`\n\nAfter:\n\n\`<Money data={cartLine.cost.totalAmount} />\`\n\nThe \`CartLinePrice\` component renders a \`Money\` component for the cart line merchandise's price or compare at price.
  `,
  type: 'component',
  defaultExample: {
    description: 'I am the default example',
    codeblock: {
      tabs: [
        {
          title: 'JavaScript',
          code: './CartLinePrice.example.jsx',
          language: 'jsx',
        },
        {
          title: 'TypeScript',
          code: './CartLinePrice.example.tsx',
          language: 'tsx',
        },
      ],
      title: 'Example code',
    },
  },
  definitions: [
    {
      title: 'Props',
      type: 'CartLinePricePropsForDocs',
      description: '',
    },
  ],
};

export default data;
