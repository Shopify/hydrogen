import {ReferenceEntityTemplateSchema} from '@shopify/generate-docs';

const data: ReferenceEntityTemplateSchema = {
  name: 'Analytics Constants',
  category: 'utilities',
  isVisualComponent: false,
  related: [],
  description: "A list of constants used by Shopify's analytics system.",
  type: 'utility',
  definitions: [
    {
      title: 'AnalyticsEventName',
      type: 'AnalyticsEventName',
      description: 'Analytics event names accepted by Shopify analytics.',
    },
    {
      title: 'AnalyticsPageType',
      type: 'AnalyticsPageType',
      description: 'Analytics page type values accepted by Shopify analytics.',
    },
    {
      title: 'ShopifySalesChannel',
      type: 'ShopifySalesChannel',
      description:
        'Analytics sales channel values accepted by Shopify analytics.',
    },
  ],
};

export default data;
