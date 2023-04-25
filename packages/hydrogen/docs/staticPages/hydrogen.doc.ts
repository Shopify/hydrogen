import {LandingTemplateSchema} from '@shopify/generate-docs';

const data: LandingTemplateSchema = {
  title: 'Hydrogen',
  description:
    'Hydrogen is Shopify’s stack for headless commerce. It provides a set of tools, utilities, and best-in-class examples for building dynamic and performant commerce applications.',
  id: 'hydrogen',
  sections: [
    {
      type: 'Generic',
      anchorLink: 'setup',
      title: 'Setup',
      sectionContent: `Setup content`,
    },
    {
      type: 'Generic',
      anchorLink: 'versioning',
      title: 'Versioning',
      sectionContent:
        "Hydrogen is tied to specific versions of the [Storefront API](/api/storefront). For example, if you're using Storefront API version `2023-01`, then Hydrogen React versions `2023.1.x` are fully compatible. \n\n >Caution: \n>If the Storefront API version update includes breaking changes, then Hydrogen React includes breaking changes. Because the API version is updated every three months, breaking changes to Hydrogen React could occur every three months. \n\n Learn more about [API versioning](/api/usage/versioning).",
    },
    {
      type: 'Generic',
      anchorLink: 'components',
      title: 'Components',
      sectionContent: 'Component description',
    },
    {
      type: 'Generic',
      anchorLink: 'hooks',
      title: 'Hooks',
      sectionContent: 'Hook description',
    },
    {
      type: 'Generic',
      anchorLink: 'utilities',
      title: 'Utilities',
      sectionContent: 'Utilities description',
    },
    {
      type: 'Resource',
      anchorLink: 'resources',
      title: 'Resources',
      resources: [
        {
          name: 'Custom Storefronts',
          subtitle:
            'Learn more about how to design, build, and manage, your custom storefront.',
          url: '/custom-storefronts',
          type: 'custom-storefronts',
        },
        {
          name: 'Getting started guide',
          subtitle: 'Follow this tutorial to get started with Hydrogen.',
          url: '/custom-storefronts/hydrogen/getting-started/quickstart',
          type: 'quickstart',
        },
        {
          name: 'Hydrogen Github',
          subtitle:
            'Get more details on how to improve your end-to-end development experience.',
          url: 'https://github.com/Shopify/hydrogen',
          type: 'github',
        },
      ],
    },
  ],
};

export default data;
