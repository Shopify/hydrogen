import {LandingTemplateSchema} from '@shopify/generate-docs';

const data: LandingTemplateSchema = {
  title: 'Hydrogen React',
  description:
    'Hydrogen React is a performant, framework-agnostic library of React components, reusable functions, and utilities for interacting with Shopify’s [Storefront API](/docs/api/storefront). It’s bundled with [Hydrogen](/docs/api/hydrogen), but can be used by any React-based web app.',
  id: 'hydrogen-react',
  sections: [
    {
      type: 'Generic',
      anchorLink: 'setup',
      title: 'Setup',
      sectionContent: `
1. Install Hydrogen React in your project with your preferred package manager.
1. Import components, hooks, or utilities that you want to use in your app. For more detailed instructions, see the Getting Started guide.
      `,
      sectionCard: [
        {
          subtitle: 'Tutorial',
          name: 'Getting Started with Hydrogen React',
          url: '/docs/custom-storefronts/hydrogen-react',
          type: 'tutorial',
        },
      ],
      codeblock: {
        title: 'Install the Hydrogen React package',
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
        'To use Hydrogen React, you need to authenticate with and make requests to the [Storefront API](/docs/api/storefront). Hydrogen React includes an [API client](/docs/api/hydrogen-react/2024-10/utilities/createstorefrontclient) to securely handle API queries and mutations.\n\nYou can create and manage Storefront API access tokens by installing the [Headless sales channel](https://apps.shopify.com/headless) on your store.\n\nApps have access to [two kinds of tokens](/docs/api/usage/authentication#access-tokens-for-the-storefront-api): a public API token, which can be used in client-side code, and a private API token, which should only be used in server-side contexts and never exposed publicly.',
      sectionCard: [
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
            title: 'client.js',
            code: 'authenticate.client.js',
            language: 'javascript',
          },
          {
            title: '.env',
            code: 'authenticate.env.example',
          },
          {
            title: 'server-side-query.js',
            code: 'authenticate.server.js',
            language: 'javascript',
          },
        ],
      },
    },
    {
      type: 'Generic',
      anchorLink: 'versioning',
      title: 'Versioning',
      sectionContent:
        "Hydrogen React is tied to specific versions of the [Storefront API](/docs/api/storefront), which is versioned quarterly. For example, if you're using Storefront API version `2023-10`, then Hydrogen versions `2023.10.x` are fully compatible.\n\n> Caution:\n>If a Storefront API version includes breaking changes, then the corresponding Hydrogen React version will include the same breaking changes.",
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
      anchorLink: 'components',
      title: 'Components',
      sectionContent:
        'Components include all the business logic and data parsing required to produce predictable markup for objects available through the Storefront API. Components provide defaults but can be customized. Hydrogen React components include no visual styles, other than the ones provided natively by browsers.',
      codeblock: {
        title: 'Component example',
        tabs: [
          {
            title: 'Component',
            code: './component.example.jsx',
            language: 'javascript',
          },
        ],
      },
    },
    {
      type: 'Generic',
      anchorLink: 'hooks',
      title: 'Hooks',
      sectionContent:
        'Hooks are functions that provide reusable business and/or state logic. They give you additional flexibility to control the behavior and display of Hydrogen React components.',
      codeblock: {
        title: 'Hook example',
        tabs: [
          {
            title: 'Hook',
            code: './hook.example.jsx',
            language: 'javascript',
          },
        ],
      },
    },
    {
      type: 'Generic',
      anchorLink: 'utilities',
      title: 'Utilities',
      sectionContent:
        'Utilities are reusable functions for common manipulations performed on data returned from the Storefront API.',
      codeblock: {
        title: 'Utility example',
        tabs: [
          {
            title: 'Utility',
            code: './utility.example.jsx',
            language: 'javascript',
          },
        ],
      },
    },
    {
      type: 'Generic',
      anchorLink: 'with_hydrogen',
      title: 'How Hydrogen React works with Hydrogen',
      sectionContent:
        'Hydrogen React is bundled as part of Hydrogen, Shopify’s opinionated headless commerce stack built on [Remix](https://remix.run). Hydrogen React is also published separately as a standalone package so that it can be used by other React-based frameworks.\n\nHydrogen adds features like standard routes, caching strategies, redirects, and SEO. When using Hydrogen, you can also install the Hydrogen sales channel, which includes built-in support for Oxygen, Shopify’s global edge hosting platform. Consider which approach works best for your use case and existing technology stack.',
      sectionCard: [
        {
          subtitle: 'Learn more',
          name: 'Hydrogen',
          url: '/docs/custom-storefronts/hydrogen',
          type: 'tutorial',
        },
        {
          subtitle: 'Install',
          name: 'Hydrogen sales channel',
          url: 'https://apps.shopify.com/hydrogen',
          type: 'hydrogen',
        },
      ],
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
          name: 'Hydrogen on GitHub',
          subtitle:
            'Follow the Hydrogen project, file bugs and feature requests, preview upcoming features, and more.',
          url: 'https://github.com/Shopify/hydrogen',
          type: 'github',
        },
      ],
    },
  ],
};

export default data;
