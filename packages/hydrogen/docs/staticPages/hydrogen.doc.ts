import {LandingTemplateSchema} from '@shopify/generate-docs';

const data: LandingTemplateSchema = {
  title: 'Hydrogen',
  description:
    'Hydrogen is Shopify’s opinionated stack for headless commerce, built on [Remix](https://remix.run). It provides a set of tools, utilities, and best-in-class examples for building dynamic and performant commerce applications.',
  id: 'hydrogen',
  sections: [
    {
      type: 'Generic',
      anchorLink: 'setup',
      title: 'Setup',
      sectionContent: `
1. Create a new Hydrogen project with your preferred package manager.
1. Import components, hooks, or utilities that you want to use in your app. For more, see the [getting started guide](/docs/custom-storefronts/hydrogen/getting-started).
      `,
      sectionCard: [
        {
          subtitle: 'Tutorial',
          name: 'Getting started with Hydrogen and Oxygen',
          url: '/docs/custom-storefronts/hydrogen/getting-started',
          type: 'tutorial',
        },
      ],
      codeblock: {
        title: 'Create a new Hydrogen project',
        tabs: [
          {
            title: 'npm',
            code: 'install.npm.example.sh',
          },
          {
            title: 'yarn',
            code: 'install.yarn.example.sh',
          },
        ],
      },
    },
    {
      type: 'Generic',
      anchorLink: 'authentication',
      title: 'Authentication',
      sectionContent:
        'To make full use of Hydrogen, you need to authenticate with and make requests to the [Storefront API](/docs/api/storefront) and the [Customer Account API](/docs/api/customer). Hydrogen includes full-featured API clients to securely handle API queries and mutations.\n\nYou can create access tokens for your own Shopify store by [installing the Hydrogen sales channel](https://apps.shopify.com/hydrogen), which includes built-in support for Oxygen, Shopify’s global edge hosting platform. Or install the [Headless sales channel](https://apps.shopify.com/headless) to host your Hydrogen app anywhere.\n\nBoth the Storefront API and Customer Account API offer public credentials for client-side applications.',
      sectionCard: [
        {
          subtitle: 'Install',
          name: 'Hydrogen sales channel',
          url: 'https://apps.shopify.com/hydrogen',
          type: 'hydrogen',
        },
        {
          subtitle: 'Install',
          name: 'Headless sales channel',
          url: 'https://apps.shopify.com/headless',
          type: 'apps',
        },
      ],
      codeblock: {
        title: 'Authenticate a Hydrogen app',
        tabs: [
          {
            title: 'server.js',
            code: 'authenticate.server.js',
            language: 'javascript',
          },
          {
            title: '.env',
            code: 'authenticate.env.example',
          },
        ],
      },
    },
    {
      type: 'Generic',
      anchorLink: 'versioning',
      title: 'Versioning',
      sectionContent:
        "Hydrogen is tied to specific versions of the [Storefront API](/api/storefront), which is versioned quarterly. For example, if you're using Storefront API version `2023-10`, then Hydrogen versions `2023.10.x` are fully compatible.\n\n> Caution:\n>If a Storefront API version includes breaking changes, then the corresponding Hydrogen version will include the same breaking changes.",
      sectionCard: [
        {
          subtitle: 'Learn more',
          name: 'Shopify API versioning',
          url: '/docs/api/usage/versioning',
          type: 'tutorial',
        },
        {
          subtitle: 'Learn more',
          name: 'API release notes',
          url: '/docs/api/release-notes',
          type: 'changelog',
        },
      ],
    },
    {
      type: 'Generic',
      anchorLink: 'hydrogen_react',
      title: 'How Hydrogen works with Hydrogen React',
      sectionContent:
        'Hydrogen is [built on Remix](/docs/custom-storefronts/hydrogen/project-structure). But many of the components, hooks and utilities built into Hydrogen come from [Hydrogen React](/docs/api/hydrogen-react), an underlying package that’s framework-agnostic. For convenience, the Hydrogen package re-exports those resources. This means that if you’re building a Hydrogen app, then you should import modules from the `@shopify/hydrogen` package.',
      codeblock: {
        title: 'Importing Hydrogen components',
        tabs: [
          {
            title: 'example-page.jsx',
            code: 'hydrogen.import.jsx',
            language: 'jsx',
          },
        ],
      },
    },
    {
      type: 'Resource',
      anchorLink: 'resources',
      title: 'Resources',
      resources: [
        {
          name: 'Custom storefronts on Shopify',
          subtitle:
            'Learn more about how to design, build, and manage custom storefronts on Shopify.',
          url: '/custom-storefronts',
          type: 'custom-storefronts',
        },
        {
          name: 'Hydrogen on Discord',
          subtitle:
            'Chat with the growing community of commerce developers building with Hydrogen',
          url: 'https://discord.gg/shopifydevs',
          type: 'discord',
        },
        {
          name: 'Hydrogen on GitHub',
          subtitle:
            'Follow the Hydrogen project, file bugs and feature requests, preview upcoming features, and more',
          url: 'https://github.com/Shopify/hydrogen',
          type: 'github',
        },
      ],
    },
  ],
};

export default data;
