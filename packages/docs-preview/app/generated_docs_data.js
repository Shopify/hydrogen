export default [
  {
    name: 'CacheCustom',
    category: 'utilities',
    isVisualComponent: false,
    related: [
      {
        name: 'createStorefrontClient',
        type: 'utilities',
        url: '/docs/api/hydrogen/2023-07/utilities/createstorefrontclient',
      },
      {
        name: 'CacheNone',
        type: 'utilities',
        url: '/docs/api/hydrogen/2023-07/utilities/cachenone',
      },
      {
        name: 'CacheShort',
        type: 'utilities',
        url: '/docs/api/hydrogen/2023-07/utilities/cacheshort',
      },
      {
        name: 'CacheLong',
        type: 'utilities',
        url: '/docs/api/hydrogen/2023-07/utilities/cachelong',
      },
    ],
    description:
      'This allows you to create your own caching strategy, using any of the options available in a `CachingStrategy` object.\n\nLearn more about [data fetching in Hydrogen](/docs/custom-storefronts/hydrogen/data-fetching/fetch-data).',
    type: 'utility',
    defaultExample: {
      description: 'I am the default example',
      codeblock: {
        tabs: [
          {
            title: 'JavaScript',
            code: "import {json} from '@shopify/remix-oxygen';\nimport {CacheCustom} from '@shopify/hydrogen';\n\nexport async function loader({context}) {\n  const data = await context.storefront.query(\n    `#grahpql\n  {\n    shop {\n      name\n      description\n    }\n  }`,\n    {\n      cache: CacheCustom({\n        maxAge: 1000 * 60 * 60 * 24 * 365,\n        staleWhileRevalidate: 1000 * 60 * 60 * 24 * 7,\n      }),\n    },\n  );\n\n  return json(data);\n}\n",
            language: 'js',
          },
          {
            title: 'TypeScript',
            code: "import {json, type LoaderArgs} from '@shopify/remix-oxygen';\nimport {CacheCustom} from '@shopify/hydrogen';\n\nexport async function loader({context}: LoaderArgs) {\n  const data = await context.storefront.query(\n    `#grahpql\n  {\n    shop {\n      name\n      description\n    }\n  }`,\n    {\n      cache: CacheCustom({\n        maxAge: 1000 * 60 * 60 * 24 * 365,\n        staleWhileRevalidate: 1000 * 60 * 60 * 24 * 7,\n      }),\n    },\n  );\n\n  return json(data);\n}\n",
            language: 'ts',
          },
        ],
        title: 'Example code',
      },
    },
    definitions: [
      {
        title: 'Arguments',
        description: '',
        type: 'CacheCustomGeneratedType',
        typeDefinitions: {
          CacheCustomGeneratedType: {
            filePath: '/cache/strategies.ts',
            name: 'CacheCustomGeneratedType',
            description: '',
            params: [
              {
                name: 'overrideOptions',
                description: '',
                value: 'AllCacheOptions',
                filePath: '/cache/strategies.ts',
              },
            ],
            returns: {
              filePath: '/cache/strategies.ts',
              description: '',
              name: 'AllCacheOptions',
              value: 'AllCacheOptions',
            },
            value:
              'export function CacheCustom(overrideOptions: CachingStrategy): AllCacheOptions {\n  return overrideOptions as AllCacheOptions;\n}',
          },
          AllCacheOptions: {
            filePath: '/cache/strategies.ts',
            name: 'AllCacheOptions',
            description: 'Override options for a cache strategy.',
            members: [
              {
                filePath: '/cache/strategies.ts',
                syntaxKind: 'PropertySignature',
                name: 'mode',
                value: 'string',
                description:
                  'The caching mode, generally `public`, `private`, or `no-store`.',
                isOptional: true,
              },
              {
                filePath: '/cache/strategies.ts',
                syntaxKind: 'PropertySignature',
                name: 'maxAge',
                value: 'number',
                description:
                  'The maximum amount of time in seconds that a resource will be considered fresh. See `max-age` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#:~:text=Response%20Directives-,max%2Dage,-The%20max%2Dage).',
                isOptional: true,
              },
              {
                filePath: '/cache/strategies.ts',
                syntaxKind: 'PropertySignature',
                name: 'staleWhileRevalidate',
                value: 'number',
                description:
                  'Indicate that the cache should serve the stale response in the background while revalidating the cache. See `stale-while-revalidate` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#stale-while-revalidate).',
                isOptional: true,
              },
              {
                filePath: '/cache/strategies.ts',
                syntaxKind: 'PropertySignature',
                name: 'sMaxAge',
                value: 'number',
                description:
                  'Similar to `maxAge` but specific to shared caches. See `s-maxage` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#s-maxage).',
                isOptional: true,
              },
              {
                filePath: '/cache/strategies.ts',
                syntaxKind: 'PropertySignature',
                name: 'staleIfError',
                value: 'number',
                description:
                  'Indicate that the cache should serve the stale response if an error occurs while revalidating the cache. See `stale-if-error` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#stale-if-error).',
                isOptional: true,
              },
            ],
            value:
              'export interface AllCacheOptions {\n  /**\n   * The caching mode, generally `public`, `private`, or `no-store`.\n   */\n  mode?: string;\n  /**\n   * The maximum amount of time in seconds that a resource will be considered fresh. See `max-age` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#:~:text=Response%20Directives-,max%2Dage,-The%20max%2Dage).\n   */\n  maxAge?: number;\n  /**\n   * Indicate that the cache should serve the stale response in the background while revalidating the cache. See `stale-while-revalidate` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#stale-while-revalidate).\n   */\n  staleWhileRevalidate?: number;\n  /**\n   * Similar to `maxAge` but specific to shared caches. See `s-maxage` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#s-maxage).\n   */\n  sMaxAge?: number;\n  /**\n   * Indicate that the cache should serve the stale response if an error occurs while revalidating the cache. See `stale-if-error` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#stale-if-error).\n   */\n  staleIfError?: number;\n}',
          },
        },
      },
    ],
  },
  {
    name: 'CacheLong',
    category: 'utilities',
    isVisualComponent: false,
    related: [
      {
        name: 'createStorefrontClient',
        type: 'utilities',
        url: '/docs/api/hydrogen/2023-07/utilities/createstorefrontclient',
      },
      {
        name: 'CacheNone',
        type: 'utilities',
        url: '/docs/api/hydrogen/2023-07/utilities/cachenone',
      },
      {
        name: 'CacheShort',
        type: 'utilities',
        url: '/docs/api/hydrogen/2023-07/utilities/cacheshort',
      },
      {
        name: 'CacheCustom',
        type: 'utilities',
        url: '/docs/api/hydrogen/2023-07/utilities/cachecustom',
      },
    ],
    description:
      'The `CacheLong` strategy instructs caches to store data for 1 hour, and `staleWhileRevalidate` data for an additional 23 hours. Note: these time values are subject to change.\n\nLearn more about [data fetching in Hydrogen](/docs/custom-storefronts/hydrogen/data-fetching/fetch-data).',
    type: 'utility',
    defaultExample: {
      description: 'I am the default example',
      codeblock: {
        tabs: [
          {
            title: 'JavaScript',
            code: "import {json} from '@shopify/remix-oxygen';\nimport {CacheLong} from '@shopify/hydrogen';\n\nexport async function loader({context}) {\n  const data = await context.storefront.query(\n    `#grahpql\n  {\n    shop {\n      name\n      description\n    }\n  }`,\n    {\n      cache: CacheLong(),\n    },\n  );\n\n  return json(data);\n}\n",
            language: 'js',
          },
          {
            title: 'TypeScript',
            code: "import {json, type LoaderArgs} from '@shopify/remix-oxygen';\nimport {CacheLong} from '@shopify/hydrogen';\n\nexport async function loader({context}: LoaderArgs) {\n  const data = await context.storefront.query(\n    `#grahpql\n  {\n    shop {\n      name\n      description\n    }\n  }`,\n    {\n      cache: CacheLong(),\n    },\n  );\n\n  return json(data);\n}\n",
            language: 'ts',
          },
        ],
        title: 'Example code',
      },
    },
    definitions: [
      {
        title: 'Arguments',
        description: '',
        type: 'CacheLongGeneratedType',
        typeDefinitions: {
          CacheLongGeneratedType: {
            filePath: '/cache/strategies.ts',
            name: 'CacheLongGeneratedType',
            description: '',
            params: [
              {
                name: 'overrideOptions',
                description: '',
                value: 'AllCacheOptions',
                isOptional: true,
                filePath: '/cache/strategies.ts',
              },
            ],
            returns: {
              filePath: '/cache/strategies.ts',
              description: '',
              name: 'AllCacheOptions',
              value: 'AllCacheOptions',
            },
            value:
              'export function CacheLong(overrideOptions?: CachingStrategy): AllCacheOptions {\n  guardExpirableModeType(overrideOptions);\n  return {\n    mode: PUBLIC,\n    maxAge: 3600, // 1 hour\n    staleWhileRevalidate: 82800, // 23 Hours\n    ...overrideOptions,\n  };\n}',
          },
          AllCacheOptions: {
            filePath: '/cache/strategies.ts',
            name: 'AllCacheOptions',
            description: 'Override options for a cache strategy.',
            members: [
              {
                filePath: '/cache/strategies.ts',
                syntaxKind: 'PropertySignature',
                name: 'mode',
                value: 'string',
                description:
                  'The caching mode, generally `public`, `private`, or `no-store`.',
                isOptional: true,
              },
              {
                filePath: '/cache/strategies.ts',
                syntaxKind: 'PropertySignature',
                name: 'maxAge',
                value: 'number',
                description:
                  'The maximum amount of time in seconds that a resource will be considered fresh. See `max-age` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#:~:text=Response%20Directives-,max%2Dage,-The%20max%2Dage).',
                isOptional: true,
              },
              {
                filePath: '/cache/strategies.ts',
                syntaxKind: 'PropertySignature',
                name: 'staleWhileRevalidate',
                value: 'number',
                description:
                  'Indicate that the cache should serve the stale response in the background while revalidating the cache. See `stale-while-revalidate` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#stale-while-revalidate).',
                isOptional: true,
              },
              {
                filePath: '/cache/strategies.ts',
                syntaxKind: 'PropertySignature',
                name: 'sMaxAge',
                value: 'number',
                description:
                  'Similar to `maxAge` but specific to shared caches. See `s-maxage` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#s-maxage).',
                isOptional: true,
              },
              {
                filePath: '/cache/strategies.ts',
                syntaxKind: 'PropertySignature',
                name: 'staleIfError',
                value: 'number',
                description:
                  'Indicate that the cache should serve the stale response if an error occurs while revalidating the cache. See `stale-if-error` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#stale-if-error).',
                isOptional: true,
              },
            ],
            value:
              'export interface AllCacheOptions {\n  /**\n   * The caching mode, generally `public`, `private`, or `no-store`.\n   */\n  mode?: string;\n  /**\n   * The maximum amount of time in seconds that a resource will be considered fresh. See `max-age` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#:~:text=Response%20Directives-,max%2Dage,-The%20max%2Dage).\n   */\n  maxAge?: number;\n  /**\n   * Indicate that the cache should serve the stale response in the background while revalidating the cache. See `stale-while-revalidate` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#stale-while-revalidate).\n   */\n  staleWhileRevalidate?: number;\n  /**\n   * Similar to `maxAge` but specific to shared caches. See `s-maxage` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#s-maxage).\n   */\n  sMaxAge?: number;\n  /**\n   * Indicate that the cache should serve the stale response if an error occurs while revalidating the cache. See `stale-if-error` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#stale-if-error).\n   */\n  staleIfError?: number;\n}',
          },
        },
      },
    ],
  },
  {
    name: 'CacheNone',
    category: 'utilities',
    isVisualComponent: false,
    related: [
      {
        name: 'createStorefrontClient',
        type: 'utilities',
        url: '/docs/api/hydrogen/2023-07/utilities/createstorefrontclient',
      },
      {
        name: 'CacheShort',
        type: 'utilities',
        url: '/docs/api/hydrogen/2023-07/utilities/cacheshort',
      },
      {
        name: 'CacheLong',
        type: 'utilities',
        url: '/docs/api/hydrogen/2023-07/utilities/cachelong',
      },
      {
        name: 'CacheCustom',
        type: 'utilities',
        url: '/docs/api/hydrogen/2023-07/utilities/cachecustom',
      },
    ],
    description:
      'The CacheNone() strategy instructs caches not to store any data. The function accepts no arguments.\n\nLearn more about [data fetching in Hydrogen](/docs/custom-storefronts/hydrogen/data-fetching/fetch-data).',
    type: 'utility',
    defaultExample: {
      description: 'I am the default example',
      codeblock: {
        tabs: [
          {
            title: 'JavaScript',
            code: "import {json} from '@shopify/remix-oxygen';\nimport {CacheNone} from '@shopify/hydrogen';\n\nexport async function loader({context}) {\n  const data = await context.storefront.query(\n    `#grahpql\n  {\n    shop {\n      name\n      description\n    }\n  }`,\n    {\n      cache: CacheNone(),\n    },\n  );\n\n  return json(data);\n}\n",
            language: 'js',
          },
          {
            title: 'TypeScript',
            code: "import {json, type LoaderArgs} from '@shopify/remix-oxygen';\nimport {CacheNone} from '@shopify/hydrogen';\n\nexport async function loader({context}: LoaderArgs) {\n  const data = await context.storefront.query(\n    `#grahpql\n  {\n    shop {\n      name\n      description\n    }\n  }`,\n    {\n      cache: CacheNone(),\n    },\n  );\n\n  return json(data);\n}\n",
            language: 'ts',
          },
        ],
        title: 'Example code',
      },
    },
    definitions: [
      {
        title: 'Arguments',
        description: '',
        type: 'CacheNoneGeneratedType',
        typeDefinitions: {
          CacheNoneGeneratedType: {
            filePath: '/cache/strategies.ts',
            name: 'CacheNoneGeneratedType',
            description: '',
            params: [],
            returns: {
              filePath: '/cache/strategies.ts',
              description: '',
              name: 'NoStoreStrategy',
              value: 'NoStoreStrategy',
            },
            value:
              'export function CacheNone(): NoStoreStrategy {\n  return {\n    mode: NO_STORE,\n  };\n}',
          },
          NoStoreStrategy: {
            filePath: '/cache/strategies.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'NoStoreStrategy',
            value: '{\n  mode: string;\n}',
            description: '',
            members: [
              {
                filePath: '/cache/strategies.ts',
                syntaxKind: 'PropertySignature',
                name: 'mode',
                value: 'string',
                description: '',
              },
            ],
          },
        },
      },
    ],
  },
  {
    name: 'CacheShort',
    category: 'utilities',
    isVisualComponent: false,
    related: [
      {
        name: 'createStorefrontClient',
        type: 'utilities',
        url: '/docs/api/hydrogen/2023-07/utilities/createstorefrontclient',
      },
      {
        name: 'CacheNone',
        type: 'utilities',
        url: '/docs/api/hydrogen/2023-07/utilities/cachenone',
      },
      {
        name: 'CacheLong',
        type: 'utilities',
        url: '/docs/api/hydrogen/2023-07/utilities/cachelong',
      },
      {
        name: 'CacheCustom',
        type: 'utilities',
        url: '/docs/api/hydrogen/2023-07/utilities/cachecustom',
      },
    ],
    description:
      'The `CacheShort` strategy instructs caches to store data for 1 second, and `staleWhileRevalidate` data for an additional 9 seconds. Note: these time values are subject to change.\n\nLearn more about [data fetching in Hydrogen](/docs/custom-storefronts/hydrogen/data-fetching/fetch-data).',
    type: 'utility',
    defaultExample: {
      description: 'I am the default example',
      codeblock: {
        tabs: [
          {
            title: 'JavaScript',
            code: "import {json} from '@shopify/remix-oxygen';\nimport {CacheShort} from '@shopify/hydrogen';\n\nexport async function loader({context}) {\n  const data = await context.storefront.query(\n    `#grahpql\n  {\n    shop {\n      name\n      description\n    }\n  }`,\n    {\n      cache: CacheShort(),\n    },\n  );\n\n  return json(data);\n}\n",
            language: 'js',
          },
          {
            title: 'TypeScript',
            code: "import {json, type LoaderArgs} from '@shopify/remix-oxygen';\nimport {CacheShort} from '@shopify/hydrogen';\n\nexport async function loader({context}: LoaderArgs) {\n  const data = await context.storefront.query(\n    `#grahpql\n  {\n    shop {\n      name\n      description\n    }\n  }`,\n    {\n      cache: CacheShort(),\n    },\n  );\n\n  return json(data);\n}\n",
            language: 'ts',
          },
        ],
        title: 'Example code',
      },
    },
    definitions: [
      {
        title: 'Arguments',
        description: '',
        type: 'CacheShortGeneratedType',
        typeDefinitions: {
          CacheShortGeneratedType: {
            filePath: '/cache/strategies.ts',
            name: 'CacheShortGeneratedType',
            description: '',
            params: [
              {
                name: 'overrideOptions',
                description: '',
                value: 'AllCacheOptions',
                isOptional: true,
                filePath: '/cache/strategies.ts',
              },
            ],
            returns: {
              filePath: '/cache/strategies.ts',
              description: '',
              name: 'AllCacheOptions',
              value: 'AllCacheOptions',
            },
            value:
              'export function CacheShort(overrideOptions?: CachingStrategy): AllCacheOptions {\n  guardExpirableModeType(overrideOptions);\n  return {\n    mode: PUBLIC,\n    maxAge: 1,\n    staleWhileRevalidate: 9,\n    ...overrideOptions,\n  };\n}',
          },
          AllCacheOptions: {
            filePath: '/cache/strategies.ts',
            name: 'AllCacheOptions',
            description: 'Override options for a cache strategy.',
            members: [
              {
                filePath: '/cache/strategies.ts',
                syntaxKind: 'PropertySignature',
                name: 'mode',
                value: 'string',
                description:
                  'The caching mode, generally `public`, `private`, or `no-store`.',
                isOptional: true,
              },
              {
                filePath: '/cache/strategies.ts',
                syntaxKind: 'PropertySignature',
                name: 'maxAge',
                value: 'number',
                description:
                  'The maximum amount of time in seconds that a resource will be considered fresh. See `max-age` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#:~:text=Response%20Directives-,max%2Dage,-The%20max%2Dage).',
                isOptional: true,
              },
              {
                filePath: '/cache/strategies.ts',
                syntaxKind: 'PropertySignature',
                name: 'staleWhileRevalidate',
                value: 'number',
                description:
                  'Indicate that the cache should serve the stale response in the background while revalidating the cache. See `stale-while-revalidate` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#stale-while-revalidate).',
                isOptional: true,
              },
              {
                filePath: '/cache/strategies.ts',
                syntaxKind: 'PropertySignature',
                name: 'sMaxAge',
                value: 'number',
                description:
                  'Similar to `maxAge` but specific to shared caches. See `s-maxage` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#s-maxage).',
                isOptional: true,
              },
              {
                filePath: '/cache/strategies.ts',
                syntaxKind: 'PropertySignature',
                name: 'staleIfError',
                value: 'number',
                description:
                  'Indicate that the cache should serve the stale response if an error occurs while revalidating the cache. See `stale-if-error` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#stale-if-error).',
                isOptional: true,
              },
            ],
            value:
              'export interface AllCacheOptions {\n  /**\n   * The caching mode, generally `public`, `private`, or `no-store`.\n   */\n  mode?: string;\n  /**\n   * The maximum amount of time in seconds that a resource will be considered fresh. See `max-age` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#:~:text=Response%20Directives-,max%2Dage,-The%20max%2Dage).\n   */\n  maxAge?: number;\n  /**\n   * Indicate that the cache should serve the stale response in the background while revalidating the cache. See `stale-while-revalidate` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#stale-while-revalidate).\n   */\n  staleWhileRevalidate?: number;\n  /**\n   * Similar to `maxAge` but specific to shared caches. See `s-maxage` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#s-maxage).\n   */\n  sMaxAge?: number;\n  /**\n   * Indicate that the cache should serve the stale response if an error occurs while revalidating the cache. See `stale-if-error` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#stale-if-error).\n   */\n  staleIfError?: number;\n}',
          },
        },
      },
    ],
  },
  {
    name: 'InMemoryCache',
    category: 'utilities',
    isVisualComponent: false,
    related: [
      {
        name: 'createStorefrontClient',
        type: 'utilities',
        url: '/docs/api/hydrogen/2023-07/utilities/createstorefrontclient',
      },
    ],
    description:
      '> Caution:\n> This utility should only be used when deploying Hydrogen to a Node.js environment. It should *not* be used when deploying Hydrogen to Oxygen.\n\nIf you are deploying Hydrogen to a Node.js environment, you can use this limited implementation of an in-memory cache. It only supports the `cache-control` header. It does NOT support `age` or `expires` headers.\n\nLearn more about [data fetching in Hydrogen](/docs/custom-storefronts/hydrogen/data-fetching/fetch-data).',
    type: 'utility',
    defaultExample: {
      description: 'I am the default example',
      codeblock: {
        tabs: [
          {
            title: 'JavaScript',
            code: "const {createRequestHandler} = require('@remix-run/express');\nconst path = require('path');\nconst {installGlobals} = require('@remix-run/node');\nconst express = require('express');\nconst {createStorefrontClient, InMemoryCache} = require('@shopify/hydrogen');\n\ninstallGlobals();\n\nconst app = express();\n\nconst BUILD_DIR = path.join(process.cwd(), 'build');\n\napp.use(\n  '/build',\n  express.static('public/build', {immutable: true, maxAge: '1y'}),\n);\n\napp.all('*', async (req) =&gt; {\n  const {storefront} = createStorefrontClient({\n    cache: new InMemoryCache(),\n    // `waitUntil` is only needed on worker environments. For Express/Node, it isn't applicable\n    waitUntil: null,\n    i18n: {language: 'EN', country: 'US'},\n    publicStorefrontToken: process.env.PUBLIC_STOREFRONT_API_TOKEN,\n    privateStorefrontToken: process.env.PRIVATE_STOREFRONT_API_TOKEN,\n    storeDomain: process.env.PUBLIC_STORE_DOMAIN,\n    storefrontId: process.env.PUBLIC_STOREFRONT_ID,\n    storefrontHeaders: {\n      cookie: req.get('cookie'),\n    },\n  });\n\n  return createRequestHandler({\n    build: require(BUILD_DIR),\n    mode: process.env.NODE_ENV,\n    getLoadContext: () =&gt; ({storefront}),\n  });\n});\n\nconst port = process.env.PORT || 3000;\n\napp.listen(port, () =&gt; {\n  console.log(`Express server listening on port ${port}`);\n});\n",
            language: 'js',
          },
        ],
        title: 'Example code',
      },
    },
    definitions: [],
  },
  {
    name: 'generateCacheControlHeader',
    category: 'utilities',
    isVisualComponent: false,
    related: [],
    description:
      'This utility function accepts a `CachingStrategy` object and returns a string with the corresponding `cache-control` header.\n\nLearn more about [data fetching in Hydrogen](/docs/custom-storefronts/hydrogen/data-fetching/fetch-data).',
    type: 'utility',
    defaultExample: {
      description: 'I am the default example',
      codeblock: {
        tabs: [
          {
            title: 'JavaScript',
            code: "import {json} from '@shopify/remix-oxygen';\nimport {generateCacheControlHeader, CacheShort} from '@shopify/hydrogen';\n\nexport async function loader() {\n  return json(\n    {some: 'data'},\n    {\n      headers: {\n        'cache-control': generateCacheControlHeader(CacheShort()),\n      },\n    },\n  );\n}\n",
            language: 'js',
          },
          {
            title: 'TypeScript',
            code: "import {json} from '@shopify/remix-oxygen';\nimport {generateCacheControlHeader, CacheShort} from '@shopify/hydrogen';\n\nexport async function loader() {\n  return json(\n    {some: 'data'},\n    {\n      headers: {\n        'cache-control': generateCacheControlHeader(CacheShort()),\n      },\n    },\n  );\n}\n",
            language: 'ts',
          },
        ],
        title: 'Example code',
      },
    },
    definitions: [
      {
        title: 'Arguments',
        description: '',
        type: 'GenerateCacheControlHeaderGeneratedType',
        typeDefinitions: {
          GenerateCacheControlHeaderGeneratedType: {
            filePath: '/cache/strategies.ts',
            name: 'GenerateCacheControlHeaderGeneratedType',
            description: '',
            params: [
              {
                name: 'cacheOptions',
                description: '',
                value: 'AllCacheOptions',
                filePath: '/cache/strategies.ts',
              },
            ],
            returns: {
              filePath: '/cache/strategies.ts',
              description: '',
              name: 'string',
              value: 'string',
            },
            value:
              "export function generateCacheControlHeader(\n  cacheOptions: CachingStrategy,\n): string {\n  const cacheControl: string[] = [];\n  Object.keys(cacheOptions).forEach((key: string) => {\n    if (key === 'mode') {\n      cacheControl.push(cacheOptions[key] as string);\n    } else if (optionMapping[key]) {\n      cacheControl.push(\n        `${optionMapping[key]}=${cacheOptions[key as keyof CachingStrategy]}`,\n      );\n    }\n  });\n  return cacheControl.join(', ');\n}",
          },
          AllCacheOptions: {
            filePath: '/cache/strategies.ts',
            name: 'AllCacheOptions',
            description: 'Override options for a cache strategy.',
            members: [
              {
                filePath: '/cache/strategies.ts',
                syntaxKind: 'PropertySignature',
                name: 'mode',
                value: 'string',
                description:
                  'The caching mode, generally `public`, `private`, or `no-store`.',
                isOptional: true,
              },
              {
                filePath: '/cache/strategies.ts',
                syntaxKind: 'PropertySignature',
                name: 'maxAge',
                value: 'number',
                description:
                  'The maximum amount of time in seconds that a resource will be considered fresh. See `max-age` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#:~:text=Response%20Directives-,max%2Dage,-The%20max%2Dage).',
                isOptional: true,
              },
              {
                filePath: '/cache/strategies.ts',
                syntaxKind: 'PropertySignature',
                name: 'staleWhileRevalidate',
                value: 'number',
                description:
                  'Indicate that the cache should serve the stale response in the background while revalidating the cache. See `stale-while-revalidate` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#stale-while-revalidate).',
                isOptional: true,
              },
              {
                filePath: '/cache/strategies.ts',
                syntaxKind: 'PropertySignature',
                name: 'sMaxAge',
                value: 'number',
                description:
                  'Similar to `maxAge` but specific to shared caches. See `s-maxage` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#s-maxage).',
                isOptional: true,
              },
              {
                filePath: '/cache/strategies.ts',
                syntaxKind: 'PropertySignature',
                name: 'staleIfError',
                value: 'number',
                description:
                  'Indicate that the cache should serve the stale response if an error occurs while revalidating the cache. See `stale-if-error` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#stale-if-error).',
                isOptional: true,
              },
            ],
            value:
              'export interface AllCacheOptions {\n  /**\n   * The caching mode, generally `public`, `private`, or `no-store`.\n   */\n  mode?: string;\n  /**\n   * The maximum amount of time in seconds that a resource will be considered fresh. See `max-age` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#:~:text=Response%20Directives-,max%2Dage,-The%20max%2Dage).\n   */\n  maxAge?: number;\n  /**\n   * Indicate that the cache should serve the stale response in the background while revalidating the cache. See `stale-while-revalidate` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#stale-while-revalidate).\n   */\n  staleWhileRevalidate?: number;\n  /**\n   * Similar to `maxAge` but specific to shared caches. See `s-maxage` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#s-maxage).\n   */\n  sMaxAge?: number;\n  /**\n   * Indicate that the cache should serve the stale response if an error occurs while revalidating the cache. See `stale-if-error` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#stale-if-error).\n   */\n  staleIfError?: number;\n}',
          },
        },
      },
    ],
  },
  {
    name: 'CartForm',
    category: 'components',
    isVisualComponent: false,
    related: [],
    description:
      'Creates a form for managing cart operations. Use `CartActionInput` to accept form inputs of known type.',
    type: 'component',
    defaultExample: {
      description: 'This is the default example',
      codeblock: {
        tabs: [
          {
            title: 'JavaScript',
            code: "import {json} from '@remix-run/server-runtime';\nimport {CartForm} from '@shopify/hydrogen';\nimport invariant from 'tiny-invariant';\n\nexport default function Cart() {\n  return (\n    &lt;CartForm\n      action={CartForm.ACTIONS.LinesUpdate}\n      inputs={{\n        lines: [\n          {\n            id: 'gid://shopify/CartLine/123456789',\n            quantity: 3,\n          },\n        ],\n        other: 'data',\n      }}\n    &gt;\n      &lt;button&gt;Quantity up&lt;/button&gt;\n    &lt;/CartForm&gt;\n  );\n}\n\nexport async function action({request, context}) {\n  const {cart} = context;\n\n  const formData = await request.formData();\n  const {action, inputs} = CartForm.getFormInput(formData);\n\n  let status = 200;\n  let result;\n\n  if (action === CartForm.ACTIONS.LinesUpdate) {\n    result = await cart.updateLines(inputs.lines);\n  } else {\n    invariant(false, `${action} cart action is not defined`);\n  }\n\n  const headers = cart.setCartId(result.cart.id);\n\n  return json(result, {status, headers});\n}\n",
            language: 'js',
          },
          {
            title: 'TypeScript',
            code: "import {type ActionArgs, json} from '@remix-run/server-runtime';\nimport {\n  type CartQueryData,\n  type HydrogenCart,\n  CartForm,\n} from '@shopify/hydrogen';\nimport invariant from 'tiny-invariant';\n\nexport default function Cart() {\n  return (\n    &lt;CartForm\n      action={CartForm.ACTIONS.LinesUpdate}\n      inputs={{\n        lines: [\n          {\n            id: 'gid://shopify/CartLine/123456789',\n            quantity: 3,\n          },\n        ],\n        other: 'data',\n      }}\n    &gt;\n      &lt;button&gt;Quantity up&lt;/button&gt;\n    &lt;/CartForm&gt;\n  );\n}\n\nexport async function action({request, context}: ActionArgs) {\n  const cart = context.cart as HydrogenCart;\n  // cart is type HydrogenCart or HydrogenCartCustom\n  // Declare cart type in remix.env.d.ts for interface AppLoadContext to avoid type casting\n  // const {cart} = context;\n\n  const formData = await request.formData();\n  const {action, inputs} = CartForm.getFormInput(formData);\n\n  let status = 200;\n  let result: CartQueryData;\n\n  if (action === CartForm.ACTIONS.LinesUpdate) {\n    result = await cart.updateLines(inputs.lines);\n  } else {\n    invariant(false, `${action} cart action is not defined`);\n  }\n\n  const headers = cart.setCartId(result.cart.id);\n\n  return json(result, {status, headers});\n}\n",
            language: 'ts',
          },
        ],
        title: 'example',
      },
    },
    definitions: [
      {
        title: 'Props',
        description: '',
        type: 'CartFormProps',
        typeDefinitions: {
          CartFormProps: {
            filePath: '/cart/CartForm.tsx',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'CartFormProps',
            value: 'CartActionInputProps & CartFormCommonProps',
            description: '',
          },
          CartActionInputProps: {
            filePath: '/cart/CartForm.tsx',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'CartActionInputProps',
            value:
              'CartAttributesUpdateProps | CartBuyerIdentityUpdateProps | CartCreateProps | CartDiscountCodesUpdateProps | CartLinesAddProps | CartLinesUpdateProps | CartLinesRemoveProps | CartNoteUpdateProps | CartSelectedDeliveryOptionsUpdateProps | CartMetafieldsSetProps | CartMetafieldDeleteProps | CartCustomProps',
            description: '',
          },
          CartAttributesUpdateProps: {
            filePath: '/cart/CartForm.tsx',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'CartAttributesUpdateProps',
            value:
              "{\n  action: 'AttributesUpdateInput';\n  inputs?: {\n    attributes: AttributeInput[];\n  } & OtherFormData;\n}",
            description: '',
            members: [
              {
                filePath: '/cart/CartForm.tsx',
                syntaxKind: 'PropertySignature',
                name: 'action',
                value: '"AttributesUpdateInput"',
                description: '',
              },
              {
                filePath: '/cart/CartForm.tsx',
                syntaxKind: 'PropertySignature',
                name: 'inputs',
                value: '{ attributes: AttributeInput[]; } & OtherFormData',
                description: '',
                isOptional: true,
              },
            ],
          },
          AttributeInput: {
            description: '',
            name: 'AttributeInput',
            value: 'AttributeInput',
            members: [],
            override:
              '[AttributeInput](/docs/api/storefront/2023-07/input-objects/AttributeInput) - Storefront API type',
          },
          OtherFormData: {
            description: '',
            name: 'OtherFormData',
            value: 'OtherFormData',
            members: [],
            override: 'Any `<key: string, value: unknown>` pair',
          },
          CartBuyerIdentityUpdateProps: {
            filePath: '/cart/CartForm.tsx',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'CartBuyerIdentityUpdateProps',
            value:
              "{\n  action: 'BuyerIdentityUpdate';\n  inputs?: {\n    buyerIdentity: CartBuyerIdentityInput;\n  } & OtherFormData;\n}",
            description: '',
            members: [
              {
                filePath: '/cart/CartForm.tsx',
                syntaxKind: 'PropertySignature',
                name: 'action',
                value: '"BuyerIdentityUpdate"',
                description: '',
              },
              {
                filePath: '/cart/CartForm.tsx',
                syntaxKind: 'PropertySignature',
                name: 'inputs',
                value:
                  '{ buyerIdentity: CartBuyerIdentityInput; } & OtherFormData',
                description: '',
                isOptional: true,
              },
            ],
          },
          CartBuyerIdentityInput: {
            description: '',
            name: 'CartBuyerIdentityInput',
            value: 'CartBuyerIdentityInput',
            members: [],
            override:
              '[CartBuyerIdentityInput](/docs/api/storefront/2023-07/input-objects/CartBuyerIdentityInput) - Storefront API type',
          },
          CartCreateProps: {
            filePath: '/cart/CartForm.tsx',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'CartCreateProps',
            value:
              "{\n  action: 'Create';\n  inputs?: {\n    input: CartInput;\n  } & OtherFormData;\n}",
            description: '',
            members: [
              {
                filePath: '/cart/CartForm.tsx',
                syntaxKind: 'PropertySignature',
                name: 'action',
                value: '"Create"',
                description: '',
              },
              {
                filePath: '/cart/CartForm.tsx',
                syntaxKind: 'PropertySignature',
                name: 'inputs',
                value: '{ input: CartInput; } & OtherFormData',
                description: '',
                isOptional: true,
              },
            ],
          },
          CartInput: {
            description: '',
            name: 'CartInput',
            value: 'CartInput',
            members: [],
            override:
              '[CartInput](/docs/api/storefront/2023-07/input-objects/CartInput) - Storefront API type',
          },
          CartDiscountCodesUpdateProps: {
            filePath: '/cart/CartForm.tsx',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'CartDiscountCodesUpdateProps',
            value:
              "{\n  action: 'DiscountCodesUpdate';\n  inputs?: {\n    discountCodes: string[];\n  } & OtherFormData;\n}",
            description: '',
            members: [
              {
                filePath: '/cart/CartForm.tsx',
                syntaxKind: 'PropertySignature',
                name: 'action',
                value: '"DiscountCodesUpdate"',
                description: '',
              },
              {
                filePath: '/cart/CartForm.tsx',
                syntaxKind: 'PropertySignature',
                name: 'inputs',
                value: '{ discountCodes: string[]; } & OtherFormData',
                description: '',
                isOptional: true,
              },
            ],
          },
          CartLinesAddProps: {
            filePath: '/cart/CartForm.tsx',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'CartLinesAddProps',
            value:
              "{\n  action: 'LinesAdd';\n  inputs?: {\n    lines: CartLineInput[];\n  } & OtherFormData;\n}",
            description: '',
            members: [
              {
                filePath: '/cart/CartForm.tsx',
                syntaxKind: 'PropertySignature',
                name: 'action',
                value: '"LinesAdd"',
                description: '',
              },
              {
                filePath: '/cart/CartForm.tsx',
                syntaxKind: 'PropertySignature',
                name: 'inputs',
                value: '{ lines: CartLineInput[]; } & OtherFormData',
                description: '',
                isOptional: true,
              },
            ],
          },
          CartLineInput: {
            description: '',
            name: 'CartLineInput',
            value: 'CartLineInput',
            members: [],
            override:
              '[CartLineInput](/docs/api/storefront/2023-07/input-objects/CartLineInput) - Storefront API type',
          },
          CartLinesUpdateProps: {
            filePath: '/cart/CartForm.tsx',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'CartLinesUpdateProps',
            value:
              "{\n  action: 'LinesUpdate';\n  inputs?: {\n    lines: CartLineUpdateInput[];\n  } & OtherFormData;\n}",
            description: '',
            members: [
              {
                filePath: '/cart/CartForm.tsx',
                syntaxKind: 'PropertySignature',
                name: 'action',
                value: '"LinesUpdate"',
                description: '',
              },
              {
                filePath: '/cart/CartForm.tsx',
                syntaxKind: 'PropertySignature',
                name: 'inputs',
                value: '{ lines: CartLineUpdateInput[]; } & OtherFormData',
                description: '',
                isOptional: true,
              },
            ],
          },
          CartLineUpdateInput: {
            description: '',
            name: 'CartLineUpdateInput',
            value: 'CartLineUpdateInput',
            members: [],
            override:
              '[CartLineUpdateInput](/docs/api/storefront/2023-07/input-objects/CartLineUpdateInput) - Storefront API type',
          },
          CartLinesRemoveProps: {
            filePath: '/cart/CartForm.tsx',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'CartLinesRemoveProps',
            value:
              "{\n  action: 'LinesRemove';\n  inputs?: {\n    lineIds: string[];\n  } & OtherFormData;\n}",
            description: '',
            members: [
              {
                filePath: '/cart/CartForm.tsx',
                syntaxKind: 'PropertySignature',
                name: 'action',
                value: '"LinesRemove"',
                description: '',
              },
              {
                filePath: '/cart/CartForm.tsx',
                syntaxKind: 'PropertySignature',
                name: 'inputs',
                value: '{ lineIds: string[]; } & OtherFormData',
                description: '',
                isOptional: true,
              },
            ],
          },
          CartNoteUpdateProps: {
            filePath: '/cart/CartForm.tsx',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'CartNoteUpdateProps',
            value:
              "{\n  action: 'NoteUpdate';\n  inputs?: {\n    note: string;\n  } & OtherFormData;\n}",
            description: '',
            members: [
              {
                filePath: '/cart/CartForm.tsx',
                syntaxKind: 'PropertySignature',
                name: 'action',
                value: '"NoteUpdate"',
                description: '',
              },
              {
                filePath: '/cart/CartForm.tsx',
                syntaxKind: 'PropertySignature',
                name: 'inputs',
                value: '{ note: string; } & OtherFormData',
                description: '',
                isOptional: true,
              },
            ],
          },
          CartSelectedDeliveryOptionsUpdateProps: {
            filePath: '/cart/CartForm.tsx',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'CartSelectedDeliveryOptionsUpdateProps',
            value:
              "{\n  action: 'SelectedDeliveryOptionsUpdate';\n  inputs?: {\n    selectedDeliveryOptions: CartSelectedDeliveryOptionInput[];\n  } & OtherFormData;\n}",
            description: '',
            members: [
              {
                filePath: '/cart/CartForm.tsx',
                syntaxKind: 'PropertySignature',
                name: 'action',
                value: '"SelectedDeliveryOptionsUpdate"',
                description: '',
              },
              {
                filePath: '/cart/CartForm.tsx',
                syntaxKind: 'PropertySignature',
                name: 'inputs',
                value:
                  '{ selectedDeliveryOptions: CartSelectedDeliveryOptionInput[]; } & OtherFormData',
                description: '',
                isOptional: true,
              },
            ],
          },
          CartSelectedDeliveryOptionInput: {
            description: '',
            name: 'CartSelectedDeliveryOptionInput',
            value: 'CartSelectedDeliveryOptionInput',
            members: [],
            override:
              '[CartSelectedDeliveryOptionInput](/docs/api/storefront/2023-07/input-objects/CartSelectedDeliveryOptionInput) - Storefront API type',
          },
          CartMetafieldsSetProps: {
            filePath: '/cart/CartForm.tsx',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'CartMetafieldsSetProps',
            value:
              "{\n  action: 'MetafieldsSet';\n  inputs?: {\n    metafields: MetafieldWithoutOwnerId[];\n  } & OtherFormData;\n}",
            description: '',
            members: [
              {
                filePath: '/cart/CartForm.tsx',
                syntaxKind: 'PropertySignature',
                name: 'action',
                value: '"MetafieldsSet"',
                description: '',
              },
              {
                filePath: '/cart/CartForm.tsx',
                syntaxKind: 'PropertySignature',
                name: 'inputs',
                value:
                  '{ metafields: MetafieldWithoutOwnerId[]; } & OtherFormData',
                description: '',
                isOptional: true,
              },
            ],
          },
          MetafieldWithoutOwnerId: {
            description: '',
            name: 'MetafieldWithoutOwnerId',
            value: 'MetafieldWithoutOwnerId',
            members: [],
            override:
              'Same as [CartMetafieldsSetInput](https://shopify.dev/docs/api/storefront/2023-07/input-objects/CartMetafieldsSetInput) Storefront API type but without `ownerId`. `ownerId` is always set to the cart id.',
          },
          CartMetafieldDeleteProps: {
            filePath: '/cart/CartForm.tsx',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'CartMetafieldDeleteProps',
            value:
              "{\n  action: 'MetafieldsDelete';\n  inputs?: {\n    key: Scalars['String'];\n  } & OtherFormData;\n}",
            description: '',
            members: [
              {
                filePath: '/cart/CartForm.tsx',
                syntaxKind: 'PropertySignature',
                name: 'action',
                value: '"MetafieldsDelete"',
                description: '',
              },
              {
                filePath: '/cart/CartForm.tsx',
                syntaxKind: 'PropertySignature',
                name: 'inputs',
                value: '{ key: string; } & OtherFormData',
                description: '',
                isOptional: true,
              },
            ],
          },
          CartCustomProps: {
            filePath: '/cart/CartForm.tsx',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'CartCustomProps',
            value:
              '{\n  action: `Custom${string}`;\n  inputs?: Record<string, unknown>;\n}',
            description: '',
            members: [
              {
                filePath: '/cart/CartForm.tsx',
                syntaxKind: 'PropertySignature',
                name: 'action',
                value: '`Custom${string}`',
                description: '',
              },
              {
                filePath: '/cart/CartForm.tsx',
                syntaxKind: 'PropertySignature',
                name: 'inputs',
                value: 'Record<string, unknown>',
                description: '',
                isOptional: true,
              },
            ],
          },
          CartFormCommonProps: {
            filePath: '/cart/CartForm.tsx',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'CartFormCommonProps',
            value:
              '{\n  /**\n   * Children nodes of CartForm.\n   * Children can be a render prop that receives the fetcher.\n   */\n  children:\n    | React.ReactNode\n    | ((fetcher: FetcherWithComponents<any>) => React.ReactNode);\n  /**\n   * The route to submit the form to. Defaults to the current route.\n   */\n  route?: string;\n}',
            description: '',
            members: [
              {
                filePath: '/cart/CartForm.tsx',
                syntaxKind: 'PropertySignature',
                name: 'children',
                value: 'any',
                description:
                  'Children nodes of CartForm. Children can be a render prop that receives the fetcher.',
              },
              {
                filePath: '/cart/CartForm.tsx',
                syntaxKind: 'PropertySignature',
                name: 'route',
                value: 'string',
                description:
                  'The route to submit the form to. Defaults to the current route.',
                isOptional: true,
              },
            ],
          },
        },
      },
    ],
    examples: {
      description: 'Examples of various ways to use the `CartForm` component.',
      exampleGroups: [
        {
          title: 'CartForm using HTML input tags as form inputs',
          examples: [
            {
              description:
                'Use HTML input tags with CartForm to accept form inputs.',
              codeblock: {
                title: 'Example',
                tabs: [
                  {
                    title: 'JavaScript',
                    code: "import {json} from '@remix-run/server-runtime';\nimport {CartForm} from '@shopify/hydrogen';\nimport invariant from 'tiny-invariant';\n\nexport default function Note() {\n  return (\n    &lt;CartForm action={CartForm.ACTIONS.NoteUpdate}&gt;\n      &lt;input type=\"text\" name=\"note\" /&gt;\n      &lt;button&gt;Update Note&lt;/button&gt;\n    &lt;/CartForm&gt;\n  );\n}\n\nexport async function action({request, context}) {\n  const cart = context.cart;\n\n  const formData = await request.formData();\n  const {action, inputs} = CartForm.getFormInput(formData);\n\n  let status = 200;\n  let result;\n\n  if (action === CartForm.ACTIONS.NoteUpdate) {\n    result = await cart.updateNote(inputs.note);\n  } else {\n    invariant(false, `${action} cart action is not defined`);\n  }\n\n  const headers = cart.setCartId(result.cart.id);\n\n  return json(result, {status, headers});\n}\n",
                    language: 'jsx',
                  },
                  {
                    title: 'TypeScript',
                    code: "import {type ActionArgs, json} from '@remix-run/server-runtime';\nimport {\n  type CartQueryData,\n  type HydrogenCart,\n  CartForm,\n} from '@shopify/hydrogen';\nimport invariant from 'tiny-invariant';\n\nexport default function Note() {\n  return (\n    &lt;CartForm action={CartForm.ACTIONS.NoteUpdate}&gt;\n      &lt;input type=\"text\" name=\"note\" /&gt;\n      &lt;button&gt;Update Note&lt;/button&gt;\n    &lt;/CartForm&gt;\n  );\n}\n\nexport async function action({request, context}: ActionArgs) {\n  const cart = context.cart as HydrogenCart;\n  // cart is type HydrogenCart or HydrogenCartCustom\n  // Declare cart type in remix.env.d.ts for interface AppLoadContext to avoid type casting\n  // const {cart} = context;\n\n  const formData = await request.formData();\n  const {action, inputs} = CartForm.getFormInput(formData);\n\n  let status = 200;\n  let result: CartQueryData;\n\n  if (action === CartForm.ACTIONS.NoteUpdate) {\n    result = await cart.updateNote(inputs.note);\n  } else {\n    invariant(false, `${action} cart action is not defined`);\n  }\n\n  const headers = cart.setCartId(result.cart.id);\n\n  return json(result, {status, headers});\n}\n",
                    language: 'tsx',
                  },
                ],
              },
            },
          ],
        },
        {
          title: 'Custom actions',
          examples: [
            {
              description:
                'Create custom actions to accept form inputs of unknown type. Just prepend `Custom` in front of your custom action name.',
              codeblock: {
                title: 'Example',
                tabs: [
                  {
                    title: 'JavaScript',
                    code: "import {json} from '@remix-run/server-runtime';\nimport {CartForm} from '@shopify/hydrogen';\nimport invariant from 'tiny-invariant';\n\nexport default function Cart() {\n  return (\n    &lt;CartForm\n      action=\"CustomEditInPlace\"\n      inputs={{\n        addLines: [\n          {\n            merchandiseId: 'gid://shopify/Product/123456789',\n            quantity: 1,\n          },\n        ],\n        removeLines: ['gid://shopify/CartLine/123456789'],\n      }}\n    &gt;\n      &lt;button&gt;Green color swatch&lt;/button&gt;\n    &lt;/CartForm&gt;\n  );\n}\n\nexport async function action({request, context}) {\n  const {cart} = context;\n\n  const formData = await request.formData();\n  const {action, inputs} = CartForm.getFormInput(formData);\n\n  let status = 200;\n  let result;\n\n  if (action === 'CustomEditInPlace') {\n    result = await cart.addLines(inputs.addLines);\n    result = await cart.removeLines(inputs.removeLines);\n  } else {\n    invariant(false, `${action} cart action is not defined`);\n  }\n\n  const headers = cart.setCartId(result.cart.id);\n\n  return json(result, {status, headers});\n}\n",
                    language: 'jsx',
                  },
                  {
                    title: 'TypeScript',
                    code: "import {type ActionArgs, json} from '@remix-run/server-runtime';\nimport {\n  type CartQueryData,\n  type HydrogenCart,\n  CartForm,\n} from '@shopify/hydrogen';\nimport {type CartLineInput} from '@shopify/hydrogen-react/storefront-api-types';\nimport invariant from 'tiny-invariant';\n\nexport default function Cart() {\n  return (\n    &lt;CartForm\n      action=\"CustomEditInPlace\"\n      inputs={{\n        addLines: [\n          {\n            merchandiseId: 'gid://shopify/Product/123456789',\n            quantity: 1,\n          },\n        ],\n        removeLines: ['gid://shopify/CartLine/123456789'],\n      }}\n    &gt;\n      &lt;button&gt;Green color swatch&lt;/button&gt;\n    &lt;/CartForm&gt;\n  );\n}\n\nexport async function action({request, context}: ActionArgs) {\n  const cart = context.cart as HydrogenCart;\n  // cart is type HydrogenCart or HydrogenCartCustom\n  // Declare cart type in remix.env.d.ts for interface AppLoadContext to avoid type casting\n  // const {cart} = context;\n\n  const formData = await request.formData();\n  const {action, inputs} = CartForm.getFormInput(formData);\n\n  let status = 200;\n  let result: CartQueryData;\n\n  if (action === 'CustomEditInPlace') {\n    result = await cart.addLines(inputs.addLines as CartLineInput[]);\n    result = await cart.removeLines(inputs.removeLines as string[]);\n  } else {\n    invariant(false, `${action} cart action is not defined`);\n  }\n\n  const headers = cart.setCartId(result.cart.id);\n\n  return json(result, {status, headers});\n}\n",
                    language: 'tsx',
                  },
                ],
              },
            },
          ],
        },
        {
          title: 'CartForm with fetcher',
          examples: [
            {
              description:
                'Use `CartForm` with a fetcher to manually submit the form. An example usage is to submit the form on changes to the state of a checkbox.\n\nWhen using fetcher to submit, make sure to have a `CartForm.INPUT_NAME` data key and its data should be a JSON stringify object.',
              codeblock: {
                title: 'Example',
                tabs: [
                  {
                    title: 'JavaScript',
                    code: "import {useFetcher} from '@remix-run/react';\nimport {json} from '@remix-run/server-runtime';\nimport {CartForm} from '@shopify/hydrogen';\nimport invariant from 'tiny-invariant';\n\nexport function ThisIsGift({metafield}) {\n  const fetcher = useFetcher();\n\n  const buildFormInput = (event) =&gt; ({\n    action: CartForm.ACTIONS.MetafieldsSet,\n    inputs: {\n      metafields: [\n        {\n          key: 'custom.gift',\n          type: 'boolean',\n          value: event.target.checked.toString(),\n        },\n      ],\n    },\n  });\n\n  return (\n    &lt;div&gt;\n      &lt;input\n        checked={metafield?.value === 'true'}\n        type=\"checkbox\"\n        id=\"isGift\"\n        onChange={(event) =&gt; {\n          fetcher.submit(\n            {\n              [CartForm.INPUT_NAME]: JSON.stringify(buildFormInput(event)),\n            },\n            {method: 'POST', action: '/cart'},\n          );\n        }}\n      /&gt;\n      &lt;label htmlFor=\"isGift\"&gt;This is a gift&lt;/label&gt;\n    &lt;/div&gt;\n  );\n}\n\nexport async function action({request, context}) {\n  const {cart} = context;\n\n  const formData = await request.formData();\n  const {action, inputs} = CartForm.getFormInput(formData);\n\n  let status = 200;\n  let result;\n\n  if (action === CartForm.ACTIONS.MetafieldsSet) {\n    result = await cart.setMetafields(inputs.metafields);\n  } else {\n    invariant(false, `${action} cart action is not defined`);\n  }\n\n  const headers = cart.setCartId(result.cart.id);\n\n  return json(result, {status, headers});\n}\n",
                    language: 'jsx',
                  },
                  {
                    title: 'TypeScript',
                    code: "import {useFetcher} from '@remix-run/react';\nimport {type ActionArgs, json} from '@remix-run/server-runtime';\nimport {\n  type CartQueryData,\n  type HydrogenCart,\n  CartForm,\n  type CartActionInput,\n} from '@shopify/hydrogen';\nimport invariant from 'tiny-invariant';\nimport type {Cart} from '@shopify/hydrogen/storefront-api-types';\n\nexport function ThisIsGift({metafield}: {metafield: Cart['metafield']}) {\n  const fetcher = useFetcher();\n\n  const buildFormInput: (\n    event: React.ChangeEvent&lt;HTMLInputElement&gt;,\n  ) =&gt; CartActionInput = (event) =&gt; ({\n    action: CartForm.ACTIONS.MetafieldsSet,\n    inputs: {\n      metafields: [\n        {\n          key: 'custom.gift',\n          type: 'boolean',\n          value: event.target.checked.toString(),\n        },\n      ],\n    },\n  });\n\n  return (\n    &lt;div&gt;\n      &lt;input\n        checked={metafield?.value === 'true'}\n        type=\"checkbox\"\n        id=\"isGift\"\n        onChange={(event) =&gt; {\n          fetcher.submit(\n            {\n              [CartForm.INPUT_NAME]: JSON.stringify(buildFormInput(event)),\n            },\n            {method: 'POST', action: '/cart'},\n          );\n        }}\n      /&gt;\n      &lt;label htmlFor=\"isGift\"&gt;This is a gift&lt;/label&gt;\n    &lt;/div&gt;\n  );\n}\n\nexport async function action({request, context}: ActionArgs) {\n  const cart = context.cart as HydrogenCart;\n  // cart is type HydrogenCart or HydrogenCartCustom\n  // Declare cart type in remix.env.d.ts for interface AppLoadContext to avoid type casting\n  // const {cart} = context;\n\n  const formData = await request.formData();\n  const {action, inputs} = CartForm.getFormInput(formData);\n\n  let status = 200;\n  let result: CartQueryData;\n\n  if (action === CartForm.ACTIONS.MetafieldsSet) {\n    result = await cart.setMetafields(inputs.metafields);\n  } else {\n    invariant(false, `${action} cart action is not defined`);\n  }\n\n  const headers = cart.setCartId(result.cart.id);\n\n  return json(result, {status, headers});\n}\n",
                    language: 'tsx',
                  },
                ],
              },
            },
          ],
        },
      ],
    },
  },
  {
    name: 'cartGetIdDefault',
    category: 'utilities',
    isVisualComponent: false,
    related: [],
    description:
      'Creates a function that returns the cart id from request header cookie.',
    type: 'utility',
    defaultExample: {
      description: 'This is the default example',
      codeblock: {
        tabs: [
          {
            title: 'JavaScript',
            code: "import {cartGetIdDefault, cartSetIdDefault} from '@shopify/hydrogen';\n\n// server.js\nexport default {\n  async fetch(request) {\n    const cart = createCartHandler({\n      storefront,\n      getCartId: cartGetIdDefault(request.headers),\n      setCartId: cartSetIdDefault(),\n    });\n  },\n};\n\n// Some route\nexport async function loader({context}) {\n  const {cart} = context;\n\n  cart.getCartId(); // gid://shopify/Cart/1234567890\n}\n",
            language: 'js',
          },
        ],
        title: 'example',
      },
    },
    definitions: [
      {
        title: 'cartGetIdDefault',
        description: '',
        type: 'CartGetIdDefaultGeneratedType',
        typeDefinitions: {
          CartGetIdDefaultGeneratedType: {
            filePath: '/cart/cartGetIdDefault.ts',
            name: 'CartGetIdDefaultGeneratedType',
            description: '',
            params: [
              {
                name: 'requestHeaders',
                description: '',
                value: 'Headers',
                filePath: '/cart/cartGetIdDefault.ts',
              },
            ],
            returns: {
              filePath: '/cart/cartGetIdDefault.ts',
              description: '',
              name: '',
              value: '',
            },
            value:
              "cartGetIdDefault = (requestHeaders: Headers) => {\n  const cookies = parse(requestHeaders.get('Cookie') || '');\n  return () => {\n    return cookies.cart ? `gid://shopify/Cart/${cookies.cart}` : undefined;\n  };\n}",
          },
          Headers: {
            description: '',
            name: 'Headers',
            value: 'Headers',
            members: [],
            override:
              '[Headers](https://developer.mozilla.org/en-US/docs/Web/API/Headers) - Web API',
          },
        },
      },
    ],
  },
  {
    name: 'cartSetIdDefault',
    category: 'utilities',
    isVisualComponent: false,
    related: [],
    description:
      'Creates a function that returns a header with a Set-Cookie on the cart ID.',
    type: 'utility',
    defaultExample: {
      description: 'This is the default example',
      codeblock: {
        tabs: [
          {
            title: 'JavaScript',
            code: "import {json} from '@remix-run/server-runtime';\nimport {cartGetIdDefault, cartSetIdDefault} from '@shopify/hydrogen';\n\n// server.js\nexport default {\n  async fetch(request) {\n    const cart = createCartHandler({\n      storefront,\n      getCartId: cartGetIdDefault(request.headers),\n      setCartId: cartSetIdDefault(), // defaults to session cookie\n      // setCartId: cartSetIdDefault({maxage: 60 * 60 * 24 * 365}), // 1 year expiry\n    });\n  },\n};\n\n// Some route\nexport async function action({context}) {\n  const {cart} = context;\n\n  // Usage\n  const result = await cart.updateNote('Some note');\n\n  const headers = cart.setCartId(result.cart.id);\n\n  return json(result, {headers});\n}\n",
            language: 'js',
          },
        ],
        title: 'example',
      },
    },
    definitions: [
      {
        title: 'cartSetIdDefault',
        description: '',
        type: 'CartSetIdDefaultGeneratedType',
        typeDefinitions: {
          CartSetIdDefaultGeneratedType: {
            filePath: '/cart/cartSetIdDefault.ts',
            name: 'CartSetIdDefaultGeneratedType',
            description: '',
            params: [
              {
                name: 'cookieOptions',
                description: '',
                value: 'CookieOptions',
                isOptional: true,
                filePath: '/cart/cartSetIdDefault.ts',
              },
            ],
            returns: {
              filePath: '/cart/cartSetIdDefault.ts',
              description: '',
              name: '',
              value: '',
            },
            value:
              "cartSetIdDefault = (cookieOptions?: CookieOptions) => {\n  return (cartId: string) => {\n    const headers = new Headers();\n    headers.append(\n      'Set-Cookie',\n      stringify('cart', cartId.split('/').pop() || '', {\n        path: '/',\n        ...cookieOptions,\n      }),\n    );\n    return headers;\n  };\n}",
          },
          CookieOptions: {
            filePath: '/cart/cartSetIdDefault.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'CookieOptions',
            value:
              "{\n  maxage?: number;\n  expires?: Date | number | string;\n  samesite?: 'Lax' | 'Strict' | 'None';\n  secure?: boolean;\n  httponly?: boolean;\n  domain?: string;\n  path?: string;\n}",
            description: '',
            members: [
              {
                filePath: '/cart/cartSetIdDefault.ts',
                syntaxKind: 'PropertySignature',
                name: 'maxage',
                value: 'number',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/cart/cartSetIdDefault.ts',
                syntaxKind: 'PropertySignature',
                name: 'expires',
                value: 'string | number | Date',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/cart/cartSetIdDefault.ts',
                syntaxKind: 'PropertySignature',
                name: 'samesite',
                value: '"Lax" | "Strict" | "None"',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/cart/cartSetIdDefault.ts',
                syntaxKind: 'PropertySignature',
                name: 'secure',
                value: 'boolean',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/cart/cartSetIdDefault.ts',
                syntaxKind: 'PropertySignature',
                name: 'httponly',
                value: 'boolean',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/cart/cartSetIdDefault.ts',
                syntaxKind: 'PropertySignature',
                name: 'domain',
                value: 'string',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/cart/cartSetIdDefault.ts',
                syntaxKind: 'PropertySignature',
                name: 'path',
                value: 'string',
                description: '',
                isOptional: true,
              },
            ],
          },
        },
      },
    ],
  },
  {
    name: 'createCartHandler',
    category: 'utilities',
    isVisualComponent: false,
    related: [],
    description: 'Creates an API that can be used to interact with the cart.',
    type: 'utility',
    defaultExample: {
      description: 'This is the default example',
      codeblock: {
        tabs: [
          {
            title: 'JavaScript',
            code: "import {\n  createStorefrontClient,\n  createCartHandler,\n  cartGetIdDefault,\n  cartSetIdDefault,\n} from '@shopify/hydrogen';\nimport * as remixBuild from '@remix-run/dev/server-build';\nimport {\n  createRequestHandler,\n  getStorefrontHeaders,\n} from '@shopify/remix-oxygen';\n\nexport default {\n  async fetch(request, env, executionContext) {\n    const {storefront} = createStorefrontClient({\n      /* client parameters */\n    });\n\n    // Create a cart api instance.\n    const cart = createCartHandler({\n      storefront,\n      getCartId: cartGetIdDefault(request.headers),\n      setCartId: cartSetIdDefault(),\n    });\n\n    const handleRequest = createRequestHandler({\n      build: remixBuild,\n      mode: process.env.NODE_ENV,\n      getLoadContext: () =&gt; ({\n        storefront,\n        cart, // Pass the cart api instance to the loader context.\n      }),\n    });\n\n    return await handleRequest(request);\n  },\n};\n",
            language: 'js',
          },
          {
            title: 'TypeScript',
            code: "import {\n  createStorefrontClient,\n  createCartHandler,\n  cartGetIdDefault,\n  cartSetIdDefault,\n} from '@shopify/hydrogen';\nimport * as remixBuild from '@remix-run/dev/server-build';\nimport {\n  createRequestHandler,\n  getStorefrontHeaders,\n} from '@shopify/remix-oxygen';\n\nexport default {\n  async fetch(\n    request: Request,\n    env: Record&lt;string, string&gt;,\n    executionContext: ExecutionContext,\n  ): Promise&lt;Response&gt; {\n    const {storefront} = createStorefrontClient({\n      /* client parameters */\n    });\n\n    // Create a cart api instance.\n    const cart = createCartHandler({\n      storefront,\n      getCartId: cartGetIdDefault(request.headers),\n      setCartId: cartSetIdDefault(),\n    });\n\n    const handleRequest = createRequestHandler({\n      build: remixBuild,\n      mode: process.env.NODE_ENV,\n      getLoadContext: () =&gt; ({\n        storefront,\n        cart, // Pass the cart api instance to the loader context.\n      }),\n    });\n\n    return await handleRequest(request);\n  },\n};\n",
            language: 'ts',
          },
        ],
        title: 'server.(js|ts)',
      },
    },
    definitions: [
      {
        title: 'createCartHandler(options)',
        description: '',
        type: 'CartHandlerOptionsForDocs',
        typeDefinitions: {
          CartHandlerOptionsForDocs: {
            filePath: '/cart/createCartHandler.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'CartHandlerOptionsForDocs',
            value:
              '{\n  /**\n   * A function that returns the cart id in the form of `gid://shopify/Cart/c1-123`.\n   */\n  getCartId: () => string | undefined;\n  /**\n   * A function that sets the cart ID.\n   */\n  setCartId: (cartId: string) => Headers;\n  /**\n   * The storefront client instance created by [`createStorefrontClient`](docs/api/hydrogen/latest/utilities/createstorefrontclient).\n   */\n  storefront: Storefront;\n  /**\n   * The cart mutation fragment used in most mutation requests, except for `setMetafields` and `deleteMetafield`.\n   * See the [example usage](/docs/api/hydrogen/2023-07/utilities/createcarthandler#example-cart-fragments) in the documentation.\n   */\n  cartMutateFragment?: string;\n  /**\n   * The cart query fragment used by `cart.get()`.\n   * See the [example usage](/docs/api/hydrogen/2023-07/utilities/createcarthandler#example-cart-fragments) in the documentation.\n   */\n  cartQueryFragment?: string;\n  /**\n   * Define custom methods or override existing methods for your cart API instance.\n   * See the [example usage](/docs/api/hydrogen/2023-07/utilities/createcarthandler#example-custom-methods) in the documentation.\n   */\n  customMethods__unstable?: TCustomMethods;\n}',
            description: '',
            members: [
              {
                filePath: '/cart/createCartHandler.ts',
                syntaxKind: 'PropertySignature',
                name: 'getCartId',
                value: '() => string',
                description:
                  'A function that returns the cart id in the form of `gid://shopify/Cart/c1-123`.',
              },
              {
                filePath: '/cart/createCartHandler.ts',
                syntaxKind: 'PropertySignature',
                name: 'setCartId',
                value: '(cartId: string) => Headers',
                description: 'A function that sets the cart ID.',
              },
              {
                filePath: '/cart/createCartHandler.ts',
                syntaxKind: 'PropertySignature',
                name: 'storefront',
                value: 'Storefront',
                description:
                  'The storefront client instance created by [`createStorefrontClient`](docs/api/hydrogen/latest/utilities/createstorefrontclient).',
              },
              {
                filePath: '/cart/createCartHandler.ts',
                syntaxKind: 'PropertySignature',
                name: 'cartMutateFragment',
                value: 'string',
                description:
                  'The cart mutation fragment used in most mutation requests, except for `setMetafields` and `deleteMetafield`. See the [example usage](/docs/api/hydrogen/2023-07/utilities/createcarthandler#example-cart-fragments) in the documentation.',
                isOptional: true,
              },
              {
                filePath: '/cart/createCartHandler.ts',
                syntaxKind: 'PropertySignature',
                name: 'cartQueryFragment',
                value: 'string',
                description:
                  'The cart query fragment used by `cart.get()`. See the [example usage](/docs/api/hydrogen/2023-07/utilities/createcarthandler#example-cart-fragments) in the documentation.',
                isOptional: true,
              },
              {
                filePath: '/cart/createCartHandler.ts',
                syntaxKind: 'PropertySignature',
                name: 'customMethods__unstable',
                value: 'TCustomMethods',
                description:
                  'Define custom methods or override existing methods for your cart API instance. See the [example usage](/docs/api/hydrogen/2023-07/utilities/createcarthandler#example-custom-methods) in the documentation.',
                isOptional: true,
              },
            ],
          },
          Headers: {
            description: '',
            name: 'Headers',
            value: 'Headers',
            members: [],
            override:
              '[Headers](https://developer.mozilla.org/en-US/docs/Web/API/Headers) - Web API',
          },
          Storefront: {
            filePath: '/storefront.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'Storefront',
            value:
              "{\n  /** The function to run a query on Storefront API. */\n  query: <OverrideReturnType = any, RawGqlString extends string = string>(\n    query: RawGqlString,\n    ...options: RawGqlString extends keyof StorefrontQueries // Do we have any generated query types?\n      ? IsOptionalVariables<StorefrontQueries[RawGqlString]> extends true\n        ? [StorefrontQuerySecondParam<RawGqlString>?] // Using codegen, query has no variables\n        : [StorefrontQuerySecondParam<RawGqlString>] // Using codegen, query needs variables\n      : [StorefrontQuerySecondParam?] // No codegen, variables always optional\n  ) => Promise<\n    RawGqlString extends keyof StorefrontQueries // Do we have any generated query types?\n      ? StorefrontQueries[RawGqlString]['return'] // Using codegen, return type is known\n      : OverrideReturnType // No codegen, let user specify return type\n  >;\n  /** The function to run a mutation on Storefront API. */\n  mutate: <OverrideReturnType = any, RawGqlString extends string = string>(\n    mutation: RawGqlString,\n    ...options: RawGqlString extends keyof StorefrontMutations // Do we have any generated mutation types?\n      ? IsOptionalVariables<StorefrontMutations[RawGqlString]> extends true\n        ? [StorefrontMutateSecondParam<RawGqlString>?] // Using codegen, mutation has no variables\n        : [StorefrontMutateSecondParam<RawGqlString>] // Using codegen, mutation needs variables\n      : [StorefrontMutateSecondParam?] // No codegen, variables always optional\n  ) => Promise<\n    RawGqlString extends keyof StorefrontMutations // Do we have any generated mutation types?\n      ? StorefrontMutations[RawGqlString]['return'] // Using codegen, return type is known\n      : OverrideReturnType // No codegen, let user specify return type\n  >;\n  /** The cache instance passed in from the `createStorefrontClient` argument. */\n  cache?: Cache;\n  /** Re-export of [`CacheNone`](/docs/api/hydrogen/2023-07/utilities/cachenone). */\n  CacheNone: typeof CacheNone;\n  /** Re-export of [`CacheLong`](/docs/api/hydrogen/2023-07/utilities/cachelong). */\n  CacheLong: typeof CacheLong;\n  /** Re-export of [`CacheShort`](/docs/api/hydrogen/2023-07/utilities/cacheshort). */\n  CacheShort: typeof CacheShort;\n  /** Re-export of [`CacheCustom`](/docs/api/hydrogen/2023-07/utilities/cachecustom). */\n  CacheCustom: typeof CacheCustom;\n  /** Re-export of [`generateCacheControlHeader`](/docs/api/hydrogen/2023-07/utilities/generatecachecontrolheader). */\n  generateCacheControlHeader: typeof generateCacheControlHeader;\n  /** Returns an object that contains headers that are needed for each query to Storefront API GraphQL endpoint. See [`getPublicTokenHeaders` in Hydrogen React](/docs/api/hydrogen-react/2023-07/utilities/createstorefrontclient#:~:text=%27graphql%27.-,getPublicTokenHeaders,-(props%3F%3A) for more details. */\n  getPublicTokenHeaders: ReturnType<\n    typeof createStorefrontUtilities\n  >['getPublicTokenHeaders'];\n  /** Returns an object that contains headers that are needed for each query to Storefront API GraphQL endpoint for API calls made from a server. See [`getPrivateTokenHeaders` in  Hydrogen React](/docs/api/hydrogen-react/2023-07/utilities/createstorefrontclient#:~:text=storefrontApiVersion-,getPrivateTokenHeaders,-(props%3F%3A) for more details.*/\n  getPrivateTokenHeaders: ReturnType<\n    typeof createStorefrontUtilities\n  >['getPrivateTokenHeaders'];\n  /** Creates the fully-qualified URL to your myshopify.com domain. See [`getShopifyDomain` in  Hydrogen React](/docs/api/hydrogen-react/2023-07/utilities/createstorefrontclient#:~:text=StorefrontClientReturn-,getShopifyDomain,-(props%3F%3A) for more details. */\n  getShopifyDomain: ReturnType<\n    typeof createStorefrontUtilities\n  >['getShopifyDomain'];\n  /** Creates the fully-qualified URL to your store's GraphQL endpoint. See [`getStorefrontApiUrl` in  Hydrogen React](/docs/api/hydrogen-react/2023-07/utilities/createstorefrontclient#:~:text=storeDomain-,getStorefrontApiUrl,-(props%3F%3A) for more details.*/\n  getApiUrl: ReturnType<\n    typeof createStorefrontUtilities\n  >['getStorefrontApiUrl'];\n  /** Determines if the error is resulted from a Storefront API call. */\n  isApiError: (error: any) => boolean;\n  /** The `i18n` object passed in from the `createStorefrontClient` argument. */\n  i18n: TI18n;\n}",
            description: 'Interface to interact with the Storefront API.',
            members: [
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'query',
                value:
                  '<OverrideReturnType = any, RawGqlString extends string = string>(query: RawGqlString, ...options: RawGqlString extends never ? IsOptionalVariables<StorefrontQueries[RawGqlString]> extends true ? [StorefrontQuerySecondParam<RawGqlString>?] : [StorefrontQuerySecondParam<RawGqlString>] : [StorefrontQuerySecondParam<string>?]) => Promise<RawGqlString extends never ? StorefrontQueries[RawGqlString]["return"] : OverrideReturnType>',
                description: 'The function to run a query on Storefront API.',
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'mutate',
                value:
                  '<OverrideReturnType = any, RawGqlString extends string = string>(mutation: RawGqlString, ...options: RawGqlString extends never ? IsOptionalVariables<StorefrontMutations[RawGqlString]> extends true ? [StorefrontMutateSecondParam<RawGqlString>?] : [StorefrontMutateSecondParam<RawGqlString>] : [StorefrontCommonOptions<{ readonly [variable: string]: unknown; }>?]) => Promise<RawGqlString extends never ? StorefrontMutations[RawGqlString]["return"] : OverrideReturnType>',
                description:
                  'The function to run a mutation on Storefront API.',
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'cache',
                value: 'Cache',
                description:
                  'The cache instance passed in from the `createStorefrontClient` argument.',
                isOptional: true,
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'CacheNone',
                value: '() => NoStoreStrategy',
                description:
                  'Re-export of [`CacheNone`](/docs/api/hydrogen/2023-07/utilities/cachenone).',
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'CacheLong',
                value: '(overrideOptions?: AllCacheOptions) => AllCacheOptions',
                description:
                  'Re-export of [`CacheLong`](/docs/api/hydrogen/2023-07/utilities/cachelong).',
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'CacheShort',
                value: '(overrideOptions?: AllCacheOptions) => AllCacheOptions',
                description:
                  'Re-export of [`CacheShort`](/docs/api/hydrogen/2023-07/utilities/cacheshort).',
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'CacheCustom',
                value: '(overrideOptions: AllCacheOptions) => AllCacheOptions',
                description:
                  'Re-export of [`CacheCustom`](/docs/api/hydrogen/2023-07/utilities/cachecustom).',
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'generateCacheControlHeader',
                value: '(cacheOptions: AllCacheOptions) => string',
                description:
                  'Re-export of [`generateCacheControlHeader`](/docs/api/hydrogen/2023-07/utilities/generatecachecontrolheader).',
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'getPublicTokenHeaders',
                value:
                  '(props?: Partial<Pick<StorefrontClientProps, "contentType">> & Pick<StorefrontClientProps, "publicStorefrontToken">) => Record<string, string>',
                description:
                  'Returns an object that contains headers that are needed for each query to Storefront API GraphQL endpoint. See [`getPublicTokenHeaders` in Hydrogen React](/docs/api/hydrogen-react/2023-07/utilities/createstorefrontclient#:~:text=%27graphql%27.-,getPublicTokenHeaders,-(props%3F%3A) for more details.',
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'getPrivateTokenHeaders',
                value:
                  '(props?: Partial<Pick<StorefrontClientProps, "contentType">> & Pick<StorefrontClientProps, "privateStorefrontToken"> & { buyerIp?: string; }) => Record<string, string>',
                description:
                  'Returns an object that contains headers that are needed for each query to Storefront API GraphQL endpoint for API calls made from a server. See [`getPrivateTokenHeaders` in  Hydrogen React](/docs/api/hydrogen-react/2023-07/utilities/createstorefrontclient#:~:text=storefrontApiVersion-,getPrivateTokenHeaders,-(props%3F%3A) for more details.',
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'getShopifyDomain',
                value:
                  '(props?: Partial<Pick<StorefrontClientProps, "storeDomain">>) => string',
                description:
                  'Creates the fully-qualified URL to your myshopify.com domain. See [`getShopifyDomain` in  Hydrogen React](/docs/api/hydrogen-react/2023-07/utilities/createstorefrontclient#:~:text=StorefrontClientReturn-,getShopifyDomain,-(props%3F%3A) for more details.',
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'getApiUrl',
                value:
                  '(props?: Partial<Pick<StorefrontClientProps, "storeDomain" | "storefrontApiVersion">>) => string',
                description:
                  "Creates the fully-qualified URL to your store's GraphQL endpoint. See [`getStorefrontApiUrl` in  Hydrogen React](/docs/api/hydrogen-react/2023-07/utilities/createstorefrontclient#:~:text=storeDomain-,getStorefrontApiUrl,-(props%3F%3A) for more details.",
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'isApiError',
                value: '(error: any) => boolean',
                description:
                  'Determines if the error is resulted from a Storefront API call.',
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'i18n',
                value: 'TI18n',
                description:
                  'The `i18n` object passed in from the `createStorefrontClient` argument.',
              },
            ],
          },
          IsOptionalVariables: {
            filePath: '/storefront.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'IsOptionalVariables',
            value:
              "Omit<\n  OperationTypeValue['variables'],\n  AutoAddedVariableNames\n> extends EmptyVariables\n  ? true // No need to pass variables\n  : GenericVariables extends OperationTypeValue['variables']\n  ? true // We don't know what variables are needed\n  : false",
            description: '',
          },
          AutoAddedVariableNames: {
            filePath: '/storefront.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'AutoAddedVariableNames',
            value: "'country' | 'language'",
            description: '',
          },
          EmptyVariables: {
            filePath: '/storefront.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'EmptyVariables',
            value: '{[key: string]: never}',
            description: '',
            members: [],
          },
          GenericVariables: {
            filePath: '/storefront.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'GenericVariables',
            value: "ExecutionArgs['variableValues']",
            description: '',
          },
          StorefrontQueries: {
            filePath: '/storefront.ts',
            name: 'StorefrontQueries',
            description:
              'Maps all the queries found in the project to variables and return types.',
            members: [],
            value:
              "export interface StorefrontQueries {\n  // Example of how a generated query type looks like:\n  // '#graphql query q1 {...}': {return: Q1Query; variables: Q1QueryVariables};\n}",
          },
          StorefrontQuerySecondParam: {
            filePath: '/storefront.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'StorefrontQuerySecondParam',
            value:
              "(RawGqlString extends keyof StorefrontQueries\n  ? StorefrontCommonOptions<StorefrontQueries[RawGqlString]['variables']>\n  : StorefrontCommonOptions<GenericVariables>) & {cache?: CachingStrategy}",
            description: '',
          },
          StorefrontCommonOptions: {
            filePath: '/storefront.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'StorefrontCommonOptions',
            value:
              '{\n  headers?: HeadersInit;\n  storefrontApiVersion?: string;\n} & (IsOptionalVariables<{variables: Variables}> extends true\n  ? {variables?: Variables}\n  : {variables: Variables})',
            description: '',
          },
          CachingStrategy: {
            filePath: '/cache/strategies.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'CachingStrategy',
            value: 'AllCacheOptions',
            description:
              'Use the `CachingStrategy` to define a custom caching mechanism for your data. Or use one of the pre-defined caching strategies: CacheNone, CacheShort, CacheLong.',
            members: [
              {
                filePath: '/cache/strategies.ts',
                syntaxKind: 'PropertySignature',
                name: 'mode',
                value: 'string',
                description:
                  'The caching mode, generally `public`, `private`, or `no-store`.',
                isOptional: true,
              },
              {
                filePath: '/cache/strategies.ts',
                syntaxKind: 'PropertySignature',
                name: 'maxAge',
                value: 'number',
                description:
                  'The maximum amount of time in seconds that a resource will be considered fresh. See `max-age` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#:~:text=Response%20Directives-,max%2Dage,-The%20max%2Dage).',
                isOptional: true,
              },
              {
                filePath: '/cache/strategies.ts',
                syntaxKind: 'PropertySignature',
                name: 'staleWhileRevalidate',
                value: 'number',
                description:
                  'Indicate that the cache should serve the stale response in the background while revalidating the cache. See `stale-while-revalidate` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#stale-while-revalidate).',
                isOptional: true,
              },
              {
                filePath: '/cache/strategies.ts',
                syntaxKind: 'PropertySignature',
                name: 'sMaxAge',
                value: 'number',
                description:
                  'Similar to `maxAge` but specific to shared caches. See `s-maxage` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#s-maxage).',
                isOptional: true,
              },
              {
                filePath: '/cache/strategies.ts',
                syntaxKind: 'PropertySignature',
                name: 'staleIfError',
                value: 'number',
                description:
                  'Indicate that the cache should serve the stale response if an error occurs while revalidating the cache. See `stale-if-error` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#stale-if-error).',
                isOptional: true,
              },
            ],
          },
          StorefrontMutations: {
            filePath: '/storefront.ts',
            name: 'StorefrontMutations',
            description:
              'Maps all the mutations found in the project to variables and return types.',
            members: [],
            value:
              "export interface StorefrontMutations {\n  // Example of how a generated mutation type looks like:\n  // '#graphql mutation m1 {...}': {return: M1Mutation; variables: M1MutationVariables};\n}",
          },
          StorefrontMutateSecondParam: {
            filePath: '/storefront.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'StorefrontMutateSecondParam',
            value:
              "RawGqlString extends keyof StorefrontMutations\n  ? StorefrontCommonOptions<StorefrontMutations[RawGqlString]['variables']>\n  : StorefrontCommonOptions<GenericVariables>",
            description: '',
          },
          NoStoreStrategy: {
            filePath: '/cache/strategies.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'NoStoreStrategy',
            value: '{\n  mode: string;\n}',
            description: '',
            members: [
              {
                filePath: '/cache/strategies.ts',
                syntaxKind: 'PropertySignature',
                name: 'mode',
                value: 'string',
                description: '',
              },
            ],
          },
          AllCacheOptions: {
            filePath: '/cache/strategies.ts',
            name: 'AllCacheOptions',
            description: 'Override options for a cache strategy.',
            members: [
              {
                filePath: '/cache/strategies.ts',
                syntaxKind: 'PropertySignature',
                name: 'mode',
                value: 'string',
                description:
                  'The caching mode, generally `public`, `private`, or `no-store`.',
                isOptional: true,
              },
              {
                filePath: '/cache/strategies.ts',
                syntaxKind: 'PropertySignature',
                name: 'maxAge',
                value: 'number',
                description:
                  'The maximum amount of time in seconds that a resource will be considered fresh. See `max-age` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#:~:text=Response%20Directives-,max%2Dage,-The%20max%2Dage).',
                isOptional: true,
              },
              {
                filePath: '/cache/strategies.ts',
                syntaxKind: 'PropertySignature',
                name: 'staleWhileRevalidate',
                value: 'number',
                description:
                  'Indicate that the cache should serve the stale response in the background while revalidating the cache. See `stale-while-revalidate` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#stale-while-revalidate).',
                isOptional: true,
              },
              {
                filePath: '/cache/strategies.ts',
                syntaxKind: 'PropertySignature',
                name: 'sMaxAge',
                value: 'number',
                description:
                  'Similar to `maxAge` but specific to shared caches. See `s-maxage` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#s-maxage).',
                isOptional: true,
              },
              {
                filePath: '/cache/strategies.ts',
                syntaxKind: 'PropertySignature',
                name: 'staleIfError',
                value: 'number',
                description:
                  'Indicate that the cache should serve the stale response if an error occurs while revalidating the cache. See `stale-if-error` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#stale-if-error).',
                isOptional: true,
              },
            ],
            value:
              'export interface AllCacheOptions {\n  /**\n   * The caching mode, generally `public`, `private`, or `no-store`.\n   */\n  mode?: string;\n  /**\n   * The maximum amount of time in seconds that a resource will be considered fresh. See `max-age` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#:~:text=Response%20Directives-,max%2Dage,-The%20max%2Dage).\n   */\n  maxAge?: number;\n  /**\n   * Indicate that the cache should serve the stale response in the background while revalidating the cache. See `stale-while-revalidate` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#stale-while-revalidate).\n   */\n  staleWhileRevalidate?: number;\n  /**\n   * Similar to `maxAge` but specific to shared caches. See `s-maxage` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#s-maxage).\n   */\n  sMaxAge?: number;\n  /**\n   * Indicate that the cache should serve the stale response if an error occurs while revalidating the cache. See `stale-if-error` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#stale-if-error).\n   */\n  staleIfError?: number;\n}',
          },
        },
      },
      {
        title: 'Returns',
        description:
          'The handler returns the following default methods. Any [custom](/docs/api/hydrogen/2023-07/utilities/createcarthandler#example-custom-methods) or overwritten methods will also be available in the returned cart instance.',
        type: 'HydrogenCartForDocs',
        typeDefinitions: {
          HydrogenCartForDocs: {
            filePath: '/cart/createCartHandler.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'HydrogenCartForDocs',
            value:
              "{\n  /**\n   * Adds items to the cart.\n   * If the cart doesn't exist, a new one will be created.\n   */\n  addLines?: CartLinesAddFunction;\n  /**\n   * Creates a new cart.\n   */\n  create?: CartCreateFunction;\n  /**\n   * Removes a custom field (metafield) from the cart.\n   */\n  deleteMetafield?: CartMetafieldDeleteFunction;\n  /**\n   * Retrieves the cart information.\n   */\n  get?: CartGetFunction;\n  /**\n   * Retrieves the unique identifier of the cart.\n   * By default, it gets the ID from the request cookie.\n   */\n  getCartId?: () => string | undefined;\n  /**\n   * Removes items from the cart.\n   */\n  removeLines?: CartLinesRemoveFunction;\n  /**\n   * Sets the unique identifier of the cart.\n   * By default, it sets the ID in the header cookie.\n   */\n  setCartId?: (cartId: string) => Headers;\n  /**\n   * Adds extra information (metafields) to the cart.\n   * If the cart doesn't exist, a new one will be created.\n   */\n  setMetafields?: CartMetafieldsSetFunction;\n  /**\n   * Updates additional information (attributes) in the cart.\n   */\n  updateAttributes?: CartAttributesUpdateFunction;\n  /**\n   * Updates the buyer's information in the cart.\n   * If the cart doesn't exist, a new one will be created.\n   */\n  updateBuyerIdentity?: CartBuyerIdentityUpdateFunction;\n  /**\n   * Updates discount codes in the cart.\n   */\n  updateDiscountCodes?: CartDiscountCodesUpdateFunction;\n  /**\n   * Updates items in the cart.\n   */\n  updateLines?: CartLinesUpdateFunction;\n  /**\n   * Updates the note in the cart.\n   * If the cart doesn't exist, a new one will be created.\n   */\n  updateNote?: CartNoteUpdateFunction;\n  /**\n   * Updates the selected delivery options in the cart.\n   * Only available for carts associated with a customer access token.\n   */\n  updateSelectedDeliveryOption?: CartSelectedDeliveryOptionsUpdateFunction;\n}",
            description: '',
            members: [
              {
                filePath: '/cart/createCartHandler.ts',
                syntaxKind: 'PropertySignature',
                name: 'addLines',
                value: 'CartLinesAddFunction',
                description:
                  "Adds items to the cart. If the cart doesn't exist, a new one will be created.",
                isOptional: true,
              },
              {
                filePath: '/cart/createCartHandler.ts',
                syntaxKind: 'PropertySignature',
                name: 'create',
                value: 'CartCreateFunction',
                description: 'Creates a new cart.',
                isOptional: true,
              },
              {
                filePath: '/cart/createCartHandler.ts',
                syntaxKind: 'PropertySignature',
                name: 'deleteMetafield',
                value: 'CartMetafieldDeleteFunction',
                description:
                  'Removes a custom field (metafield) from the cart.',
                isOptional: true,
              },
              {
                filePath: '/cart/createCartHandler.ts',
                syntaxKind: 'PropertySignature',
                name: 'get',
                value: 'CartGetFunction',
                description: 'Retrieves the cart information.',
                isOptional: true,
              },
              {
                filePath: '/cart/createCartHandler.ts',
                syntaxKind: 'PropertySignature',
                name: 'getCartId',
                value: '() => string',
                description:
                  'Retrieves the unique identifier of the cart. By default, it gets the ID from the request cookie.',
                isOptional: true,
              },
              {
                filePath: '/cart/createCartHandler.ts',
                syntaxKind: 'PropertySignature',
                name: 'removeLines',
                value: 'CartLinesRemoveFunction',
                description: 'Removes items from the cart.',
                isOptional: true,
              },
              {
                filePath: '/cart/createCartHandler.ts',
                syntaxKind: 'PropertySignature',
                name: 'setCartId',
                value: '(cartId: string) => Headers',
                description:
                  'Sets the unique identifier of the cart. By default, it sets the ID in the header cookie.',
                isOptional: true,
              },
              {
                filePath: '/cart/createCartHandler.ts',
                syntaxKind: 'PropertySignature',
                name: 'setMetafields',
                value: 'CartMetafieldsSetFunction',
                description:
                  "Adds extra information (metafields) to the cart. If the cart doesn't exist, a new one will be created.",
                isOptional: true,
              },
              {
                filePath: '/cart/createCartHandler.ts',
                syntaxKind: 'PropertySignature',
                name: 'updateAttributes',
                value: 'CartAttributesUpdateFunction',
                description:
                  'Updates additional information (attributes) in the cart.',
                isOptional: true,
              },
              {
                filePath: '/cart/createCartHandler.ts',
                syntaxKind: 'PropertySignature',
                name: 'updateBuyerIdentity',
                value: 'CartBuyerIdentityUpdateFunction',
                description:
                  "Updates the buyer's information in the cart. If the cart doesn't exist, a new one will be created.",
                isOptional: true,
              },
              {
                filePath: '/cart/createCartHandler.ts',
                syntaxKind: 'PropertySignature',
                name: 'updateDiscountCodes',
                value: 'CartDiscountCodesUpdateFunction',
                description: 'Updates discount codes in the cart.',
                isOptional: true,
              },
              {
                filePath: '/cart/createCartHandler.ts',
                syntaxKind: 'PropertySignature',
                name: 'updateLines',
                value: 'CartLinesUpdateFunction',
                description: 'Updates items in the cart.',
                isOptional: true,
              },
              {
                filePath: '/cart/createCartHandler.ts',
                syntaxKind: 'PropertySignature',
                name: 'updateNote',
                value: 'CartNoteUpdateFunction',
                description:
                  "Updates the note in the cart. If the cart doesn't exist, a new one will be created.",
                isOptional: true,
              },
              {
                filePath: '/cart/createCartHandler.ts',
                syntaxKind: 'PropertySignature',
                name: 'updateSelectedDeliveryOption',
                value: 'CartSelectedDeliveryOptionsUpdateFunction',
                description:
                  'Updates the selected delivery options in the cart. Only available for carts associated with a customer access token.',
                isOptional: true,
              },
            ],
          },
          CartLinesAddFunction: {
            filePath: '/cart/queries/cartLinesAddDefault.ts',
            name: 'CartLinesAddFunction',
            description: '',
            params: [
              {
                name: 'lines',
                description: '',
                value: 'CartLineInput[]',
                filePath: '/cart/queries/cartLinesAddDefault.ts',
              },
              {
                name: 'optionalParams',
                description: '',
                value: 'CartOptionalInput',
                isOptional: true,
                filePath: '/cart/queries/cartLinesAddDefault.ts',
              },
            ],
            returns: {
              filePath: '/cart/queries/cartLinesAddDefault.ts',
              description: '',
              name: 'Promise<CartQueryData>',
              value: 'Promise<CartQueryData>',
            },
            value:
              'export type CartLinesAddFunction = (\n  lines: CartLineInput[],\n  optionalParams?: CartOptionalInput,\n) => Promise<CartQueryData>;',
          },
          CartLineInput: {
            description: '',
            name: 'CartLineInput',
            value: 'CartLineInput',
            members: [],
            override:
              '[CartLineInput](/docs/api/storefront/2023-07/input-objects/CartLineInput) - Storefront API type',
          },
          CartOptionalInput: {
            filePath: '/cart/queries/cart-types.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'CartOptionalInput',
            value:
              "{\n  /**\n   * The cart id.\n   * @default cart.getCartId();\n   */\n  cartId?: Scalars['ID'];\n  /**\n   * The country code.\n   * @default storefront.i18n.country\n   */\n  country?: CountryCode;\n  /**\n   * The language code.\n   * @default storefront.i18n.language\n   */\n  language?: LanguageCode;\n}",
            description: '',
            members: [
              {
                filePath: '/cart/queries/cart-types.ts',
                syntaxKind: 'PropertySignature',
                name: 'cartId',
                value: 'string',
                description: 'The cart id.',
                isOptional: true,
                defaultValue: 'cart.getCartId();',
              },
              {
                filePath: '/cart/queries/cart-types.ts',
                syntaxKind: 'PropertySignature',
                name: 'country',
                value: 'CountryCode',
                description: 'The country code.',
                isOptional: true,
                defaultValue: 'storefront.i18n.country',
              },
              {
                filePath: '/cart/queries/cart-types.ts',
                syntaxKind: 'PropertySignature',
                name: 'language',
                value: 'LanguageCode',
                description: 'The language code.',
                isOptional: true,
                defaultValue: 'storefront.i18n.language',
              },
            ],
          },
          CartQueryData: {
            filePath: '/cart/queries/cart-types.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'CartQueryData',
            value:
              '{\n  cart: Cart;\n  errors?:\n    | CartUserError[]\n    | MetafieldsSetUserError[]\n    | MetafieldDeleteUserError[];\n}',
            description: '',
            members: [
              {
                filePath: '/cart/queries/cart-types.ts',
                syntaxKind: 'PropertySignature',
                name: 'cart',
                value: 'Cart',
                description: '',
              },
              {
                filePath: '/cart/queries/cart-types.ts',
                syntaxKind: 'PropertySignature',
                name: 'errors',
                value:
                  'CartUserError[] | MetafieldsSetUserError[] | MetafieldDeleteUserError[]',
                description: '',
                isOptional: true,
              },
            ],
          },
          Cart: {
            description: '',
            name: 'Cart',
            value: 'Cart',
            members: [],
            override:
              '[Cart](/docs/api/storefront/2023-07/objects/Cart) - Storefront API type',
          },
          CartUserError: {
            description: '',
            name: 'CartUserError',
            value: 'CartUserError',
            members: [],
            override:
              '[CartUserError](/docs/api/storefront/2023-07/objects/CartUserError) - Storefront API type',
          },
          MetafieldsSetUserError: {
            description: '',
            name: 'MetafieldsSetUserError',
            value: 'MetafieldsSetUserError',
            members: [],
            override:
              '[MetafieldsSetUserError](/docs/api/storefront/2023-07/objects/MetafieldsSetUserError) - Storefront API type',
          },
          MetafieldDeleteUserError: {
            description: '',
            name: 'MetafieldDeleteUserError',
            value: 'MetafieldDeleteUserError',
            members: [],
            override:
              '[MetafieldDeleteUserError](/docs/api/storefront/2023-07/objects/MetafieldDeleteUserError) - Storefront API type',
          },
          CartCreateFunction: {
            filePath: '/cart/queries/cartCreateDefault.ts',
            name: 'CartCreateFunction',
            description: '',
            params: [
              {
                name: 'input',
                description: '',
                value: 'CartInput',
                filePath: '/cart/queries/cartCreateDefault.ts',
              },
              {
                name: 'optionalParams',
                description: '',
                value: 'CartOptionalInput',
                isOptional: true,
                filePath: '/cart/queries/cartCreateDefault.ts',
              },
            ],
            returns: {
              filePath: '/cart/queries/cartCreateDefault.ts',
              description: '',
              name: 'Promise<CartQueryData>',
              value: 'Promise<CartQueryData>',
            },
            value:
              'export type CartCreateFunction = (\n  input: CartInput,\n  optionalParams?: CartOptionalInput,\n) => Promise<CartQueryData>;',
          },
          CartInput: {
            description: '',
            name: 'CartInput',
            value: 'CartInput',
            members: [],
            override:
              '[CartInput](/docs/api/storefront/2023-07/input-objects/CartInput) - Storefront API type',
          },
          CartMetafieldDeleteFunction: {
            filePath: '/cart/queries/cartMetafieldDeleteDefault.ts',
            name: 'CartMetafieldDeleteFunction',
            description: '',
            params: [
              {
                name: 'key',
                description: '',
                value: 'string',
                filePath: '/cart/queries/cartMetafieldDeleteDefault.ts',
              },
              {
                name: 'optionalParams',
                description: '',
                value: 'CartOptionalInput',
                isOptional: true,
                filePath: '/cart/queries/cartMetafieldDeleteDefault.ts',
              },
            ],
            returns: {
              filePath: '/cart/queries/cartMetafieldDeleteDefault.ts',
              description: '',
              name: 'Promise<CartQueryData>',
              value: 'Promise<CartQueryData>',
            },
            value:
              "export type CartMetafieldDeleteFunction = (\n  key: Scalars['String'],\n  optionalParams?: CartOptionalInput,\n) => Promise<CartQueryData>;",
          },
          CartGetFunction: {
            filePath: '/cart/queries/cartGetDefault.ts',
            name: 'CartGetFunction',
            description: '',
            params: [
              {
                name: 'cartInput',
                description: '',
                value: 'CartGetProps',
                isOptional: true,
                filePath: '/cart/queries/cartGetDefault.ts',
              },
            ],
            returns: {
              filePath: '/cart/queries/cartGetDefault.ts',
              description: '',
              name: 'Promise<Cart | null>',
              value: 'Promise<Cart | null>',
            },
            value:
              'export type CartGetFunction = (\n  cartInput?: CartGetProps,\n) => Promise<Cart | null>;',
          },
          CartGetProps: {
            filePath: '/cart/queries/cartGetDefault.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'CartGetProps',
            value:
              '{\n  /**\n   * The cart ID.\n   * @default cart.getCartId();\n   */\n  cartId?: string;\n  /**\n   * The country code.\n   * @default storefront.i18n.country\n   */\n  country?: CountryCode;\n  /**\n   * The language code.\n   * @default storefront.i18n.language\n   */\n  language?: LanguageCode;\n  /**\n   * The number of cart lines to be returned.\n   * @default 100\n   */\n  numCartLines?: number;\n}',
            description: '',
            members: [
              {
                filePath: '/cart/queries/cartGetDefault.ts',
                syntaxKind: 'PropertySignature',
                name: 'cartId',
                value: 'string',
                description: 'The cart ID.',
                isOptional: true,
                defaultValue: 'cart.getCartId();',
              },
              {
                filePath: '/cart/queries/cartGetDefault.ts',
                syntaxKind: 'PropertySignature',
                name: 'country',
                value: 'CountryCode',
                description: 'The country code.',
                isOptional: true,
                defaultValue: 'storefront.i18n.country',
              },
              {
                filePath: '/cart/queries/cartGetDefault.ts',
                syntaxKind: 'PropertySignature',
                name: 'language',
                value: 'LanguageCode',
                description: 'The language code.',
                isOptional: true,
                defaultValue: 'storefront.i18n.language',
              },
              {
                filePath: '/cart/queries/cartGetDefault.ts',
                syntaxKind: 'PropertySignature',
                name: 'numCartLines',
                value: 'number',
                description: 'The number of cart lines to be returned.',
                isOptional: true,
                defaultValue: '100',
              },
            ],
          },
          CartLinesRemoveFunction: {
            filePath: '/cart/queries/cartLinesRemoveDefault.ts',
            name: 'CartLinesRemoveFunction',
            description: '',
            params: [
              {
                name: 'lineIds',
                description: '',
                value: 'string[]',
                filePath: '/cart/queries/cartLinesRemoveDefault.ts',
              },
              {
                name: 'optionalParams',
                description: '',
                value: 'CartOptionalInput',
                isOptional: true,
                filePath: '/cart/queries/cartLinesRemoveDefault.ts',
              },
            ],
            returns: {
              filePath: '/cart/queries/cartLinesRemoveDefault.ts',
              description: '',
              name: 'Promise<CartQueryData>',
              value: 'Promise<CartQueryData>',
            },
            value:
              'export type CartLinesRemoveFunction = (\n  lineIds: string[],\n  optionalParams?: CartOptionalInput,\n) => Promise<CartQueryData>;',
          },
          Headers: {
            description: '',
            name: 'Headers',
            value: 'Headers',
            members: [],
            override:
              '[Headers](https://developer.mozilla.org/en-US/docs/Web/API/Headers) - Web API',
          },
          CartMetafieldsSetFunction: {
            filePath: '/cart/queries/cartMetafieldsSetDefault.ts',
            name: 'CartMetafieldsSetFunction',
            description: '',
            params: [
              {
                name: 'metafields',
                description: '',
                value: 'MetafieldWithoutOwnerId[]',
                filePath: '/cart/queries/cartMetafieldsSetDefault.ts',
              },
              {
                name: 'optionalParams',
                description: '',
                value: 'CartOptionalInput',
                isOptional: true,
                filePath: '/cart/queries/cartMetafieldsSetDefault.ts',
              },
            ],
            returns: {
              filePath: '/cart/queries/cartMetafieldsSetDefault.ts',
              description: '',
              name: 'Promise<CartQueryData>',
              value: 'Promise<CartQueryData>',
            },
            value:
              'export type CartMetafieldsSetFunction = (\n  metafields: MetafieldWithoutOwnerId[],\n  optionalParams?: CartOptionalInput,\n) => Promise<CartQueryData>;',
          },
          MetafieldWithoutOwnerId: {
            description: '',
            name: 'MetafieldWithoutOwnerId',
            value: 'MetafieldWithoutOwnerId',
            members: [],
            override:
              'Same as [CartMetafieldsSetInput](https://shopify.dev/docs/api/storefront/2023-07/input-objects/CartMetafieldsSetInput) Storefront API type but without `ownerId`. `ownerId` is always set to the cart id.',
          },
          CartAttributesUpdateFunction: {
            filePath: '/cart/queries/cartAttributesUpdateDefault.ts',
            name: 'CartAttributesUpdateFunction',
            description: '',
            params: [
              {
                name: 'attributes',
                description: '',
                value: 'AttributeInput[]',
                filePath: '/cart/queries/cartAttributesUpdateDefault.ts',
              },
              {
                name: 'optionalParams',
                description: '',
                value: 'CartOptionalInput',
                isOptional: true,
                filePath: '/cart/queries/cartAttributesUpdateDefault.ts',
              },
            ],
            returns: {
              filePath: '/cart/queries/cartAttributesUpdateDefault.ts',
              description: '',
              name: 'Promise<CartQueryData>',
              value: 'Promise<CartQueryData>',
            },
            value:
              'export type CartAttributesUpdateFunction = (\n  attributes: AttributeInput[],\n  optionalParams?: CartOptionalInput,\n) => Promise<CartQueryData>;',
          },
          AttributeInput: {
            description: '',
            name: 'AttributeInput',
            value: 'AttributeInput',
            members: [],
            override:
              '[AttributeInput](/docs/api/storefront/2023-07/input-objects/AttributeInput) - Storefront API type',
          },
          CartBuyerIdentityUpdateFunction: {
            filePath: '/cart/queries/cartBuyerIdentityUpdateDefault.ts',
            name: 'CartBuyerIdentityUpdateFunction',
            description: '',
            params: [
              {
                name: 'buyerIdentity',
                description: '',
                value: 'CartBuyerIdentityInput',
                filePath: '/cart/queries/cartBuyerIdentityUpdateDefault.ts',
              },
              {
                name: 'optionalParams',
                description: '',
                value: 'CartOptionalInput',
                isOptional: true,
                filePath: '/cart/queries/cartBuyerIdentityUpdateDefault.ts',
              },
            ],
            returns: {
              filePath: '/cart/queries/cartBuyerIdentityUpdateDefault.ts',
              description: '',
              name: 'Promise<CartQueryData>',
              value: 'Promise<CartQueryData>',
            },
            value:
              'export type CartBuyerIdentityUpdateFunction = (\n  buyerIdentity: CartBuyerIdentityInput,\n  optionalParams?: CartOptionalInput,\n) => Promise<CartQueryData>;',
          },
          CartBuyerIdentityInput: {
            description: '',
            name: 'CartBuyerIdentityInput',
            value: 'CartBuyerIdentityInput',
            members: [],
            override:
              '[CartBuyerIdentityInput](/docs/api/storefront/2023-07/input-objects/CartBuyerIdentityInput) - Storefront API type',
          },
          CartDiscountCodesUpdateFunction: {
            filePath: '/cart/queries/cartDiscountCodesUpdateDefault.ts',
            name: 'CartDiscountCodesUpdateFunction',
            description: '',
            params: [
              {
                name: 'discountCodes',
                description: '',
                value: 'string[]',
                filePath: '/cart/queries/cartDiscountCodesUpdateDefault.ts',
              },
              {
                name: 'optionalParams',
                description: '',
                value: 'CartOptionalInput',
                isOptional: true,
                filePath: '/cart/queries/cartDiscountCodesUpdateDefault.ts',
              },
            ],
            returns: {
              filePath: '/cart/queries/cartDiscountCodesUpdateDefault.ts',
              description: '',
              name: 'Promise<CartQueryData>',
              value: 'Promise<CartQueryData>',
            },
            value:
              'export type CartDiscountCodesUpdateFunction = (\n  discountCodes: string[],\n  optionalParams?: CartOptionalInput,\n) => Promise<CartQueryData>;',
          },
          CartLinesUpdateFunction: {
            filePath: '/cart/queries/cartLinesUpdateDefault.ts',
            name: 'CartLinesUpdateFunction',
            description: '',
            params: [
              {
                name: 'lines',
                description: '',
                value: 'CartLineUpdateInput[]',
                filePath: '/cart/queries/cartLinesUpdateDefault.ts',
              },
              {
                name: 'optionalParams',
                description: '',
                value: 'CartOptionalInput',
                isOptional: true,
                filePath: '/cart/queries/cartLinesUpdateDefault.ts',
              },
            ],
            returns: {
              filePath: '/cart/queries/cartLinesUpdateDefault.ts',
              description: '',
              name: 'Promise<CartQueryData>',
              value: 'Promise<CartQueryData>',
            },
            value:
              'export type CartLinesUpdateFunction = (\n  lines: CartLineUpdateInput[],\n  optionalParams?: CartOptionalInput,\n) => Promise<CartQueryData>;',
          },
          CartLineUpdateInput: {
            description: '',
            name: 'CartLineUpdateInput',
            value: 'CartLineUpdateInput',
            members: [],
            override:
              '[CartLineUpdateInput](/docs/api/storefront/2023-07/input-objects/CartLineUpdateInput) - Storefront API type',
          },
          CartNoteUpdateFunction: {
            filePath: '/cart/queries/cartNoteUpdateDefault.ts',
            name: 'CartNoteUpdateFunction',
            description: '',
            params: [
              {
                name: 'note',
                description: '',
                value: 'string',
                filePath: '/cart/queries/cartNoteUpdateDefault.ts',
              },
              {
                name: 'optionalParams',
                description: '',
                value: 'CartOptionalInput',
                isOptional: true,
                filePath: '/cart/queries/cartNoteUpdateDefault.ts',
              },
            ],
            returns: {
              filePath: '/cart/queries/cartNoteUpdateDefault.ts',
              description: '',
              name: 'Promise<CartQueryData>',
              value: 'Promise<CartQueryData>',
            },
            value:
              'export type CartNoteUpdateFunction = (\n  note: string,\n  optionalParams?: CartOptionalInput,\n) => Promise<CartQueryData>;',
          },
          CartSelectedDeliveryOptionsUpdateFunction: {
            filePath:
              '/cart/queries/cartSelectedDeliveryOptionsUpdateDefault.ts',
            name: 'CartSelectedDeliveryOptionsUpdateFunction',
            description: '',
            params: [
              {
                name: 'selectedDeliveryOptions',
                description: '',
                value: 'CartSelectedDeliveryOptionInput[]',
                filePath:
                  '/cart/queries/cartSelectedDeliveryOptionsUpdateDefault.ts',
              },
              {
                name: 'optionalParams',
                description: '',
                value: 'CartOptionalInput',
                isOptional: true,
                filePath:
                  '/cart/queries/cartSelectedDeliveryOptionsUpdateDefault.ts',
              },
            ],
            returns: {
              filePath:
                '/cart/queries/cartSelectedDeliveryOptionsUpdateDefault.ts',
              description: '',
              name: 'Promise<CartQueryData>',
              value: 'Promise<CartQueryData>',
            },
            value:
              'export type CartSelectedDeliveryOptionsUpdateFunction = (\n  selectedDeliveryOptions: CartSelectedDeliveryOptionInput[],\n  optionalParams?: CartOptionalInput,\n) => Promise<CartQueryData>;',
          },
          CartSelectedDeliveryOptionInput: {
            description: '',
            name: 'CartSelectedDeliveryOptionInput',
            value: 'CartSelectedDeliveryOptionInput',
            members: [],
            override:
              '[CartSelectedDeliveryOptionInput](/docs/api/storefront/2023-07/input-objects/CartSelectedDeliveryOptionInput) - Storefront API type',
          },
        },
      },
    ],
    examples: {
      description:
        'Examples of various ways to use the `createCartHandler` utility.',
      exampleGroups: [
        {
          title: 'Cart fragments',
          examples: [
            {
              description:
                'Use `cartQueryFragment` and `cartMutateFragment` to change the cart data the queries will return.',
              codeblock: {
                title: 'Example',
                tabs: [
                  {
                    title: 'JavaScript',
                    code: "import {\n  createCartHandler,\n  cartGetIdDefault,\n  cartSetIdDefault,\n} from '@shopify/hydrogen';\n\n// Override cart fragments\nconst cart = createCartHandler({\n  storefront,\n  getCartId: cartGetIdDefault(request.headers),\n  setCartId: cartSetIdDefault(),\n  cartQueryFragment: CART_QUERY_FRAGMENT,\n  cartMutateFragment: CART_MUTATE_FRAGMENT,\n});\n\n// cartQueryFragment requirements:\n// - Must be named `CartApiQuery`\n// - Only have access to the following query variables:\n//   - $cartId: ID!\n//   - $country: CountryCode\n//   - $language: LanguageCode\n//   - $numCartLines: Int\nconst CART_QUERY_FRAGMENT = `#graphql\n  fragment CartApiQuery on Cart {\n    id\n    totalQuantity\n    checkoutUrl\n    note\n  }\n`;\n\n// cartMutateFragment requirements:\n// - Must be named `CartApiMutation`\n// - Only have access to the following query variables:\n//   - $cartId: ID!\n//   - $country: CountryCode\n//   - $language: LanguageCode\nconst CART_MUTATE_FRAGMENT = `#graphql\n  fragment CartApiMutation on Cart {\n    id\n    totalQuantity\n    checkoutUrl\n    lines(first: 100) {\n      edges {\n        node {\n          id\n          quantity\n        }\n      }\n    }\n  }\n`;\n",
                    language: 'js',
                  },
                ],
              },
            },
          ],
        },
        {
          title: 'Custom methods',
          examples: [
            {
              description:
                'Define or override methods in your cart handler instance. Note that for addLines, updateDiscountCodes, updateBuyerIdentity, updateNote, updateAttributes, and setMetafields, if you override any of these methods, a new cart will not be created unless you implement the cart creation logic in your overriding method.',
              codeblock: {
                title: 'Example',
                tabs: [
                  {
                    title: 'JavaScript',
                    code: "import {\n  createCartHandler,\n  cartGetIdDefault,\n  cartSetIdDefault,\n  cartLinesAddDefault,\n  cartLinesRemoveDefault,\n} from '@shopify/hydrogen';\n\nconst cartQueryOptions = {\n  storefront,\n  getCartId: cartGetIdDefault(request.headers),\n};\n\nconst cart = createCartHandler({\n  storefront,\n  getCartId: cartGetIdDefault(request.headers),\n  setCartId: cartSetIdDefault(),\n  customMethods__unstable: {\n    editInLine: async (addLines, removeLineIds, optionalParams) =&gt; {\n      // Using Hydrogen default cart query methods\n      await cartLinesAddDefault(cartQueryOptions)(addLines, optionalParams);\n      return await cartLinesRemoveDefault(cartQueryOptions)(\n        removeLineIds,\n        optionalParams,\n      );\n    },\n    addLines: async (lines, optionalParams) =&gt; {\n      // With your own Storefront API graphql query\n      return await storefront.mutate(CART_LINES_ADD_MUTATION, {\n        variables: {\n          id: optionalParams.cartId,\n          lines,\n        },\n      });\n    },\n  },\n});\n\n// Use custom method editInLine that delete and add items in one method\ncart.editInLine(\n  ['123'],\n  [\n    {\n      merchandiseId: 'gid://shopify/ProductVariant/456789123',\n      quantity: 1,\n    },\n  ],\n);\n\n// Use overridden cart.addLines\nconst result = await cart.addLines(\n  [\n    {\n      merchandiseId: 'gid://shopify/ProductVariant/123456789',\n      quantity: 1,\n    },\n  ],\n  {\n    cartId: 'c-123',\n  },\n);\n// Output of result:\n// {\n//   cartLinesAdd: {\n//     cart: {\n//       id: 'c-123',\n//       totalQuantity: 1\n//     },\n//     errors: []\n//   }\n// }\n\nconst CART_LINES_ADD_MUTATION = `#graphql\n  mutation CartLinesAdd(\n    $cartId: ID!\n    $lines: [CartLineInput!]!\n    $country: CountryCode = ZZ\n    $language: LanguageCode\n  ) @inContext(country: $country, language: $language) {\n    cartLinesAdd(cartId: $cartId, lines: $lines) {\n      cart {\n        id\n        totalQuantity\n      }\n      errors: userErrors {\n        message\n        field\n        code\n      }\n    }\n  }\n`;\n",
                    language: 'js',
                  },
                ],
              },
            },
          ],
        },
        {
          title: 'Cart instance usage',
          examples: [
            {
              description:
                'Add items to the cart. If the cart does not exist, a new cart will be created.',
              codeblock: {
                title: 'cart.addLines',
                tabs: [
                  {
                    title: 'JavaScript',
                    code: "export async function action({context}) {\n  const {cart} = context;\n\n  // Usage\n  const result = await cart.addLines(\n    [\n      {\n        merchandiseId: 'gid://shopify/ProductVariant/123456789',\n        quantity: 1,\n      },\n    ],\n    // Optional parameters\n    {\n      cartId: '123', // override the cart id\n      country: 'US', // override the country code to 'US'\n      language: 'EN', // override the language code to 'EN'\n    },\n  );\n}\n\n// Output of result:\n// {\n//   cart: {\n//     id: 'c1-123',\n//     totalQuantity: 1\n//   },\n//   errors: []\n// }\n",
                    language: 'js',
                  },
                ],
              },
            },
            {
              description: 'Create a new cart.',
              codeblock: {
                title: 'cart.create',
                tabs: [
                  {
                    title: 'JavaScript',
                    code: "export async function action({context}) {\n  const {cart} = context;\n\n  // Usage\n  const result = await cart.create(\n    {\n      lines: [\n        {\n          merchandiseId: 'gid://shopify/ProductVariant/123456789',\n          quantity: 1,\n        },\n      ],\n      discountCodes: ['FREE_SHIPPING'],\n    },\n    // Optional parameters\n    {\n      cartId: '123', // override the cart id\n      country: 'US', // override the country code to 'US'\n      language: 'EN', // override the language code to 'EN'\n    },\n  );\n\n  // Output of result:\n  // {\n  //   cart: {\n  //     id: 'c1-123',\n  //     totalQuantity: 1,\n  //     discountCodes: [{ code: 'FREE_SHIPPING'}]\n  //   },\n  //   errors: []\n  // }\n}\n",
                    language: 'js',
                  },
                ],
              },
            },
            {
              description:
                'Delete extra information (metafield) from the cart.',
              codeblock: {
                title: 'cart.deleteMetafield',
                tabs: [
                  {
                    title: 'JavaScript',
                    code: "export async function action({context}) {\n  const {cart} = context;\n\n  // Usage\n  const result = await cart.setMetafields(\n    [\n      {\n        key: 'custom.gift',\n        type: 'boolean',\n        value: 'true',\n      },\n    ],\n    // Optional parameters\n    {\n      cartId: '123', // override the cart id\n    },\n  );\n\n  const result2 = await cart.deleteMetafield(\n    'custom.gift',\n    // Optional parameters\n    {\n      cartId: '123', // override the cart id\n    },\n  );\n}\n\n// server.js\n// To query for metafields, use the `cartQueryFragment` option when creating the cart handler.\nimport {\n  createCartHandler,\n  cartGetIdDefault,\n  cartSetIdDefault,\n} from '@shopify/hydrogen';\n\nconst cart = createCartHandler({\n  storefront,\n  getCartId: cartGetIdDefault(request.headers),\n  setCartId: cartSetIdDefault(),\n  cartQueryFragment: CART_QUERY_FRAGMENT,\n});\n\nconst CART_QUERY_FRAGMENT = `#graphql\n  fragment CartApiQuery on Cart {\n    id\n    metafields(\n      identifiers: [{\n        namespace: \"custom\",\n        key: \"gift\"\n      ])\n    {\n      namespace\n      key\n      type\n      value\n    }\n\n  }\n`;\n",
                    language: 'js',
                  },
                ],
              },
            },
            {
              description: 'Retrieve the cart information.',
              codeblock: {
                title: 'cart.get',
                tabs: [
                  {
                    title: 'JavaScript',
                    code: "export async function loader({context}) {\n  const {cart} = context;\n\n  // Usage\n  const result = await cart.get();\n\n  // Optional parameters\n  const result2 = await cart.get({\n    cartId: '123', // override the cart id\n    numCartLines: 50, //override to return 50 cart lines\n    country: 'US', // override the country code to 'US'\n    language: 'EN', // override the language code to 'EN'\n  });\n}\n",
                    language: 'js',
                  },
                ],
              },
            },
            {
              description: 'Get the unique identifier of the cart.',
              codeblock: {
                title: 'cart.getCartId',
                tabs: [
                  {
                    title: 'JavaScript',
                    code: "export async function loader({context}) {\n  // Usage\n  context.cart.getCartId(); // 'gid://shopify/Cart/123'\n}\n",
                    language: 'js',
                  },
                ],
              },
            },
            {
              description: 'Remove items from the cart.',
              codeblock: {
                title: 'cart.removeLines',
                tabs: [
                  {
                    title: 'JavaScript',
                    code: "export async function action({context}) {\n  const {cart} = context;\n\n  // Usage\n  const result = await cart.removeLines(\n    ['123'],\n    // Optional parameters\n    {\n      cartId: '123', // override the cart id\n      country: 'US', // override the country code to 'US'\n      language: 'EN', // override the language code to 'EN'\n    },\n  );\n\n  // Output of result:\n  // {\n  //   cart: {\n  //     id: 'c1-123',\n  //     totalQuantity: 0\n  //   },\n  //   errors: []\n  // }\n}\n",
                    language: 'js',
                  },
                ],
              },
            },
            {
              description: 'Set the unique identifier of the cart.',
              codeblock: {
                title: 'cart.setCartId',
                tabs: [
                  {
                    title: 'JavaScript',
                    code: "export async function action({context}) {\n  const {cart} = context;\n\n  const result = await cart.addLines([\n    {\n      merchandiseId: 'gid://shopify/ProductVariant/123456789',\n      quantity: 1,\n    },\n  ]);\n\n  // Usage\n  const headers = cart.setCartId(result.cart.id);\n}\n",
                    language: 'js',
                  },
                ],
              },
            },
            {
              description:
                'Add extra information (metafields) to the cart. If the cart does not exist, a new cart will be created.',
              codeblock: {
                title: 'cart.setMetafields',
                tabs: [
                  {
                    title: 'JavaScript',
                    code: "export async function action({context}) {\n  const {cart} = context;\n\n  // Usage\n  const result = await cart.setMetafields(\n    [\n      {\n        key: 'custom.gift',\n        type: 'boolean',\n        value: 'true',\n      },\n    ],\n    // Optional parameters\n    {\n      cartId: '123', // override the cart id\n    },\n  );\n\n  const result2 = await cart.deleteMetafield(\n    'custom.gift',\n    // Optional parameters\n    {\n      cartId: '123', // override the cart id\n    },\n  );\n}\n\n// server.js\n// To query for metafields, use the `cartQueryFragment` option when creating the cart handler.\nimport {\n  createCartHandler,\n  cartGetIdDefault,\n  cartSetIdDefault,\n} from '@shopify/hydrogen';\n\nconst cart = createCartHandler({\n  storefront,\n  getCartId: cartGetIdDefault(request.headers),\n  setCartId: cartSetIdDefault(),\n  cartQueryFragment: CART_QUERY_FRAGMENT,\n});\n\nconst CART_QUERY_FRAGMENT = `#graphql\n  fragment CartApiQuery on Cart {\n    id\n    metafields(\n      identifiers: [{\n        namespace: \"custom\",\n        key: \"gift\"\n      ])\n    {\n      namespace\n      key\n      type\n      value\n    }\n\n  }\n`;\n",
                    language: 'js',
                  },
                ],
              },
            },
            {
              description:
                'Update additional information (attributes) in the cart. If the cart does not exist, a new cart will be created.',
              codeblock: {
                title: 'cart.updateAttributes',
                tabs: [
                  {
                    title: 'JavaScript',
                    code: "export async function action({context}) {\n  const {cart} = context;\n\n  // Usage\n  const result = await cart.updateAttributes(\n    [\n      {\n        key: 'Somekey',\n        value: '1',\n      },\n    ],\n    // Optional parameters\n    {\n      cartId: '123', // override the cart id\n    },\n  );\n\n  // Output of result:\n  // {\n  //   cart: {\n  //     id: 'c1-123',\n  //     totalQuantity: 1\n  //   },\n  //   errors: []\n  // }\n}\n",
                    language: 'js',
                  },
                ],
              },
            },
            {
              description:
                'Update the buyer’s information in the cart. If the cart does not exist, a new cart will be created.',
              codeblock: {
                title: 'cart.updateBuyerIdentity',
                tabs: [
                  {
                    title: 'JavaScript',
                    code: "export async function action({context}) {\n  const {cart} = context;\n\n  // Usage\n  const result = await cart.updateBuyerIdentity(\n    {\n      customerAccessToken: '123',\n    },\n    // Optional parameters\n    {\n      cartId: '123', // override the cart id\n      country: 'US', // override the country code to 'US'\n      language: 'EN', // override the language code to 'EN'\n    },\n  );\n\n  // Output of result:\n  // {\n  //   cart: {\n  //     id: 'c1-123',\n  //     totalQuantity: 1\n  //   },\n  //   errors: []\n  // }\n}\n",
                    language: 'js',
                  },
                ],
              },
            },
            {
              description: 'Update discount codes in the cart.',
              codeblock: {
                title: 'cart.updateDiscountCodes',
                tabs: [
                  {
                    title: 'JavaScript',
                    code: "export async function action({context}) {\n  const {cart} = context;\n\n  // Usage\n  const result = await cart.updateDiscountCodes(\n    ['FREE_SHIPPING'],\n    // Optional parameters\n    {\n      cartId: '123', // override the cart id\n      country: 'US', // override the country code to 'US'\n      language: 'EN', // override the language code to 'EN'\n    },\n  );\n\n  // Output of result:\n  // {\n  //   cart: {\n  //     id: 'c1-123',\n  //     totalQuantity: 1\n  //   },\n  //   errors: []\n  // }\n}\n",
                    language: 'js',
                  },
                ],
              },
            },
            {
              description: 'Update items in the cart.',
              codeblock: {
                title: 'cart.updateLines',
                tabs: [
                  {
                    title: 'JavaScript',
                    code: "export async function action({context}) {\n  const {cart} = context;\n\n  // Usage\n  const result = await cart.updateLines(\n    [\n      {\n        merchandiseId: 'gid://shopify/ProductVariant/123456789',\n        quantity: 2,\n      },\n    ],\n    // Optional parameters\n    {\n      cartId: '123', // override the cart id\n      country: 'US', // override the country code to 'US'\n      language: 'EN', // override the language code to 'EN'\n    },\n  );\n\n  // Output of result:\n  // {\n  //   cart: {\n  //     id: 'c1-123',\n  //     totalQuantity: 2\n  //   },\n  //   errors: []\n  // }\n}\n",
                    language: 'js',
                  },
                ],
              },
            },
            {
              description:
                'Update the note in the cart. If the cart does not exist, a new cart will be created.',
              codeblock: {
                title: 'cart.updateNote',
                tabs: [
                  {
                    title: 'JavaScript',
                    code: "export async function action({context}) {\n  const {cart} = context;\n\n  // Usage\n  const result = await cart.updateNote(\n    'Some notes',\n    // Optional parameters\n    {\n      cartId: '123', // override the cart id\n    },\n  );\n\n  // Output of result:\n  // {\n  //   cart: {\n  //     id: 'c1-123',\n  //     totalQuantity: 0\n  //   },\n  //   errors: []\n  // }\n}\n",
                    language: 'js',
                  },
                ],
              },
            },
            {
              description:
                'Update the selected delivery options in the cart. Only available for carts associated with a customer access token.',
              codeblock: {
                title: 'cart.updateSelectedDeliveryOptions',
                tabs: [
                  {
                    title: 'JavaScript',
                    code: "export async function action({context}) {\n  const {cart} = context;\n\n  // Usage\n  const result = await cart.updateSelectedDeliveryOptions(\n    [\n      {\n        deliveryGroupId: '123',\n        deliveryOptionHandle: 'Canada Post',\n      },\n    ],\n    // Optional parameters\n    {\n      cartId: '123', // override the cart id\n      country: 'US', // override the country code to 'US'\n      language: 'EN', // override the language code to 'EN'\n    },\n  );\n\n  // Output of result:\n  // {\n  //   cart: {\n  //     id: 'c1-123',\n  //     totalQuantity: 2\n  //   },\n  //   errors: []\n  // }\n}\n",
                    language: 'js',
                  },
                ],
              },
            },
          ],
        },
      ],
    },
  },
  {
    name: 'cartAttributesUpdateDefault',
    category: 'utilities',
    isVisualComponent: false,
    related: [],
    description:
      'Creates a function that accepts an array of [AttributeInput](/docs/api/storefront/2023-07/input-objects/AttributeInput) and updates attributes to a cart',
    type: 'utility',
    defaultExample: {
      description: 'This is the default example',
      codeblock: {
        tabs: [
          {
            title: 'JavaScript',
            code: "import {cartAttributesUpdateDefault} from '@shopify/hydrogen';\n\nconst cartAttributes = cartAttributesUpdateDefault({\n  storefront,\n  getCartId,\n});\n\nconst result = await cartAttributes([\n  {\n    key: 'Somekey',\n    value: '1',\n  },\n]);\n",
            language: 'js',
          },
        ],
        title: 'example',
      },
    },
    definitions: [
      {
        title: 'cartAttributesUpdateDefault',
        description: '',
        type: 'CartAttributesUpdateDefaultGeneratedType',
        typeDefinitions: {
          CartAttributesUpdateDefaultGeneratedType: {
            filePath: '/cart/queries/cartAttributesUpdateDefault.ts',
            name: 'CartAttributesUpdateDefaultGeneratedType',
            description: '',
            params: [
              {
                name: 'options',
                description: '',
                value: 'CartQueryOptions',
                filePath: '/cart/queries/cartAttributesUpdateDefault.ts',
              },
            ],
            returns: {
              filePath: '/cart/queries/cartAttributesUpdateDefault.ts',
              description: '',
              name: 'CartAttributesUpdateFunction',
              value: 'CartAttributesUpdateFunction',
            },
            value:
              'export function cartAttributesUpdateDefault(\n  options: CartQueryOptions,\n): CartAttributesUpdateFunction {\n  return async (attributes, optionalParams) => {\n    const {cartAttributesUpdate} = await options.storefront.mutate<{\n      cartAttributesUpdate: CartQueryData;\n    }>(CART_ATTRIBUTES_UPDATE_MUTATION(options.cartFragment), {\n      variables: {\n        cartId: optionalParams?.cartId || options.getCartId(),\n        attributes,\n      },\n    });\n    return cartAttributesUpdate;\n  };\n}',
          },
          CartQueryOptions: {
            filePath: '/cart/queries/cart-types.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'CartQueryOptions',
            value:
              '{\n  /**\n   * The storefront client instance created by [`createStorefrontClient`](docs/api/hydrogen/latest/utilities/createstorefrontclient).\n   */\n  storefront: Storefront;\n  /**\n   * A function that returns the cart ID.\n   */\n  getCartId: () => string | undefined;\n  /**\n   * The cart fragment to override the one used in this query.\n   */\n  cartFragment?: string;\n}',
            description: '',
            members: [
              {
                filePath: '/cart/queries/cart-types.ts',
                syntaxKind: 'PropertySignature',
                name: 'storefront',
                value: 'Storefront',
                description:
                  'The storefront client instance created by [`createStorefrontClient`](docs/api/hydrogen/latest/utilities/createstorefrontclient).',
              },
              {
                filePath: '/cart/queries/cart-types.ts',
                syntaxKind: 'PropertySignature',
                name: 'getCartId',
                value: '() => string',
                description: 'A function that returns the cart ID.',
              },
              {
                filePath: '/cart/queries/cart-types.ts',
                syntaxKind: 'PropertySignature',
                name: 'cartFragment',
                value: 'string',
                description:
                  'The cart fragment to override the one used in this query.',
                isOptional: true,
              },
            ],
          },
          Storefront: {
            filePath: '/storefront.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'Storefront',
            value:
              "{\n  /** The function to run a query on Storefront API. */\n  query: <OverrideReturnType = any, RawGqlString extends string = string>(\n    query: RawGqlString,\n    ...options: RawGqlString extends keyof StorefrontQueries // Do we have any generated query types?\n      ? IsOptionalVariables<StorefrontQueries[RawGqlString]> extends true\n        ? [StorefrontQuerySecondParam<RawGqlString>?] // Using codegen, query has no variables\n        : [StorefrontQuerySecondParam<RawGqlString>] // Using codegen, query needs variables\n      : [StorefrontQuerySecondParam?] // No codegen, variables always optional\n  ) => Promise<\n    RawGqlString extends keyof StorefrontQueries // Do we have any generated query types?\n      ? StorefrontQueries[RawGqlString]['return'] // Using codegen, return type is known\n      : OverrideReturnType // No codegen, let user specify return type\n  >;\n  /** The function to run a mutation on Storefront API. */\n  mutate: <OverrideReturnType = any, RawGqlString extends string = string>(\n    mutation: RawGqlString,\n    ...options: RawGqlString extends keyof StorefrontMutations // Do we have any generated mutation types?\n      ? IsOptionalVariables<StorefrontMutations[RawGqlString]> extends true\n        ? [StorefrontMutateSecondParam<RawGqlString>?] // Using codegen, mutation has no variables\n        : [StorefrontMutateSecondParam<RawGqlString>] // Using codegen, mutation needs variables\n      : [StorefrontMutateSecondParam?] // No codegen, variables always optional\n  ) => Promise<\n    RawGqlString extends keyof StorefrontMutations // Do we have any generated mutation types?\n      ? StorefrontMutations[RawGqlString]['return'] // Using codegen, return type is known\n      : OverrideReturnType // No codegen, let user specify return type\n  >;\n  /** The cache instance passed in from the `createStorefrontClient` argument. */\n  cache?: Cache;\n  /** Re-export of [`CacheNone`](/docs/api/hydrogen/2023-07/utilities/cachenone). */\n  CacheNone: typeof CacheNone;\n  /** Re-export of [`CacheLong`](/docs/api/hydrogen/2023-07/utilities/cachelong). */\n  CacheLong: typeof CacheLong;\n  /** Re-export of [`CacheShort`](/docs/api/hydrogen/2023-07/utilities/cacheshort). */\n  CacheShort: typeof CacheShort;\n  /** Re-export of [`CacheCustom`](/docs/api/hydrogen/2023-07/utilities/cachecustom). */\n  CacheCustom: typeof CacheCustom;\n  /** Re-export of [`generateCacheControlHeader`](/docs/api/hydrogen/2023-07/utilities/generatecachecontrolheader). */\n  generateCacheControlHeader: typeof generateCacheControlHeader;\n  /** Returns an object that contains headers that are needed for each query to Storefront API GraphQL endpoint. See [`getPublicTokenHeaders` in Hydrogen React](/docs/api/hydrogen-react/2023-07/utilities/createstorefrontclient#:~:text=%27graphql%27.-,getPublicTokenHeaders,-(props%3F%3A) for more details. */\n  getPublicTokenHeaders: ReturnType<\n    typeof createStorefrontUtilities\n  >['getPublicTokenHeaders'];\n  /** Returns an object that contains headers that are needed for each query to Storefront API GraphQL endpoint for API calls made from a server. See [`getPrivateTokenHeaders` in  Hydrogen React](/docs/api/hydrogen-react/2023-07/utilities/createstorefrontclient#:~:text=storefrontApiVersion-,getPrivateTokenHeaders,-(props%3F%3A) for more details.*/\n  getPrivateTokenHeaders: ReturnType<\n    typeof createStorefrontUtilities\n  >['getPrivateTokenHeaders'];\n  /** Creates the fully-qualified URL to your myshopify.com domain. See [`getShopifyDomain` in  Hydrogen React](/docs/api/hydrogen-react/2023-07/utilities/createstorefrontclient#:~:text=StorefrontClientReturn-,getShopifyDomain,-(props%3F%3A) for more details. */\n  getShopifyDomain: ReturnType<\n    typeof createStorefrontUtilities\n  >['getShopifyDomain'];\n  /** Creates the fully-qualified URL to your store's GraphQL endpoint. See [`getStorefrontApiUrl` in  Hydrogen React](/docs/api/hydrogen-react/2023-07/utilities/createstorefrontclient#:~:text=storeDomain-,getStorefrontApiUrl,-(props%3F%3A) for more details.*/\n  getApiUrl: ReturnType<\n    typeof createStorefrontUtilities\n  >['getStorefrontApiUrl'];\n  /** Determines if the error is resulted from a Storefront API call. */\n  isApiError: (error: any) => boolean;\n  /** The `i18n` object passed in from the `createStorefrontClient` argument. */\n  i18n: TI18n;\n}",
            description: 'Interface to interact with the Storefront API.',
            members: [
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'query',
                value:
                  '<OverrideReturnType = any, RawGqlString extends string = string>(query: RawGqlString, ...options: RawGqlString extends never ? IsOptionalVariables<StorefrontQueries[RawGqlString]> extends true ? [StorefrontQuerySecondParam<RawGqlString>?] : [StorefrontQuerySecondParam<RawGqlString>] : [StorefrontQuerySecondParam<string>?]) => Promise<RawGqlString extends never ? StorefrontQueries[RawGqlString]["return"] : OverrideReturnType>',
                description: 'The function to run a query on Storefront API.',
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'mutate',
                value:
                  '<OverrideReturnType = any, RawGqlString extends string = string>(mutation: RawGqlString, ...options: RawGqlString extends never ? IsOptionalVariables<StorefrontMutations[RawGqlString]> extends true ? [StorefrontMutateSecondParam<RawGqlString>?] : [StorefrontMutateSecondParam<RawGqlString>] : [StorefrontCommonOptions<{ readonly [variable: string]: unknown; }>?]) => Promise<RawGqlString extends never ? StorefrontMutations[RawGqlString]["return"] : OverrideReturnType>',
                description:
                  'The function to run a mutation on Storefront API.',
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'cache',
                value: 'Cache',
                description:
                  'The cache instance passed in from the `createStorefrontClient` argument.',
                isOptional: true,
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'CacheNone',
                value: '() => NoStoreStrategy',
                description:
                  'Re-export of [`CacheNone`](/docs/api/hydrogen/2023-07/utilities/cachenone).',
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'CacheLong',
                value: '(overrideOptions?: AllCacheOptions) => AllCacheOptions',
                description:
                  'Re-export of [`CacheLong`](/docs/api/hydrogen/2023-07/utilities/cachelong).',
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'CacheShort',
                value: '(overrideOptions?: AllCacheOptions) => AllCacheOptions',
                description:
                  'Re-export of [`CacheShort`](/docs/api/hydrogen/2023-07/utilities/cacheshort).',
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'CacheCustom',
                value: '(overrideOptions: AllCacheOptions) => AllCacheOptions',
                description:
                  'Re-export of [`CacheCustom`](/docs/api/hydrogen/2023-07/utilities/cachecustom).',
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'generateCacheControlHeader',
                value: '(cacheOptions: AllCacheOptions) => string',
                description:
                  'Re-export of [`generateCacheControlHeader`](/docs/api/hydrogen/2023-07/utilities/generatecachecontrolheader).',
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'getPublicTokenHeaders',
                value:
                  '(props?: Partial<Pick<StorefrontClientProps, "contentType">> & Pick<StorefrontClientProps, "publicStorefrontToken">) => Record<string, string>',
                description:
                  'Returns an object that contains headers that are needed for each query to Storefront API GraphQL endpoint. See [`getPublicTokenHeaders` in Hydrogen React](/docs/api/hydrogen-react/2023-07/utilities/createstorefrontclient#:~:text=%27graphql%27.-,getPublicTokenHeaders,-(props%3F%3A) for more details.',
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'getPrivateTokenHeaders',
                value:
                  '(props?: Partial<Pick<StorefrontClientProps, "contentType">> & Pick<StorefrontClientProps, "privateStorefrontToken"> & { buyerIp?: string; }) => Record<string, string>',
                description:
                  'Returns an object that contains headers that are needed for each query to Storefront API GraphQL endpoint for API calls made from a server. See [`getPrivateTokenHeaders` in  Hydrogen React](/docs/api/hydrogen-react/2023-07/utilities/createstorefrontclient#:~:text=storefrontApiVersion-,getPrivateTokenHeaders,-(props%3F%3A) for more details.',
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'getShopifyDomain',
                value:
                  '(props?: Partial<Pick<StorefrontClientProps, "storeDomain">>) => string',
                description:
                  'Creates the fully-qualified URL to your myshopify.com domain. See [`getShopifyDomain` in  Hydrogen React](/docs/api/hydrogen-react/2023-07/utilities/createstorefrontclient#:~:text=StorefrontClientReturn-,getShopifyDomain,-(props%3F%3A) for more details.',
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'getApiUrl',
                value:
                  '(props?: Partial<Pick<StorefrontClientProps, "storeDomain" | "storefrontApiVersion">>) => string',
                description:
                  "Creates the fully-qualified URL to your store's GraphQL endpoint. See [`getStorefrontApiUrl` in  Hydrogen React](/docs/api/hydrogen-react/2023-07/utilities/createstorefrontclient#:~:text=storeDomain-,getStorefrontApiUrl,-(props%3F%3A) for more details.",
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'isApiError',
                value: '(error: any) => boolean',
                description:
                  'Determines if the error is resulted from a Storefront API call.',
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'i18n',
                value: 'TI18n',
                description:
                  'The `i18n` object passed in from the `createStorefrontClient` argument.',
              },
            ],
          },
          IsOptionalVariables: {
            filePath: '/storefront.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'IsOptionalVariables',
            value:
              "Omit<\n  OperationTypeValue['variables'],\n  AutoAddedVariableNames\n> extends EmptyVariables\n  ? true // No need to pass variables\n  : GenericVariables extends OperationTypeValue['variables']\n  ? true // We don't know what variables are needed\n  : false",
            description: '',
          },
          AutoAddedVariableNames: {
            filePath: '/storefront.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'AutoAddedVariableNames',
            value: "'country' | 'language'",
            description: '',
          },
          EmptyVariables: {
            filePath: '/storefront.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'EmptyVariables',
            value: '{[key: string]: never}',
            description: '',
            members: [],
          },
          GenericVariables: {
            filePath: '/storefront.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'GenericVariables',
            value: "ExecutionArgs['variableValues']",
            description: '',
          },
          StorefrontQueries: {
            filePath: '/storefront.ts',
            name: 'StorefrontQueries',
            description:
              'Maps all the queries found in the project to variables and return types.',
            members: [],
            value:
              "export interface StorefrontQueries {\n  // Example of how a generated query type looks like:\n  // '#graphql query q1 {...}': {return: Q1Query; variables: Q1QueryVariables};\n}",
          },
          StorefrontQuerySecondParam: {
            filePath: '/storefront.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'StorefrontQuerySecondParam',
            value:
              "(RawGqlString extends keyof StorefrontQueries\n  ? StorefrontCommonOptions<StorefrontQueries[RawGqlString]['variables']>\n  : StorefrontCommonOptions<GenericVariables>) & {cache?: CachingStrategy}",
            description: '',
          },
          StorefrontCommonOptions: {
            filePath: '/storefront.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'StorefrontCommonOptions',
            value:
              '{\n  headers?: HeadersInit;\n  storefrontApiVersion?: string;\n} & (IsOptionalVariables<{variables: Variables}> extends true\n  ? {variables?: Variables}\n  : {variables: Variables})',
            description: '',
          },
          CachingStrategy: {
            filePath: '/cache/strategies.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'CachingStrategy',
            value: 'AllCacheOptions',
            description:
              'Use the `CachingStrategy` to define a custom caching mechanism for your data. Or use one of the pre-defined caching strategies: CacheNone, CacheShort, CacheLong.',
            members: [
              {
                filePath: '/cache/strategies.ts',
                syntaxKind: 'PropertySignature',
                name: 'mode',
                value: 'string',
                description:
                  'The caching mode, generally `public`, `private`, or `no-store`.',
                isOptional: true,
              },
              {
                filePath: '/cache/strategies.ts',
                syntaxKind: 'PropertySignature',
                name: 'maxAge',
                value: 'number',
                description:
                  'The maximum amount of time in seconds that a resource will be considered fresh. See `max-age` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#:~:text=Response%20Directives-,max%2Dage,-The%20max%2Dage).',
                isOptional: true,
              },
              {
                filePath: '/cache/strategies.ts',
                syntaxKind: 'PropertySignature',
                name: 'staleWhileRevalidate',
                value: 'number',
                description:
                  'Indicate that the cache should serve the stale response in the background while revalidating the cache. See `stale-while-revalidate` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#stale-while-revalidate).',
                isOptional: true,
              },
              {
                filePath: '/cache/strategies.ts',
                syntaxKind: 'PropertySignature',
                name: 'sMaxAge',
                value: 'number',
                description:
                  'Similar to `maxAge` but specific to shared caches. See `s-maxage` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#s-maxage).',
                isOptional: true,
              },
              {
                filePath: '/cache/strategies.ts',
                syntaxKind: 'PropertySignature',
                name: 'staleIfError',
                value: 'number',
                description:
                  'Indicate that the cache should serve the stale response if an error occurs while revalidating the cache. See `stale-if-error` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#stale-if-error).',
                isOptional: true,
              },
            ],
          },
          StorefrontMutations: {
            filePath: '/storefront.ts',
            name: 'StorefrontMutations',
            description:
              'Maps all the mutations found in the project to variables and return types.',
            members: [],
            value:
              "export interface StorefrontMutations {\n  // Example of how a generated mutation type looks like:\n  // '#graphql mutation m1 {...}': {return: M1Mutation; variables: M1MutationVariables};\n}",
          },
          StorefrontMutateSecondParam: {
            filePath: '/storefront.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'StorefrontMutateSecondParam',
            value:
              "RawGqlString extends keyof StorefrontMutations\n  ? StorefrontCommonOptions<StorefrontMutations[RawGqlString]['variables']>\n  : StorefrontCommonOptions<GenericVariables>",
            description: '',
          },
          NoStoreStrategy: {
            filePath: '/cache/strategies.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'NoStoreStrategy',
            value: '{\n  mode: string;\n}',
            description: '',
            members: [
              {
                filePath: '/cache/strategies.ts',
                syntaxKind: 'PropertySignature',
                name: 'mode',
                value: 'string',
                description: '',
              },
            ],
          },
          AllCacheOptions: {
            filePath: '/cache/strategies.ts',
            name: 'AllCacheOptions',
            description: 'Override options for a cache strategy.',
            members: [
              {
                filePath: '/cache/strategies.ts',
                syntaxKind: 'PropertySignature',
                name: 'mode',
                value: 'string',
                description:
                  'The caching mode, generally `public`, `private`, or `no-store`.',
                isOptional: true,
              },
              {
                filePath: '/cache/strategies.ts',
                syntaxKind: 'PropertySignature',
                name: 'maxAge',
                value: 'number',
                description:
                  'The maximum amount of time in seconds that a resource will be considered fresh. See `max-age` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#:~:text=Response%20Directives-,max%2Dage,-The%20max%2Dage).',
                isOptional: true,
              },
              {
                filePath: '/cache/strategies.ts',
                syntaxKind: 'PropertySignature',
                name: 'staleWhileRevalidate',
                value: 'number',
                description:
                  'Indicate that the cache should serve the stale response in the background while revalidating the cache. See `stale-while-revalidate` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#stale-while-revalidate).',
                isOptional: true,
              },
              {
                filePath: '/cache/strategies.ts',
                syntaxKind: 'PropertySignature',
                name: 'sMaxAge',
                value: 'number',
                description:
                  'Similar to `maxAge` but specific to shared caches. See `s-maxage` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#s-maxage).',
                isOptional: true,
              },
              {
                filePath: '/cache/strategies.ts',
                syntaxKind: 'PropertySignature',
                name: 'staleIfError',
                value: 'number',
                description:
                  'Indicate that the cache should serve the stale response if an error occurs while revalidating the cache. See `stale-if-error` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#stale-if-error).',
                isOptional: true,
              },
            ],
            value:
              'export interface AllCacheOptions {\n  /**\n   * The caching mode, generally `public`, `private`, or `no-store`.\n   */\n  mode?: string;\n  /**\n   * The maximum amount of time in seconds that a resource will be considered fresh. See `max-age` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#:~:text=Response%20Directives-,max%2Dage,-The%20max%2Dage).\n   */\n  maxAge?: number;\n  /**\n   * Indicate that the cache should serve the stale response in the background while revalidating the cache. See `stale-while-revalidate` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#stale-while-revalidate).\n   */\n  staleWhileRevalidate?: number;\n  /**\n   * Similar to `maxAge` but specific to shared caches. See `s-maxage` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#s-maxage).\n   */\n  sMaxAge?: number;\n  /**\n   * Indicate that the cache should serve the stale response if an error occurs while revalidating the cache. See `stale-if-error` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#stale-if-error).\n   */\n  staleIfError?: number;\n}',
          },
          CartAttributesUpdateFunction: {
            filePath: '/cart/queries/cartAttributesUpdateDefault.ts',
            name: 'CartAttributesUpdateFunction',
            description: '',
            params: [
              {
                name: 'attributes',
                description: '',
                value: 'AttributeInput[]',
                filePath: '/cart/queries/cartAttributesUpdateDefault.ts',
              },
              {
                name: 'optionalParams',
                description: '',
                value: 'CartOptionalInput',
                isOptional: true,
                filePath: '/cart/queries/cartAttributesUpdateDefault.ts',
              },
            ],
            returns: {
              filePath: '/cart/queries/cartAttributesUpdateDefault.ts',
              description: '',
              name: 'Promise<CartQueryData>',
              value: 'Promise<CartQueryData>',
            },
            value:
              'export type CartAttributesUpdateFunction = (\n  attributes: AttributeInput[],\n  optionalParams?: CartOptionalInput,\n) => Promise<CartQueryData>;',
          },
          AttributeInput: {
            description: '',
            name: 'AttributeInput',
            value: 'AttributeInput',
            members: [],
            override:
              '[AttributeInput](/docs/api/storefront/2023-07/input-objects/AttributeInput) - Storefront API type',
          },
          CartOptionalInput: {
            filePath: '/cart/queries/cart-types.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'CartOptionalInput',
            value:
              "{\n  /**\n   * The cart id.\n   * @default cart.getCartId();\n   */\n  cartId?: Scalars['ID'];\n  /**\n   * The country code.\n   * @default storefront.i18n.country\n   */\n  country?: CountryCode;\n  /**\n   * The language code.\n   * @default storefront.i18n.language\n   */\n  language?: LanguageCode;\n}",
            description: '',
            members: [
              {
                filePath: '/cart/queries/cart-types.ts',
                syntaxKind: 'PropertySignature',
                name: 'cartId',
                value: 'string',
                description: 'The cart id.',
                isOptional: true,
                defaultValue: 'cart.getCartId();',
              },
              {
                filePath: '/cart/queries/cart-types.ts',
                syntaxKind: 'PropertySignature',
                name: 'country',
                value: 'CountryCode',
                description: 'The country code.',
                isOptional: true,
                defaultValue: 'storefront.i18n.country',
              },
              {
                filePath: '/cart/queries/cart-types.ts',
                syntaxKind: 'PropertySignature',
                name: 'language',
                value: 'LanguageCode',
                description: 'The language code.',
                isOptional: true,
                defaultValue: 'storefront.i18n.language',
              },
            ],
          },
          CartQueryData: {
            filePath: '/cart/queries/cart-types.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'CartQueryData',
            value:
              '{\n  cart: Cart;\n  errors?:\n    | CartUserError[]\n    | MetafieldsSetUserError[]\n    | MetafieldDeleteUserError[];\n}',
            description: '',
            members: [
              {
                filePath: '/cart/queries/cart-types.ts',
                syntaxKind: 'PropertySignature',
                name: 'cart',
                value: 'Cart',
                description: '',
              },
              {
                filePath: '/cart/queries/cart-types.ts',
                syntaxKind: 'PropertySignature',
                name: 'errors',
                value:
                  'CartUserError[] | MetafieldsSetUserError[] | MetafieldDeleteUserError[]',
                description: '',
                isOptional: true,
              },
            ],
          },
          Cart: {
            description: '',
            name: 'Cart',
            value: 'Cart',
            members: [],
            override:
              '[Cart](/docs/api/storefront/2023-07/objects/Cart) - Storefront API type',
          },
          CartUserError: {
            description: '',
            name: 'CartUserError',
            value: 'CartUserError',
            members: [],
            override:
              '[CartUserError](/docs/api/storefront/2023-07/objects/CartUserError) - Storefront API type',
          },
          MetafieldsSetUserError: {
            description: '',
            name: 'MetafieldsSetUserError',
            value: 'MetafieldsSetUserError',
            members: [],
            override:
              '[MetafieldsSetUserError](/docs/api/storefront/2023-07/objects/MetafieldsSetUserError) - Storefront API type',
          },
          MetafieldDeleteUserError: {
            description: '',
            name: 'MetafieldDeleteUserError',
            value: 'MetafieldDeleteUserError',
            members: [],
            override:
              '[MetafieldDeleteUserError](/docs/api/storefront/2023-07/objects/MetafieldDeleteUserError) - Storefront API type',
          },
        },
      },
    ],
  },
  {
    name: 'cartBuyerIdentityUpdateDefault',
    category: 'utilities',
    isVisualComponent: false,
    related: [],
    description:
      'Creates a function that accepts an object of [CartBuyerIdentityInput](/docs/api/storefront/2023-07/input-objects/CartBuyerIdentityInput) and updates the buyer identity of a cart',
    type: 'utility',
    defaultExample: {
      description: 'This is the default example',
      codeblock: {
        tabs: [
          {
            title: 'JavaScript',
            code: "import {cartBuyerIdentityUpdateDefault} from '@shopify/hydrogen';\n\nconst cartBuyerIdentity = cartBuyerIdentityUpdateDefault({\n  storefront,\n  getCartId,\n});\n\nconst result = await cartBuyerIdentity({\n  customerAccessToken: '123',\n});\n",
            language: 'js',
          },
        ],
        title: 'example',
      },
    },
    definitions: [
      {
        title: 'cartBuyerIdentityUpdateDefault',
        description: '',
        type: 'CartBuyerIdentityUpdateDefaultGeneratedType',
        typeDefinitions: {
          CartBuyerIdentityUpdateDefaultGeneratedType: {
            filePath: '/cart/queries/cartBuyerIdentityUpdateDefault.ts',
            name: 'CartBuyerIdentityUpdateDefaultGeneratedType',
            description: '',
            params: [
              {
                name: 'options',
                description: '',
                value: 'CartQueryOptions',
                filePath: '/cart/queries/cartBuyerIdentityUpdateDefault.ts',
              },
            ],
            returns: {
              filePath: '/cart/queries/cartBuyerIdentityUpdateDefault.ts',
              description: '',
              name: 'CartBuyerIdentityUpdateFunction',
              value: 'CartBuyerIdentityUpdateFunction',
            },
            value:
              'export function cartBuyerIdentityUpdateDefault(\n  options: CartQueryOptions,\n): CartBuyerIdentityUpdateFunction {\n  return async (buyerIdentity, optionalParams) => {\n    const {cartBuyerIdentityUpdate} = await options.storefront.mutate<{\n      cartBuyerIdentityUpdate: CartQueryData;\n    }>(CART_BUYER_IDENTITY_UPDATE_MUTATION(options.cartFragment), {\n      variables: {\n        cartId: options.getCartId(),\n        buyerIdentity,\n        ...optionalParams,\n      },\n    });\n    return cartBuyerIdentityUpdate;\n  };\n}',
          },
          CartQueryOptions: {
            filePath: '/cart/queries/cart-types.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'CartQueryOptions',
            value:
              '{\n  /**\n   * The storefront client instance created by [`createStorefrontClient`](docs/api/hydrogen/latest/utilities/createstorefrontclient).\n   */\n  storefront: Storefront;\n  /**\n   * A function that returns the cart ID.\n   */\n  getCartId: () => string | undefined;\n  /**\n   * The cart fragment to override the one used in this query.\n   */\n  cartFragment?: string;\n}',
            description: '',
            members: [
              {
                filePath: '/cart/queries/cart-types.ts',
                syntaxKind: 'PropertySignature',
                name: 'storefront',
                value: 'Storefront',
                description:
                  'The storefront client instance created by [`createStorefrontClient`](docs/api/hydrogen/latest/utilities/createstorefrontclient).',
              },
              {
                filePath: '/cart/queries/cart-types.ts',
                syntaxKind: 'PropertySignature',
                name: 'getCartId',
                value: '() => string',
                description: 'A function that returns the cart ID.',
              },
              {
                filePath: '/cart/queries/cart-types.ts',
                syntaxKind: 'PropertySignature',
                name: 'cartFragment',
                value: 'string',
                description:
                  'The cart fragment to override the one used in this query.',
                isOptional: true,
              },
            ],
          },
          Storefront: {
            filePath: '/storefront.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'Storefront',
            value:
              "{\n  /** The function to run a query on Storefront API. */\n  query: <OverrideReturnType = any, RawGqlString extends string = string>(\n    query: RawGqlString,\n    ...options: RawGqlString extends keyof StorefrontQueries // Do we have any generated query types?\n      ? IsOptionalVariables<StorefrontQueries[RawGqlString]> extends true\n        ? [StorefrontQuerySecondParam<RawGqlString>?] // Using codegen, query has no variables\n        : [StorefrontQuerySecondParam<RawGqlString>] // Using codegen, query needs variables\n      : [StorefrontQuerySecondParam?] // No codegen, variables always optional\n  ) => Promise<\n    RawGqlString extends keyof StorefrontQueries // Do we have any generated query types?\n      ? StorefrontQueries[RawGqlString]['return'] // Using codegen, return type is known\n      : OverrideReturnType // No codegen, let user specify return type\n  >;\n  /** The function to run a mutation on Storefront API. */\n  mutate: <OverrideReturnType = any, RawGqlString extends string = string>(\n    mutation: RawGqlString,\n    ...options: RawGqlString extends keyof StorefrontMutations // Do we have any generated mutation types?\n      ? IsOptionalVariables<StorefrontMutations[RawGqlString]> extends true\n        ? [StorefrontMutateSecondParam<RawGqlString>?] // Using codegen, mutation has no variables\n        : [StorefrontMutateSecondParam<RawGqlString>] // Using codegen, mutation needs variables\n      : [StorefrontMutateSecondParam?] // No codegen, variables always optional\n  ) => Promise<\n    RawGqlString extends keyof StorefrontMutations // Do we have any generated mutation types?\n      ? StorefrontMutations[RawGqlString]['return'] // Using codegen, return type is known\n      : OverrideReturnType // No codegen, let user specify return type\n  >;\n  /** The cache instance passed in from the `createStorefrontClient` argument. */\n  cache?: Cache;\n  /** Re-export of [`CacheNone`](/docs/api/hydrogen/2023-07/utilities/cachenone). */\n  CacheNone: typeof CacheNone;\n  /** Re-export of [`CacheLong`](/docs/api/hydrogen/2023-07/utilities/cachelong). */\n  CacheLong: typeof CacheLong;\n  /** Re-export of [`CacheShort`](/docs/api/hydrogen/2023-07/utilities/cacheshort). */\n  CacheShort: typeof CacheShort;\n  /** Re-export of [`CacheCustom`](/docs/api/hydrogen/2023-07/utilities/cachecustom). */\n  CacheCustom: typeof CacheCustom;\n  /** Re-export of [`generateCacheControlHeader`](/docs/api/hydrogen/2023-07/utilities/generatecachecontrolheader). */\n  generateCacheControlHeader: typeof generateCacheControlHeader;\n  /** Returns an object that contains headers that are needed for each query to Storefront API GraphQL endpoint. See [`getPublicTokenHeaders` in Hydrogen React](/docs/api/hydrogen-react/2023-07/utilities/createstorefrontclient#:~:text=%27graphql%27.-,getPublicTokenHeaders,-(props%3F%3A) for more details. */\n  getPublicTokenHeaders: ReturnType<\n    typeof createStorefrontUtilities\n  >['getPublicTokenHeaders'];\n  /** Returns an object that contains headers that are needed for each query to Storefront API GraphQL endpoint for API calls made from a server. See [`getPrivateTokenHeaders` in  Hydrogen React](/docs/api/hydrogen-react/2023-07/utilities/createstorefrontclient#:~:text=storefrontApiVersion-,getPrivateTokenHeaders,-(props%3F%3A) for more details.*/\n  getPrivateTokenHeaders: ReturnType<\n    typeof createStorefrontUtilities\n  >['getPrivateTokenHeaders'];\n  /** Creates the fully-qualified URL to your myshopify.com domain. See [`getShopifyDomain` in  Hydrogen React](/docs/api/hydrogen-react/2023-07/utilities/createstorefrontclient#:~:text=StorefrontClientReturn-,getShopifyDomain,-(props%3F%3A) for more details. */\n  getShopifyDomain: ReturnType<\n    typeof createStorefrontUtilities\n  >['getShopifyDomain'];\n  /** Creates the fully-qualified URL to your store's GraphQL endpoint. See [`getStorefrontApiUrl` in  Hydrogen React](/docs/api/hydrogen-react/2023-07/utilities/createstorefrontclient#:~:text=storeDomain-,getStorefrontApiUrl,-(props%3F%3A) for more details.*/\n  getApiUrl: ReturnType<\n    typeof createStorefrontUtilities\n  >['getStorefrontApiUrl'];\n  /** Determines if the error is resulted from a Storefront API call. */\n  isApiError: (error: any) => boolean;\n  /** The `i18n` object passed in from the `createStorefrontClient` argument. */\n  i18n: TI18n;\n}",
            description: 'Interface to interact with the Storefront API.',
            members: [
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'query',
                value:
                  '<OverrideReturnType = any, RawGqlString extends string = string>(query: RawGqlString, ...options: RawGqlString extends never ? IsOptionalVariables<StorefrontQueries[RawGqlString]> extends true ? [StorefrontQuerySecondParam<RawGqlString>?] : [StorefrontQuerySecondParam<RawGqlString>] : [StorefrontQuerySecondParam<string>?]) => Promise<RawGqlString extends never ? StorefrontQueries[RawGqlString]["return"] : OverrideReturnType>',
                description: 'The function to run a query on Storefront API.',
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'mutate',
                value:
                  '<OverrideReturnType = any, RawGqlString extends string = string>(mutation: RawGqlString, ...options: RawGqlString extends never ? IsOptionalVariables<StorefrontMutations[RawGqlString]> extends true ? [StorefrontMutateSecondParam<RawGqlString>?] : [StorefrontMutateSecondParam<RawGqlString>] : [StorefrontCommonOptions<{ readonly [variable: string]: unknown; }>?]) => Promise<RawGqlString extends never ? StorefrontMutations[RawGqlString]["return"] : OverrideReturnType>',
                description:
                  'The function to run a mutation on Storefront API.',
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'cache',
                value: 'Cache',
                description:
                  'The cache instance passed in from the `createStorefrontClient` argument.',
                isOptional: true,
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'CacheNone',
                value: '() => NoStoreStrategy',
                description:
                  'Re-export of [`CacheNone`](/docs/api/hydrogen/2023-07/utilities/cachenone).',
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'CacheLong',
                value: '(overrideOptions?: AllCacheOptions) => AllCacheOptions',
                description:
                  'Re-export of [`CacheLong`](/docs/api/hydrogen/2023-07/utilities/cachelong).',
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'CacheShort',
                value: '(overrideOptions?: AllCacheOptions) => AllCacheOptions',
                description:
                  'Re-export of [`CacheShort`](/docs/api/hydrogen/2023-07/utilities/cacheshort).',
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'CacheCustom',
                value: '(overrideOptions: AllCacheOptions) => AllCacheOptions',
                description:
                  'Re-export of [`CacheCustom`](/docs/api/hydrogen/2023-07/utilities/cachecustom).',
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'generateCacheControlHeader',
                value: '(cacheOptions: AllCacheOptions) => string',
                description:
                  'Re-export of [`generateCacheControlHeader`](/docs/api/hydrogen/2023-07/utilities/generatecachecontrolheader).',
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'getPublicTokenHeaders',
                value:
                  '(props?: Partial<Pick<StorefrontClientProps, "contentType">> & Pick<StorefrontClientProps, "publicStorefrontToken">) => Record<string, string>',
                description:
                  'Returns an object that contains headers that are needed for each query to Storefront API GraphQL endpoint. See [`getPublicTokenHeaders` in Hydrogen React](/docs/api/hydrogen-react/2023-07/utilities/createstorefrontclient#:~:text=%27graphql%27.-,getPublicTokenHeaders,-(props%3F%3A) for more details.',
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'getPrivateTokenHeaders',
                value:
                  '(props?: Partial<Pick<StorefrontClientProps, "contentType">> & Pick<StorefrontClientProps, "privateStorefrontToken"> & { buyerIp?: string; }) => Record<string, string>',
                description:
                  'Returns an object that contains headers that are needed for each query to Storefront API GraphQL endpoint for API calls made from a server. See [`getPrivateTokenHeaders` in  Hydrogen React](/docs/api/hydrogen-react/2023-07/utilities/createstorefrontclient#:~:text=storefrontApiVersion-,getPrivateTokenHeaders,-(props%3F%3A) for more details.',
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'getShopifyDomain',
                value:
                  '(props?: Partial<Pick<StorefrontClientProps, "storeDomain">>) => string',
                description:
                  'Creates the fully-qualified URL to your myshopify.com domain. See [`getShopifyDomain` in  Hydrogen React](/docs/api/hydrogen-react/2023-07/utilities/createstorefrontclient#:~:text=StorefrontClientReturn-,getShopifyDomain,-(props%3F%3A) for more details.',
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'getApiUrl',
                value:
                  '(props?: Partial<Pick<StorefrontClientProps, "storeDomain" | "storefrontApiVersion">>) => string',
                description:
                  "Creates the fully-qualified URL to your store's GraphQL endpoint. See [`getStorefrontApiUrl` in  Hydrogen React](/docs/api/hydrogen-react/2023-07/utilities/createstorefrontclient#:~:text=storeDomain-,getStorefrontApiUrl,-(props%3F%3A) for more details.",
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'isApiError',
                value: '(error: any) => boolean',
                description:
                  'Determines if the error is resulted from a Storefront API call.',
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'i18n',
                value: 'TI18n',
                description:
                  'The `i18n` object passed in from the `createStorefrontClient` argument.',
              },
            ],
          },
          IsOptionalVariables: {
            filePath: '/storefront.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'IsOptionalVariables',
            value:
              "Omit<\n  OperationTypeValue['variables'],\n  AutoAddedVariableNames\n> extends EmptyVariables\n  ? true // No need to pass variables\n  : GenericVariables extends OperationTypeValue['variables']\n  ? true // We don't know what variables are needed\n  : false",
            description: '',
          },
          AutoAddedVariableNames: {
            filePath: '/storefront.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'AutoAddedVariableNames',
            value: "'country' | 'language'",
            description: '',
          },
          EmptyVariables: {
            filePath: '/storefront.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'EmptyVariables',
            value: '{[key: string]: never}',
            description: '',
            members: [],
          },
          GenericVariables: {
            filePath: '/storefront.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'GenericVariables',
            value: "ExecutionArgs['variableValues']",
            description: '',
          },
          StorefrontQueries: {
            filePath: '/storefront.ts',
            name: 'StorefrontQueries',
            description:
              'Maps all the queries found in the project to variables and return types.',
            members: [],
            value:
              "export interface StorefrontQueries {\n  // Example of how a generated query type looks like:\n  // '#graphql query q1 {...}': {return: Q1Query; variables: Q1QueryVariables};\n}",
          },
          StorefrontQuerySecondParam: {
            filePath: '/storefront.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'StorefrontQuerySecondParam',
            value:
              "(RawGqlString extends keyof StorefrontQueries\n  ? StorefrontCommonOptions<StorefrontQueries[RawGqlString]['variables']>\n  : StorefrontCommonOptions<GenericVariables>) & {cache?: CachingStrategy}",
            description: '',
          },
          StorefrontCommonOptions: {
            filePath: '/storefront.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'StorefrontCommonOptions',
            value:
              '{\n  headers?: HeadersInit;\n  storefrontApiVersion?: string;\n} & (IsOptionalVariables<{variables: Variables}> extends true\n  ? {variables?: Variables}\n  : {variables: Variables})',
            description: '',
          },
          CachingStrategy: {
            filePath: '/cache/strategies.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'CachingStrategy',
            value: 'AllCacheOptions',
            description:
              'Use the `CachingStrategy` to define a custom caching mechanism for your data. Or use one of the pre-defined caching strategies: CacheNone, CacheShort, CacheLong.',
            members: [
              {
                filePath: '/cache/strategies.ts',
                syntaxKind: 'PropertySignature',
                name: 'mode',
                value: 'string',
                description:
                  'The caching mode, generally `public`, `private`, or `no-store`.',
                isOptional: true,
              },
              {
                filePath: '/cache/strategies.ts',
                syntaxKind: 'PropertySignature',
                name: 'maxAge',
                value: 'number',
                description:
                  'The maximum amount of time in seconds that a resource will be considered fresh. See `max-age` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#:~:text=Response%20Directives-,max%2Dage,-The%20max%2Dage).',
                isOptional: true,
              },
              {
                filePath: '/cache/strategies.ts',
                syntaxKind: 'PropertySignature',
                name: 'staleWhileRevalidate',
                value: 'number',
                description:
                  'Indicate that the cache should serve the stale response in the background while revalidating the cache. See `stale-while-revalidate` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#stale-while-revalidate).',
                isOptional: true,
              },
              {
                filePath: '/cache/strategies.ts',
                syntaxKind: 'PropertySignature',
                name: 'sMaxAge',
                value: 'number',
                description:
                  'Similar to `maxAge` but specific to shared caches. See `s-maxage` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#s-maxage).',
                isOptional: true,
              },
              {
                filePath: '/cache/strategies.ts',
                syntaxKind: 'PropertySignature',
                name: 'staleIfError',
                value: 'number',
                description:
                  'Indicate that the cache should serve the stale response if an error occurs while revalidating the cache. See `stale-if-error` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#stale-if-error).',
                isOptional: true,
              },
            ],
          },
          StorefrontMutations: {
            filePath: '/storefront.ts',
            name: 'StorefrontMutations',
            description:
              'Maps all the mutations found in the project to variables and return types.',
            members: [],
            value:
              "export interface StorefrontMutations {\n  // Example of how a generated mutation type looks like:\n  // '#graphql mutation m1 {...}': {return: M1Mutation; variables: M1MutationVariables};\n}",
          },
          StorefrontMutateSecondParam: {
            filePath: '/storefront.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'StorefrontMutateSecondParam',
            value:
              "RawGqlString extends keyof StorefrontMutations\n  ? StorefrontCommonOptions<StorefrontMutations[RawGqlString]['variables']>\n  : StorefrontCommonOptions<GenericVariables>",
            description: '',
          },
          NoStoreStrategy: {
            filePath: '/cache/strategies.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'NoStoreStrategy',
            value: '{\n  mode: string;\n}',
            description: '',
            members: [
              {
                filePath: '/cache/strategies.ts',
                syntaxKind: 'PropertySignature',
                name: 'mode',
                value: 'string',
                description: '',
              },
            ],
          },
          AllCacheOptions: {
            filePath: '/cache/strategies.ts',
            name: 'AllCacheOptions',
            description: 'Override options for a cache strategy.',
            members: [
              {
                filePath: '/cache/strategies.ts',
                syntaxKind: 'PropertySignature',
                name: 'mode',
                value: 'string',
                description:
                  'The caching mode, generally `public`, `private`, or `no-store`.',
                isOptional: true,
              },
              {
                filePath: '/cache/strategies.ts',
                syntaxKind: 'PropertySignature',
                name: 'maxAge',
                value: 'number',
                description:
                  'The maximum amount of time in seconds that a resource will be considered fresh. See `max-age` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#:~:text=Response%20Directives-,max%2Dage,-The%20max%2Dage).',
                isOptional: true,
              },
              {
                filePath: '/cache/strategies.ts',
                syntaxKind: 'PropertySignature',
                name: 'staleWhileRevalidate',
                value: 'number',
                description:
                  'Indicate that the cache should serve the stale response in the background while revalidating the cache. See `stale-while-revalidate` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#stale-while-revalidate).',
                isOptional: true,
              },
              {
                filePath: '/cache/strategies.ts',
                syntaxKind: 'PropertySignature',
                name: 'sMaxAge',
                value: 'number',
                description:
                  'Similar to `maxAge` but specific to shared caches. See `s-maxage` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#s-maxage).',
                isOptional: true,
              },
              {
                filePath: '/cache/strategies.ts',
                syntaxKind: 'PropertySignature',
                name: 'staleIfError',
                value: 'number',
                description:
                  'Indicate that the cache should serve the stale response if an error occurs while revalidating the cache. See `stale-if-error` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#stale-if-error).',
                isOptional: true,
              },
            ],
            value:
              'export interface AllCacheOptions {\n  /**\n   * The caching mode, generally `public`, `private`, or `no-store`.\n   */\n  mode?: string;\n  /**\n   * The maximum amount of time in seconds that a resource will be considered fresh. See `max-age` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#:~:text=Response%20Directives-,max%2Dage,-The%20max%2Dage).\n   */\n  maxAge?: number;\n  /**\n   * Indicate that the cache should serve the stale response in the background while revalidating the cache. See `stale-while-revalidate` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#stale-while-revalidate).\n   */\n  staleWhileRevalidate?: number;\n  /**\n   * Similar to `maxAge` but specific to shared caches. See `s-maxage` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#s-maxage).\n   */\n  sMaxAge?: number;\n  /**\n   * Indicate that the cache should serve the stale response if an error occurs while revalidating the cache. See `stale-if-error` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#stale-if-error).\n   */\n  staleIfError?: number;\n}',
          },
          CartBuyerIdentityUpdateFunction: {
            filePath: '/cart/queries/cartBuyerIdentityUpdateDefault.ts',
            name: 'CartBuyerIdentityUpdateFunction',
            description: '',
            params: [
              {
                name: 'buyerIdentity',
                description: '',
                value: 'CartBuyerIdentityInput',
                filePath: '/cart/queries/cartBuyerIdentityUpdateDefault.ts',
              },
              {
                name: 'optionalParams',
                description: '',
                value: 'CartOptionalInput',
                isOptional: true,
                filePath: '/cart/queries/cartBuyerIdentityUpdateDefault.ts',
              },
            ],
            returns: {
              filePath: '/cart/queries/cartBuyerIdentityUpdateDefault.ts',
              description: '',
              name: 'Promise<CartQueryData>',
              value: 'Promise<CartQueryData>',
            },
            value:
              'export type CartBuyerIdentityUpdateFunction = (\n  buyerIdentity: CartBuyerIdentityInput,\n  optionalParams?: CartOptionalInput,\n) => Promise<CartQueryData>;',
          },
          CartBuyerIdentityInput: {
            description: '',
            name: 'CartBuyerIdentityInput',
            value: 'CartBuyerIdentityInput',
            members: [],
            override:
              '[CartBuyerIdentityInput](/docs/api/storefront/2023-07/input-objects/CartBuyerIdentityInput) - Storefront API type',
          },
          CartOptionalInput: {
            filePath: '/cart/queries/cart-types.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'CartOptionalInput',
            value:
              "{\n  /**\n   * The cart id.\n   * @default cart.getCartId();\n   */\n  cartId?: Scalars['ID'];\n  /**\n   * The country code.\n   * @default storefront.i18n.country\n   */\n  country?: CountryCode;\n  /**\n   * The language code.\n   * @default storefront.i18n.language\n   */\n  language?: LanguageCode;\n}",
            description: '',
            members: [
              {
                filePath: '/cart/queries/cart-types.ts',
                syntaxKind: 'PropertySignature',
                name: 'cartId',
                value: 'string',
                description: 'The cart id.',
                isOptional: true,
                defaultValue: 'cart.getCartId();',
              },
              {
                filePath: '/cart/queries/cart-types.ts',
                syntaxKind: 'PropertySignature',
                name: 'country',
                value: 'CountryCode',
                description: 'The country code.',
                isOptional: true,
                defaultValue: 'storefront.i18n.country',
              },
              {
                filePath: '/cart/queries/cart-types.ts',
                syntaxKind: 'PropertySignature',
                name: 'language',
                value: 'LanguageCode',
                description: 'The language code.',
                isOptional: true,
                defaultValue: 'storefront.i18n.language',
              },
            ],
          },
          CartQueryData: {
            filePath: '/cart/queries/cart-types.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'CartQueryData',
            value:
              '{\n  cart: Cart;\n  errors?:\n    | CartUserError[]\n    | MetafieldsSetUserError[]\n    | MetafieldDeleteUserError[];\n}',
            description: '',
            members: [
              {
                filePath: '/cart/queries/cart-types.ts',
                syntaxKind: 'PropertySignature',
                name: 'cart',
                value: 'Cart',
                description: '',
              },
              {
                filePath: '/cart/queries/cart-types.ts',
                syntaxKind: 'PropertySignature',
                name: 'errors',
                value:
                  'CartUserError[] | MetafieldsSetUserError[] | MetafieldDeleteUserError[]',
                description: '',
                isOptional: true,
              },
            ],
          },
          Cart: {
            description: '',
            name: 'Cart',
            value: 'Cart',
            members: [],
            override:
              '[Cart](/docs/api/storefront/2023-07/objects/Cart) - Storefront API type',
          },
          CartUserError: {
            description: '',
            name: 'CartUserError',
            value: 'CartUserError',
            members: [],
            override:
              '[CartUserError](/docs/api/storefront/2023-07/objects/CartUserError) - Storefront API type',
          },
          MetafieldsSetUserError: {
            description: '',
            name: 'MetafieldsSetUserError',
            value: 'MetafieldsSetUserError',
            members: [],
            override:
              '[MetafieldsSetUserError](/docs/api/storefront/2023-07/objects/MetafieldsSetUserError) - Storefront API type',
          },
          MetafieldDeleteUserError: {
            description: '',
            name: 'MetafieldDeleteUserError',
            value: 'MetafieldDeleteUserError',
            members: [],
            override:
              '[MetafieldDeleteUserError](/docs/api/storefront/2023-07/objects/MetafieldDeleteUserError) - Storefront API type',
          },
        },
      },
    ],
  },
  {
    name: 'cartCreateDefault',
    category: 'utilities',
    isVisualComponent: false,
    related: [],
    description:
      'Creates a function that accepts an object of [CartInput](/docs/api/storefront/2023-07/input-objects/CartInput) and returns a new cart',
    type: 'utility',
    defaultExample: {
      description: 'This is the default example',
      codeblock: {
        tabs: [
          {
            title: 'JavaScript',
            code: "import {cartCreateDefault} from '@shopify/hydrogen';\n\nconst cartCreate = cartCreateDefault({\n  storefront,\n  getCartId,\n});\n\nconst result = await cartCreate({\n  lines: [\n    {\n      merchandiseId: 'gid://shopify/ProductVariant/123456789',\n      quantity: 1,\n    },\n  ],\n});\n",
            language: 'js',
          },
        ],
        title: 'example',
      },
    },
    definitions: [
      {
        title: 'cartCreateDefault',
        description: '',
        type: 'CartCreateDefaultGeneratedType',
        typeDefinitions: {
          CartCreateDefaultGeneratedType: {
            filePath: '/cart/queries/cartCreateDefault.ts',
            name: 'CartCreateDefaultGeneratedType',
            description: '',
            params: [
              {
                name: 'options',
                description: '',
                value: 'CartQueryOptions',
                filePath: '/cart/queries/cartCreateDefault.ts',
              },
            ],
            returns: {
              filePath: '/cart/queries/cartCreateDefault.ts',
              description: '',
              name: 'CartCreateFunction',
              value: 'CartCreateFunction',
            },
            value:
              'export function cartCreateDefault(\n  options: CartQueryOptions,\n): CartCreateFunction {\n  return async (input, optionalParams) => {\n    const {cartId, ...restOfOptionalParams} = optionalParams || {};\n    const {cartCreate} = await options.storefront.mutate<{\n      cartCreate: CartQueryData;\n    }>(CART_CREATE_MUTATION(options.cartFragment), {\n      variables: {\n        input,\n        ...restOfOptionalParams,\n      },\n    });\n    return cartCreate;\n  };\n}',
          },
          CartQueryOptions: {
            filePath: '/cart/queries/cart-types.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'CartQueryOptions',
            value:
              '{\n  /**\n   * The storefront client instance created by [`createStorefrontClient`](docs/api/hydrogen/latest/utilities/createstorefrontclient).\n   */\n  storefront: Storefront;\n  /**\n   * A function that returns the cart ID.\n   */\n  getCartId: () => string | undefined;\n  /**\n   * The cart fragment to override the one used in this query.\n   */\n  cartFragment?: string;\n}',
            description: '',
            members: [
              {
                filePath: '/cart/queries/cart-types.ts',
                syntaxKind: 'PropertySignature',
                name: 'storefront',
                value: 'Storefront',
                description:
                  'The storefront client instance created by [`createStorefrontClient`](docs/api/hydrogen/latest/utilities/createstorefrontclient).',
              },
              {
                filePath: '/cart/queries/cart-types.ts',
                syntaxKind: 'PropertySignature',
                name: 'getCartId',
                value: '() => string',
                description: 'A function that returns the cart ID.',
              },
              {
                filePath: '/cart/queries/cart-types.ts',
                syntaxKind: 'PropertySignature',
                name: 'cartFragment',
                value: 'string',
                description:
                  'The cart fragment to override the one used in this query.',
                isOptional: true,
              },
            ],
          },
          Storefront: {
            filePath: '/storefront.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'Storefront',
            value:
              "{\n  /** The function to run a query on Storefront API. */\n  query: <OverrideReturnType = any, RawGqlString extends string = string>(\n    query: RawGqlString,\n    ...options: RawGqlString extends keyof StorefrontQueries // Do we have any generated query types?\n      ? IsOptionalVariables<StorefrontQueries[RawGqlString]> extends true\n        ? [StorefrontQuerySecondParam<RawGqlString>?] // Using codegen, query has no variables\n        : [StorefrontQuerySecondParam<RawGqlString>] // Using codegen, query needs variables\n      : [StorefrontQuerySecondParam?] // No codegen, variables always optional\n  ) => Promise<\n    RawGqlString extends keyof StorefrontQueries // Do we have any generated query types?\n      ? StorefrontQueries[RawGqlString]['return'] // Using codegen, return type is known\n      : OverrideReturnType // No codegen, let user specify return type\n  >;\n  /** The function to run a mutation on Storefront API. */\n  mutate: <OverrideReturnType = any, RawGqlString extends string = string>(\n    mutation: RawGqlString,\n    ...options: RawGqlString extends keyof StorefrontMutations // Do we have any generated mutation types?\n      ? IsOptionalVariables<StorefrontMutations[RawGqlString]> extends true\n        ? [StorefrontMutateSecondParam<RawGqlString>?] // Using codegen, mutation has no variables\n        : [StorefrontMutateSecondParam<RawGqlString>] // Using codegen, mutation needs variables\n      : [StorefrontMutateSecondParam?] // No codegen, variables always optional\n  ) => Promise<\n    RawGqlString extends keyof StorefrontMutations // Do we have any generated mutation types?\n      ? StorefrontMutations[RawGqlString]['return'] // Using codegen, return type is known\n      : OverrideReturnType // No codegen, let user specify return type\n  >;\n  /** The cache instance passed in from the `createStorefrontClient` argument. */\n  cache?: Cache;\n  /** Re-export of [`CacheNone`](/docs/api/hydrogen/2023-07/utilities/cachenone). */\n  CacheNone: typeof CacheNone;\n  /** Re-export of [`CacheLong`](/docs/api/hydrogen/2023-07/utilities/cachelong). */\n  CacheLong: typeof CacheLong;\n  /** Re-export of [`CacheShort`](/docs/api/hydrogen/2023-07/utilities/cacheshort). */\n  CacheShort: typeof CacheShort;\n  /** Re-export of [`CacheCustom`](/docs/api/hydrogen/2023-07/utilities/cachecustom). */\n  CacheCustom: typeof CacheCustom;\n  /** Re-export of [`generateCacheControlHeader`](/docs/api/hydrogen/2023-07/utilities/generatecachecontrolheader). */\n  generateCacheControlHeader: typeof generateCacheControlHeader;\n  /** Returns an object that contains headers that are needed for each query to Storefront API GraphQL endpoint. See [`getPublicTokenHeaders` in Hydrogen React](/docs/api/hydrogen-react/2023-07/utilities/createstorefrontclient#:~:text=%27graphql%27.-,getPublicTokenHeaders,-(props%3F%3A) for more details. */\n  getPublicTokenHeaders: ReturnType<\n    typeof createStorefrontUtilities\n  >['getPublicTokenHeaders'];\n  /** Returns an object that contains headers that are needed for each query to Storefront API GraphQL endpoint for API calls made from a server. See [`getPrivateTokenHeaders` in  Hydrogen React](/docs/api/hydrogen-react/2023-07/utilities/createstorefrontclient#:~:text=storefrontApiVersion-,getPrivateTokenHeaders,-(props%3F%3A) for more details.*/\n  getPrivateTokenHeaders: ReturnType<\n    typeof createStorefrontUtilities\n  >['getPrivateTokenHeaders'];\n  /** Creates the fully-qualified URL to your myshopify.com domain. See [`getShopifyDomain` in  Hydrogen React](/docs/api/hydrogen-react/2023-07/utilities/createstorefrontclient#:~:text=StorefrontClientReturn-,getShopifyDomain,-(props%3F%3A) for more details. */\n  getShopifyDomain: ReturnType<\n    typeof createStorefrontUtilities\n  >['getShopifyDomain'];\n  /** Creates the fully-qualified URL to your store's GraphQL endpoint. See [`getStorefrontApiUrl` in  Hydrogen React](/docs/api/hydrogen-react/2023-07/utilities/createstorefrontclient#:~:text=storeDomain-,getStorefrontApiUrl,-(props%3F%3A) for more details.*/\n  getApiUrl: ReturnType<\n    typeof createStorefrontUtilities\n  >['getStorefrontApiUrl'];\n  /** Determines if the error is resulted from a Storefront API call. */\n  isApiError: (error: any) => boolean;\n  /** The `i18n` object passed in from the `createStorefrontClient` argument. */\n  i18n: TI18n;\n}",
            description: 'Interface to interact with the Storefront API.',
            members: [
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'query',
                value:
                  '<OverrideReturnType = any, RawGqlString extends string = string>(query: RawGqlString, ...options: RawGqlString extends never ? IsOptionalVariables<StorefrontQueries[RawGqlString]> extends true ? [StorefrontQuerySecondParam<RawGqlString>?] : [StorefrontQuerySecondParam<RawGqlString>] : [StorefrontQuerySecondParam<string>?]) => Promise<RawGqlString extends never ? StorefrontQueries[RawGqlString]["return"] : OverrideReturnType>',
                description: 'The function to run a query on Storefront API.',
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'mutate',
                value:
                  '<OverrideReturnType = any, RawGqlString extends string = string>(mutation: RawGqlString, ...options: RawGqlString extends never ? IsOptionalVariables<StorefrontMutations[RawGqlString]> extends true ? [StorefrontMutateSecondParam<RawGqlString>?] : [StorefrontMutateSecondParam<RawGqlString>] : [StorefrontCommonOptions<{ readonly [variable: string]: unknown; }>?]) => Promise<RawGqlString extends never ? StorefrontMutations[RawGqlString]["return"] : OverrideReturnType>',
                description:
                  'The function to run a mutation on Storefront API.',
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'cache',
                value: 'Cache',
                description:
                  'The cache instance passed in from the `createStorefrontClient` argument.',
                isOptional: true,
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'CacheNone',
                value: '() => NoStoreStrategy',
                description:
                  'Re-export of [`CacheNone`](/docs/api/hydrogen/2023-07/utilities/cachenone).',
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'CacheLong',
                value: '(overrideOptions?: AllCacheOptions) => AllCacheOptions',
                description:
                  'Re-export of [`CacheLong`](/docs/api/hydrogen/2023-07/utilities/cachelong).',
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'CacheShort',
                value: '(overrideOptions?: AllCacheOptions) => AllCacheOptions',
                description:
                  'Re-export of [`CacheShort`](/docs/api/hydrogen/2023-07/utilities/cacheshort).',
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'CacheCustom',
                value: '(overrideOptions: AllCacheOptions) => AllCacheOptions',
                description:
                  'Re-export of [`CacheCustom`](/docs/api/hydrogen/2023-07/utilities/cachecustom).',
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'generateCacheControlHeader',
                value: '(cacheOptions: AllCacheOptions) => string',
                description:
                  'Re-export of [`generateCacheControlHeader`](/docs/api/hydrogen/2023-07/utilities/generatecachecontrolheader).',
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'getPublicTokenHeaders',
                value:
                  '(props?: Partial<Pick<StorefrontClientProps, "contentType">> & Pick<StorefrontClientProps, "publicStorefrontToken">) => Record<string, string>',
                description:
                  'Returns an object that contains headers that are needed for each query to Storefront API GraphQL endpoint. See [`getPublicTokenHeaders` in Hydrogen React](/docs/api/hydrogen-react/2023-07/utilities/createstorefrontclient#:~:text=%27graphql%27.-,getPublicTokenHeaders,-(props%3F%3A) for more details.',
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'getPrivateTokenHeaders',
                value:
                  '(props?: Partial<Pick<StorefrontClientProps, "contentType">> & Pick<StorefrontClientProps, "privateStorefrontToken"> & { buyerIp?: string; }) => Record<string, string>',
                description:
                  'Returns an object that contains headers that are needed for each query to Storefront API GraphQL endpoint for API calls made from a server. See [`getPrivateTokenHeaders` in  Hydrogen React](/docs/api/hydrogen-react/2023-07/utilities/createstorefrontclient#:~:text=storefrontApiVersion-,getPrivateTokenHeaders,-(props%3F%3A) for more details.',
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'getShopifyDomain',
                value:
                  '(props?: Partial<Pick<StorefrontClientProps, "storeDomain">>) => string',
                description:
                  'Creates the fully-qualified URL to your myshopify.com domain. See [`getShopifyDomain` in  Hydrogen React](/docs/api/hydrogen-react/2023-07/utilities/createstorefrontclient#:~:text=StorefrontClientReturn-,getShopifyDomain,-(props%3F%3A) for more details.',
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'getApiUrl',
                value:
                  '(props?: Partial<Pick<StorefrontClientProps, "storeDomain" | "storefrontApiVersion">>) => string',
                description:
                  "Creates the fully-qualified URL to your store's GraphQL endpoint. See [`getStorefrontApiUrl` in  Hydrogen React](/docs/api/hydrogen-react/2023-07/utilities/createstorefrontclient#:~:text=storeDomain-,getStorefrontApiUrl,-(props%3F%3A) for more details.",
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'isApiError',
                value: '(error: any) => boolean',
                description:
                  'Determines if the error is resulted from a Storefront API call.',
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'i18n',
                value: 'TI18n',
                description:
                  'The `i18n` object passed in from the `createStorefrontClient` argument.',
              },
            ],
          },
          IsOptionalVariables: {
            filePath: '/storefront.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'IsOptionalVariables',
            value:
              "Omit<\n  OperationTypeValue['variables'],\n  AutoAddedVariableNames\n> extends EmptyVariables\n  ? true // No need to pass variables\n  : GenericVariables extends OperationTypeValue['variables']\n  ? true // We don't know what variables are needed\n  : false",
            description: '',
          },
          AutoAddedVariableNames: {
            filePath: '/storefront.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'AutoAddedVariableNames',
            value: "'country' | 'language'",
            description: '',
          },
          EmptyVariables: {
            filePath: '/storefront.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'EmptyVariables',
            value: '{[key: string]: never}',
            description: '',
            members: [],
          },
          GenericVariables: {
            filePath: '/storefront.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'GenericVariables',
            value: "ExecutionArgs['variableValues']",
            description: '',
          },
          StorefrontQueries: {
            filePath: '/storefront.ts',
            name: 'StorefrontQueries',
            description:
              'Maps all the queries found in the project to variables and return types.',
            members: [],
            value:
              "export interface StorefrontQueries {\n  // Example of how a generated query type looks like:\n  // '#graphql query q1 {...}': {return: Q1Query; variables: Q1QueryVariables};\n}",
          },
          StorefrontQuerySecondParam: {
            filePath: '/storefront.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'StorefrontQuerySecondParam',
            value:
              "(RawGqlString extends keyof StorefrontQueries\n  ? StorefrontCommonOptions<StorefrontQueries[RawGqlString]['variables']>\n  : StorefrontCommonOptions<GenericVariables>) & {cache?: CachingStrategy}",
            description: '',
          },
          StorefrontCommonOptions: {
            filePath: '/storefront.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'StorefrontCommonOptions',
            value:
              '{\n  headers?: HeadersInit;\n  storefrontApiVersion?: string;\n} & (IsOptionalVariables<{variables: Variables}> extends true\n  ? {variables?: Variables}\n  : {variables: Variables})',
            description: '',
          },
          CachingStrategy: {
            filePath: '/cache/strategies.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'CachingStrategy',
            value: 'AllCacheOptions',
            description:
              'Use the `CachingStrategy` to define a custom caching mechanism for your data. Or use one of the pre-defined caching strategies: CacheNone, CacheShort, CacheLong.',
            members: [
              {
                filePath: '/cache/strategies.ts',
                syntaxKind: 'PropertySignature',
                name: 'mode',
                value: 'string',
                description:
                  'The caching mode, generally `public`, `private`, or `no-store`.',
                isOptional: true,
              },
              {
                filePath: '/cache/strategies.ts',
                syntaxKind: 'PropertySignature',
                name: 'maxAge',
                value: 'number',
                description:
                  'The maximum amount of time in seconds that a resource will be considered fresh. See `max-age` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#:~:text=Response%20Directives-,max%2Dage,-The%20max%2Dage).',
                isOptional: true,
              },
              {
                filePath: '/cache/strategies.ts',
                syntaxKind: 'PropertySignature',
                name: 'staleWhileRevalidate',
                value: 'number',
                description:
                  'Indicate that the cache should serve the stale response in the background while revalidating the cache. See `stale-while-revalidate` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#stale-while-revalidate).',
                isOptional: true,
              },
              {
                filePath: '/cache/strategies.ts',
                syntaxKind: 'PropertySignature',
                name: 'sMaxAge',
                value: 'number',
                description:
                  'Similar to `maxAge` but specific to shared caches. See `s-maxage` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#s-maxage).',
                isOptional: true,
              },
              {
                filePath: '/cache/strategies.ts',
                syntaxKind: 'PropertySignature',
                name: 'staleIfError',
                value: 'number',
                description:
                  'Indicate that the cache should serve the stale response if an error occurs while revalidating the cache. See `stale-if-error` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#stale-if-error).',
                isOptional: true,
              },
            ],
          },
          StorefrontMutations: {
            filePath: '/storefront.ts',
            name: 'StorefrontMutations',
            description:
              'Maps all the mutations found in the project to variables and return types.',
            members: [],
            value:
              "export interface StorefrontMutations {\n  // Example of how a generated mutation type looks like:\n  // '#graphql mutation m1 {...}': {return: M1Mutation; variables: M1MutationVariables};\n}",
          },
          StorefrontMutateSecondParam: {
            filePath: '/storefront.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'StorefrontMutateSecondParam',
            value:
              "RawGqlString extends keyof StorefrontMutations\n  ? StorefrontCommonOptions<StorefrontMutations[RawGqlString]['variables']>\n  : StorefrontCommonOptions<GenericVariables>",
            description: '',
          },
          NoStoreStrategy: {
            filePath: '/cache/strategies.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'NoStoreStrategy',
            value: '{\n  mode: string;\n}',
            description: '',
            members: [
              {
                filePath: '/cache/strategies.ts',
                syntaxKind: 'PropertySignature',
                name: 'mode',
                value: 'string',
                description: '',
              },
            ],
          },
          AllCacheOptions: {
            filePath: '/cache/strategies.ts',
            name: 'AllCacheOptions',
            description: 'Override options for a cache strategy.',
            members: [
              {
                filePath: '/cache/strategies.ts',
                syntaxKind: 'PropertySignature',
                name: 'mode',
                value: 'string',
                description:
                  'The caching mode, generally `public`, `private`, or `no-store`.',
                isOptional: true,
              },
              {
                filePath: '/cache/strategies.ts',
                syntaxKind: 'PropertySignature',
                name: 'maxAge',
                value: 'number',
                description:
                  'The maximum amount of time in seconds that a resource will be considered fresh. See `max-age` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#:~:text=Response%20Directives-,max%2Dage,-The%20max%2Dage).',
                isOptional: true,
              },
              {
                filePath: '/cache/strategies.ts',
                syntaxKind: 'PropertySignature',
                name: 'staleWhileRevalidate',
                value: 'number',
                description:
                  'Indicate that the cache should serve the stale response in the background while revalidating the cache. See `stale-while-revalidate` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#stale-while-revalidate).',
                isOptional: true,
              },
              {
                filePath: '/cache/strategies.ts',
                syntaxKind: 'PropertySignature',
                name: 'sMaxAge',
                value: 'number',
                description:
                  'Similar to `maxAge` but specific to shared caches. See `s-maxage` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#s-maxage).',
                isOptional: true,
              },
              {
                filePath: '/cache/strategies.ts',
                syntaxKind: 'PropertySignature',
                name: 'staleIfError',
                value: 'number',
                description:
                  'Indicate that the cache should serve the stale response if an error occurs while revalidating the cache. See `stale-if-error` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#stale-if-error).',
                isOptional: true,
              },
            ],
            value:
              'export interface AllCacheOptions {\n  /**\n   * The caching mode, generally `public`, `private`, or `no-store`.\n   */\n  mode?: string;\n  /**\n   * The maximum amount of time in seconds that a resource will be considered fresh. See `max-age` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#:~:text=Response%20Directives-,max%2Dage,-The%20max%2Dage).\n   */\n  maxAge?: number;\n  /**\n   * Indicate that the cache should serve the stale response in the background while revalidating the cache. See `stale-while-revalidate` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#stale-while-revalidate).\n   */\n  staleWhileRevalidate?: number;\n  /**\n   * Similar to `maxAge` but specific to shared caches. See `s-maxage` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#s-maxage).\n   */\n  sMaxAge?: number;\n  /**\n   * Indicate that the cache should serve the stale response if an error occurs while revalidating the cache. See `stale-if-error` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#stale-if-error).\n   */\n  staleIfError?: number;\n}',
          },
          CartCreateFunction: {
            filePath: '/cart/queries/cartCreateDefault.ts',
            name: 'CartCreateFunction',
            description: '',
            params: [
              {
                name: 'input',
                description: '',
                value: 'CartInput',
                filePath: '/cart/queries/cartCreateDefault.ts',
              },
              {
                name: 'optionalParams',
                description: '',
                value: 'CartOptionalInput',
                isOptional: true,
                filePath: '/cart/queries/cartCreateDefault.ts',
              },
            ],
            returns: {
              filePath: '/cart/queries/cartCreateDefault.ts',
              description: '',
              name: 'Promise<CartQueryData>',
              value: 'Promise<CartQueryData>',
            },
            value:
              'export type CartCreateFunction = (\n  input: CartInput,\n  optionalParams?: CartOptionalInput,\n) => Promise<CartQueryData>;',
          },
          CartInput: {
            description: '',
            name: 'CartInput',
            value: 'CartInput',
            members: [],
            override:
              '[CartInput](/docs/api/storefront/2023-07/input-objects/CartInput) - Storefront API type',
          },
          CartOptionalInput: {
            filePath: '/cart/queries/cart-types.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'CartOptionalInput',
            value:
              "{\n  /**\n   * The cart id.\n   * @default cart.getCartId();\n   */\n  cartId?: Scalars['ID'];\n  /**\n   * The country code.\n   * @default storefront.i18n.country\n   */\n  country?: CountryCode;\n  /**\n   * The language code.\n   * @default storefront.i18n.language\n   */\n  language?: LanguageCode;\n}",
            description: '',
            members: [
              {
                filePath: '/cart/queries/cart-types.ts',
                syntaxKind: 'PropertySignature',
                name: 'cartId',
                value: 'string',
                description: 'The cart id.',
                isOptional: true,
                defaultValue: 'cart.getCartId();',
              },
              {
                filePath: '/cart/queries/cart-types.ts',
                syntaxKind: 'PropertySignature',
                name: 'country',
                value: 'CountryCode',
                description: 'The country code.',
                isOptional: true,
                defaultValue: 'storefront.i18n.country',
              },
              {
                filePath: '/cart/queries/cart-types.ts',
                syntaxKind: 'PropertySignature',
                name: 'language',
                value: 'LanguageCode',
                description: 'The language code.',
                isOptional: true,
                defaultValue: 'storefront.i18n.language',
              },
            ],
          },
          CartQueryData: {
            filePath: '/cart/queries/cart-types.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'CartQueryData',
            value:
              '{\n  cart: Cart;\n  errors?:\n    | CartUserError[]\n    | MetafieldsSetUserError[]\n    | MetafieldDeleteUserError[];\n}',
            description: '',
            members: [
              {
                filePath: '/cart/queries/cart-types.ts',
                syntaxKind: 'PropertySignature',
                name: 'cart',
                value: 'Cart',
                description: '',
              },
              {
                filePath: '/cart/queries/cart-types.ts',
                syntaxKind: 'PropertySignature',
                name: 'errors',
                value:
                  'CartUserError[] | MetafieldsSetUserError[] | MetafieldDeleteUserError[]',
                description: '',
                isOptional: true,
              },
            ],
          },
          Cart: {
            description: '',
            name: 'Cart',
            value: 'Cart',
            members: [],
            override:
              '[Cart](/docs/api/storefront/2023-07/objects/Cart) - Storefront API type',
          },
          CartUserError: {
            description: '',
            name: 'CartUserError',
            value: 'CartUserError',
            members: [],
            override:
              '[CartUserError](/docs/api/storefront/2023-07/objects/CartUserError) - Storefront API type',
          },
          MetafieldsSetUserError: {
            description: '',
            name: 'MetafieldsSetUserError',
            value: 'MetafieldsSetUserError',
            members: [],
            override:
              '[MetafieldsSetUserError](/docs/api/storefront/2023-07/objects/MetafieldsSetUserError) - Storefront API type',
          },
          MetafieldDeleteUserError: {
            description: '',
            name: 'MetafieldDeleteUserError',
            value: 'MetafieldDeleteUserError',
            members: [],
            override:
              '[MetafieldDeleteUserError](/docs/api/storefront/2023-07/objects/MetafieldDeleteUserError) - Storefront API type',
          },
        },
      },
    ],
  },
  {
    name: 'cartDiscountCodesUpdateDefault',
    category: 'utilities',
    isVisualComponent: false,
    related: [],
    description:
      'Creates a function that accepts an array of strings and adds the discount codes to a cart',
    type: 'utility',
    defaultExample: {
      description: 'This is the default example',
      codeblock: {
        tabs: [
          {
            title: 'JavaScript',
            code: "import {cartDiscountCodesUpdateDefault} from '@shopify/hydrogen';\n\nconst cartDiscount = cartDiscountCodesUpdateDefault({\n  storefront,\n  getCartId,\n});\n\nconst result = await cartDiscount(['FREE_SHIPPING']);\n",
            language: 'js',
          },
        ],
        title: 'example',
      },
    },
    definitions: [
      {
        title: 'cartDiscountCodesUpdateDefault',
        description: '',
        type: 'CartDiscountCodesUpdateDefaultGeneratedType',
        typeDefinitions: {
          CartDiscountCodesUpdateDefaultGeneratedType: {
            filePath: '/cart/queries/cartDiscountCodesUpdateDefault.ts',
            name: 'CartDiscountCodesUpdateDefaultGeneratedType',
            description: '',
            params: [
              {
                name: 'options',
                description: '',
                value: 'CartQueryOptions',
                filePath: '/cart/queries/cartDiscountCodesUpdateDefault.ts',
              },
            ],
            returns: {
              filePath: '/cart/queries/cartDiscountCodesUpdateDefault.ts',
              description: '',
              name: 'CartDiscountCodesUpdateFunction',
              value: 'CartDiscountCodesUpdateFunction',
            },
            value:
              'export function cartDiscountCodesUpdateDefault(\n  options: CartQueryOptions,\n): CartDiscountCodesUpdateFunction {\n  return async (discountCodes, optionalParams) => {\n    // Ensure the discount codes are unique\n    const uniqueCodes = discountCodes.filter((value, index, array) => {\n      return array.indexOf(value) === index;\n    });\n\n    const {cartDiscountCodesUpdate} = await options.storefront.mutate<{\n      cartDiscountCodesUpdate: CartQueryData;\n    }>(CART_DISCOUNT_CODE_UPDATE_MUTATION(options.cartFragment), {\n      variables: {\n        cartId: options.getCartId(),\n        discountCodes: uniqueCodes,\n        ...optionalParams,\n      },\n    });\n    return cartDiscountCodesUpdate;\n  };\n}',
          },
          CartQueryOptions: {
            filePath: '/cart/queries/cart-types.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'CartQueryOptions',
            value:
              '{\n  /**\n   * The storefront client instance created by [`createStorefrontClient`](docs/api/hydrogen/latest/utilities/createstorefrontclient).\n   */\n  storefront: Storefront;\n  /**\n   * A function that returns the cart ID.\n   */\n  getCartId: () => string | undefined;\n  /**\n   * The cart fragment to override the one used in this query.\n   */\n  cartFragment?: string;\n}',
            description: '',
            members: [
              {
                filePath: '/cart/queries/cart-types.ts',
                syntaxKind: 'PropertySignature',
                name: 'storefront',
                value: 'Storefront',
                description:
                  'The storefront client instance created by [`createStorefrontClient`](docs/api/hydrogen/latest/utilities/createstorefrontclient).',
              },
              {
                filePath: '/cart/queries/cart-types.ts',
                syntaxKind: 'PropertySignature',
                name: 'getCartId',
                value: '() => string',
                description: 'A function that returns the cart ID.',
              },
              {
                filePath: '/cart/queries/cart-types.ts',
                syntaxKind: 'PropertySignature',
                name: 'cartFragment',
                value: 'string',
                description:
                  'The cart fragment to override the one used in this query.',
                isOptional: true,
              },
            ],
          },
          Storefront: {
            filePath: '/storefront.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'Storefront',
            value:
              "{\n  /** The function to run a query on Storefront API. */\n  query: <OverrideReturnType = any, RawGqlString extends string = string>(\n    query: RawGqlString,\n    ...options: RawGqlString extends keyof StorefrontQueries // Do we have any generated query types?\n      ? IsOptionalVariables<StorefrontQueries[RawGqlString]> extends true\n        ? [StorefrontQuerySecondParam<RawGqlString>?] // Using codegen, query has no variables\n        : [StorefrontQuerySecondParam<RawGqlString>] // Using codegen, query needs variables\n      : [StorefrontQuerySecondParam?] // No codegen, variables always optional\n  ) => Promise<\n    RawGqlString extends keyof StorefrontQueries // Do we have any generated query types?\n      ? StorefrontQueries[RawGqlString]['return'] // Using codegen, return type is known\n      : OverrideReturnType // No codegen, let user specify return type\n  >;\n  /** The function to run a mutation on Storefront API. */\n  mutate: <OverrideReturnType = any, RawGqlString extends string = string>(\n    mutation: RawGqlString,\n    ...options: RawGqlString extends keyof StorefrontMutations // Do we have any generated mutation types?\n      ? IsOptionalVariables<StorefrontMutations[RawGqlString]> extends true\n        ? [StorefrontMutateSecondParam<RawGqlString>?] // Using codegen, mutation has no variables\n        : [StorefrontMutateSecondParam<RawGqlString>] // Using codegen, mutation needs variables\n      : [StorefrontMutateSecondParam?] // No codegen, variables always optional\n  ) => Promise<\n    RawGqlString extends keyof StorefrontMutations // Do we have any generated mutation types?\n      ? StorefrontMutations[RawGqlString]['return'] // Using codegen, return type is known\n      : OverrideReturnType // No codegen, let user specify return type\n  >;\n  /** The cache instance passed in from the `createStorefrontClient` argument. */\n  cache?: Cache;\n  /** Re-export of [`CacheNone`](/docs/api/hydrogen/2023-07/utilities/cachenone). */\n  CacheNone: typeof CacheNone;\n  /** Re-export of [`CacheLong`](/docs/api/hydrogen/2023-07/utilities/cachelong). */\n  CacheLong: typeof CacheLong;\n  /** Re-export of [`CacheShort`](/docs/api/hydrogen/2023-07/utilities/cacheshort). */\n  CacheShort: typeof CacheShort;\n  /** Re-export of [`CacheCustom`](/docs/api/hydrogen/2023-07/utilities/cachecustom). */\n  CacheCustom: typeof CacheCustom;\n  /** Re-export of [`generateCacheControlHeader`](/docs/api/hydrogen/2023-07/utilities/generatecachecontrolheader). */\n  generateCacheControlHeader: typeof generateCacheControlHeader;\n  /** Returns an object that contains headers that are needed for each query to Storefront API GraphQL endpoint. See [`getPublicTokenHeaders` in Hydrogen React](/docs/api/hydrogen-react/2023-07/utilities/createstorefrontclient#:~:text=%27graphql%27.-,getPublicTokenHeaders,-(props%3F%3A) for more details. */\n  getPublicTokenHeaders: ReturnType<\n    typeof createStorefrontUtilities\n  >['getPublicTokenHeaders'];\n  /** Returns an object that contains headers that are needed for each query to Storefront API GraphQL endpoint for API calls made from a server. See [`getPrivateTokenHeaders` in  Hydrogen React](/docs/api/hydrogen-react/2023-07/utilities/createstorefrontclient#:~:text=storefrontApiVersion-,getPrivateTokenHeaders,-(props%3F%3A) for more details.*/\n  getPrivateTokenHeaders: ReturnType<\n    typeof createStorefrontUtilities\n  >['getPrivateTokenHeaders'];\n  /** Creates the fully-qualified URL to your myshopify.com domain. See [`getShopifyDomain` in  Hydrogen React](/docs/api/hydrogen-react/2023-07/utilities/createstorefrontclient#:~:text=StorefrontClientReturn-,getShopifyDomain,-(props%3F%3A) for more details. */\n  getShopifyDomain: ReturnType<\n    typeof createStorefrontUtilities\n  >['getShopifyDomain'];\n  /** Creates the fully-qualified URL to your store's GraphQL endpoint. See [`getStorefrontApiUrl` in  Hydrogen React](/docs/api/hydrogen-react/2023-07/utilities/createstorefrontclient#:~:text=storeDomain-,getStorefrontApiUrl,-(props%3F%3A) for more details.*/\n  getApiUrl: ReturnType<\n    typeof createStorefrontUtilities\n  >['getStorefrontApiUrl'];\n  /** Determines if the error is resulted from a Storefront API call. */\n  isApiError: (error: any) => boolean;\n  /** The `i18n` object passed in from the `createStorefrontClient` argument. */\n  i18n: TI18n;\n}",
            description: 'Interface to interact with the Storefront API.',
            members: [
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'query',
                value:
                  '<OverrideReturnType = any, RawGqlString extends string = string>(query: RawGqlString, ...options: RawGqlString extends never ? IsOptionalVariables<StorefrontQueries[RawGqlString]> extends true ? [StorefrontQuerySecondParam<RawGqlString>?] : [StorefrontQuerySecondParam<RawGqlString>] : [StorefrontQuerySecondParam<string>?]) => Promise<RawGqlString extends never ? StorefrontQueries[RawGqlString]["return"] : OverrideReturnType>',
                description: 'The function to run a query on Storefront API.',
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'mutate',
                value:
                  '<OverrideReturnType = any, RawGqlString extends string = string>(mutation: RawGqlString, ...options: RawGqlString extends never ? IsOptionalVariables<StorefrontMutations[RawGqlString]> extends true ? [StorefrontMutateSecondParam<RawGqlString>?] : [StorefrontMutateSecondParam<RawGqlString>] : [StorefrontCommonOptions<{ readonly [variable: string]: unknown; }>?]) => Promise<RawGqlString extends never ? StorefrontMutations[RawGqlString]["return"] : OverrideReturnType>',
                description:
                  'The function to run a mutation on Storefront API.',
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'cache',
                value: 'Cache',
                description:
                  'The cache instance passed in from the `createStorefrontClient` argument.',
                isOptional: true,
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'CacheNone',
                value: '() => NoStoreStrategy',
                description:
                  'Re-export of [`CacheNone`](/docs/api/hydrogen/2023-07/utilities/cachenone).',
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'CacheLong',
                value: '(overrideOptions?: AllCacheOptions) => AllCacheOptions',
                description:
                  'Re-export of [`CacheLong`](/docs/api/hydrogen/2023-07/utilities/cachelong).',
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'CacheShort',
                value: '(overrideOptions?: AllCacheOptions) => AllCacheOptions',
                description:
                  'Re-export of [`CacheShort`](/docs/api/hydrogen/2023-07/utilities/cacheshort).',
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'CacheCustom',
                value: '(overrideOptions: AllCacheOptions) => AllCacheOptions',
                description:
                  'Re-export of [`CacheCustom`](/docs/api/hydrogen/2023-07/utilities/cachecustom).',
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'generateCacheControlHeader',
                value: '(cacheOptions: AllCacheOptions) => string',
                description:
                  'Re-export of [`generateCacheControlHeader`](/docs/api/hydrogen/2023-07/utilities/generatecachecontrolheader).',
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'getPublicTokenHeaders',
                value:
                  '(props?: Partial<Pick<StorefrontClientProps, "contentType">> & Pick<StorefrontClientProps, "publicStorefrontToken">) => Record<string, string>',
                description:
                  'Returns an object that contains headers that are needed for each query to Storefront API GraphQL endpoint. See [`getPublicTokenHeaders` in Hydrogen React](/docs/api/hydrogen-react/2023-07/utilities/createstorefrontclient#:~:text=%27graphql%27.-,getPublicTokenHeaders,-(props%3F%3A) for more details.',
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'getPrivateTokenHeaders',
                value:
                  '(props?: Partial<Pick<StorefrontClientProps, "contentType">> & Pick<StorefrontClientProps, "privateStorefrontToken"> & { buyerIp?: string; }) => Record<string, string>',
                description:
                  'Returns an object that contains headers that are needed for each query to Storefront API GraphQL endpoint for API calls made from a server. See [`getPrivateTokenHeaders` in  Hydrogen React](/docs/api/hydrogen-react/2023-07/utilities/createstorefrontclient#:~:text=storefrontApiVersion-,getPrivateTokenHeaders,-(props%3F%3A) for more details.',
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'getShopifyDomain',
                value:
                  '(props?: Partial<Pick<StorefrontClientProps, "storeDomain">>) => string',
                description:
                  'Creates the fully-qualified URL to your myshopify.com domain. See [`getShopifyDomain` in  Hydrogen React](/docs/api/hydrogen-react/2023-07/utilities/createstorefrontclient#:~:text=StorefrontClientReturn-,getShopifyDomain,-(props%3F%3A) for more details.',
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'getApiUrl',
                value:
                  '(props?: Partial<Pick<StorefrontClientProps, "storeDomain" | "storefrontApiVersion">>) => string',
                description:
                  "Creates the fully-qualified URL to your store's GraphQL endpoint. See [`getStorefrontApiUrl` in  Hydrogen React](/docs/api/hydrogen-react/2023-07/utilities/createstorefrontclient#:~:text=storeDomain-,getStorefrontApiUrl,-(props%3F%3A) for more details.",
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'isApiError',
                value: '(error: any) => boolean',
                description:
                  'Determines if the error is resulted from a Storefront API call.',
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'i18n',
                value: 'TI18n',
                description:
                  'The `i18n` object passed in from the `createStorefrontClient` argument.',
              },
            ],
          },
          IsOptionalVariables: {
            filePath: '/storefront.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'IsOptionalVariables',
            value:
              "Omit<\n  OperationTypeValue['variables'],\n  AutoAddedVariableNames\n> extends EmptyVariables\n  ? true // No need to pass variables\n  : GenericVariables extends OperationTypeValue['variables']\n  ? true // We don't know what variables are needed\n  : false",
            description: '',
          },
          AutoAddedVariableNames: {
            filePath: '/storefront.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'AutoAddedVariableNames',
            value: "'country' | 'language'",
            description: '',
          },
          EmptyVariables: {
            filePath: '/storefront.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'EmptyVariables',
            value: '{[key: string]: never}',
            description: '',
            members: [],
          },
          GenericVariables: {
            filePath: '/storefront.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'GenericVariables',
            value: "ExecutionArgs['variableValues']",
            description: '',
          },
          StorefrontQueries: {
            filePath: '/storefront.ts',
            name: 'StorefrontQueries',
            description:
              'Maps all the queries found in the project to variables and return types.',
            members: [],
            value:
              "export interface StorefrontQueries {\n  // Example of how a generated query type looks like:\n  // '#graphql query q1 {...}': {return: Q1Query; variables: Q1QueryVariables};\n}",
          },
          StorefrontQuerySecondParam: {
            filePath: '/storefront.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'StorefrontQuerySecondParam',
            value:
              "(RawGqlString extends keyof StorefrontQueries\n  ? StorefrontCommonOptions<StorefrontQueries[RawGqlString]['variables']>\n  : StorefrontCommonOptions<GenericVariables>) & {cache?: CachingStrategy}",
            description: '',
          },
          StorefrontCommonOptions: {
            filePath: '/storefront.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'StorefrontCommonOptions',
            value:
              '{\n  headers?: HeadersInit;\n  storefrontApiVersion?: string;\n} & (IsOptionalVariables<{variables: Variables}> extends true\n  ? {variables?: Variables}\n  : {variables: Variables})',
            description: '',
          },
          CachingStrategy: {
            filePath: '/cache/strategies.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'CachingStrategy',
            value: 'AllCacheOptions',
            description:
              'Use the `CachingStrategy` to define a custom caching mechanism for your data. Or use one of the pre-defined caching strategies: CacheNone, CacheShort, CacheLong.',
            members: [
              {
                filePath: '/cache/strategies.ts',
                syntaxKind: 'PropertySignature',
                name: 'mode',
                value: 'string',
                description:
                  'The caching mode, generally `public`, `private`, or `no-store`.',
                isOptional: true,
              },
              {
                filePath: '/cache/strategies.ts',
                syntaxKind: 'PropertySignature',
                name: 'maxAge',
                value: 'number',
                description:
                  'The maximum amount of time in seconds that a resource will be considered fresh. See `max-age` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#:~:text=Response%20Directives-,max%2Dage,-The%20max%2Dage).',
                isOptional: true,
              },
              {
                filePath: '/cache/strategies.ts',
                syntaxKind: 'PropertySignature',
                name: 'staleWhileRevalidate',
                value: 'number',
                description:
                  'Indicate that the cache should serve the stale response in the background while revalidating the cache. See `stale-while-revalidate` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#stale-while-revalidate).',
                isOptional: true,
              },
              {
                filePath: '/cache/strategies.ts',
                syntaxKind: 'PropertySignature',
                name: 'sMaxAge',
                value: 'number',
                description:
                  'Similar to `maxAge` but specific to shared caches. See `s-maxage` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#s-maxage).',
                isOptional: true,
              },
              {
                filePath: '/cache/strategies.ts',
                syntaxKind: 'PropertySignature',
                name: 'staleIfError',
                value: 'number',
                description:
                  'Indicate that the cache should serve the stale response if an error occurs while revalidating the cache. See `stale-if-error` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#stale-if-error).',
                isOptional: true,
              },
            ],
          },
          StorefrontMutations: {
            filePath: '/storefront.ts',
            name: 'StorefrontMutations',
            description:
              'Maps all the mutations found in the project to variables and return types.',
            members: [],
            value:
              "export interface StorefrontMutations {\n  // Example of how a generated mutation type looks like:\n  // '#graphql mutation m1 {...}': {return: M1Mutation; variables: M1MutationVariables};\n}",
          },
          StorefrontMutateSecondParam: {
            filePath: '/storefront.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'StorefrontMutateSecondParam',
            value:
              "RawGqlString extends keyof StorefrontMutations\n  ? StorefrontCommonOptions<StorefrontMutations[RawGqlString]['variables']>\n  : StorefrontCommonOptions<GenericVariables>",
            description: '',
          },
          NoStoreStrategy: {
            filePath: '/cache/strategies.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'NoStoreStrategy',
            value: '{\n  mode: string;\n}',
            description: '',
            members: [
              {
                filePath: '/cache/strategies.ts',
                syntaxKind: 'PropertySignature',
                name: 'mode',
                value: 'string',
                description: '',
              },
            ],
          },
          AllCacheOptions: {
            filePath: '/cache/strategies.ts',
            name: 'AllCacheOptions',
            description: 'Override options for a cache strategy.',
            members: [
              {
                filePath: '/cache/strategies.ts',
                syntaxKind: 'PropertySignature',
                name: 'mode',
                value: 'string',
                description:
                  'The caching mode, generally `public`, `private`, or `no-store`.',
                isOptional: true,
              },
              {
                filePath: '/cache/strategies.ts',
                syntaxKind: 'PropertySignature',
                name: 'maxAge',
                value: 'number',
                description:
                  'The maximum amount of time in seconds that a resource will be considered fresh. See `max-age` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#:~:text=Response%20Directives-,max%2Dage,-The%20max%2Dage).',
                isOptional: true,
              },
              {
                filePath: '/cache/strategies.ts',
                syntaxKind: 'PropertySignature',
                name: 'staleWhileRevalidate',
                value: 'number',
                description:
                  'Indicate that the cache should serve the stale response in the background while revalidating the cache. See `stale-while-revalidate` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#stale-while-revalidate).',
                isOptional: true,
              },
              {
                filePath: '/cache/strategies.ts',
                syntaxKind: 'PropertySignature',
                name: 'sMaxAge',
                value: 'number',
                description:
                  'Similar to `maxAge` but specific to shared caches. See `s-maxage` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#s-maxage).',
                isOptional: true,
              },
              {
                filePath: '/cache/strategies.ts',
                syntaxKind: 'PropertySignature',
                name: 'staleIfError',
                value: 'number',
                description:
                  'Indicate that the cache should serve the stale response if an error occurs while revalidating the cache. See `stale-if-error` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#stale-if-error).',
                isOptional: true,
              },
            ],
            value:
              'export interface AllCacheOptions {\n  /**\n   * The caching mode, generally `public`, `private`, or `no-store`.\n   */\n  mode?: string;\n  /**\n   * The maximum amount of time in seconds that a resource will be considered fresh. See `max-age` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#:~:text=Response%20Directives-,max%2Dage,-The%20max%2Dage).\n   */\n  maxAge?: number;\n  /**\n   * Indicate that the cache should serve the stale response in the background while revalidating the cache. See `stale-while-revalidate` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#stale-while-revalidate).\n   */\n  staleWhileRevalidate?: number;\n  /**\n   * Similar to `maxAge` but specific to shared caches. See `s-maxage` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#s-maxage).\n   */\n  sMaxAge?: number;\n  /**\n   * Indicate that the cache should serve the stale response if an error occurs while revalidating the cache. See `stale-if-error` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#stale-if-error).\n   */\n  staleIfError?: number;\n}',
          },
          CartDiscountCodesUpdateFunction: {
            filePath: '/cart/queries/cartDiscountCodesUpdateDefault.ts',
            name: 'CartDiscountCodesUpdateFunction',
            description: '',
            params: [
              {
                name: 'discountCodes',
                description: '',
                value: 'string[]',
                filePath: '/cart/queries/cartDiscountCodesUpdateDefault.ts',
              },
              {
                name: 'optionalParams',
                description: '',
                value: 'CartOptionalInput',
                isOptional: true,
                filePath: '/cart/queries/cartDiscountCodesUpdateDefault.ts',
              },
            ],
            returns: {
              filePath: '/cart/queries/cartDiscountCodesUpdateDefault.ts',
              description: '',
              name: 'Promise<CartQueryData>',
              value: 'Promise<CartQueryData>',
            },
            value:
              'export type CartDiscountCodesUpdateFunction = (\n  discountCodes: string[],\n  optionalParams?: CartOptionalInput,\n) => Promise<CartQueryData>;',
          },
          CartOptionalInput: {
            filePath: '/cart/queries/cart-types.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'CartOptionalInput',
            value:
              "{\n  /**\n   * The cart id.\n   * @default cart.getCartId();\n   */\n  cartId?: Scalars['ID'];\n  /**\n   * The country code.\n   * @default storefront.i18n.country\n   */\n  country?: CountryCode;\n  /**\n   * The language code.\n   * @default storefront.i18n.language\n   */\n  language?: LanguageCode;\n}",
            description: '',
            members: [
              {
                filePath: '/cart/queries/cart-types.ts',
                syntaxKind: 'PropertySignature',
                name: 'cartId',
                value: 'string',
                description: 'The cart id.',
                isOptional: true,
                defaultValue: 'cart.getCartId();',
              },
              {
                filePath: '/cart/queries/cart-types.ts',
                syntaxKind: 'PropertySignature',
                name: 'country',
                value: 'CountryCode',
                description: 'The country code.',
                isOptional: true,
                defaultValue: 'storefront.i18n.country',
              },
              {
                filePath: '/cart/queries/cart-types.ts',
                syntaxKind: 'PropertySignature',
                name: 'language',
                value: 'LanguageCode',
                description: 'The language code.',
                isOptional: true,
                defaultValue: 'storefront.i18n.language',
              },
            ],
          },
          CartQueryData: {
            filePath: '/cart/queries/cart-types.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'CartQueryData',
            value:
              '{\n  cart: Cart;\n  errors?:\n    | CartUserError[]\n    | MetafieldsSetUserError[]\n    | MetafieldDeleteUserError[];\n}',
            description: '',
            members: [
              {
                filePath: '/cart/queries/cart-types.ts',
                syntaxKind: 'PropertySignature',
                name: 'cart',
                value: 'Cart',
                description: '',
              },
              {
                filePath: '/cart/queries/cart-types.ts',
                syntaxKind: 'PropertySignature',
                name: 'errors',
                value:
                  'CartUserError[] | MetafieldsSetUserError[] | MetafieldDeleteUserError[]',
                description: '',
                isOptional: true,
              },
            ],
          },
          Cart: {
            description: '',
            name: 'Cart',
            value: 'Cart',
            members: [],
            override:
              '[Cart](/docs/api/storefront/2023-07/objects/Cart) - Storefront API type',
          },
          CartUserError: {
            description: '',
            name: 'CartUserError',
            value: 'CartUserError',
            members: [],
            override:
              '[CartUserError](/docs/api/storefront/2023-07/objects/CartUserError) - Storefront API type',
          },
          MetafieldsSetUserError: {
            description: '',
            name: 'MetafieldsSetUserError',
            value: 'MetafieldsSetUserError',
            members: [],
            override:
              '[MetafieldsSetUserError](/docs/api/storefront/2023-07/objects/MetafieldsSetUserError) - Storefront API type',
          },
          MetafieldDeleteUserError: {
            description: '',
            name: 'MetafieldDeleteUserError',
            value: 'MetafieldDeleteUserError',
            members: [],
            override:
              '[MetafieldDeleteUserError](/docs/api/storefront/2023-07/objects/MetafieldDeleteUserError) - Storefront API type',
          },
        },
      },
    ],
  },
  {
    name: 'cartGetDefault',
    category: 'utilities',
    isVisualComponent: false,
    related: [],
    description: 'Creates a function that returns a cart',
    type: 'utility',
    defaultExample: {
      description: 'This is the default example',
      codeblock: {
        tabs: [
          {
            title: 'JavaScript',
            code: "import {cartGetDefault} from '@shopify/hydrogen';\n\nconst cartGet = cartGetDefault({\n  storefront,\n  getCartId,\n});\n\nconst result = await cartGet();\n",
            language: 'js',
          },
        ],
        title: 'example',
      },
    },
    definitions: [
      {
        title: 'cartGetDefault',
        description: '',
        type: 'CartGetDefaultGeneratedType',
        typeDefinitions: {
          CartGetDefaultGeneratedType: {
            filePath: '/cart/queries/cartGetDefault.ts',
            name: 'CartGetDefaultGeneratedType',
            description: '',
            params: [
              {
                name: 'options',
                description: '',
                value: 'CartQueryOptions',
                filePath: '/cart/queries/cartGetDefault.ts',
              },
            ],
            returns: {
              filePath: '/cart/queries/cartGetDefault.ts',
              description: '',
              name: 'CartGetFunction',
              value: 'CartGetFunction',
            },
            value:
              'export function cartGetDefault(options: CartQueryOptions): CartGetFunction {\n  return async (cartInput?: CartGetProps) => {\n    const cartId = options.getCartId();\n\n    if (!cartId) return null;\n\n    const {cart} = await options.storefront.query<{cart: Cart}>(\n      CART_QUERY(options.cartFragment),\n      {\n        variables: {\n          cartId,\n          ...cartInput,\n        },\n        cache: options.storefront.CacheNone(),\n      },\n    );\n\n    return cart;\n  };\n}',
          },
          CartQueryOptions: {
            filePath: '/cart/queries/cart-types.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'CartQueryOptions',
            value:
              '{\n  /**\n   * The storefront client instance created by [`createStorefrontClient`](docs/api/hydrogen/latest/utilities/createstorefrontclient).\n   */\n  storefront: Storefront;\n  /**\n   * A function that returns the cart ID.\n   */\n  getCartId: () => string | undefined;\n  /**\n   * The cart fragment to override the one used in this query.\n   */\n  cartFragment?: string;\n}',
            description: '',
            members: [
              {
                filePath: '/cart/queries/cart-types.ts',
                syntaxKind: 'PropertySignature',
                name: 'storefront',
                value: 'Storefront',
                description:
                  'The storefront client instance created by [`createStorefrontClient`](docs/api/hydrogen/latest/utilities/createstorefrontclient).',
              },
              {
                filePath: '/cart/queries/cart-types.ts',
                syntaxKind: 'PropertySignature',
                name: 'getCartId',
                value: '() => string',
                description: 'A function that returns the cart ID.',
              },
              {
                filePath: '/cart/queries/cart-types.ts',
                syntaxKind: 'PropertySignature',
                name: 'cartFragment',
                value: 'string',
                description:
                  'The cart fragment to override the one used in this query.',
                isOptional: true,
              },
            ],
          },
          Storefront: {
            filePath: '/storefront.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'Storefront',
            value:
              "{\n  /** The function to run a query on Storefront API. */\n  query: <OverrideReturnType = any, RawGqlString extends string = string>(\n    query: RawGqlString,\n    ...options: RawGqlString extends keyof StorefrontQueries // Do we have any generated query types?\n      ? IsOptionalVariables<StorefrontQueries[RawGqlString]> extends true\n        ? [StorefrontQuerySecondParam<RawGqlString>?] // Using codegen, query has no variables\n        : [StorefrontQuerySecondParam<RawGqlString>] // Using codegen, query needs variables\n      : [StorefrontQuerySecondParam?] // No codegen, variables always optional\n  ) => Promise<\n    RawGqlString extends keyof StorefrontQueries // Do we have any generated query types?\n      ? StorefrontQueries[RawGqlString]['return'] // Using codegen, return type is known\n      : OverrideReturnType // No codegen, let user specify return type\n  >;\n  /** The function to run a mutation on Storefront API. */\n  mutate: <OverrideReturnType = any, RawGqlString extends string = string>(\n    mutation: RawGqlString,\n    ...options: RawGqlString extends keyof StorefrontMutations // Do we have any generated mutation types?\n      ? IsOptionalVariables<StorefrontMutations[RawGqlString]> extends true\n        ? [StorefrontMutateSecondParam<RawGqlString>?] // Using codegen, mutation has no variables\n        : [StorefrontMutateSecondParam<RawGqlString>] // Using codegen, mutation needs variables\n      : [StorefrontMutateSecondParam?] // No codegen, variables always optional\n  ) => Promise<\n    RawGqlString extends keyof StorefrontMutations // Do we have any generated mutation types?\n      ? StorefrontMutations[RawGqlString]['return'] // Using codegen, return type is known\n      : OverrideReturnType // No codegen, let user specify return type\n  >;\n  /** The cache instance passed in from the `createStorefrontClient` argument. */\n  cache?: Cache;\n  /** Re-export of [`CacheNone`](/docs/api/hydrogen/2023-07/utilities/cachenone). */\n  CacheNone: typeof CacheNone;\n  /** Re-export of [`CacheLong`](/docs/api/hydrogen/2023-07/utilities/cachelong). */\n  CacheLong: typeof CacheLong;\n  /** Re-export of [`CacheShort`](/docs/api/hydrogen/2023-07/utilities/cacheshort). */\n  CacheShort: typeof CacheShort;\n  /** Re-export of [`CacheCustom`](/docs/api/hydrogen/2023-07/utilities/cachecustom). */\n  CacheCustom: typeof CacheCustom;\n  /** Re-export of [`generateCacheControlHeader`](/docs/api/hydrogen/2023-07/utilities/generatecachecontrolheader). */\n  generateCacheControlHeader: typeof generateCacheControlHeader;\n  /** Returns an object that contains headers that are needed for each query to Storefront API GraphQL endpoint. See [`getPublicTokenHeaders` in Hydrogen React](/docs/api/hydrogen-react/2023-07/utilities/createstorefrontclient#:~:text=%27graphql%27.-,getPublicTokenHeaders,-(props%3F%3A) for more details. */\n  getPublicTokenHeaders: ReturnType<\n    typeof createStorefrontUtilities\n  >['getPublicTokenHeaders'];\n  /** Returns an object that contains headers that are needed for each query to Storefront API GraphQL endpoint for API calls made from a server. See [`getPrivateTokenHeaders` in  Hydrogen React](/docs/api/hydrogen-react/2023-07/utilities/createstorefrontclient#:~:text=storefrontApiVersion-,getPrivateTokenHeaders,-(props%3F%3A) for more details.*/\n  getPrivateTokenHeaders: ReturnType<\n    typeof createStorefrontUtilities\n  >['getPrivateTokenHeaders'];\n  /** Creates the fully-qualified URL to your myshopify.com domain. See [`getShopifyDomain` in  Hydrogen React](/docs/api/hydrogen-react/2023-07/utilities/createstorefrontclient#:~:text=StorefrontClientReturn-,getShopifyDomain,-(props%3F%3A) for more details. */\n  getShopifyDomain: ReturnType<\n    typeof createStorefrontUtilities\n  >['getShopifyDomain'];\n  /** Creates the fully-qualified URL to your store's GraphQL endpoint. See [`getStorefrontApiUrl` in  Hydrogen React](/docs/api/hydrogen-react/2023-07/utilities/createstorefrontclient#:~:text=storeDomain-,getStorefrontApiUrl,-(props%3F%3A) for more details.*/\n  getApiUrl: ReturnType<\n    typeof createStorefrontUtilities\n  >['getStorefrontApiUrl'];\n  /** Determines if the error is resulted from a Storefront API call. */\n  isApiError: (error: any) => boolean;\n  /** The `i18n` object passed in from the `createStorefrontClient` argument. */\n  i18n: TI18n;\n}",
            description: 'Interface to interact with the Storefront API.',
            members: [
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'query',
                value:
                  '<OverrideReturnType = any, RawGqlString extends string = string>(query: RawGqlString, ...options: RawGqlString extends never ? IsOptionalVariables<StorefrontQueries[RawGqlString]> extends true ? [StorefrontQuerySecondParam<RawGqlString>?] : [StorefrontQuerySecondParam<RawGqlString>] : [StorefrontQuerySecondParam<string>?]) => Promise<RawGqlString extends never ? StorefrontQueries[RawGqlString]["return"] : OverrideReturnType>',
                description: 'The function to run a query on Storefront API.',
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'mutate',
                value:
                  '<OverrideReturnType = any, RawGqlString extends string = string>(mutation: RawGqlString, ...options: RawGqlString extends never ? IsOptionalVariables<StorefrontMutations[RawGqlString]> extends true ? [StorefrontMutateSecondParam<RawGqlString>?] : [StorefrontMutateSecondParam<RawGqlString>] : [StorefrontCommonOptions<{ readonly [variable: string]: unknown; }>?]) => Promise<RawGqlString extends never ? StorefrontMutations[RawGqlString]["return"] : OverrideReturnType>',
                description:
                  'The function to run a mutation on Storefront API.',
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'cache',
                value: 'Cache',
                description:
                  'The cache instance passed in from the `createStorefrontClient` argument.',
                isOptional: true,
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'CacheNone',
                value: '() => NoStoreStrategy',
                description:
                  'Re-export of [`CacheNone`](/docs/api/hydrogen/2023-07/utilities/cachenone).',
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'CacheLong',
                value: '(overrideOptions?: AllCacheOptions) => AllCacheOptions',
                description:
                  'Re-export of [`CacheLong`](/docs/api/hydrogen/2023-07/utilities/cachelong).',
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'CacheShort',
                value: '(overrideOptions?: AllCacheOptions) => AllCacheOptions',
                description:
                  'Re-export of [`CacheShort`](/docs/api/hydrogen/2023-07/utilities/cacheshort).',
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'CacheCustom',
                value: '(overrideOptions: AllCacheOptions) => AllCacheOptions',
                description:
                  'Re-export of [`CacheCustom`](/docs/api/hydrogen/2023-07/utilities/cachecustom).',
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'generateCacheControlHeader',
                value: '(cacheOptions: AllCacheOptions) => string',
                description:
                  'Re-export of [`generateCacheControlHeader`](/docs/api/hydrogen/2023-07/utilities/generatecachecontrolheader).',
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'getPublicTokenHeaders',
                value:
                  '(props?: Partial<Pick<StorefrontClientProps, "contentType">> & Pick<StorefrontClientProps, "publicStorefrontToken">) => Record<string, string>',
                description:
                  'Returns an object that contains headers that are needed for each query to Storefront API GraphQL endpoint. See [`getPublicTokenHeaders` in Hydrogen React](/docs/api/hydrogen-react/2023-07/utilities/createstorefrontclient#:~:text=%27graphql%27.-,getPublicTokenHeaders,-(props%3F%3A) for more details.',
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'getPrivateTokenHeaders',
                value:
                  '(props?: Partial<Pick<StorefrontClientProps, "contentType">> & Pick<StorefrontClientProps, "privateStorefrontToken"> & { buyerIp?: string; }) => Record<string, string>',
                description:
                  'Returns an object that contains headers that are needed for each query to Storefront API GraphQL endpoint for API calls made from a server. See [`getPrivateTokenHeaders` in  Hydrogen React](/docs/api/hydrogen-react/2023-07/utilities/createstorefrontclient#:~:text=storefrontApiVersion-,getPrivateTokenHeaders,-(props%3F%3A) for more details.',
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'getShopifyDomain',
                value:
                  '(props?: Partial<Pick<StorefrontClientProps, "storeDomain">>) => string',
                description:
                  'Creates the fully-qualified URL to your myshopify.com domain. See [`getShopifyDomain` in  Hydrogen React](/docs/api/hydrogen-react/2023-07/utilities/createstorefrontclient#:~:text=StorefrontClientReturn-,getShopifyDomain,-(props%3F%3A) for more details.',
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'getApiUrl',
                value:
                  '(props?: Partial<Pick<StorefrontClientProps, "storeDomain" | "storefrontApiVersion">>) => string',
                description:
                  "Creates the fully-qualified URL to your store's GraphQL endpoint. See [`getStorefrontApiUrl` in  Hydrogen React](/docs/api/hydrogen-react/2023-07/utilities/createstorefrontclient#:~:text=storeDomain-,getStorefrontApiUrl,-(props%3F%3A) for more details.",
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'isApiError',
                value: '(error: any) => boolean',
                description:
                  'Determines if the error is resulted from a Storefront API call.',
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'i18n',
                value: 'TI18n',
                description:
                  'The `i18n` object passed in from the `createStorefrontClient` argument.',
              },
            ],
          },
          IsOptionalVariables: {
            filePath: '/storefront.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'IsOptionalVariables',
            value:
              "Omit<\n  OperationTypeValue['variables'],\n  AutoAddedVariableNames\n> extends EmptyVariables\n  ? true // No need to pass variables\n  : GenericVariables extends OperationTypeValue['variables']\n  ? true // We don't know what variables are needed\n  : false",
            description: '',
          },
          AutoAddedVariableNames: {
            filePath: '/storefront.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'AutoAddedVariableNames',
            value: "'country' | 'language'",
            description: '',
          },
          EmptyVariables: {
            filePath: '/storefront.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'EmptyVariables',
            value: '{[key: string]: never}',
            description: '',
            members: [],
          },
          GenericVariables: {
            filePath: '/storefront.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'GenericVariables',
            value: "ExecutionArgs['variableValues']",
            description: '',
          },
          StorefrontQueries: {
            filePath: '/storefront.ts',
            name: 'StorefrontQueries',
            description:
              'Maps all the queries found in the project to variables and return types.',
            members: [],
            value:
              "export interface StorefrontQueries {\n  // Example of how a generated query type looks like:\n  // '#graphql query q1 {...}': {return: Q1Query; variables: Q1QueryVariables};\n}",
          },
          StorefrontQuerySecondParam: {
            filePath: '/storefront.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'StorefrontQuerySecondParam',
            value:
              "(RawGqlString extends keyof StorefrontQueries\n  ? StorefrontCommonOptions<StorefrontQueries[RawGqlString]['variables']>\n  : StorefrontCommonOptions<GenericVariables>) & {cache?: CachingStrategy}",
            description: '',
          },
          StorefrontCommonOptions: {
            filePath: '/storefront.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'StorefrontCommonOptions',
            value:
              '{\n  headers?: HeadersInit;\n  storefrontApiVersion?: string;\n} & (IsOptionalVariables<{variables: Variables}> extends true\n  ? {variables?: Variables}\n  : {variables: Variables})',
            description: '',
          },
          CachingStrategy: {
            filePath: '/cache/strategies.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'CachingStrategy',
            value: 'AllCacheOptions',
            description:
              'Use the `CachingStrategy` to define a custom caching mechanism for your data. Or use one of the pre-defined caching strategies: CacheNone, CacheShort, CacheLong.',
            members: [
              {
                filePath: '/cache/strategies.ts',
                syntaxKind: 'PropertySignature',
                name: 'mode',
                value: 'string',
                description:
                  'The caching mode, generally `public`, `private`, or `no-store`.',
                isOptional: true,
              },
              {
                filePath: '/cache/strategies.ts',
                syntaxKind: 'PropertySignature',
                name: 'maxAge',
                value: 'number',
                description:
                  'The maximum amount of time in seconds that a resource will be considered fresh. See `max-age` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#:~:text=Response%20Directives-,max%2Dage,-The%20max%2Dage).',
                isOptional: true,
              },
              {
                filePath: '/cache/strategies.ts',
                syntaxKind: 'PropertySignature',
                name: 'staleWhileRevalidate',
                value: 'number',
                description:
                  'Indicate that the cache should serve the stale response in the background while revalidating the cache. See `stale-while-revalidate` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#stale-while-revalidate).',
                isOptional: true,
              },
              {
                filePath: '/cache/strategies.ts',
                syntaxKind: 'PropertySignature',
                name: 'sMaxAge',
                value: 'number',
                description:
                  'Similar to `maxAge` but specific to shared caches. See `s-maxage` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#s-maxage).',
                isOptional: true,
              },
              {
                filePath: '/cache/strategies.ts',
                syntaxKind: 'PropertySignature',
                name: 'staleIfError',
                value: 'number',
                description:
                  'Indicate that the cache should serve the stale response if an error occurs while revalidating the cache. See `stale-if-error` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#stale-if-error).',
                isOptional: true,
              },
            ],
          },
          StorefrontMutations: {
            filePath: '/storefront.ts',
            name: 'StorefrontMutations',
            description:
              'Maps all the mutations found in the project to variables and return types.',
            members: [],
            value:
              "export interface StorefrontMutations {\n  // Example of how a generated mutation type looks like:\n  // '#graphql mutation m1 {...}': {return: M1Mutation; variables: M1MutationVariables};\n}",
          },
          StorefrontMutateSecondParam: {
            filePath: '/storefront.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'StorefrontMutateSecondParam',
            value:
              "RawGqlString extends keyof StorefrontMutations\n  ? StorefrontCommonOptions<StorefrontMutations[RawGqlString]['variables']>\n  : StorefrontCommonOptions<GenericVariables>",
            description: '',
          },
          NoStoreStrategy: {
            filePath: '/cache/strategies.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'NoStoreStrategy',
            value: '{\n  mode: string;\n}',
            description: '',
            members: [
              {
                filePath: '/cache/strategies.ts',
                syntaxKind: 'PropertySignature',
                name: 'mode',
                value: 'string',
                description: '',
              },
            ],
          },
          AllCacheOptions: {
            filePath: '/cache/strategies.ts',
            name: 'AllCacheOptions',
            description: 'Override options for a cache strategy.',
            members: [
              {
                filePath: '/cache/strategies.ts',
                syntaxKind: 'PropertySignature',
                name: 'mode',
                value: 'string',
                description:
                  'The caching mode, generally `public`, `private`, or `no-store`.',
                isOptional: true,
              },
              {
                filePath: '/cache/strategies.ts',
                syntaxKind: 'PropertySignature',
                name: 'maxAge',
                value: 'number',
                description:
                  'The maximum amount of time in seconds that a resource will be considered fresh. See `max-age` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#:~:text=Response%20Directives-,max%2Dage,-The%20max%2Dage).',
                isOptional: true,
              },
              {
                filePath: '/cache/strategies.ts',
                syntaxKind: 'PropertySignature',
                name: 'staleWhileRevalidate',
                value: 'number',
                description:
                  'Indicate that the cache should serve the stale response in the background while revalidating the cache. See `stale-while-revalidate` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#stale-while-revalidate).',
                isOptional: true,
              },
              {
                filePath: '/cache/strategies.ts',
                syntaxKind: 'PropertySignature',
                name: 'sMaxAge',
                value: 'number',
                description:
                  'Similar to `maxAge` but specific to shared caches. See `s-maxage` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#s-maxage).',
                isOptional: true,
              },
              {
                filePath: '/cache/strategies.ts',
                syntaxKind: 'PropertySignature',
                name: 'staleIfError',
                value: 'number',
                description:
                  'Indicate that the cache should serve the stale response if an error occurs while revalidating the cache. See `stale-if-error` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#stale-if-error).',
                isOptional: true,
              },
            ],
            value:
              'export interface AllCacheOptions {\n  /**\n   * The caching mode, generally `public`, `private`, or `no-store`.\n   */\n  mode?: string;\n  /**\n   * The maximum amount of time in seconds that a resource will be considered fresh. See `max-age` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#:~:text=Response%20Directives-,max%2Dage,-The%20max%2Dage).\n   */\n  maxAge?: number;\n  /**\n   * Indicate that the cache should serve the stale response in the background while revalidating the cache. See `stale-while-revalidate` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#stale-while-revalidate).\n   */\n  staleWhileRevalidate?: number;\n  /**\n   * Similar to `maxAge` but specific to shared caches. See `s-maxage` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#s-maxage).\n   */\n  sMaxAge?: number;\n  /**\n   * Indicate that the cache should serve the stale response if an error occurs while revalidating the cache. See `stale-if-error` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#stale-if-error).\n   */\n  staleIfError?: number;\n}',
          },
          CartGetFunction: {
            filePath: '/cart/queries/cartGetDefault.ts',
            name: 'CartGetFunction',
            description: '',
            params: [
              {
                name: 'cartInput',
                description: '',
                value: 'CartGetProps',
                isOptional: true,
                filePath: '/cart/queries/cartGetDefault.ts',
              },
            ],
            returns: {
              filePath: '/cart/queries/cartGetDefault.ts',
              description: '',
              name: 'Promise<Cart | null>',
              value: 'Promise<Cart | null>',
            },
            value:
              'export type CartGetFunction = (\n  cartInput?: CartGetProps,\n) => Promise<Cart | null>;',
          },
          CartGetProps: {
            filePath: '/cart/queries/cartGetDefault.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'CartGetProps',
            value:
              '{\n  /**\n   * The cart ID.\n   * @default cart.getCartId();\n   */\n  cartId?: string;\n  /**\n   * The country code.\n   * @default storefront.i18n.country\n   */\n  country?: CountryCode;\n  /**\n   * The language code.\n   * @default storefront.i18n.language\n   */\n  language?: LanguageCode;\n  /**\n   * The number of cart lines to be returned.\n   * @default 100\n   */\n  numCartLines?: number;\n}',
            description: '',
            members: [
              {
                filePath: '/cart/queries/cartGetDefault.ts',
                syntaxKind: 'PropertySignature',
                name: 'cartId',
                value: 'string',
                description: 'The cart ID.',
                isOptional: true,
                defaultValue: 'cart.getCartId();',
              },
              {
                filePath: '/cart/queries/cartGetDefault.ts',
                syntaxKind: 'PropertySignature',
                name: 'country',
                value: 'CountryCode',
                description: 'The country code.',
                isOptional: true,
                defaultValue: 'storefront.i18n.country',
              },
              {
                filePath: '/cart/queries/cartGetDefault.ts',
                syntaxKind: 'PropertySignature',
                name: 'language',
                value: 'LanguageCode',
                description: 'The language code.',
                isOptional: true,
                defaultValue: 'storefront.i18n.language',
              },
              {
                filePath: '/cart/queries/cartGetDefault.ts',
                syntaxKind: 'PropertySignature',
                name: 'numCartLines',
                value: 'number',
                description: 'The number of cart lines to be returned.',
                isOptional: true,
                defaultValue: '100',
              },
            ],
          },
          Cart: {
            description: '',
            name: 'Cart',
            value: 'Cart',
            members: [],
            override:
              '[Cart](/docs/api/storefront/2023-07/objects/Cart) - Storefront API type',
          },
        },
      },
    ],
  },
  {
    name: 'cartLinesAddDefault',
    category: 'utilities',
    isVisualComponent: false,
    related: [],
    description:
      'Creates a function that accepts an array of [CartLineInput](/docs/api/storefront/2023-07/input-objects/CartLineInput) and adds the line items to a cart',
    type: 'utility',
    defaultExample: {
      description: 'This is the default example',
      codeblock: {
        tabs: [
          {
            title: 'JavaScript',
            code: "import {cartLinesAddDefault} from '@shopify/hydrogen';\n\nconst cartAdd = cartLinesAddDefault({\n  storefront,\n  getCartId,\n});\n\nconst result = await cartAdd([\n  {\n    merchandiseId: 'gid://shopify/ProductVariant/123456789',\n    quantity: 1,\n  },\n]);\n",
            language: 'js',
          },
        ],
        title: 'example',
      },
    },
    definitions: [
      {
        title: 'cartLinesAddDefault',
        description: '',
        type: 'CartLinesAddDefaultGeneratedType',
        typeDefinitions: {
          CartLinesAddDefaultGeneratedType: {
            filePath: '/cart/queries/cartLinesAddDefault.ts',
            name: 'CartLinesAddDefaultGeneratedType',
            description: '',
            params: [
              {
                name: 'options',
                description: '',
                value: 'CartQueryOptions',
                filePath: '/cart/queries/cartLinesAddDefault.ts',
              },
            ],
            returns: {
              filePath: '/cart/queries/cartLinesAddDefault.ts',
              description: '',
              name: 'CartLinesAddFunction',
              value: 'CartLinesAddFunction',
            },
            value:
              'export function cartLinesAddDefault(\n  options: CartQueryOptions,\n): CartLinesAddFunction {\n  return async (lines, optionalParams) => {\n    const {cartLinesAdd} = await options.storefront.mutate<{\n      cartLinesAdd: CartQueryData;\n    }>(CART_LINES_ADD_MUTATION(options.cartFragment), {\n      variables: {\n        cartId: options.getCartId(),\n        lines,\n        ...optionalParams,\n      },\n    });\n    return cartLinesAdd;\n  };\n}',
          },
          CartQueryOptions: {
            filePath: '/cart/queries/cart-types.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'CartQueryOptions',
            value:
              '{\n  /**\n   * The storefront client instance created by [`createStorefrontClient`](docs/api/hydrogen/latest/utilities/createstorefrontclient).\n   */\n  storefront: Storefront;\n  /**\n   * A function that returns the cart ID.\n   */\n  getCartId: () => string | undefined;\n  /**\n   * The cart fragment to override the one used in this query.\n   */\n  cartFragment?: string;\n}',
            description: '',
            members: [
              {
                filePath: '/cart/queries/cart-types.ts',
                syntaxKind: 'PropertySignature',
                name: 'storefront',
                value: 'Storefront',
                description:
                  'The storefront client instance created by [`createStorefrontClient`](docs/api/hydrogen/latest/utilities/createstorefrontclient).',
              },
              {
                filePath: '/cart/queries/cart-types.ts',
                syntaxKind: 'PropertySignature',
                name: 'getCartId',
                value: '() => string',
                description: 'A function that returns the cart ID.',
              },
              {
                filePath: '/cart/queries/cart-types.ts',
                syntaxKind: 'PropertySignature',
                name: 'cartFragment',
                value: 'string',
                description:
                  'The cart fragment to override the one used in this query.',
                isOptional: true,
              },
            ],
          },
          Storefront: {
            filePath: '/storefront.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'Storefront',
            value:
              "{\n  /** The function to run a query on Storefront API. */\n  query: <OverrideReturnType = any, RawGqlString extends string = string>(\n    query: RawGqlString,\n    ...options: RawGqlString extends keyof StorefrontQueries // Do we have any generated query types?\n      ? IsOptionalVariables<StorefrontQueries[RawGqlString]> extends true\n        ? [StorefrontQuerySecondParam<RawGqlString>?] // Using codegen, query has no variables\n        : [StorefrontQuerySecondParam<RawGqlString>] // Using codegen, query needs variables\n      : [StorefrontQuerySecondParam?] // No codegen, variables always optional\n  ) => Promise<\n    RawGqlString extends keyof StorefrontQueries // Do we have any generated query types?\n      ? StorefrontQueries[RawGqlString]['return'] // Using codegen, return type is known\n      : OverrideReturnType // No codegen, let user specify return type\n  >;\n  /** The function to run a mutation on Storefront API. */\n  mutate: <OverrideReturnType = any, RawGqlString extends string = string>(\n    mutation: RawGqlString,\n    ...options: RawGqlString extends keyof StorefrontMutations // Do we have any generated mutation types?\n      ? IsOptionalVariables<StorefrontMutations[RawGqlString]> extends true\n        ? [StorefrontMutateSecondParam<RawGqlString>?] // Using codegen, mutation has no variables\n        : [StorefrontMutateSecondParam<RawGqlString>] // Using codegen, mutation needs variables\n      : [StorefrontMutateSecondParam?] // No codegen, variables always optional\n  ) => Promise<\n    RawGqlString extends keyof StorefrontMutations // Do we have any generated mutation types?\n      ? StorefrontMutations[RawGqlString]['return'] // Using codegen, return type is known\n      : OverrideReturnType // No codegen, let user specify return type\n  >;\n  /** The cache instance passed in from the `createStorefrontClient` argument. */\n  cache?: Cache;\n  /** Re-export of [`CacheNone`](/docs/api/hydrogen/2023-07/utilities/cachenone). */\n  CacheNone: typeof CacheNone;\n  /** Re-export of [`CacheLong`](/docs/api/hydrogen/2023-07/utilities/cachelong). */\n  CacheLong: typeof CacheLong;\n  /** Re-export of [`CacheShort`](/docs/api/hydrogen/2023-07/utilities/cacheshort). */\n  CacheShort: typeof CacheShort;\n  /** Re-export of [`CacheCustom`](/docs/api/hydrogen/2023-07/utilities/cachecustom). */\n  CacheCustom: typeof CacheCustom;\n  /** Re-export of [`generateCacheControlHeader`](/docs/api/hydrogen/2023-07/utilities/generatecachecontrolheader). */\n  generateCacheControlHeader: typeof generateCacheControlHeader;\n  /** Returns an object that contains headers that are needed for each query to Storefront API GraphQL endpoint. See [`getPublicTokenHeaders` in Hydrogen React](/docs/api/hydrogen-react/2023-07/utilities/createstorefrontclient#:~:text=%27graphql%27.-,getPublicTokenHeaders,-(props%3F%3A) for more details. */\n  getPublicTokenHeaders: ReturnType<\n    typeof createStorefrontUtilities\n  >['getPublicTokenHeaders'];\n  /** Returns an object that contains headers that are needed for each query to Storefront API GraphQL endpoint for API calls made from a server. See [`getPrivateTokenHeaders` in  Hydrogen React](/docs/api/hydrogen-react/2023-07/utilities/createstorefrontclient#:~:text=storefrontApiVersion-,getPrivateTokenHeaders,-(props%3F%3A) for more details.*/\n  getPrivateTokenHeaders: ReturnType<\n    typeof createStorefrontUtilities\n  >['getPrivateTokenHeaders'];\n  /** Creates the fully-qualified URL to your myshopify.com domain. See [`getShopifyDomain` in  Hydrogen React](/docs/api/hydrogen-react/2023-07/utilities/createstorefrontclient#:~:text=StorefrontClientReturn-,getShopifyDomain,-(props%3F%3A) for more details. */\n  getShopifyDomain: ReturnType<\n    typeof createStorefrontUtilities\n  >['getShopifyDomain'];\n  /** Creates the fully-qualified URL to your store's GraphQL endpoint. See [`getStorefrontApiUrl` in  Hydrogen React](/docs/api/hydrogen-react/2023-07/utilities/createstorefrontclient#:~:text=storeDomain-,getStorefrontApiUrl,-(props%3F%3A) for more details.*/\n  getApiUrl: ReturnType<\n    typeof createStorefrontUtilities\n  >['getStorefrontApiUrl'];\n  /** Determines if the error is resulted from a Storefront API call. */\n  isApiError: (error: any) => boolean;\n  /** The `i18n` object passed in from the `createStorefrontClient` argument. */\n  i18n: TI18n;\n}",
            description: 'Interface to interact with the Storefront API.',
            members: [
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'query',
                value:
                  '<OverrideReturnType = any, RawGqlString extends string = string>(query: RawGqlString, ...options: RawGqlString extends never ? IsOptionalVariables<StorefrontQueries[RawGqlString]> extends true ? [StorefrontQuerySecondParam<RawGqlString>?] : [StorefrontQuerySecondParam<RawGqlString>] : [StorefrontQuerySecondParam<string>?]) => Promise<RawGqlString extends never ? StorefrontQueries[RawGqlString]["return"] : OverrideReturnType>',
                description: 'The function to run a query on Storefront API.',
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'mutate',
                value:
                  '<OverrideReturnType = any, RawGqlString extends string = string>(mutation: RawGqlString, ...options: RawGqlString extends never ? IsOptionalVariables<StorefrontMutations[RawGqlString]> extends true ? [StorefrontMutateSecondParam<RawGqlString>?] : [StorefrontMutateSecondParam<RawGqlString>] : [StorefrontCommonOptions<{ readonly [variable: string]: unknown; }>?]) => Promise<RawGqlString extends never ? StorefrontMutations[RawGqlString]["return"] : OverrideReturnType>',
                description:
                  'The function to run a mutation on Storefront API.',
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'cache',
                value: 'Cache',
                description:
                  'The cache instance passed in from the `createStorefrontClient` argument.',
                isOptional: true,
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'CacheNone',
                value: '() => NoStoreStrategy',
                description:
                  'Re-export of [`CacheNone`](/docs/api/hydrogen/2023-07/utilities/cachenone).',
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'CacheLong',
                value: '(overrideOptions?: AllCacheOptions) => AllCacheOptions',
                description:
                  'Re-export of [`CacheLong`](/docs/api/hydrogen/2023-07/utilities/cachelong).',
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'CacheShort',
                value: '(overrideOptions?: AllCacheOptions) => AllCacheOptions',
                description:
                  'Re-export of [`CacheShort`](/docs/api/hydrogen/2023-07/utilities/cacheshort).',
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'CacheCustom',
                value: '(overrideOptions: AllCacheOptions) => AllCacheOptions',
                description:
                  'Re-export of [`CacheCustom`](/docs/api/hydrogen/2023-07/utilities/cachecustom).',
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'generateCacheControlHeader',
                value: '(cacheOptions: AllCacheOptions) => string',
                description:
                  'Re-export of [`generateCacheControlHeader`](/docs/api/hydrogen/2023-07/utilities/generatecachecontrolheader).',
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'getPublicTokenHeaders',
                value:
                  '(props?: Partial<Pick<StorefrontClientProps, "contentType">> & Pick<StorefrontClientProps, "publicStorefrontToken">) => Record<string, string>',
                description:
                  'Returns an object that contains headers that are needed for each query to Storefront API GraphQL endpoint. See [`getPublicTokenHeaders` in Hydrogen React](/docs/api/hydrogen-react/2023-07/utilities/createstorefrontclient#:~:text=%27graphql%27.-,getPublicTokenHeaders,-(props%3F%3A) for more details.',
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'getPrivateTokenHeaders',
                value:
                  '(props?: Partial<Pick<StorefrontClientProps, "contentType">> & Pick<StorefrontClientProps, "privateStorefrontToken"> & { buyerIp?: string; }) => Record<string, string>',
                description:
                  'Returns an object that contains headers that are needed for each query to Storefront API GraphQL endpoint for API calls made from a server. See [`getPrivateTokenHeaders` in  Hydrogen React](/docs/api/hydrogen-react/2023-07/utilities/createstorefrontclient#:~:text=storefrontApiVersion-,getPrivateTokenHeaders,-(props%3F%3A) for more details.',
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'getShopifyDomain',
                value:
                  '(props?: Partial<Pick<StorefrontClientProps, "storeDomain">>) => string',
                description:
                  'Creates the fully-qualified URL to your myshopify.com domain. See [`getShopifyDomain` in  Hydrogen React](/docs/api/hydrogen-react/2023-07/utilities/createstorefrontclient#:~:text=StorefrontClientReturn-,getShopifyDomain,-(props%3F%3A) for more details.',
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'getApiUrl',
                value:
                  '(props?: Partial<Pick<StorefrontClientProps, "storeDomain" | "storefrontApiVersion">>) => string',
                description:
                  "Creates the fully-qualified URL to your store's GraphQL endpoint. See [`getStorefrontApiUrl` in  Hydrogen React](/docs/api/hydrogen-react/2023-07/utilities/createstorefrontclient#:~:text=storeDomain-,getStorefrontApiUrl,-(props%3F%3A) for more details.",
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'isApiError',
                value: '(error: any) => boolean',
                description:
                  'Determines if the error is resulted from a Storefront API call.',
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'i18n',
                value: 'TI18n',
                description:
                  'The `i18n` object passed in from the `createStorefrontClient` argument.',
              },
            ],
          },
          IsOptionalVariables: {
            filePath: '/storefront.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'IsOptionalVariables',
            value:
              "Omit<\n  OperationTypeValue['variables'],\n  AutoAddedVariableNames\n> extends EmptyVariables\n  ? true // No need to pass variables\n  : GenericVariables extends OperationTypeValue['variables']\n  ? true // We don't know what variables are needed\n  : false",
            description: '',
          },
          AutoAddedVariableNames: {
            filePath: '/storefront.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'AutoAddedVariableNames',
            value: "'country' | 'language'",
            description: '',
          },
          EmptyVariables: {
            filePath: '/storefront.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'EmptyVariables',
            value: '{[key: string]: never}',
            description: '',
            members: [],
          },
          GenericVariables: {
            filePath: '/storefront.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'GenericVariables',
            value: "ExecutionArgs['variableValues']",
            description: '',
          },
          StorefrontQueries: {
            filePath: '/storefront.ts',
            name: 'StorefrontQueries',
            description:
              'Maps all the queries found in the project to variables and return types.',
            members: [],
            value:
              "export interface StorefrontQueries {\n  // Example of how a generated query type looks like:\n  // '#graphql query q1 {...}': {return: Q1Query; variables: Q1QueryVariables};\n}",
          },
          StorefrontQuerySecondParam: {
            filePath: '/storefront.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'StorefrontQuerySecondParam',
            value:
              "(RawGqlString extends keyof StorefrontQueries\n  ? StorefrontCommonOptions<StorefrontQueries[RawGqlString]['variables']>\n  : StorefrontCommonOptions<GenericVariables>) & {cache?: CachingStrategy}",
            description: '',
          },
          StorefrontCommonOptions: {
            filePath: '/storefront.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'StorefrontCommonOptions',
            value:
              '{\n  headers?: HeadersInit;\n  storefrontApiVersion?: string;\n} & (IsOptionalVariables<{variables: Variables}> extends true\n  ? {variables?: Variables}\n  : {variables: Variables})',
            description: '',
          },
          CachingStrategy: {
            filePath: '/cache/strategies.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'CachingStrategy',
            value: 'AllCacheOptions',
            description:
              'Use the `CachingStrategy` to define a custom caching mechanism for your data. Or use one of the pre-defined caching strategies: CacheNone, CacheShort, CacheLong.',
            members: [
              {
                filePath: '/cache/strategies.ts',
                syntaxKind: 'PropertySignature',
                name: 'mode',
                value: 'string',
                description:
                  'The caching mode, generally `public`, `private`, or `no-store`.',
                isOptional: true,
              },
              {
                filePath: '/cache/strategies.ts',
                syntaxKind: 'PropertySignature',
                name: 'maxAge',
                value: 'number',
                description:
                  'The maximum amount of time in seconds that a resource will be considered fresh. See `max-age` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#:~:text=Response%20Directives-,max%2Dage,-The%20max%2Dage).',
                isOptional: true,
              },
              {
                filePath: '/cache/strategies.ts',
                syntaxKind: 'PropertySignature',
                name: 'staleWhileRevalidate',
                value: 'number',
                description:
                  'Indicate that the cache should serve the stale response in the background while revalidating the cache. See `stale-while-revalidate` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#stale-while-revalidate).',
                isOptional: true,
              },
              {
                filePath: '/cache/strategies.ts',
                syntaxKind: 'PropertySignature',
                name: 'sMaxAge',
                value: 'number',
                description:
                  'Similar to `maxAge` but specific to shared caches. See `s-maxage` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#s-maxage).',
                isOptional: true,
              },
              {
                filePath: '/cache/strategies.ts',
                syntaxKind: 'PropertySignature',
                name: 'staleIfError',
                value: 'number',
                description:
                  'Indicate that the cache should serve the stale response if an error occurs while revalidating the cache. See `stale-if-error` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#stale-if-error).',
                isOptional: true,
              },
            ],
          },
          StorefrontMutations: {
            filePath: '/storefront.ts',
            name: 'StorefrontMutations',
            description:
              'Maps all the mutations found in the project to variables and return types.',
            members: [],
            value:
              "export interface StorefrontMutations {\n  // Example of how a generated mutation type looks like:\n  // '#graphql mutation m1 {...}': {return: M1Mutation; variables: M1MutationVariables};\n}",
          },
          StorefrontMutateSecondParam: {
            filePath: '/storefront.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'StorefrontMutateSecondParam',
            value:
              "RawGqlString extends keyof StorefrontMutations\n  ? StorefrontCommonOptions<StorefrontMutations[RawGqlString]['variables']>\n  : StorefrontCommonOptions<GenericVariables>",
            description: '',
          },
          NoStoreStrategy: {
            filePath: '/cache/strategies.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'NoStoreStrategy',
            value: '{\n  mode: string;\n}',
            description: '',
            members: [
              {
                filePath: '/cache/strategies.ts',
                syntaxKind: 'PropertySignature',
                name: 'mode',
                value: 'string',
                description: '',
              },
            ],
          },
          AllCacheOptions: {
            filePath: '/cache/strategies.ts',
            name: 'AllCacheOptions',
            description: 'Override options for a cache strategy.',
            members: [
              {
                filePath: '/cache/strategies.ts',
                syntaxKind: 'PropertySignature',
                name: 'mode',
                value: 'string',
                description:
                  'The caching mode, generally `public`, `private`, or `no-store`.',
                isOptional: true,
              },
              {
                filePath: '/cache/strategies.ts',
                syntaxKind: 'PropertySignature',
                name: 'maxAge',
                value: 'number',
                description:
                  'The maximum amount of time in seconds that a resource will be considered fresh. See `max-age` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#:~:text=Response%20Directives-,max%2Dage,-The%20max%2Dage).',
                isOptional: true,
              },
              {
                filePath: '/cache/strategies.ts',
                syntaxKind: 'PropertySignature',
                name: 'staleWhileRevalidate',
                value: 'number',
                description:
                  'Indicate that the cache should serve the stale response in the background while revalidating the cache. See `stale-while-revalidate` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#stale-while-revalidate).',
                isOptional: true,
              },
              {
                filePath: '/cache/strategies.ts',
                syntaxKind: 'PropertySignature',
                name: 'sMaxAge',
                value: 'number',
                description:
                  'Similar to `maxAge` but specific to shared caches. See `s-maxage` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#s-maxage).',
                isOptional: true,
              },
              {
                filePath: '/cache/strategies.ts',
                syntaxKind: 'PropertySignature',
                name: 'staleIfError',
                value: 'number',
                description:
                  'Indicate that the cache should serve the stale response if an error occurs while revalidating the cache. See `stale-if-error` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#stale-if-error).',
                isOptional: true,
              },
            ],
            value:
              'export interface AllCacheOptions {\n  /**\n   * The caching mode, generally `public`, `private`, or `no-store`.\n   */\n  mode?: string;\n  /**\n   * The maximum amount of time in seconds that a resource will be considered fresh. See `max-age` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#:~:text=Response%20Directives-,max%2Dage,-The%20max%2Dage).\n   */\n  maxAge?: number;\n  /**\n   * Indicate that the cache should serve the stale response in the background while revalidating the cache. See `stale-while-revalidate` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#stale-while-revalidate).\n   */\n  staleWhileRevalidate?: number;\n  /**\n   * Similar to `maxAge` but specific to shared caches. See `s-maxage` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#s-maxage).\n   */\n  sMaxAge?: number;\n  /**\n   * Indicate that the cache should serve the stale response if an error occurs while revalidating the cache. See `stale-if-error` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#stale-if-error).\n   */\n  staleIfError?: number;\n}',
          },
          CartLinesAddFunction: {
            filePath: '/cart/queries/cartLinesAddDefault.ts',
            name: 'CartLinesAddFunction',
            description: '',
            params: [
              {
                name: 'lines',
                description: '',
                value: 'CartLineInput[]',
                filePath: '/cart/queries/cartLinesAddDefault.ts',
              },
              {
                name: 'optionalParams',
                description: '',
                value: 'CartOptionalInput',
                isOptional: true,
                filePath: '/cart/queries/cartLinesAddDefault.ts',
              },
            ],
            returns: {
              filePath: '/cart/queries/cartLinesAddDefault.ts',
              description: '',
              name: 'Promise<CartQueryData>',
              value: 'Promise<CartQueryData>',
            },
            value:
              'export type CartLinesAddFunction = (\n  lines: CartLineInput[],\n  optionalParams?: CartOptionalInput,\n) => Promise<CartQueryData>;',
          },
          CartLineInput: {
            description: '',
            name: 'CartLineInput',
            value: 'CartLineInput',
            members: [],
            override:
              '[CartLineInput](/docs/api/storefront/2023-07/input-objects/CartLineInput) - Storefront API type',
          },
          CartOptionalInput: {
            filePath: '/cart/queries/cart-types.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'CartOptionalInput',
            value:
              "{\n  /**\n   * The cart id.\n   * @default cart.getCartId();\n   */\n  cartId?: Scalars['ID'];\n  /**\n   * The country code.\n   * @default storefront.i18n.country\n   */\n  country?: CountryCode;\n  /**\n   * The language code.\n   * @default storefront.i18n.language\n   */\n  language?: LanguageCode;\n}",
            description: '',
            members: [
              {
                filePath: '/cart/queries/cart-types.ts',
                syntaxKind: 'PropertySignature',
                name: 'cartId',
                value: 'string',
                description: 'The cart id.',
                isOptional: true,
                defaultValue: 'cart.getCartId();',
              },
              {
                filePath: '/cart/queries/cart-types.ts',
                syntaxKind: 'PropertySignature',
                name: 'country',
                value: 'CountryCode',
                description: 'The country code.',
                isOptional: true,
                defaultValue: 'storefront.i18n.country',
              },
              {
                filePath: '/cart/queries/cart-types.ts',
                syntaxKind: 'PropertySignature',
                name: 'language',
                value: 'LanguageCode',
                description: 'The language code.',
                isOptional: true,
                defaultValue: 'storefront.i18n.language',
              },
            ],
          },
          CartQueryData: {
            filePath: '/cart/queries/cart-types.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'CartQueryData',
            value:
              '{\n  cart: Cart;\n  errors?:\n    | CartUserError[]\n    | MetafieldsSetUserError[]\n    | MetafieldDeleteUserError[];\n}',
            description: '',
            members: [
              {
                filePath: '/cart/queries/cart-types.ts',
                syntaxKind: 'PropertySignature',
                name: 'cart',
                value: 'Cart',
                description: '',
              },
              {
                filePath: '/cart/queries/cart-types.ts',
                syntaxKind: 'PropertySignature',
                name: 'errors',
                value:
                  'CartUserError[] | MetafieldsSetUserError[] | MetafieldDeleteUserError[]',
                description: '',
                isOptional: true,
              },
            ],
          },
          Cart: {
            description: '',
            name: 'Cart',
            value: 'Cart',
            members: [],
            override:
              '[Cart](/docs/api/storefront/2023-07/objects/Cart) - Storefront API type',
          },
          CartUserError: {
            description: '',
            name: 'CartUserError',
            value: 'CartUserError',
            members: [],
            override:
              '[CartUserError](/docs/api/storefront/2023-07/objects/CartUserError) - Storefront API type',
          },
          MetafieldsSetUserError: {
            description: '',
            name: 'MetafieldsSetUserError',
            value: 'MetafieldsSetUserError',
            members: [],
            override:
              '[MetafieldsSetUserError](/docs/api/storefront/2023-07/objects/MetafieldsSetUserError) - Storefront API type',
          },
          MetafieldDeleteUserError: {
            description: '',
            name: 'MetafieldDeleteUserError',
            value: 'MetafieldDeleteUserError',
            members: [],
            override:
              '[MetafieldDeleteUserError](/docs/api/storefront/2023-07/objects/MetafieldDeleteUserError) - Storefront API type',
          },
        },
      },
    ],
  },
  {
    name: 'cartLinesRemoveDefault',
    category: 'utilities',
    isVisualComponent: false,
    related: [],
    description:
      'Creates a function that accepts an array of line ids and removes the line items from a cart',
    type: 'utility',
    defaultExample: {
      description: 'This is the default example',
      codeblock: {
        tabs: [
          {
            title: 'JavaScript',
            code: "import {cartLinesRemoveDefault} from '@shopify/hydrogen';\n\nconst cartRemove = cartLinesRemoveDefault({\n  storefront,\n  getCartId,\n});\n\nconst result = await cartRemove(['gid://shopify/CartLine/123456789']);\n",
            language: 'js',
          },
        ],
        title: 'example',
      },
    },
    definitions: [
      {
        title: 'cartLinesRemoveDefault',
        description: '',
        type: 'CartLinesRemoveDefaultGeneratedType',
        typeDefinitions: {
          CartLinesRemoveDefaultGeneratedType: {
            filePath: '/cart/queries/cartLinesRemoveDefault.ts',
            name: 'CartLinesRemoveDefaultGeneratedType',
            description: '',
            params: [
              {
                name: 'options',
                description: '',
                value: 'CartQueryOptions',
                filePath: '/cart/queries/cartLinesRemoveDefault.ts',
              },
            ],
            returns: {
              filePath: '/cart/queries/cartLinesRemoveDefault.ts',
              description: '',
              name: 'CartLinesRemoveFunction',
              value: 'CartLinesRemoveFunction',
            },
            value:
              'export function cartLinesRemoveDefault(\n  options: CartQueryOptions,\n): CartLinesRemoveFunction {\n  return async (lineIds, optionalParams) => {\n    const {cartLinesRemove} = await options.storefront.mutate<{\n      cartLinesRemove: CartQueryData;\n    }>(CART_LINES_REMOVE_MUTATION(options.cartFragment), {\n      variables: {\n        cartId: options.getCartId(),\n        lineIds,\n        ...optionalParams,\n      },\n    });\n    return cartLinesRemove;\n  };\n}',
          },
          CartQueryOptions: {
            filePath: '/cart/queries/cart-types.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'CartQueryOptions',
            value:
              '{\n  /**\n   * The storefront client instance created by [`createStorefrontClient`](docs/api/hydrogen/latest/utilities/createstorefrontclient).\n   */\n  storefront: Storefront;\n  /**\n   * A function that returns the cart ID.\n   */\n  getCartId: () => string | undefined;\n  /**\n   * The cart fragment to override the one used in this query.\n   */\n  cartFragment?: string;\n}',
            description: '',
            members: [
              {
                filePath: '/cart/queries/cart-types.ts',
                syntaxKind: 'PropertySignature',
                name: 'storefront',
                value: 'Storefront',
                description:
                  'The storefront client instance created by [`createStorefrontClient`](docs/api/hydrogen/latest/utilities/createstorefrontclient).',
              },
              {
                filePath: '/cart/queries/cart-types.ts',
                syntaxKind: 'PropertySignature',
                name: 'getCartId',
                value: '() => string',
                description: 'A function that returns the cart ID.',
              },
              {
                filePath: '/cart/queries/cart-types.ts',
                syntaxKind: 'PropertySignature',
                name: 'cartFragment',
                value: 'string',
                description:
                  'The cart fragment to override the one used in this query.',
                isOptional: true,
              },
            ],
          },
          Storefront: {
            filePath: '/storefront.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'Storefront',
            value:
              "{\n  /** The function to run a query on Storefront API. */\n  query: <OverrideReturnType = any, RawGqlString extends string = string>(\n    query: RawGqlString,\n    ...options: RawGqlString extends keyof StorefrontQueries // Do we have any generated query types?\n      ? IsOptionalVariables<StorefrontQueries[RawGqlString]> extends true\n        ? [StorefrontQuerySecondParam<RawGqlString>?] // Using codegen, query has no variables\n        : [StorefrontQuerySecondParam<RawGqlString>] // Using codegen, query needs variables\n      : [StorefrontQuerySecondParam?] // No codegen, variables always optional\n  ) => Promise<\n    RawGqlString extends keyof StorefrontQueries // Do we have any generated query types?\n      ? StorefrontQueries[RawGqlString]['return'] // Using codegen, return type is known\n      : OverrideReturnType // No codegen, let user specify return type\n  >;\n  /** The function to run a mutation on Storefront API. */\n  mutate: <OverrideReturnType = any, RawGqlString extends string = string>(\n    mutation: RawGqlString,\n    ...options: RawGqlString extends keyof StorefrontMutations // Do we have any generated mutation types?\n      ? IsOptionalVariables<StorefrontMutations[RawGqlString]> extends true\n        ? [StorefrontMutateSecondParam<RawGqlString>?] // Using codegen, mutation has no variables\n        : [StorefrontMutateSecondParam<RawGqlString>] // Using codegen, mutation needs variables\n      : [StorefrontMutateSecondParam?] // No codegen, variables always optional\n  ) => Promise<\n    RawGqlString extends keyof StorefrontMutations // Do we have any generated mutation types?\n      ? StorefrontMutations[RawGqlString]['return'] // Using codegen, return type is known\n      : OverrideReturnType // No codegen, let user specify return type\n  >;\n  /** The cache instance passed in from the `createStorefrontClient` argument. */\n  cache?: Cache;\n  /** Re-export of [`CacheNone`](/docs/api/hydrogen/2023-07/utilities/cachenone). */\n  CacheNone: typeof CacheNone;\n  /** Re-export of [`CacheLong`](/docs/api/hydrogen/2023-07/utilities/cachelong). */\n  CacheLong: typeof CacheLong;\n  /** Re-export of [`CacheShort`](/docs/api/hydrogen/2023-07/utilities/cacheshort). */\n  CacheShort: typeof CacheShort;\n  /** Re-export of [`CacheCustom`](/docs/api/hydrogen/2023-07/utilities/cachecustom). */\n  CacheCustom: typeof CacheCustom;\n  /** Re-export of [`generateCacheControlHeader`](/docs/api/hydrogen/2023-07/utilities/generatecachecontrolheader). */\n  generateCacheControlHeader: typeof generateCacheControlHeader;\n  /** Returns an object that contains headers that are needed for each query to Storefront API GraphQL endpoint. See [`getPublicTokenHeaders` in Hydrogen React](/docs/api/hydrogen-react/2023-07/utilities/createstorefrontclient#:~:text=%27graphql%27.-,getPublicTokenHeaders,-(props%3F%3A) for more details. */\n  getPublicTokenHeaders: ReturnType<\n    typeof createStorefrontUtilities\n  >['getPublicTokenHeaders'];\n  /** Returns an object that contains headers that are needed for each query to Storefront API GraphQL endpoint for API calls made from a server. See [`getPrivateTokenHeaders` in  Hydrogen React](/docs/api/hydrogen-react/2023-07/utilities/createstorefrontclient#:~:text=storefrontApiVersion-,getPrivateTokenHeaders,-(props%3F%3A) for more details.*/\n  getPrivateTokenHeaders: ReturnType<\n    typeof createStorefrontUtilities\n  >['getPrivateTokenHeaders'];\n  /** Creates the fully-qualified URL to your myshopify.com domain. See [`getShopifyDomain` in  Hydrogen React](/docs/api/hydrogen-react/2023-07/utilities/createstorefrontclient#:~:text=StorefrontClientReturn-,getShopifyDomain,-(props%3F%3A) for more details. */\n  getShopifyDomain: ReturnType<\n    typeof createStorefrontUtilities\n  >['getShopifyDomain'];\n  /** Creates the fully-qualified URL to your store's GraphQL endpoint. See [`getStorefrontApiUrl` in  Hydrogen React](/docs/api/hydrogen-react/2023-07/utilities/createstorefrontclient#:~:text=storeDomain-,getStorefrontApiUrl,-(props%3F%3A) for more details.*/\n  getApiUrl: ReturnType<\n    typeof createStorefrontUtilities\n  >['getStorefrontApiUrl'];\n  /** Determines if the error is resulted from a Storefront API call. */\n  isApiError: (error: any) => boolean;\n  /** The `i18n` object passed in from the `createStorefrontClient` argument. */\n  i18n: TI18n;\n}",
            description: 'Interface to interact with the Storefront API.',
            members: [
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'query',
                value:
                  '<OverrideReturnType = any, RawGqlString extends string = string>(query: RawGqlString, ...options: RawGqlString extends never ? IsOptionalVariables<StorefrontQueries[RawGqlString]> extends true ? [StorefrontQuerySecondParam<RawGqlString>?] : [StorefrontQuerySecondParam<RawGqlString>] : [StorefrontQuerySecondParam<string>?]) => Promise<RawGqlString extends never ? StorefrontQueries[RawGqlString]["return"] : OverrideReturnType>',
                description: 'The function to run a query on Storefront API.',
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'mutate',
                value:
                  '<OverrideReturnType = any, RawGqlString extends string = string>(mutation: RawGqlString, ...options: RawGqlString extends never ? IsOptionalVariables<StorefrontMutations[RawGqlString]> extends true ? [StorefrontMutateSecondParam<RawGqlString>?] : [StorefrontMutateSecondParam<RawGqlString>] : [StorefrontCommonOptions<{ readonly [variable: string]: unknown; }>?]) => Promise<RawGqlString extends never ? StorefrontMutations[RawGqlString]["return"] : OverrideReturnType>',
                description:
                  'The function to run a mutation on Storefront API.',
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'cache',
                value: 'Cache',
                description:
                  'The cache instance passed in from the `createStorefrontClient` argument.',
                isOptional: true,
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'CacheNone',
                value: '() => NoStoreStrategy',
                description:
                  'Re-export of [`CacheNone`](/docs/api/hydrogen/2023-07/utilities/cachenone).',
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'CacheLong',
                value: '(overrideOptions?: AllCacheOptions) => AllCacheOptions',
                description:
                  'Re-export of [`CacheLong`](/docs/api/hydrogen/2023-07/utilities/cachelong).',
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'CacheShort',
                value: '(overrideOptions?: AllCacheOptions) => AllCacheOptions',
                description:
                  'Re-export of [`CacheShort`](/docs/api/hydrogen/2023-07/utilities/cacheshort).',
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'CacheCustom',
                value: '(overrideOptions: AllCacheOptions) => AllCacheOptions',
                description:
                  'Re-export of [`CacheCustom`](/docs/api/hydrogen/2023-07/utilities/cachecustom).',
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'generateCacheControlHeader',
                value: '(cacheOptions: AllCacheOptions) => string',
                description:
                  'Re-export of [`generateCacheControlHeader`](/docs/api/hydrogen/2023-07/utilities/generatecachecontrolheader).',
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'getPublicTokenHeaders',
                value:
                  '(props?: Partial<Pick<StorefrontClientProps, "contentType">> & Pick<StorefrontClientProps, "publicStorefrontToken">) => Record<string, string>',
                description:
                  'Returns an object that contains headers that are needed for each query to Storefront API GraphQL endpoint. See [`getPublicTokenHeaders` in Hydrogen React](/docs/api/hydrogen-react/2023-07/utilities/createstorefrontclient#:~:text=%27graphql%27.-,getPublicTokenHeaders,-(props%3F%3A) for more details.',
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'getPrivateTokenHeaders',
                value:
                  '(props?: Partial<Pick<StorefrontClientProps, "contentType">> & Pick<StorefrontClientProps, "privateStorefrontToken"> & { buyerIp?: string; }) => Record<string, string>',
                description:
                  'Returns an object that contains headers that are needed for each query to Storefront API GraphQL endpoint for API calls made from a server. See [`getPrivateTokenHeaders` in  Hydrogen React](/docs/api/hydrogen-react/2023-07/utilities/createstorefrontclient#:~:text=storefrontApiVersion-,getPrivateTokenHeaders,-(props%3F%3A) for more details.',
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'getShopifyDomain',
                value:
                  '(props?: Partial<Pick<StorefrontClientProps, "storeDomain">>) => string',
                description:
                  'Creates the fully-qualified URL to your myshopify.com domain. See [`getShopifyDomain` in  Hydrogen React](/docs/api/hydrogen-react/2023-07/utilities/createstorefrontclient#:~:text=StorefrontClientReturn-,getShopifyDomain,-(props%3F%3A) for more details.',
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'getApiUrl',
                value:
                  '(props?: Partial<Pick<StorefrontClientProps, "storeDomain" | "storefrontApiVersion">>) => string',
                description:
                  "Creates the fully-qualified URL to your store's GraphQL endpoint. See [`getStorefrontApiUrl` in  Hydrogen React](/docs/api/hydrogen-react/2023-07/utilities/createstorefrontclient#:~:text=storeDomain-,getStorefrontApiUrl,-(props%3F%3A) for more details.",
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'isApiError',
                value: '(error: any) => boolean',
                description:
                  'Determines if the error is resulted from a Storefront API call.',
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'i18n',
                value: 'TI18n',
                description:
                  'The `i18n` object passed in from the `createStorefrontClient` argument.',
              },
            ],
          },
          IsOptionalVariables: {
            filePath: '/storefront.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'IsOptionalVariables',
            value:
              "Omit<\n  OperationTypeValue['variables'],\n  AutoAddedVariableNames\n> extends EmptyVariables\n  ? true // No need to pass variables\n  : GenericVariables extends OperationTypeValue['variables']\n  ? true // We don't know what variables are needed\n  : false",
            description: '',
          },
          AutoAddedVariableNames: {
            filePath: '/storefront.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'AutoAddedVariableNames',
            value: "'country' | 'language'",
            description: '',
          },
          EmptyVariables: {
            filePath: '/storefront.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'EmptyVariables',
            value: '{[key: string]: never}',
            description: '',
            members: [],
          },
          GenericVariables: {
            filePath: '/storefront.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'GenericVariables',
            value: "ExecutionArgs['variableValues']",
            description: '',
          },
          StorefrontQueries: {
            filePath: '/storefront.ts',
            name: 'StorefrontQueries',
            description:
              'Maps all the queries found in the project to variables and return types.',
            members: [],
            value:
              "export interface StorefrontQueries {\n  // Example of how a generated query type looks like:\n  // '#graphql query q1 {...}': {return: Q1Query; variables: Q1QueryVariables};\n}",
          },
          StorefrontQuerySecondParam: {
            filePath: '/storefront.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'StorefrontQuerySecondParam',
            value:
              "(RawGqlString extends keyof StorefrontQueries\n  ? StorefrontCommonOptions<StorefrontQueries[RawGqlString]['variables']>\n  : StorefrontCommonOptions<GenericVariables>) & {cache?: CachingStrategy}",
            description: '',
          },
          StorefrontCommonOptions: {
            filePath: '/storefront.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'StorefrontCommonOptions',
            value:
              '{\n  headers?: HeadersInit;\n  storefrontApiVersion?: string;\n} & (IsOptionalVariables<{variables: Variables}> extends true\n  ? {variables?: Variables}\n  : {variables: Variables})',
            description: '',
          },
          CachingStrategy: {
            filePath: '/cache/strategies.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'CachingStrategy',
            value: 'AllCacheOptions',
            description:
              'Use the `CachingStrategy` to define a custom caching mechanism for your data. Or use one of the pre-defined caching strategies: CacheNone, CacheShort, CacheLong.',
            members: [
              {
                filePath: '/cache/strategies.ts',
                syntaxKind: 'PropertySignature',
                name: 'mode',
                value: 'string',
                description:
                  'The caching mode, generally `public`, `private`, or `no-store`.',
                isOptional: true,
              },
              {
                filePath: '/cache/strategies.ts',
                syntaxKind: 'PropertySignature',
                name: 'maxAge',
                value: 'number',
                description:
                  'The maximum amount of time in seconds that a resource will be considered fresh. See `max-age` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#:~:text=Response%20Directives-,max%2Dage,-The%20max%2Dage).',
                isOptional: true,
              },
              {
                filePath: '/cache/strategies.ts',
                syntaxKind: 'PropertySignature',
                name: 'staleWhileRevalidate',
                value: 'number',
                description:
                  'Indicate that the cache should serve the stale response in the background while revalidating the cache. See `stale-while-revalidate` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#stale-while-revalidate).',
                isOptional: true,
              },
              {
                filePath: '/cache/strategies.ts',
                syntaxKind: 'PropertySignature',
                name: 'sMaxAge',
                value: 'number',
                description:
                  'Similar to `maxAge` but specific to shared caches. See `s-maxage` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#s-maxage).',
                isOptional: true,
              },
              {
                filePath: '/cache/strategies.ts',
                syntaxKind: 'PropertySignature',
                name: 'staleIfError',
                value: 'number',
                description:
                  'Indicate that the cache should serve the stale response if an error occurs while revalidating the cache. See `stale-if-error` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#stale-if-error).',
                isOptional: true,
              },
            ],
          },
          StorefrontMutations: {
            filePath: '/storefront.ts',
            name: 'StorefrontMutations',
            description:
              'Maps all the mutations found in the project to variables and return types.',
            members: [],
            value:
              "export interface StorefrontMutations {\n  // Example of how a generated mutation type looks like:\n  // '#graphql mutation m1 {...}': {return: M1Mutation; variables: M1MutationVariables};\n}",
          },
          StorefrontMutateSecondParam: {
            filePath: '/storefront.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'StorefrontMutateSecondParam',
            value:
              "RawGqlString extends keyof StorefrontMutations\n  ? StorefrontCommonOptions<StorefrontMutations[RawGqlString]['variables']>\n  : StorefrontCommonOptions<GenericVariables>",
            description: '',
          },
          NoStoreStrategy: {
            filePath: '/cache/strategies.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'NoStoreStrategy',
            value: '{\n  mode: string;\n}',
            description: '',
            members: [
              {
                filePath: '/cache/strategies.ts',
                syntaxKind: 'PropertySignature',
                name: 'mode',
                value: 'string',
                description: '',
              },
            ],
          },
          AllCacheOptions: {
            filePath: '/cache/strategies.ts',
            name: 'AllCacheOptions',
            description: 'Override options for a cache strategy.',
            members: [
              {
                filePath: '/cache/strategies.ts',
                syntaxKind: 'PropertySignature',
                name: 'mode',
                value: 'string',
                description:
                  'The caching mode, generally `public`, `private`, or `no-store`.',
                isOptional: true,
              },
              {
                filePath: '/cache/strategies.ts',
                syntaxKind: 'PropertySignature',
                name: 'maxAge',
                value: 'number',
                description:
                  'The maximum amount of time in seconds that a resource will be considered fresh. See `max-age` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#:~:text=Response%20Directives-,max%2Dage,-The%20max%2Dage).',
                isOptional: true,
              },
              {
                filePath: '/cache/strategies.ts',
                syntaxKind: 'PropertySignature',
                name: 'staleWhileRevalidate',
                value: 'number',
                description:
                  'Indicate that the cache should serve the stale response in the background while revalidating the cache. See `stale-while-revalidate` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#stale-while-revalidate).',
                isOptional: true,
              },
              {
                filePath: '/cache/strategies.ts',
                syntaxKind: 'PropertySignature',
                name: 'sMaxAge',
                value: 'number',
                description:
                  'Similar to `maxAge` but specific to shared caches. See `s-maxage` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#s-maxage).',
                isOptional: true,
              },
              {
                filePath: '/cache/strategies.ts',
                syntaxKind: 'PropertySignature',
                name: 'staleIfError',
                value: 'number',
                description:
                  'Indicate that the cache should serve the stale response if an error occurs while revalidating the cache. See `stale-if-error` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#stale-if-error).',
                isOptional: true,
              },
            ],
            value:
              'export interface AllCacheOptions {\n  /**\n   * The caching mode, generally `public`, `private`, or `no-store`.\n   */\n  mode?: string;\n  /**\n   * The maximum amount of time in seconds that a resource will be considered fresh. See `max-age` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#:~:text=Response%20Directives-,max%2Dage,-The%20max%2Dage).\n   */\n  maxAge?: number;\n  /**\n   * Indicate that the cache should serve the stale response in the background while revalidating the cache. See `stale-while-revalidate` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#stale-while-revalidate).\n   */\n  staleWhileRevalidate?: number;\n  /**\n   * Similar to `maxAge` but specific to shared caches. See `s-maxage` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#s-maxage).\n   */\n  sMaxAge?: number;\n  /**\n   * Indicate that the cache should serve the stale response if an error occurs while revalidating the cache. See `stale-if-error` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#stale-if-error).\n   */\n  staleIfError?: number;\n}',
          },
          CartLinesRemoveFunction: {
            filePath: '/cart/queries/cartLinesRemoveDefault.ts',
            name: 'CartLinesRemoveFunction',
            description: '',
            params: [
              {
                name: 'lineIds',
                description: '',
                value: 'string[]',
                filePath: '/cart/queries/cartLinesRemoveDefault.ts',
              },
              {
                name: 'optionalParams',
                description: '',
                value: 'CartOptionalInput',
                isOptional: true,
                filePath: '/cart/queries/cartLinesRemoveDefault.ts',
              },
            ],
            returns: {
              filePath: '/cart/queries/cartLinesRemoveDefault.ts',
              description: '',
              name: 'Promise<CartQueryData>',
              value: 'Promise<CartQueryData>',
            },
            value:
              'export type CartLinesRemoveFunction = (\n  lineIds: string[],\n  optionalParams?: CartOptionalInput,\n) => Promise<CartQueryData>;',
          },
          CartOptionalInput: {
            filePath: '/cart/queries/cart-types.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'CartOptionalInput',
            value:
              "{\n  /**\n   * The cart id.\n   * @default cart.getCartId();\n   */\n  cartId?: Scalars['ID'];\n  /**\n   * The country code.\n   * @default storefront.i18n.country\n   */\n  country?: CountryCode;\n  /**\n   * The language code.\n   * @default storefront.i18n.language\n   */\n  language?: LanguageCode;\n}",
            description: '',
            members: [
              {
                filePath: '/cart/queries/cart-types.ts',
                syntaxKind: 'PropertySignature',
                name: 'cartId',
                value: 'string',
                description: 'The cart id.',
                isOptional: true,
                defaultValue: 'cart.getCartId();',
              },
              {
                filePath: '/cart/queries/cart-types.ts',
                syntaxKind: 'PropertySignature',
                name: 'country',
                value: 'CountryCode',
                description: 'The country code.',
                isOptional: true,
                defaultValue: 'storefront.i18n.country',
              },
              {
                filePath: '/cart/queries/cart-types.ts',
                syntaxKind: 'PropertySignature',
                name: 'language',
                value: 'LanguageCode',
                description: 'The language code.',
                isOptional: true,
                defaultValue: 'storefront.i18n.language',
              },
            ],
          },
          CartQueryData: {
            filePath: '/cart/queries/cart-types.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'CartQueryData',
            value:
              '{\n  cart: Cart;\n  errors?:\n    | CartUserError[]\n    | MetafieldsSetUserError[]\n    | MetafieldDeleteUserError[];\n}',
            description: '',
            members: [
              {
                filePath: '/cart/queries/cart-types.ts',
                syntaxKind: 'PropertySignature',
                name: 'cart',
                value: 'Cart',
                description: '',
              },
              {
                filePath: '/cart/queries/cart-types.ts',
                syntaxKind: 'PropertySignature',
                name: 'errors',
                value:
                  'CartUserError[] | MetafieldsSetUserError[] | MetafieldDeleteUserError[]',
                description: '',
                isOptional: true,
              },
            ],
          },
          Cart: {
            description: '',
            name: 'Cart',
            value: 'Cart',
            members: [],
            override:
              '[Cart](/docs/api/storefront/2023-07/objects/Cart) - Storefront API type',
          },
          CartUserError: {
            description: '',
            name: 'CartUserError',
            value: 'CartUserError',
            members: [],
            override:
              '[CartUserError](/docs/api/storefront/2023-07/objects/CartUserError) - Storefront API type',
          },
          MetafieldsSetUserError: {
            description: '',
            name: 'MetafieldsSetUserError',
            value: 'MetafieldsSetUserError',
            members: [],
            override:
              '[MetafieldsSetUserError](/docs/api/storefront/2023-07/objects/MetafieldsSetUserError) - Storefront API type',
          },
          MetafieldDeleteUserError: {
            description: '',
            name: 'MetafieldDeleteUserError',
            value: 'MetafieldDeleteUserError',
            members: [],
            override:
              '[MetafieldDeleteUserError](/docs/api/storefront/2023-07/objects/MetafieldDeleteUserError) - Storefront API type',
          },
        },
      },
    ],
  },
  {
    name: 'cartLinesUpdateDefault',
    category: 'utilities',
    isVisualComponent: false,
    related: [],
    description:
      'Creates a function that accepts an array of [CartLineUpdateInput](/docs/api/storefront/2023-07/input-objects/CartLineUpdateInput) and updates the line items in a cart',
    type: 'utility',
    defaultExample: {
      description: 'This is the default example',
      codeblock: {
        tabs: [
          {
            title: 'JavaScript',
            code: "import {cartLinesUpdateDefault} from '@shopify/hydrogen';\n\nconst cartUpdate = cartLinesUpdateDefault({\n  storefront,\n  getCartId,\n});\n\nconst result = await cartUpdate([\n  {\n    id: 'gid://shopify/CartLine/123456789',\n    quantity: 2,\n  },\n]);\n",
            language: 'js',
          },
        ],
        title: 'example',
      },
    },
    definitions: [
      {
        title: 'cartLinesUpdateDefault',
        description: '',
        type: 'CartLinesUpdateDefaultGeneratedType',
        typeDefinitions: {
          CartLinesUpdateDefaultGeneratedType: {
            filePath: '/cart/queries/cartLinesUpdateDefault.ts',
            name: 'CartLinesUpdateDefaultGeneratedType',
            description: '',
            params: [
              {
                name: 'options',
                description: '',
                value: 'CartQueryOptions',
                filePath: '/cart/queries/cartLinesUpdateDefault.ts',
              },
            ],
            returns: {
              filePath: '/cart/queries/cartLinesUpdateDefault.ts',
              description: '',
              name: 'CartLinesUpdateFunction',
              value: 'CartLinesUpdateFunction',
            },
            value:
              'export function cartLinesUpdateDefault(\n  options: CartQueryOptions,\n): CartLinesUpdateFunction {\n  return async (lines, optionalParams) => {\n    const {cartLinesUpdate} = await options.storefront.mutate<{\n      cartLinesUpdate: CartQueryData;\n    }>(CART_LINES_UPDATE_MUTATION(options.cartFragment), {\n      variables: {\n        cartId: options.getCartId(),\n        lines,\n        ...optionalParams,\n      },\n    });\n    return cartLinesUpdate;\n  };\n}',
          },
          CartQueryOptions: {
            filePath: '/cart/queries/cart-types.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'CartQueryOptions',
            value:
              '{\n  /**\n   * The storefront client instance created by [`createStorefrontClient`](docs/api/hydrogen/latest/utilities/createstorefrontclient).\n   */\n  storefront: Storefront;\n  /**\n   * A function that returns the cart ID.\n   */\n  getCartId: () => string | undefined;\n  /**\n   * The cart fragment to override the one used in this query.\n   */\n  cartFragment?: string;\n}',
            description: '',
            members: [
              {
                filePath: '/cart/queries/cart-types.ts',
                syntaxKind: 'PropertySignature',
                name: 'storefront',
                value: 'Storefront',
                description:
                  'The storefront client instance created by [`createStorefrontClient`](docs/api/hydrogen/latest/utilities/createstorefrontclient).',
              },
              {
                filePath: '/cart/queries/cart-types.ts',
                syntaxKind: 'PropertySignature',
                name: 'getCartId',
                value: '() => string',
                description: 'A function that returns the cart ID.',
              },
              {
                filePath: '/cart/queries/cart-types.ts',
                syntaxKind: 'PropertySignature',
                name: 'cartFragment',
                value: 'string',
                description:
                  'The cart fragment to override the one used in this query.',
                isOptional: true,
              },
            ],
          },
          Storefront: {
            filePath: '/storefront.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'Storefront',
            value:
              "{\n  /** The function to run a query on Storefront API. */\n  query: <OverrideReturnType = any, RawGqlString extends string = string>(\n    query: RawGqlString,\n    ...options: RawGqlString extends keyof StorefrontQueries // Do we have any generated query types?\n      ? IsOptionalVariables<StorefrontQueries[RawGqlString]> extends true\n        ? [StorefrontQuerySecondParam<RawGqlString>?] // Using codegen, query has no variables\n        : [StorefrontQuerySecondParam<RawGqlString>] // Using codegen, query needs variables\n      : [StorefrontQuerySecondParam?] // No codegen, variables always optional\n  ) => Promise<\n    RawGqlString extends keyof StorefrontQueries // Do we have any generated query types?\n      ? StorefrontQueries[RawGqlString]['return'] // Using codegen, return type is known\n      : OverrideReturnType // No codegen, let user specify return type\n  >;\n  /** The function to run a mutation on Storefront API. */\n  mutate: <OverrideReturnType = any, RawGqlString extends string = string>(\n    mutation: RawGqlString,\n    ...options: RawGqlString extends keyof StorefrontMutations // Do we have any generated mutation types?\n      ? IsOptionalVariables<StorefrontMutations[RawGqlString]> extends true\n        ? [StorefrontMutateSecondParam<RawGqlString>?] // Using codegen, mutation has no variables\n        : [StorefrontMutateSecondParam<RawGqlString>] // Using codegen, mutation needs variables\n      : [StorefrontMutateSecondParam?] // No codegen, variables always optional\n  ) => Promise<\n    RawGqlString extends keyof StorefrontMutations // Do we have any generated mutation types?\n      ? StorefrontMutations[RawGqlString]['return'] // Using codegen, return type is known\n      : OverrideReturnType // No codegen, let user specify return type\n  >;\n  /** The cache instance passed in from the `createStorefrontClient` argument. */\n  cache?: Cache;\n  /** Re-export of [`CacheNone`](/docs/api/hydrogen/2023-07/utilities/cachenone). */\n  CacheNone: typeof CacheNone;\n  /** Re-export of [`CacheLong`](/docs/api/hydrogen/2023-07/utilities/cachelong). */\n  CacheLong: typeof CacheLong;\n  /** Re-export of [`CacheShort`](/docs/api/hydrogen/2023-07/utilities/cacheshort). */\n  CacheShort: typeof CacheShort;\n  /** Re-export of [`CacheCustom`](/docs/api/hydrogen/2023-07/utilities/cachecustom). */\n  CacheCustom: typeof CacheCustom;\n  /** Re-export of [`generateCacheControlHeader`](/docs/api/hydrogen/2023-07/utilities/generatecachecontrolheader). */\n  generateCacheControlHeader: typeof generateCacheControlHeader;\n  /** Returns an object that contains headers that are needed for each query to Storefront API GraphQL endpoint. See [`getPublicTokenHeaders` in Hydrogen React](/docs/api/hydrogen-react/2023-07/utilities/createstorefrontclient#:~:text=%27graphql%27.-,getPublicTokenHeaders,-(props%3F%3A) for more details. */\n  getPublicTokenHeaders: ReturnType<\n    typeof createStorefrontUtilities\n  >['getPublicTokenHeaders'];\n  /** Returns an object that contains headers that are needed for each query to Storefront API GraphQL endpoint for API calls made from a server. See [`getPrivateTokenHeaders` in  Hydrogen React](/docs/api/hydrogen-react/2023-07/utilities/createstorefrontclient#:~:text=storefrontApiVersion-,getPrivateTokenHeaders,-(props%3F%3A) for more details.*/\n  getPrivateTokenHeaders: ReturnType<\n    typeof createStorefrontUtilities\n  >['getPrivateTokenHeaders'];\n  /** Creates the fully-qualified URL to your myshopify.com domain. See [`getShopifyDomain` in  Hydrogen React](/docs/api/hydrogen-react/2023-07/utilities/createstorefrontclient#:~:text=StorefrontClientReturn-,getShopifyDomain,-(props%3F%3A) for more details. */\n  getShopifyDomain: ReturnType<\n    typeof createStorefrontUtilities\n  >['getShopifyDomain'];\n  /** Creates the fully-qualified URL to your store's GraphQL endpoint. See [`getStorefrontApiUrl` in  Hydrogen React](/docs/api/hydrogen-react/2023-07/utilities/createstorefrontclient#:~:text=storeDomain-,getStorefrontApiUrl,-(props%3F%3A) for more details.*/\n  getApiUrl: ReturnType<\n    typeof createStorefrontUtilities\n  >['getStorefrontApiUrl'];\n  /** Determines if the error is resulted from a Storefront API call. */\n  isApiError: (error: any) => boolean;\n  /** The `i18n` object passed in from the `createStorefrontClient` argument. */\n  i18n: TI18n;\n}",
            description: 'Interface to interact with the Storefront API.',
            members: [
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'query',
                value:
                  '<OverrideReturnType = any, RawGqlString extends string = string>(query: RawGqlString, ...options: RawGqlString extends never ? IsOptionalVariables<StorefrontQueries[RawGqlString]> extends true ? [StorefrontQuerySecondParam<RawGqlString>?] : [StorefrontQuerySecondParam<RawGqlString>] : [StorefrontQuerySecondParam<string>?]) => Promise<RawGqlString extends never ? StorefrontQueries[RawGqlString]["return"] : OverrideReturnType>',
                description: 'The function to run a query on Storefront API.',
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'mutate',
                value:
                  '<OverrideReturnType = any, RawGqlString extends string = string>(mutation: RawGqlString, ...options: RawGqlString extends never ? IsOptionalVariables<StorefrontMutations[RawGqlString]> extends true ? [StorefrontMutateSecondParam<RawGqlString>?] : [StorefrontMutateSecondParam<RawGqlString>] : [StorefrontCommonOptions<{ readonly [variable: string]: unknown; }>?]) => Promise<RawGqlString extends never ? StorefrontMutations[RawGqlString]["return"] : OverrideReturnType>',
                description:
                  'The function to run a mutation on Storefront API.',
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'cache',
                value: 'Cache',
                description:
                  'The cache instance passed in from the `createStorefrontClient` argument.',
                isOptional: true,
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'CacheNone',
                value: '() => NoStoreStrategy',
                description:
                  'Re-export of [`CacheNone`](/docs/api/hydrogen/2023-07/utilities/cachenone).',
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'CacheLong',
                value: '(overrideOptions?: AllCacheOptions) => AllCacheOptions',
                description:
                  'Re-export of [`CacheLong`](/docs/api/hydrogen/2023-07/utilities/cachelong).',
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'CacheShort',
                value: '(overrideOptions?: AllCacheOptions) => AllCacheOptions',
                description:
                  'Re-export of [`CacheShort`](/docs/api/hydrogen/2023-07/utilities/cacheshort).',
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'CacheCustom',
                value: '(overrideOptions: AllCacheOptions) => AllCacheOptions',
                description:
                  'Re-export of [`CacheCustom`](/docs/api/hydrogen/2023-07/utilities/cachecustom).',
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'generateCacheControlHeader',
                value: '(cacheOptions: AllCacheOptions) => string',
                description:
                  'Re-export of [`generateCacheControlHeader`](/docs/api/hydrogen/2023-07/utilities/generatecachecontrolheader).',
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'getPublicTokenHeaders',
                value:
                  '(props?: Partial<Pick<StorefrontClientProps, "contentType">> & Pick<StorefrontClientProps, "publicStorefrontToken">) => Record<string, string>',
                description:
                  'Returns an object that contains headers that are needed for each query to Storefront API GraphQL endpoint. See [`getPublicTokenHeaders` in Hydrogen React](/docs/api/hydrogen-react/2023-07/utilities/createstorefrontclient#:~:text=%27graphql%27.-,getPublicTokenHeaders,-(props%3F%3A) for more details.',
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'getPrivateTokenHeaders',
                value:
                  '(props?: Partial<Pick<StorefrontClientProps, "contentType">> & Pick<StorefrontClientProps, "privateStorefrontToken"> & { buyerIp?: string; }) => Record<string, string>',
                description:
                  'Returns an object that contains headers that are needed for each query to Storefront API GraphQL endpoint for API calls made from a server. See [`getPrivateTokenHeaders` in  Hydrogen React](/docs/api/hydrogen-react/2023-07/utilities/createstorefrontclient#:~:text=storefrontApiVersion-,getPrivateTokenHeaders,-(props%3F%3A) for more details.',
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'getShopifyDomain',
                value:
                  '(props?: Partial<Pick<StorefrontClientProps, "storeDomain">>) => string',
                description:
                  'Creates the fully-qualified URL to your myshopify.com domain. See [`getShopifyDomain` in  Hydrogen React](/docs/api/hydrogen-react/2023-07/utilities/createstorefrontclient#:~:text=StorefrontClientReturn-,getShopifyDomain,-(props%3F%3A) for more details.',
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'getApiUrl',
                value:
                  '(props?: Partial<Pick<StorefrontClientProps, "storeDomain" | "storefrontApiVersion">>) => string',
                description:
                  "Creates the fully-qualified URL to your store's GraphQL endpoint. See [`getStorefrontApiUrl` in  Hydrogen React](/docs/api/hydrogen-react/2023-07/utilities/createstorefrontclient#:~:text=storeDomain-,getStorefrontApiUrl,-(props%3F%3A) for more details.",
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'isApiError',
                value: '(error: any) => boolean',
                description:
                  'Determines if the error is resulted from a Storefront API call.',
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'i18n',
                value: 'TI18n',
                description:
                  'The `i18n` object passed in from the `createStorefrontClient` argument.',
              },
            ],
          },
          IsOptionalVariables: {
            filePath: '/storefront.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'IsOptionalVariables',
            value:
              "Omit<\n  OperationTypeValue['variables'],\n  AutoAddedVariableNames\n> extends EmptyVariables\n  ? true // No need to pass variables\n  : GenericVariables extends OperationTypeValue['variables']\n  ? true // We don't know what variables are needed\n  : false",
            description: '',
          },
          AutoAddedVariableNames: {
            filePath: '/storefront.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'AutoAddedVariableNames',
            value: "'country' | 'language'",
            description: '',
          },
          EmptyVariables: {
            filePath: '/storefront.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'EmptyVariables',
            value: '{[key: string]: never}',
            description: '',
            members: [],
          },
          GenericVariables: {
            filePath: '/storefront.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'GenericVariables',
            value: "ExecutionArgs['variableValues']",
            description: '',
          },
          StorefrontQueries: {
            filePath: '/storefront.ts',
            name: 'StorefrontQueries',
            description:
              'Maps all the queries found in the project to variables and return types.',
            members: [],
            value:
              "export interface StorefrontQueries {\n  // Example of how a generated query type looks like:\n  // '#graphql query q1 {...}': {return: Q1Query; variables: Q1QueryVariables};\n}",
          },
          StorefrontQuerySecondParam: {
            filePath: '/storefront.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'StorefrontQuerySecondParam',
            value:
              "(RawGqlString extends keyof StorefrontQueries\n  ? StorefrontCommonOptions<StorefrontQueries[RawGqlString]['variables']>\n  : StorefrontCommonOptions<GenericVariables>) & {cache?: CachingStrategy}",
            description: '',
          },
          StorefrontCommonOptions: {
            filePath: '/storefront.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'StorefrontCommonOptions',
            value:
              '{\n  headers?: HeadersInit;\n  storefrontApiVersion?: string;\n} & (IsOptionalVariables<{variables: Variables}> extends true\n  ? {variables?: Variables}\n  : {variables: Variables})',
            description: '',
          },
          CachingStrategy: {
            filePath: '/cache/strategies.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'CachingStrategy',
            value: 'AllCacheOptions',
            description:
              'Use the `CachingStrategy` to define a custom caching mechanism for your data. Or use one of the pre-defined caching strategies: CacheNone, CacheShort, CacheLong.',
            members: [
              {
                filePath: '/cache/strategies.ts',
                syntaxKind: 'PropertySignature',
                name: 'mode',
                value: 'string',
                description:
                  'The caching mode, generally `public`, `private`, or `no-store`.',
                isOptional: true,
              },
              {
                filePath: '/cache/strategies.ts',
                syntaxKind: 'PropertySignature',
                name: 'maxAge',
                value: 'number',
                description:
                  'The maximum amount of time in seconds that a resource will be considered fresh. See `max-age` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#:~:text=Response%20Directives-,max%2Dage,-The%20max%2Dage).',
                isOptional: true,
              },
              {
                filePath: '/cache/strategies.ts',
                syntaxKind: 'PropertySignature',
                name: 'staleWhileRevalidate',
                value: 'number',
                description:
                  'Indicate that the cache should serve the stale response in the background while revalidating the cache. See `stale-while-revalidate` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#stale-while-revalidate).',
                isOptional: true,
              },
              {
                filePath: '/cache/strategies.ts',
                syntaxKind: 'PropertySignature',
                name: 'sMaxAge',
                value: 'number',
                description:
                  'Similar to `maxAge` but specific to shared caches. See `s-maxage` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#s-maxage).',
                isOptional: true,
              },
              {
                filePath: '/cache/strategies.ts',
                syntaxKind: 'PropertySignature',
                name: 'staleIfError',
                value: 'number',
                description:
                  'Indicate that the cache should serve the stale response if an error occurs while revalidating the cache. See `stale-if-error` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#stale-if-error).',
                isOptional: true,
              },
            ],
          },
          StorefrontMutations: {
            filePath: '/storefront.ts',
            name: 'StorefrontMutations',
            description:
              'Maps all the mutations found in the project to variables and return types.',
            members: [],
            value:
              "export interface StorefrontMutations {\n  // Example of how a generated mutation type looks like:\n  // '#graphql mutation m1 {...}': {return: M1Mutation; variables: M1MutationVariables};\n}",
          },
          StorefrontMutateSecondParam: {
            filePath: '/storefront.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'StorefrontMutateSecondParam',
            value:
              "RawGqlString extends keyof StorefrontMutations\n  ? StorefrontCommonOptions<StorefrontMutations[RawGqlString]['variables']>\n  : StorefrontCommonOptions<GenericVariables>",
            description: '',
          },
          NoStoreStrategy: {
            filePath: '/cache/strategies.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'NoStoreStrategy',
            value: '{\n  mode: string;\n}',
            description: '',
            members: [
              {
                filePath: '/cache/strategies.ts',
                syntaxKind: 'PropertySignature',
                name: 'mode',
                value: 'string',
                description: '',
              },
            ],
          },
          AllCacheOptions: {
            filePath: '/cache/strategies.ts',
            name: 'AllCacheOptions',
            description: 'Override options for a cache strategy.',
            members: [
              {
                filePath: '/cache/strategies.ts',
                syntaxKind: 'PropertySignature',
                name: 'mode',
                value: 'string',
                description:
                  'The caching mode, generally `public`, `private`, or `no-store`.',
                isOptional: true,
              },
              {
                filePath: '/cache/strategies.ts',
                syntaxKind: 'PropertySignature',
                name: 'maxAge',
                value: 'number',
                description:
                  'The maximum amount of time in seconds that a resource will be considered fresh. See `max-age` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#:~:text=Response%20Directives-,max%2Dage,-The%20max%2Dage).',
                isOptional: true,
              },
              {
                filePath: '/cache/strategies.ts',
                syntaxKind: 'PropertySignature',
                name: 'staleWhileRevalidate',
                value: 'number',
                description:
                  'Indicate that the cache should serve the stale response in the background while revalidating the cache. See `stale-while-revalidate` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#stale-while-revalidate).',
                isOptional: true,
              },
              {
                filePath: '/cache/strategies.ts',
                syntaxKind: 'PropertySignature',
                name: 'sMaxAge',
                value: 'number',
                description:
                  'Similar to `maxAge` but specific to shared caches. See `s-maxage` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#s-maxage).',
                isOptional: true,
              },
              {
                filePath: '/cache/strategies.ts',
                syntaxKind: 'PropertySignature',
                name: 'staleIfError',
                value: 'number',
                description:
                  'Indicate that the cache should serve the stale response if an error occurs while revalidating the cache. See `stale-if-error` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#stale-if-error).',
                isOptional: true,
              },
            ],
            value:
              'export interface AllCacheOptions {\n  /**\n   * The caching mode, generally `public`, `private`, or `no-store`.\n   */\n  mode?: string;\n  /**\n   * The maximum amount of time in seconds that a resource will be considered fresh. See `max-age` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#:~:text=Response%20Directives-,max%2Dage,-The%20max%2Dage).\n   */\n  maxAge?: number;\n  /**\n   * Indicate that the cache should serve the stale response in the background while revalidating the cache. See `stale-while-revalidate` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#stale-while-revalidate).\n   */\n  staleWhileRevalidate?: number;\n  /**\n   * Similar to `maxAge` but specific to shared caches. See `s-maxage` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#s-maxage).\n   */\n  sMaxAge?: number;\n  /**\n   * Indicate that the cache should serve the stale response if an error occurs while revalidating the cache. See `stale-if-error` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#stale-if-error).\n   */\n  staleIfError?: number;\n}',
          },
          CartLinesUpdateFunction: {
            filePath: '/cart/queries/cartLinesUpdateDefault.ts',
            name: 'CartLinesUpdateFunction',
            description: '',
            params: [
              {
                name: 'lines',
                description: '',
                value: 'CartLineUpdateInput[]',
                filePath: '/cart/queries/cartLinesUpdateDefault.ts',
              },
              {
                name: 'optionalParams',
                description: '',
                value: 'CartOptionalInput',
                isOptional: true,
                filePath: '/cart/queries/cartLinesUpdateDefault.ts',
              },
            ],
            returns: {
              filePath: '/cart/queries/cartLinesUpdateDefault.ts',
              description: '',
              name: 'Promise<CartQueryData>',
              value: 'Promise<CartQueryData>',
            },
            value:
              'export type CartLinesUpdateFunction = (\n  lines: CartLineUpdateInput[],\n  optionalParams?: CartOptionalInput,\n) => Promise<CartQueryData>;',
          },
          CartLineUpdateInput: {
            description: '',
            name: 'CartLineUpdateInput',
            value: 'CartLineUpdateInput',
            members: [],
            override:
              '[CartLineUpdateInput](/docs/api/storefront/2023-07/input-objects/CartLineUpdateInput) - Storefront API type',
          },
          CartOptionalInput: {
            filePath: '/cart/queries/cart-types.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'CartOptionalInput',
            value:
              "{\n  /**\n   * The cart id.\n   * @default cart.getCartId();\n   */\n  cartId?: Scalars['ID'];\n  /**\n   * The country code.\n   * @default storefront.i18n.country\n   */\n  country?: CountryCode;\n  /**\n   * The language code.\n   * @default storefront.i18n.language\n   */\n  language?: LanguageCode;\n}",
            description: '',
            members: [
              {
                filePath: '/cart/queries/cart-types.ts',
                syntaxKind: 'PropertySignature',
                name: 'cartId',
                value: 'string',
                description: 'The cart id.',
                isOptional: true,
                defaultValue: 'cart.getCartId();',
              },
              {
                filePath: '/cart/queries/cart-types.ts',
                syntaxKind: 'PropertySignature',
                name: 'country',
                value: 'CountryCode',
                description: 'The country code.',
                isOptional: true,
                defaultValue: 'storefront.i18n.country',
              },
              {
                filePath: '/cart/queries/cart-types.ts',
                syntaxKind: 'PropertySignature',
                name: 'language',
                value: 'LanguageCode',
                description: 'The language code.',
                isOptional: true,
                defaultValue: 'storefront.i18n.language',
              },
            ],
          },
          CartQueryData: {
            filePath: '/cart/queries/cart-types.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'CartQueryData',
            value:
              '{\n  cart: Cart;\n  errors?:\n    | CartUserError[]\n    | MetafieldsSetUserError[]\n    | MetafieldDeleteUserError[];\n}',
            description: '',
            members: [
              {
                filePath: '/cart/queries/cart-types.ts',
                syntaxKind: 'PropertySignature',
                name: 'cart',
                value: 'Cart',
                description: '',
              },
              {
                filePath: '/cart/queries/cart-types.ts',
                syntaxKind: 'PropertySignature',
                name: 'errors',
                value:
                  'CartUserError[] | MetafieldsSetUserError[] | MetafieldDeleteUserError[]',
                description: '',
                isOptional: true,
              },
            ],
          },
          Cart: {
            description: '',
            name: 'Cart',
            value: 'Cart',
            members: [],
            override:
              '[Cart](/docs/api/storefront/2023-07/objects/Cart) - Storefront API type',
          },
          CartUserError: {
            description: '',
            name: 'CartUserError',
            value: 'CartUserError',
            members: [],
            override:
              '[CartUserError](/docs/api/storefront/2023-07/objects/CartUserError) - Storefront API type',
          },
          MetafieldsSetUserError: {
            description: '',
            name: 'MetafieldsSetUserError',
            value: 'MetafieldsSetUserError',
            members: [],
            override:
              '[MetafieldsSetUserError](/docs/api/storefront/2023-07/objects/MetafieldsSetUserError) - Storefront API type',
          },
          MetafieldDeleteUserError: {
            description: '',
            name: 'MetafieldDeleteUserError',
            value: 'MetafieldDeleteUserError',
            members: [],
            override:
              '[MetafieldDeleteUserError](/docs/api/storefront/2023-07/objects/MetafieldDeleteUserError) - Storefront API type',
          },
        },
      },
    ],
  },
  {
    name: 'cartMetafieldDeleteDefault',
    category: 'utilities',
    isVisualComponent: false,
    related: [],
    description:
      'Creates a function that accepts a string key and removes the matching metafield from the cart.',
    type: 'utility',
    defaultExample: {
      description: 'This is the default example',
      codeblock: {
        tabs: [
          {
            title: 'JavaScript',
            code: "import {cartMetafieldDeleteDefault} from '@shopify/hydrogen';\n\nconst cartDeleteMetafield = cartMetafieldDeleteDefault({\n  storefront,\n  getCartId,\n});\n\nconst result = await cartDeleteMetafield('namespace.key');\n",
            language: 'js',
          },
        ],
        title: 'example',
      },
    },
    definitions: [
      {
        title: 'cartMetafieldDeleteDefault',
        description: '',
        type: 'CartMetafieldDeleteDefaultGeneratedType',
        typeDefinitions: {
          CartMetafieldDeleteDefaultGeneratedType: {
            filePath: '/cart/queries/cartMetafieldDeleteDefault.ts',
            name: 'CartMetafieldDeleteDefaultGeneratedType',
            description: '',
            params: [
              {
                name: 'options',
                description: '',
                value: 'CartQueryOptions',
                filePath: '/cart/queries/cartMetafieldDeleteDefault.ts',
              },
            ],
            returns: {
              filePath: '/cart/queries/cartMetafieldDeleteDefault.ts',
              description: '',
              name: 'CartMetafieldDeleteFunction',
              value: 'CartMetafieldDeleteFunction',
            },
            value:
              'export function cartMetafieldDeleteDefault(\n  options: CartQueryOptions,\n): CartMetafieldDeleteFunction {\n  return async (key, optionalParams) => {\n    const ownerId = optionalParams?.cartId || options.getCartId();\n    const {cartMetafieldDelete} = await options.storefront.mutate<{\n      cartMetafieldDelete: {\n        cart: Cart;\n        errors: MetafieldDeleteUserError[];\n      };\n    }>(CART_METAFIELD_DELETE_MUTATION(), {\n      variables: {\n        input: {\n          ownerId,\n          key,\n        },\n      },\n    });\n    return {\n      cart: {\n        id: ownerId,\n      } as Cart,\n      errors:\n        cartMetafieldDelete.errors as unknown as MetafieldDeleteUserError[],\n    };\n  };\n}',
          },
          CartQueryOptions: {
            filePath: '/cart/queries/cart-types.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'CartQueryOptions',
            value:
              '{\n  /**\n   * The storefront client instance created by [`createStorefrontClient`](docs/api/hydrogen/latest/utilities/createstorefrontclient).\n   */\n  storefront: Storefront;\n  /**\n   * A function that returns the cart ID.\n   */\n  getCartId: () => string | undefined;\n  /**\n   * The cart fragment to override the one used in this query.\n   */\n  cartFragment?: string;\n}',
            description: '',
            members: [
              {
                filePath: '/cart/queries/cart-types.ts',
                syntaxKind: 'PropertySignature',
                name: 'storefront',
                value: 'Storefront',
                description:
                  'The storefront client instance created by [`createStorefrontClient`](docs/api/hydrogen/latest/utilities/createstorefrontclient).',
              },
              {
                filePath: '/cart/queries/cart-types.ts',
                syntaxKind: 'PropertySignature',
                name: 'getCartId',
                value: '() => string',
                description: 'A function that returns the cart ID.',
              },
              {
                filePath: '/cart/queries/cart-types.ts',
                syntaxKind: 'PropertySignature',
                name: 'cartFragment',
                value: 'string',
                description:
                  'The cart fragment to override the one used in this query.',
                isOptional: true,
              },
            ],
          },
          Storefront: {
            filePath: '/storefront.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'Storefront',
            value:
              "{\n  /** The function to run a query on Storefront API. */\n  query: <OverrideReturnType = any, RawGqlString extends string = string>(\n    query: RawGqlString,\n    ...options: RawGqlString extends keyof StorefrontQueries // Do we have any generated query types?\n      ? IsOptionalVariables<StorefrontQueries[RawGqlString]> extends true\n        ? [StorefrontQuerySecondParam<RawGqlString>?] // Using codegen, query has no variables\n        : [StorefrontQuerySecondParam<RawGqlString>] // Using codegen, query needs variables\n      : [StorefrontQuerySecondParam?] // No codegen, variables always optional\n  ) => Promise<\n    RawGqlString extends keyof StorefrontQueries // Do we have any generated query types?\n      ? StorefrontQueries[RawGqlString]['return'] // Using codegen, return type is known\n      : OverrideReturnType // No codegen, let user specify return type\n  >;\n  /** The function to run a mutation on Storefront API. */\n  mutate: <OverrideReturnType = any, RawGqlString extends string = string>(\n    mutation: RawGqlString,\n    ...options: RawGqlString extends keyof StorefrontMutations // Do we have any generated mutation types?\n      ? IsOptionalVariables<StorefrontMutations[RawGqlString]> extends true\n        ? [StorefrontMutateSecondParam<RawGqlString>?] // Using codegen, mutation has no variables\n        : [StorefrontMutateSecondParam<RawGqlString>] // Using codegen, mutation needs variables\n      : [StorefrontMutateSecondParam?] // No codegen, variables always optional\n  ) => Promise<\n    RawGqlString extends keyof StorefrontMutations // Do we have any generated mutation types?\n      ? StorefrontMutations[RawGqlString]['return'] // Using codegen, return type is known\n      : OverrideReturnType // No codegen, let user specify return type\n  >;\n  /** The cache instance passed in from the `createStorefrontClient` argument. */\n  cache?: Cache;\n  /** Re-export of [`CacheNone`](/docs/api/hydrogen/2023-07/utilities/cachenone). */\n  CacheNone: typeof CacheNone;\n  /** Re-export of [`CacheLong`](/docs/api/hydrogen/2023-07/utilities/cachelong). */\n  CacheLong: typeof CacheLong;\n  /** Re-export of [`CacheShort`](/docs/api/hydrogen/2023-07/utilities/cacheshort). */\n  CacheShort: typeof CacheShort;\n  /** Re-export of [`CacheCustom`](/docs/api/hydrogen/2023-07/utilities/cachecustom). */\n  CacheCustom: typeof CacheCustom;\n  /** Re-export of [`generateCacheControlHeader`](/docs/api/hydrogen/2023-07/utilities/generatecachecontrolheader). */\n  generateCacheControlHeader: typeof generateCacheControlHeader;\n  /** Returns an object that contains headers that are needed for each query to Storefront API GraphQL endpoint. See [`getPublicTokenHeaders` in Hydrogen React](/docs/api/hydrogen-react/2023-07/utilities/createstorefrontclient#:~:text=%27graphql%27.-,getPublicTokenHeaders,-(props%3F%3A) for more details. */\n  getPublicTokenHeaders: ReturnType<\n    typeof createStorefrontUtilities\n  >['getPublicTokenHeaders'];\n  /** Returns an object that contains headers that are needed for each query to Storefront API GraphQL endpoint for API calls made from a server. See [`getPrivateTokenHeaders` in  Hydrogen React](/docs/api/hydrogen-react/2023-07/utilities/createstorefrontclient#:~:text=storefrontApiVersion-,getPrivateTokenHeaders,-(props%3F%3A) for more details.*/\n  getPrivateTokenHeaders: ReturnType<\n    typeof createStorefrontUtilities\n  >['getPrivateTokenHeaders'];\n  /** Creates the fully-qualified URL to your myshopify.com domain. See [`getShopifyDomain` in  Hydrogen React](/docs/api/hydrogen-react/2023-07/utilities/createstorefrontclient#:~:text=StorefrontClientReturn-,getShopifyDomain,-(props%3F%3A) for more details. */\n  getShopifyDomain: ReturnType<\n    typeof createStorefrontUtilities\n  >['getShopifyDomain'];\n  /** Creates the fully-qualified URL to your store's GraphQL endpoint. See [`getStorefrontApiUrl` in  Hydrogen React](/docs/api/hydrogen-react/2023-07/utilities/createstorefrontclient#:~:text=storeDomain-,getStorefrontApiUrl,-(props%3F%3A) for more details.*/\n  getApiUrl: ReturnType<\n    typeof createStorefrontUtilities\n  >['getStorefrontApiUrl'];\n  /** Determines if the error is resulted from a Storefront API call. */\n  isApiError: (error: any) => boolean;\n  /** The `i18n` object passed in from the `createStorefrontClient` argument. */\n  i18n: TI18n;\n}",
            description: 'Interface to interact with the Storefront API.',
            members: [
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'query',
                value:
                  '<OverrideReturnType = any, RawGqlString extends string = string>(query: RawGqlString, ...options: RawGqlString extends never ? IsOptionalVariables<StorefrontQueries[RawGqlString]> extends true ? [StorefrontQuerySecondParam<RawGqlString>?] : [StorefrontQuerySecondParam<RawGqlString>] : [StorefrontQuerySecondParam<string>?]) => Promise<RawGqlString extends never ? StorefrontQueries[RawGqlString]["return"] : OverrideReturnType>',
                description: 'The function to run a query on Storefront API.',
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'mutate',
                value:
                  '<OverrideReturnType = any, RawGqlString extends string = string>(mutation: RawGqlString, ...options: RawGqlString extends never ? IsOptionalVariables<StorefrontMutations[RawGqlString]> extends true ? [StorefrontMutateSecondParam<RawGqlString>?] : [StorefrontMutateSecondParam<RawGqlString>] : [StorefrontCommonOptions<{ readonly [variable: string]: unknown; }>?]) => Promise<RawGqlString extends never ? StorefrontMutations[RawGqlString]["return"] : OverrideReturnType>',
                description:
                  'The function to run a mutation on Storefront API.',
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'cache',
                value: 'Cache',
                description:
                  'The cache instance passed in from the `createStorefrontClient` argument.',
                isOptional: true,
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'CacheNone',
                value: '() => NoStoreStrategy',
                description:
                  'Re-export of [`CacheNone`](/docs/api/hydrogen/2023-07/utilities/cachenone).',
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'CacheLong',
                value: '(overrideOptions?: AllCacheOptions) => AllCacheOptions',
                description:
                  'Re-export of [`CacheLong`](/docs/api/hydrogen/2023-07/utilities/cachelong).',
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'CacheShort',
                value: '(overrideOptions?: AllCacheOptions) => AllCacheOptions',
                description:
                  'Re-export of [`CacheShort`](/docs/api/hydrogen/2023-07/utilities/cacheshort).',
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'CacheCustom',
                value: '(overrideOptions: AllCacheOptions) => AllCacheOptions',
                description:
                  'Re-export of [`CacheCustom`](/docs/api/hydrogen/2023-07/utilities/cachecustom).',
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'generateCacheControlHeader',
                value: '(cacheOptions: AllCacheOptions) => string',
                description:
                  'Re-export of [`generateCacheControlHeader`](/docs/api/hydrogen/2023-07/utilities/generatecachecontrolheader).',
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'getPublicTokenHeaders',
                value:
                  '(props?: Partial<Pick<StorefrontClientProps, "contentType">> & Pick<StorefrontClientProps, "publicStorefrontToken">) => Record<string, string>',
                description:
                  'Returns an object that contains headers that are needed for each query to Storefront API GraphQL endpoint. See [`getPublicTokenHeaders` in Hydrogen React](/docs/api/hydrogen-react/2023-07/utilities/createstorefrontclient#:~:text=%27graphql%27.-,getPublicTokenHeaders,-(props%3F%3A) for more details.',
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'getPrivateTokenHeaders',
                value:
                  '(props?: Partial<Pick<StorefrontClientProps, "contentType">> & Pick<StorefrontClientProps, "privateStorefrontToken"> & { buyerIp?: string; }) => Record<string, string>',
                description:
                  'Returns an object that contains headers that are needed for each query to Storefront API GraphQL endpoint for API calls made from a server. See [`getPrivateTokenHeaders` in  Hydrogen React](/docs/api/hydrogen-react/2023-07/utilities/createstorefrontclient#:~:text=storefrontApiVersion-,getPrivateTokenHeaders,-(props%3F%3A) for more details.',
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'getShopifyDomain',
                value:
                  '(props?: Partial<Pick<StorefrontClientProps, "storeDomain">>) => string',
                description:
                  'Creates the fully-qualified URL to your myshopify.com domain. See [`getShopifyDomain` in  Hydrogen React](/docs/api/hydrogen-react/2023-07/utilities/createstorefrontclient#:~:text=StorefrontClientReturn-,getShopifyDomain,-(props%3F%3A) for more details.',
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'getApiUrl',
                value:
                  '(props?: Partial<Pick<StorefrontClientProps, "storeDomain" | "storefrontApiVersion">>) => string',
                description:
                  "Creates the fully-qualified URL to your store's GraphQL endpoint. See [`getStorefrontApiUrl` in  Hydrogen React](/docs/api/hydrogen-react/2023-07/utilities/createstorefrontclient#:~:text=storeDomain-,getStorefrontApiUrl,-(props%3F%3A) for more details.",
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'isApiError',
                value: '(error: any) => boolean',
                description:
                  'Determines if the error is resulted from a Storefront API call.',
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'i18n',
                value: 'TI18n',
                description:
                  'The `i18n` object passed in from the `createStorefrontClient` argument.',
              },
            ],
          },
          IsOptionalVariables: {
            filePath: '/storefront.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'IsOptionalVariables',
            value:
              "Omit<\n  OperationTypeValue['variables'],\n  AutoAddedVariableNames\n> extends EmptyVariables\n  ? true // No need to pass variables\n  : GenericVariables extends OperationTypeValue['variables']\n  ? true // We don't know what variables are needed\n  : false",
            description: '',
          },
          AutoAddedVariableNames: {
            filePath: '/storefront.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'AutoAddedVariableNames',
            value: "'country' | 'language'",
            description: '',
          },
          EmptyVariables: {
            filePath: '/storefront.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'EmptyVariables',
            value: '{[key: string]: never}',
            description: '',
            members: [],
          },
          GenericVariables: {
            filePath: '/storefront.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'GenericVariables',
            value: "ExecutionArgs['variableValues']",
            description: '',
          },
          StorefrontQueries: {
            filePath: '/storefront.ts',
            name: 'StorefrontQueries',
            description:
              'Maps all the queries found in the project to variables and return types.',
            members: [],
            value:
              "export interface StorefrontQueries {\n  // Example of how a generated query type looks like:\n  // '#graphql query q1 {...}': {return: Q1Query; variables: Q1QueryVariables};\n}",
          },
          StorefrontQuerySecondParam: {
            filePath: '/storefront.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'StorefrontQuerySecondParam',
            value:
              "(RawGqlString extends keyof StorefrontQueries\n  ? StorefrontCommonOptions<StorefrontQueries[RawGqlString]['variables']>\n  : StorefrontCommonOptions<GenericVariables>) & {cache?: CachingStrategy}",
            description: '',
          },
          StorefrontCommonOptions: {
            filePath: '/storefront.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'StorefrontCommonOptions',
            value:
              '{\n  headers?: HeadersInit;\n  storefrontApiVersion?: string;\n} & (IsOptionalVariables<{variables: Variables}> extends true\n  ? {variables?: Variables}\n  : {variables: Variables})',
            description: '',
          },
          CachingStrategy: {
            filePath: '/cache/strategies.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'CachingStrategy',
            value: 'AllCacheOptions',
            description:
              'Use the `CachingStrategy` to define a custom caching mechanism for your data. Or use one of the pre-defined caching strategies: CacheNone, CacheShort, CacheLong.',
            members: [
              {
                filePath: '/cache/strategies.ts',
                syntaxKind: 'PropertySignature',
                name: 'mode',
                value: 'string',
                description:
                  'The caching mode, generally `public`, `private`, or `no-store`.',
                isOptional: true,
              },
              {
                filePath: '/cache/strategies.ts',
                syntaxKind: 'PropertySignature',
                name: 'maxAge',
                value: 'number',
                description:
                  'The maximum amount of time in seconds that a resource will be considered fresh. See `max-age` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#:~:text=Response%20Directives-,max%2Dage,-The%20max%2Dage).',
                isOptional: true,
              },
              {
                filePath: '/cache/strategies.ts',
                syntaxKind: 'PropertySignature',
                name: 'staleWhileRevalidate',
                value: 'number',
                description:
                  'Indicate that the cache should serve the stale response in the background while revalidating the cache. See `stale-while-revalidate` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#stale-while-revalidate).',
                isOptional: true,
              },
              {
                filePath: '/cache/strategies.ts',
                syntaxKind: 'PropertySignature',
                name: 'sMaxAge',
                value: 'number',
                description:
                  'Similar to `maxAge` but specific to shared caches. See `s-maxage` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#s-maxage).',
                isOptional: true,
              },
              {
                filePath: '/cache/strategies.ts',
                syntaxKind: 'PropertySignature',
                name: 'staleIfError',
                value: 'number',
                description:
                  'Indicate that the cache should serve the stale response if an error occurs while revalidating the cache. See `stale-if-error` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#stale-if-error).',
                isOptional: true,
              },
            ],
          },
          StorefrontMutations: {
            filePath: '/storefront.ts',
            name: 'StorefrontMutations',
            description:
              'Maps all the mutations found in the project to variables and return types.',
            members: [],
            value:
              "export interface StorefrontMutations {\n  // Example of how a generated mutation type looks like:\n  // '#graphql mutation m1 {...}': {return: M1Mutation; variables: M1MutationVariables};\n}",
          },
          StorefrontMutateSecondParam: {
            filePath: '/storefront.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'StorefrontMutateSecondParam',
            value:
              "RawGqlString extends keyof StorefrontMutations\n  ? StorefrontCommonOptions<StorefrontMutations[RawGqlString]['variables']>\n  : StorefrontCommonOptions<GenericVariables>",
            description: '',
          },
          NoStoreStrategy: {
            filePath: '/cache/strategies.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'NoStoreStrategy',
            value: '{\n  mode: string;\n}',
            description: '',
            members: [
              {
                filePath: '/cache/strategies.ts',
                syntaxKind: 'PropertySignature',
                name: 'mode',
                value: 'string',
                description: '',
              },
            ],
          },
          AllCacheOptions: {
            filePath: '/cache/strategies.ts',
            name: 'AllCacheOptions',
            description: 'Override options for a cache strategy.',
            members: [
              {
                filePath: '/cache/strategies.ts',
                syntaxKind: 'PropertySignature',
                name: 'mode',
                value: 'string',
                description:
                  'The caching mode, generally `public`, `private`, or `no-store`.',
                isOptional: true,
              },
              {
                filePath: '/cache/strategies.ts',
                syntaxKind: 'PropertySignature',
                name: 'maxAge',
                value: 'number',
                description:
                  'The maximum amount of time in seconds that a resource will be considered fresh. See `max-age` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#:~:text=Response%20Directives-,max%2Dage,-The%20max%2Dage).',
                isOptional: true,
              },
              {
                filePath: '/cache/strategies.ts',
                syntaxKind: 'PropertySignature',
                name: 'staleWhileRevalidate',
                value: 'number',
                description:
                  'Indicate that the cache should serve the stale response in the background while revalidating the cache. See `stale-while-revalidate` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#stale-while-revalidate).',
                isOptional: true,
              },
              {
                filePath: '/cache/strategies.ts',
                syntaxKind: 'PropertySignature',
                name: 'sMaxAge',
                value: 'number',
                description:
                  'Similar to `maxAge` but specific to shared caches. See `s-maxage` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#s-maxage).',
                isOptional: true,
              },
              {
                filePath: '/cache/strategies.ts',
                syntaxKind: 'PropertySignature',
                name: 'staleIfError',
                value: 'number',
                description:
                  'Indicate that the cache should serve the stale response if an error occurs while revalidating the cache. See `stale-if-error` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#stale-if-error).',
                isOptional: true,
              },
            ],
            value:
              'export interface AllCacheOptions {\n  /**\n   * The caching mode, generally `public`, `private`, or `no-store`.\n   */\n  mode?: string;\n  /**\n   * The maximum amount of time in seconds that a resource will be considered fresh. See `max-age` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#:~:text=Response%20Directives-,max%2Dage,-The%20max%2Dage).\n   */\n  maxAge?: number;\n  /**\n   * Indicate that the cache should serve the stale response in the background while revalidating the cache. See `stale-while-revalidate` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#stale-while-revalidate).\n   */\n  staleWhileRevalidate?: number;\n  /**\n   * Similar to `maxAge` but specific to shared caches. See `s-maxage` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#s-maxage).\n   */\n  sMaxAge?: number;\n  /**\n   * Indicate that the cache should serve the stale response if an error occurs while revalidating the cache. See `stale-if-error` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#stale-if-error).\n   */\n  staleIfError?: number;\n}',
          },
          CartMetafieldDeleteFunction: {
            filePath: '/cart/queries/cartMetafieldDeleteDefault.ts',
            name: 'CartMetafieldDeleteFunction',
            description: '',
            params: [
              {
                name: 'key',
                description: '',
                value: 'string',
                filePath: '/cart/queries/cartMetafieldDeleteDefault.ts',
              },
              {
                name: 'optionalParams',
                description: '',
                value: 'CartOptionalInput',
                isOptional: true,
                filePath: '/cart/queries/cartMetafieldDeleteDefault.ts',
              },
            ],
            returns: {
              filePath: '/cart/queries/cartMetafieldDeleteDefault.ts',
              description: '',
              name: 'Promise<CartQueryData>',
              value: 'Promise<CartQueryData>',
            },
            value:
              "export type CartMetafieldDeleteFunction = (\n  key: Scalars['String'],\n  optionalParams?: CartOptionalInput,\n) => Promise<CartQueryData>;",
          },
          CartOptionalInput: {
            filePath: '/cart/queries/cart-types.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'CartOptionalInput',
            value:
              "{\n  /**\n   * The cart id.\n   * @default cart.getCartId();\n   */\n  cartId?: Scalars['ID'];\n  /**\n   * The country code.\n   * @default storefront.i18n.country\n   */\n  country?: CountryCode;\n  /**\n   * The language code.\n   * @default storefront.i18n.language\n   */\n  language?: LanguageCode;\n}",
            description: '',
            members: [
              {
                filePath: '/cart/queries/cart-types.ts',
                syntaxKind: 'PropertySignature',
                name: 'cartId',
                value: 'string',
                description: 'The cart id.',
                isOptional: true,
                defaultValue: 'cart.getCartId();',
              },
              {
                filePath: '/cart/queries/cart-types.ts',
                syntaxKind: 'PropertySignature',
                name: 'country',
                value: 'CountryCode',
                description: 'The country code.',
                isOptional: true,
                defaultValue: 'storefront.i18n.country',
              },
              {
                filePath: '/cart/queries/cart-types.ts',
                syntaxKind: 'PropertySignature',
                name: 'language',
                value: 'LanguageCode',
                description: 'The language code.',
                isOptional: true,
                defaultValue: 'storefront.i18n.language',
              },
            ],
          },
          CartQueryData: {
            filePath: '/cart/queries/cart-types.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'CartQueryData',
            value:
              '{\n  cart: Cart;\n  errors?:\n    | CartUserError[]\n    | MetafieldsSetUserError[]\n    | MetafieldDeleteUserError[];\n}',
            description: '',
            members: [
              {
                filePath: '/cart/queries/cart-types.ts',
                syntaxKind: 'PropertySignature',
                name: 'cart',
                value: 'Cart',
                description: '',
              },
              {
                filePath: '/cart/queries/cart-types.ts',
                syntaxKind: 'PropertySignature',
                name: 'errors',
                value:
                  'CartUserError[] | MetafieldsSetUserError[] | MetafieldDeleteUserError[]',
                description: '',
                isOptional: true,
              },
            ],
          },
          Cart: {
            description: '',
            name: 'Cart',
            value: 'Cart',
            members: [],
            override:
              '[Cart](/docs/api/storefront/2023-07/objects/Cart) - Storefront API type',
          },
          CartUserError: {
            description: '',
            name: 'CartUserError',
            value: 'CartUserError',
            members: [],
            override:
              '[CartUserError](/docs/api/storefront/2023-07/objects/CartUserError) - Storefront API type',
          },
          MetafieldsSetUserError: {
            description: '',
            name: 'MetafieldsSetUserError',
            value: 'MetafieldsSetUserError',
            members: [],
            override:
              '[MetafieldsSetUserError](/docs/api/storefront/2023-07/objects/MetafieldsSetUserError) - Storefront API type',
          },
          MetafieldDeleteUserError: {
            description: '',
            name: 'MetafieldDeleteUserError',
            value: 'MetafieldDeleteUserError',
            members: [],
            override:
              '[MetafieldDeleteUserError](/docs/api/storefront/2023-07/objects/MetafieldDeleteUserError) - Storefront API type',
          },
        },
      },
    ],
  },
  {
    name: 'cartMetafieldsSetDefault',
    category: 'utilities',
    isVisualComponent: false,
    related: [],
    description:
      'Creates a function that accepts an array of [CartMetafieldsSetInput](https://shopify.dev/docs/api/storefront/2023-07/input-objects/CartMetafieldsSetInput) without `ownerId` and set the metafields to a cart',
    type: 'utility',
    defaultExample: {
      description: 'This is the default example',
      codeblock: {
        tabs: [
          {
            title: 'JavaScript',
            code: "import {cartMetafieldsSetDefault} from '@shopify/hydrogen';\n\nconst cartSetMetafields = cartMetafieldsSetDefault({\n  storefront,\n  getCartId,\n});\n\nconst result = await cartSetMetafields([\n  {\n    key: 'custom.gift',\n    type: 'boolean',\n    value: 'true',\n  },\n]);\n",
            language: 'js',
          },
        ],
        title: 'example',
      },
    },
    definitions: [
      {
        title: 'cartMetafieldsSetDefault',
        description: '',
        type: 'CartMetafieldsSetDefaultGeneratedType',
        typeDefinitions: {
          CartMetafieldsSetDefaultGeneratedType: {
            filePath: '/cart/queries/cartMetafieldsSetDefault.ts',
            name: 'CartMetafieldsSetDefaultGeneratedType',
            description: '',
            params: [
              {
                name: 'options',
                description: '',
                value: 'CartQueryOptions',
                filePath: '/cart/queries/cartMetafieldsSetDefault.ts',
              },
            ],
            returns: {
              filePath: '/cart/queries/cartMetafieldsSetDefault.ts',
              description: '',
              name: 'CartMetafieldsSetFunction',
              value: 'CartMetafieldsSetFunction',
            },
            value:
              'export function cartMetafieldsSetDefault(\n  options: CartQueryOptions,\n): CartMetafieldsSetFunction {\n  return async (metafields, optionalParams) => {\n    const ownerId = optionalParams?.cartId || options.getCartId();\n    const metafieldsWithOwnerId = metafields.map(\n      (metafield: MetafieldWithoutOwnerId) => ({\n        ...metafield,\n        ownerId,\n      }),\n    );\n    const {cartMetafieldsSet} = await options.storefront.mutate<{\n      cartMetafieldsSet: {\n        cart: Cart;\n        errors: MetafieldsSetUserError[];\n      };\n    }>(CART_METAFIELD_SET_MUTATION(), {\n      variables: {metafields: metafieldsWithOwnerId},\n    });\n\n    return {\n      cart: {\n        id: ownerId,\n      } as Cart,\n      errors: cartMetafieldsSet.errors as unknown as MetafieldsSetUserError[],\n    };\n  };\n}',
          },
          CartQueryOptions: {
            filePath: '/cart/queries/cart-types.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'CartQueryOptions',
            value:
              '{\n  /**\n   * The storefront client instance created by [`createStorefrontClient`](docs/api/hydrogen/latest/utilities/createstorefrontclient).\n   */\n  storefront: Storefront;\n  /**\n   * A function that returns the cart ID.\n   */\n  getCartId: () => string | undefined;\n  /**\n   * The cart fragment to override the one used in this query.\n   */\n  cartFragment?: string;\n}',
            description: '',
            members: [
              {
                filePath: '/cart/queries/cart-types.ts',
                syntaxKind: 'PropertySignature',
                name: 'storefront',
                value: 'Storefront',
                description:
                  'The storefront client instance created by [`createStorefrontClient`](docs/api/hydrogen/latest/utilities/createstorefrontclient).',
              },
              {
                filePath: '/cart/queries/cart-types.ts',
                syntaxKind: 'PropertySignature',
                name: 'getCartId',
                value: '() => string',
                description: 'A function that returns the cart ID.',
              },
              {
                filePath: '/cart/queries/cart-types.ts',
                syntaxKind: 'PropertySignature',
                name: 'cartFragment',
                value: 'string',
                description:
                  'The cart fragment to override the one used in this query.',
                isOptional: true,
              },
            ],
          },
          Storefront: {
            filePath: '/storefront.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'Storefront',
            value:
              "{\n  /** The function to run a query on Storefront API. */\n  query: <OverrideReturnType = any, RawGqlString extends string = string>(\n    query: RawGqlString,\n    ...options: RawGqlString extends keyof StorefrontQueries // Do we have any generated query types?\n      ? IsOptionalVariables<StorefrontQueries[RawGqlString]> extends true\n        ? [StorefrontQuerySecondParam<RawGqlString>?] // Using codegen, query has no variables\n        : [StorefrontQuerySecondParam<RawGqlString>] // Using codegen, query needs variables\n      : [StorefrontQuerySecondParam?] // No codegen, variables always optional\n  ) => Promise<\n    RawGqlString extends keyof StorefrontQueries // Do we have any generated query types?\n      ? StorefrontQueries[RawGqlString]['return'] // Using codegen, return type is known\n      : OverrideReturnType // No codegen, let user specify return type\n  >;\n  /** The function to run a mutation on Storefront API. */\n  mutate: <OverrideReturnType = any, RawGqlString extends string = string>(\n    mutation: RawGqlString,\n    ...options: RawGqlString extends keyof StorefrontMutations // Do we have any generated mutation types?\n      ? IsOptionalVariables<StorefrontMutations[RawGqlString]> extends true\n        ? [StorefrontMutateSecondParam<RawGqlString>?] // Using codegen, mutation has no variables\n        : [StorefrontMutateSecondParam<RawGqlString>] // Using codegen, mutation needs variables\n      : [StorefrontMutateSecondParam?] // No codegen, variables always optional\n  ) => Promise<\n    RawGqlString extends keyof StorefrontMutations // Do we have any generated mutation types?\n      ? StorefrontMutations[RawGqlString]['return'] // Using codegen, return type is known\n      : OverrideReturnType // No codegen, let user specify return type\n  >;\n  /** The cache instance passed in from the `createStorefrontClient` argument. */\n  cache?: Cache;\n  /** Re-export of [`CacheNone`](/docs/api/hydrogen/2023-07/utilities/cachenone). */\n  CacheNone: typeof CacheNone;\n  /** Re-export of [`CacheLong`](/docs/api/hydrogen/2023-07/utilities/cachelong). */\n  CacheLong: typeof CacheLong;\n  /** Re-export of [`CacheShort`](/docs/api/hydrogen/2023-07/utilities/cacheshort). */\n  CacheShort: typeof CacheShort;\n  /** Re-export of [`CacheCustom`](/docs/api/hydrogen/2023-07/utilities/cachecustom). */\n  CacheCustom: typeof CacheCustom;\n  /** Re-export of [`generateCacheControlHeader`](/docs/api/hydrogen/2023-07/utilities/generatecachecontrolheader). */\n  generateCacheControlHeader: typeof generateCacheControlHeader;\n  /** Returns an object that contains headers that are needed for each query to Storefront API GraphQL endpoint. See [`getPublicTokenHeaders` in Hydrogen React](/docs/api/hydrogen-react/2023-07/utilities/createstorefrontclient#:~:text=%27graphql%27.-,getPublicTokenHeaders,-(props%3F%3A) for more details. */\n  getPublicTokenHeaders: ReturnType<\n    typeof createStorefrontUtilities\n  >['getPublicTokenHeaders'];\n  /** Returns an object that contains headers that are needed for each query to Storefront API GraphQL endpoint for API calls made from a server. See [`getPrivateTokenHeaders` in  Hydrogen React](/docs/api/hydrogen-react/2023-07/utilities/createstorefrontclient#:~:text=storefrontApiVersion-,getPrivateTokenHeaders,-(props%3F%3A) for more details.*/\n  getPrivateTokenHeaders: ReturnType<\n    typeof createStorefrontUtilities\n  >['getPrivateTokenHeaders'];\n  /** Creates the fully-qualified URL to your myshopify.com domain. See [`getShopifyDomain` in  Hydrogen React](/docs/api/hydrogen-react/2023-07/utilities/createstorefrontclient#:~:text=StorefrontClientReturn-,getShopifyDomain,-(props%3F%3A) for more details. */\n  getShopifyDomain: ReturnType<\n    typeof createStorefrontUtilities\n  >['getShopifyDomain'];\n  /** Creates the fully-qualified URL to your store's GraphQL endpoint. See [`getStorefrontApiUrl` in  Hydrogen React](/docs/api/hydrogen-react/2023-07/utilities/createstorefrontclient#:~:text=storeDomain-,getStorefrontApiUrl,-(props%3F%3A) for more details.*/\n  getApiUrl: ReturnType<\n    typeof createStorefrontUtilities\n  >['getStorefrontApiUrl'];\n  /** Determines if the error is resulted from a Storefront API call. */\n  isApiError: (error: any) => boolean;\n  /** The `i18n` object passed in from the `createStorefrontClient` argument. */\n  i18n: TI18n;\n}",
            description: 'Interface to interact with the Storefront API.',
            members: [
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'query',
                value:
                  '<OverrideReturnType = any, RawGqlString extends string = string>(query: RawGqlString, ...options: RawGqlString extends never ? IsOptionalVariables<StorefrontQueries[RawGqlString]> extends true ? [StorefrontQuerySecondParam<RawGqlString>?] : [StorefrontQuerySecondParam<RawGqlString>] : [StorefrontQuerySecondParam<string>?]) => Promise<RawGqlString extends never ? StorefrontQueries[RawGqlString]["return"] : OverrideReturnType>',
                description: 'The function to run a query on Storefront API.',
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'mutate',
                value:
                  '<OverrideReturnType = any, RawGqlString extends string = string>(mutation: RawGqlString, ...options: RawGqlString extends never ? IsOptionalVariables<StorefrontMutations[RawGqlString]> extends true ? [StorefrontMutateSecondParam<RawGqlString>?] : [StorefrontMutateSecondParam<RawGqlString>] : [StorefrontCommonOptions<{ readonly [variable: string]: unknown; }>?]) => Promise<RawGqlString extends never ? StorefrontMutations[RawGqlString]["return"] : OverrideReturnType>',
                description:
                  'The function to run a mutation on Storefront API.',
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'cache',
                value: 'Cache',
                description:
                  'The cache instance passed in from the `createStorefrontClient` argument.',
                isOptional: true,
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'CacheNone',
                value: '() => NoStoreStrategy',
                description:
                  'Re-export of [`CacheNone`](/docs/api/hydrogen/2023-07/utilities/cachenone).',
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'CacheLong',
                value: '(overrideOptions?: AllCacheOptions) => AllCacheOptions',
                description:
                  'Re-export of [`CacheLong`](/docs/api/hydrogen/2023-07/utilities/cachelong).',
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'CacheShort',
                value: '(overrideOptions?: AllCacheOptions) => AllCacheOptions',
                description:
                  'Re-export of [`CacheShort`](/docs/api/hydrogen/2023-07/utilities/cacheshort).',
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'CacheCustom',
                value: '(overrideOptions: AllCacheOptions) => AllCacheOptions',
                description:
                  'Re-export of [`CacheCustom`](/docs/api/hydrogen/2023-07/utilities/cachecustom).',
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'generateCacheControlHeader',
                value: '(cacheOptions: AllCacheOptions) => string',
                description:
                  'Re-export of [`generateCacheControlHeader`](/docs/api/hydrogen/2023-07/utilities/generatecachecontrolheader).',
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'getPublicTokenHeaders',
                value:
                  '(props?: Partial<Pick<StorefrontClientProps, "contentType">> & Pick<StorefrontClientProps, "publicStorefrontToken">) => Record<string, string>',
                description:
                  'Returns an object that contains headers that are needed for each query to Storefront API GraphQL endpoint. See [`getPublicTokenHeaders` in Hydrogen React](/docs/api/hydrogen-react/2023-07/utilities/createstorefrontclient#:~:text=%27graphql%27.-,getPublicTokenHeaders,-(props%3F%3A) for more details.',
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'getPrivateTokenHeaders',
                value:
                  '(props?: Partial<Pick<StorefrontClientProps, "contentType">> & Pick<StorefrontClientProps, "privateStorefrontToken"> & { buyerIp?: string; }) => Record<string, string>',
                description:
                  'Returns an object that contains headers that are needed for each query to Storefront API GraphQL endpoint for API calls made from a server. See [`getPrivateTokenHeaders` in  Hydrogen React](/docs/api/hydrogen-react/2023-07/utilities/createstorefrontclient#:~:text=storefrontApiVersion-,getPrivateTokenHeaders,-(props%3F%3A) for more details.',
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'getShopifyDomain',
                value:
                  '(props?: Partial<Pick<StorefrontClientProps, "storeDomain">>) => string',
                description:
                  'Creates the fully-qualified URL to your myshopify.com domain. See [`getShopifyDomain` in  Hydrogen React](/docs/api/hydrogen-react/2023-07/utilities/createstorefrontclient#:~:text=StorefrontClientReturn-,getShopifyDomain,-(props%3F%3A) for more details.',
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'getApiUrl',
                value:
                  '(props?: Partial<Pick<StorefrontClientProps, "storeDomain" | "storefrontApiVersion">>) => string',
                description:
                  "Creates the fully-qualified URL to your store's GraphQL endpoint. See [`getStorefrontApiUrl` in  Hydrogen React](/docs/api/hydrogen-react/2023-07/utilities/createstorefrontclient#:~:text=storeDomain-,getStorefrontApiUrl,-(props%3F%3A) for more details.",
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'isApiError',
                value: '(error: any) => boolean',
                description:
                  'Determines if the error is resulted from a Storefront API call.',
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'i18n',
                value: 'TI18n',
                description:
                  'The `i18n` object passed in from the `createStorefrontClient` argument.',
              },
            ],
          },
          IsOptionalVariables: {
            filePath: '/storefront.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'IsOptionalVariables',
            value:
              "Omit<\n  OperationTypeValue['variables'],\n  AutoAddedVariableNames\n> extends EmptyVariables\n  ? true // No need to pass variables\n  : GenericVariables extends OperationTypeValue['variables']\n  ? true // We don't know what variables are needed\n  : false",
            description: '',
          },
          AutoAddedVariableNames: {
            filePath: '/storefront.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'AutoAddedVariableNames',
            value: "'country' | 'language'",
            description: '',
          },
          EmptyVariables: {
            filePath: '/storefront.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'EmptyVariables',
            value: '{[key: string]: never}',
            description: '',
            members: [],
          },
          GenericVariables: {
            filePath: '/storefront.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'GenericVariables',
            value: "ExecutionArgs['variableValues']",
            description: '',
          },
          StorefrontQueries: {
            filePath: '/storefront.ts',
            name: 'StorefrontQueries',
            description:
              'Maps all the queries found in the project to variables and return types.',
            members: [],
            value:
              "export interface StorefrontQueries {\n  // Example of how a generated query type looks like:\n  // '#graphql query q1 {...}': {return: Q1Query; variables: Q1QueryVariables};\n}",
          },
          StorefrontQuerySecondParam: {
            filePath: '/storefront.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'StorefrontQuerySecondParam',
            value:
              "(RawGqlString extends keyof StorefrontQueries\n  ? StorefrontCommonOptions<StorefrontQueries[RawGqlString]['variables']>\n  : StorefrontCommonOptions<GenericVariables>) & {cache?: CachingStrategy}",
            description: '',
          },
          StorefrontCommonOptions: {
            filePath: '/storefront.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'StorefrontCommonOptions',
            value:
              '{\n  headers?: HeadersInit;\n  storefrontApiVersion?: string;\n} & (IsOptionalVariables<{variables: Variables}> extends true\n  ? {variables?: Variables}\n  : {variables: Variables})',
            description: '',
          },
          CachingStrategy: {
            filePath: '/cache/strategies.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'CachingStrategy',
            value: 'AllCacheOptions',
            description:
              'Use the `CachingStrategy` to define a custom caching mechanism for your data. Or use one of the pre-defined caching strategies: CacheNone, CacheShort, CacheLong.',
            members: [
              {
                filePath: '/cache/strategies.ts',
                syntaxKind: 'PropertySignature',
                name: 'mode',
                value: 'string',
                description:
                  'The caching mode, generally `public`, `private`, or `no-store`.',
                isOptional: true,
              },
              {
                filePath: '/cache/strategies.ts',
                syntaxKind: 'PropertySignature',
                name: 'maxAge',
                value: 'number',
                description:
                  'The maximum amount of time in seconds that a resource will be considered fresh. See `max-age` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#:~:text=Response%20Directives-,max%2Dage,-The%20max%2Dage).',
                isOptional: true,
              },
              {
                filePath: '/cache/strategies.ts',
                syntaxKind: 'PropertySignature',
                name: 'staleWhileRevalidate',
                value: 'number',
                description:
                  'Indicate that the cache should serve the stale response in the background while revalidating the cache. See `stale-while-revalidate` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#stale-while-revalidate).',
                isOptional: true,
              },
              {
                filePath: '/cache/strategies.ts',
                syntaxKind: 'PropertySignature',
                name: 'sMaxAge',
                value: 'number',
                description:
                  'Similar to `maxAge` but specific to shared caches. See `s-maxage` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#s-maxage).',
                isOptional: true,
              },
              {
                filePath: '/cache/strategies.ts',
                syntaxKind: 'PropertySignature',
                name: 'staleIfError',
                value: 'number',
                description:
                  'Indicate that the cache should serve the stale response if an error occurs while revalidating the cache. See `stale-if-error` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#stale-if-error).',
                isOptional: true,
              },
            ],
          },
          StorefrontMutations: {
            filePath: '/storefront.ts',
            name: 'StorefrontMutations',
            description:
              'Maps all the mutations found in the project to variables and return types.',
            members: [],
            value:
              "export interface StorefrontMutations {\n  // Example of how a generated mutation type looks like:\n  // '#graphql mutation m1 {...}': {return: M1Mutation; variables: M1MutationVariables};\n}",
          },
          StorefrontMutateSecondParam: {
            filePath: '/storefront.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'StorefrontMutateSecondParam',
            value:
              "RawGqlString extends keyof StorefrontMutations\n  ? StorefrontCommonOptions<StorefrontMutations[RawGqlString]['variables']>\n  : StorefrontCommonOptions<GenericVariables>",
            description: '',
          },
          NoStoreStrategy: {
            filePath: '/cache/strategies.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'NoStoreStrategy',
            value: '{\n  mode: string;\n}',
            description: '',
            members: [
              {
                filePath: '/cache/strategies.ts',
                syntaxKind: 'PropertySignature',
                name: 'mode',
                value: 'string',
                description: '',
              },
            ],
          },
          AllCacheOptions: {
            filePath: '/cache/strategies.ts',
            name: 'AllCacheOptions',
            description: 'Override options for a cache strategy.',
            members: [
              {
                filePath: '/cache/strategies.ts',
                syntaxKind: 'PropertySignature',
                name: 'mode',
                value: 'string',
                description:
                  'The caching mode, generally `public`, `private`, or `no-store`.',
                isOptional: true,
              },
              {
                filePath: '/cache/strategies.ts',
                syntaxKind: 'PropertySignature',
                name: 'maxAge',
                value: 'number',
                description:
                  'The maximum amount of time in seconds that a resource will be considered fresh. See `max-age` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#:~:text=Response%20Directives-,max%2Dage,-The%20max%2Dage).',
                isOptional: true,
              },
              {
                filePath: '/cache/strategies.ts',
                syntaxKind: 'PropertySignature',
                name: 'staleWhileRevalidate',
                value: 'number',
                description:
                  'Indicate that the cache should serve the stale response in the background while revalidating the cache. See `stale-while-revalidate` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#stale-while-revalidate).',
                isOptional: true,
              },
              {
                filePath: '/cache/strategies.ts',
                syntaxKind: 'PropertySignature',
                name: 'sMaxAge',
                value: 'number',
                description:
                  'Similar to `maxAge` but specific to shared caches. See `s-maxage` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#s-maxage).',
                isOptional: true,
              },
              {
                filePath: '/cache/strategies.ts',
                syntaxKind: 'PropertySignature',
                name: 'staleIfError',
                value: 'number',
                description:
                  'Indicate that the cache should serve the stale response if an error occurs while revalidating the cache. See `stale-if-error` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#stale-if-error).',
                isOptional: true,
              },
            ],
            value:
              'export interface AllCacheOptions {\n  /**\n   * The caching mode, generally `public`, `private`, or `no-store`.\n   */\n  mode?: string;\n  /**\n   * The maximum amount of time in seconds that a resource will be considered fresh. See `max-age` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#:~:text=Response%20Directives-,max%2Dage,-The%20max%2Dage).\n   */\n  maxAge?: number;\n  /**\n   * Indicate that the cache should serve the stale response in the background while revalidating the cache. See `stale-while-revalidate` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#stale-while-revalidate).\n   */\n  staleWhileRevalidate?: number;\n  /**\n   * Similar to `maxAge` but specific to shared caches. See `s-maxage` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#s-maxage).\n   */\n  sMaxAge?: number;\n  /**\n   * Indicate that the cache should serve the stale response if an error occurs while revalidating the cache. See `stale-if-error` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#stale-if-error).\n   */\n  staleIfError?: number;\n}',
          },
          CartMetafieldsSetFunction: {
            filePath: '/cart/queries/cartMetafieldsSetDefault.ts',
            name: 'CartMetafieldsSetFunction',
            description: '',
            params: [
              {
                name: 'metafields',
                description: '',
                value: 'MetafieldWithoutOwnerId[]',
                filePath: '/cart/queries/cartMetafieldsSetDefault.ts',
              },
              {
                name: 'optionalParams',
                description: '',
                value: 'CartOptionalInput',
                isOptional: true,
                filePath: '/cart/queries/cartMetafieldsSetDefault.ts',
              },
            ],
            returns: {
              filePath: '/cart/queries/cartMetafieldsSetDefault.ts',
              description: '',
              name: 'Promise<CartQueryData>',
              value: 'Promise<CartQueryData>',
            },
            value:
              'export type CartMetafieldsSetFunction = (\n  metafields: MetafieldWithoutOwnerId[],\n  optionalParams?: CartOptionalInput,\n) => Promise<CartQueryData>;',
          },
          MetafieldWithoutOwnerId: {
            description: '',
            name: 'MetafieldWithoutOwnerId',
            value: 'MetafieldWithoutOwnerId',
            members: [],
            override:
              'Same as [CartMetafieldsSetInput](https://shopify.dev/docs/api/storefront/2023-07/input-objects/CartMetafieldsSetInput) Storefront API type but without `ownerId`. `ownerId` is always set to the cart id.',
          },
          CartOptionalInput: {
            filePath: '/cart/queries/cart-types.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'CartOptionalInput',
            value:
              "{\n  /**\n   * The cart id.\n   * @default cart.getCartId();\n   */\n  cartId?: Scalars['ID'];\n  /**\n   * The country code.\n   * @default storefront.i18n.country\n   */\n  country?: CountryCode;\n  /**\n   * The language code.\n   * @default storefront.i18n.language\n   */\n  language?: LanguageCode;\n}",
            description: '',
            members: [
              {
                filePath: '/cart/queries/cart-types.ts',
                syntaxKind: 'PropertySignature',
                name: 'cartId',
                value: 'string',
                description: 'The cart id.',
                isOptional: true,
                defaultValue: 'cart.getCartId();',
              },
              {
                filePath: '/cart/queries/cart-types.ts',
                syntaxKind: 'PropertySignature',
                name: 'country',
                value: 'CountryCode',
                description: 'The country code.',
                isOptional: true,
                defaultValue: 'storefront.i18n.country',
              },
              {
                filePath: '/cart/queries/cart-types.ts',
                syntaxKind: 'PropertySignature',
                name: 'language',
                value: 'LanguageCode',
                description: 'The language code.',
                isOptional: true,
                defaultValue: 'storefront.i18n.language',
              },
            ],
          },
          CartQueryData: {
            filePath: '/cart/queries/cart-types.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'CartQueryData',
            value:
              '{\n  cart: Cart;\n  errors?:\n    | CartUserError[]\n    | MetafieldsSetUserError[]\n    | MetafieldDeleteUserError[];\n}',
            description: '',
            members: [
              {
                filePath: '/cart/queries/cart-types.ts',
                syntaxKind: 'PropertySignature',
                name: 'cart',
                value: 'Cart',
                description: '',
              },
              {
                filePath: '/cart/queries/cart-types.ts',
                syntaxKind: 'PropertySignature',
                name: 'errors',
                value:
                  'CartUserError[] | MetafieldsSetUserError[] | MetafieldDeleteUserError[]',
                description: '',
                isOptional: true,
              },
            ],
          },
          Cart: {
            description: '',
            name: 'Cart',
            value: 'Cart',
            members: [],
            override:
              '[Cart](/docs/api/storefront/2023-07/objects/Cart) - Storefront API type',
          },
          CartUserError: {
            description: '',
            name: 'CartUserError',
            value: 'CartUserError',
            members: [],
            override:
              '[CartUserError](/docs/api/storefront/2023-07/objects/CartUserError) - Storefront API type',
          },
          MetafieldsSetUserError: {
            description: '',
            name: 'MetafieldsSetUserError',
            value: 'MetafieldsSetUserError',
            members: [],
            override:
              '[MetafieldsSetUserError](/docs/api/storefront/2023-07/objects/MetafieldsSetUserError) - Storefront API type',
          },
          MetafieldDeleteUserError: {
            description: '',
            name: 'MetafieldDeleteUserError',
            value: 'MetafieldDeleteUserError',
            members: [],
            override:
              '[MetafieldDeleteUserError](/docs/api/storefront/2023-07/objects/MetafieldDeleteUserError) - Storefront API type',
          },
        },
      },
    ],
  },
  {
    name: 'cartNoteUpdateDefault',
    category: 'utilities',
    isVisualComponent: false,
    related: [],
    description:
      'Creates a function that accepts a string and attaches it as a note to a cart.',
    type: 'utility',
    defaultExample: {
      description: 'This is the default example',
      codeblock: {
        tabs: [
          {
            title: 'JavaScript',
            code: "import {cartNoteUpdateDefault} from '@shopify/hydrogen';\n\nconst cartNote = cartNoteUpdateDefault({\n  storefront,\n  getCartId,\n});\n\nconst result = await cartNote('This is a note');\n",
            language: 'js',
          },
        ],
        title: 'example',
      },
    },
    definitions: [
      {
        title: 'cartNoteUpdateDefault',
        description: '',
        type: 'CartNoteUpdateDefaultGeneratedType',
        typeDefinitions: {
          CartNoteUpdateDefaultGeneratedType: {
            filePath: '/cart/queries/cartNoteUpdateDefault.ts',
            name: 'CartNoteUpdateDefaultGeneratedType',
            description: '',
            params: [
              {
                name: 'options',
                description: '',
                value: 'CartQueryOptions',
                filePath: '/cart/queries/cartNoteUpdateDefault.ts',
              },
            ],
            returns: {
              filePath: '/cart/queries/cartNoteUpdateDefault.ts',
              description: '',
              name: 'CartNoteUpdateFunction',
              value: 'CartNoteUpdateFunction',
            },
            value:
              'export function cartNoteUpdateDefault(\n  options: CartQueryOptions,\n): CartNoteUpdateFunction {\n  return async (note, optionalParams) => {\n    const {cartNoteUpdate} = await options.storefront.mutate<{\n      cartNoteUpdate: CartQueryData;\n    }>(CART_NOTE_UPDATE_MUTATION(options.cartFragment), {\n      variables: {\n        cartId: options.getCartId(),\n        note,\n        ...optionalParams,\n      },\n    });\n    return cartNoteUpdate;\n  };\n}',
          },
          CartQueryOptions: {
            filePath: '/cart/queries/cart-types.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'CartQueryOptions',
            value:
              '{\n  /**\n   * The storefront client instance created by [`createStorefrontClient`](docs/api/hydrogen/latest/utilities/createstorefrontclient).\n   */\n  storefront: Storefront;\n  /**\n   * A function that returns the cart ID.\n   */\n  getCartId: () => string | undefined;\n  /**\n   * The cart fragment to override the one used in this query.\n   */\n  cartFragment?: string;\n}',
            description: '',
            members: [
              {
                filePath: '/cart/queries/cart-types.ts',
                syntaxKind: 'PropertySignature',
                name: 'storefront',
                value: 'Storefront',
                description:
                  'The storefront client instance created by [`createStorefrontClient`](docs/api/hydrogen/latest/utilities/createstorefrontclient).',
              },
              {
                filePath: '/cart/queries/cart-types.ts',
                syntaxKind: 'PropertySignature',
                name: 'getCartId',
                value: '() => string',
                description: 'A function that returns the cart ID.',
              },
              {
                filePath: '/cart/queries/cart-types.ts',
                syntaxKind: 'PropertySignature',
                name: 'cartFragment',
                value: 'string',
                description:
                  'The cart fragment to override the one used in this query.',
                isOptional: true,
              },
            ],
          },
          Storefront: {
            filePath: '/storefront.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'Storefront',
            value:
              "{\n  /** The function to run a query on Storefront API. */\n  query: <OverrideReturnType = any, RawGqlString extends string = string>(\n    query: RawGqlString,\n    ...options: RawGqlString extends keyof StorefrontQueries // Do we have any generated query types?\n      ? IsOptionalVariables<StorefrontQueries[RawGqlString]> extends true\n        ? [StorefrontQuerySecondParam<RawGqlString>?] // Using codegen, query has no variables\n        : [StorefrontQuerySecondParam<RawGqlString>] // Using codegen, query needs variables\n      : [StorefrontQuerySecondParam?] // No codegen, variables always optional\n  ) => Promise<\n    RawGqlString extends keyof StorefrontQueries // Do we have any generated query types?\n      ? StorefrontQueries[RawGqlString]['return'] // Using codegen, return type is known\n      : OverrideReturnType // No codegen, let user specify return type\n  >;\n  /** The function to run a mutation on Storefront API. */\n  mutate: <OverrideReturnType = any, RawGqlString extends string = string>(\n    mutation: RawGqlString,\n    ...options: RawGqlString extends keyof StorefrontMutations // Do we have any generated mutation types?\n      ? IsOptionalVariables<StorefrontMutations[RawGqlString]> extends true\n        ? [StorefrontMutateSecondParam<RawGqlString>?] // Using codegen, mutation has no variables\n        : [StorefrontMutateSecondParam<RawGqlString>] // Using codegen, mutation needs variables\n      : [StorefrontMutateSecondParam?] // No codegen, variables always optional\n  ) => Promise<\n    RawGqlString extends keyof StorefrontMutations // Do we have any generated mutation types?\n      ? StorefrontMutations[RawGqlString]['return'] // Using codegen, return type is known\n      : OverrideReturnType // No codegen, let user specify return type\n  >;\n  /** The cache instance passed in from the `createStorefrontClient` argument. */\n  cache?: Cache;\n  /** Re-export of [`CacheNone`](/docs/api/hydrogen/2023-07/utilities/cachenone). */\n  CacheNone: typeof CacheNone;\n  /** Re-export of [`CacheLong`](/docs/api/hydrogen/2023-07/utilities/cachelong). */\n  CacheLong: typeof CacheLong;\n  /** Re-export of [`CacheShort`](/docs/api/hydrogen/2023-07/utilities/cacheshort). */\n  CacheShort: typeof CacheShort;\n  /** Re-export of [`CacheCustom`](/docs/api/hydrogen/2023-07/utilities/cachecustom). */\n  CacheCustom: typeof CacheCustom;\n  /** Re-export of [`generateCacheControlHeader`](/docs/api/hydrogen/2023-07/utilities/generatecachecontrolheader). */\n  generateCacheControlHeader: typeof generateCacheControlHeader;\n  /** Returns an object that contains headers that are needed for each query to Storefront API GraphQL endpoint. See [`getPublicTokenHeaders` in Hydrogen React](/docs/api/hydrogen-react/2023-07/utilities/createstorefrontclient#:~:text=%27graphql%27.-,getPublicTokenHeaders,-(props%3F%3A) for more details. */\n  getPublicTokenHeaders: ReturnType<\n    typeof createStorefrontUtilities\n  >['getPublicTokenHeaders'];\n  /** Returns an object that contains headers that are needed for each query to Storefront API GraphQL endpoint for API calls made from a server. See [`getPrivateTokenHeaders` in  Hydrogen React](/docs/api/hydrogen-react/2023-07/utilities/createstorefrontclient#:~:text=storefrontApiVersion-,getPrivateTokenHeaders,-(props%3F%3A) for more details.*/\n  getPrivateTokenHeaders: ReturnType<\n    typeof createStorefrontUtilities\n  >['getPrivateTokenHeaders'];\n  /** Creates the fully-qualified URL to your myshopify.com domain. See [`getShopifyDomain` in  Hydrogen React](/docs/api/hydrogen-react/2023-07/utilities/createstorefrontclient#:~:text=StorefrontClientReturn-,getShopifyDomain,-(props%3F%3A) for more details. */\n  getShopifyDomain: ReturnType<\n    typeof createStorefrontUtilities\n  >['getShopifyDomain'];\n  /** Creates the fully-qualified URL to your store's GraphQL endpoint. See [`getStorefrontApiUrl` in  Hydrogen React](/docs/api/hydrogen-react/2023-07/utilities/createstorefrontclient#:~:text=storeDomain-,getStorefrontApiUrl,-(props%3F%3A) for more details.*/\n  getApiUrl: ReturnType<\n    typeof createStorefrontUtilities\n  >['getStorefrontApiUrl'];\n  /** Determines if the error is resulted from a Storefront API call. */\n  isApiError: (error: any) => boolean;\n  /** The `i18n` object passed in from the `createStorefrontClient` argument. */\n  i18n: TI18n;\n}",
            description: 'Interface to interact with the Storefront API.',
            members: [
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'query',
                value:
                  '<OverrideReturnType = any, RawGqlString extends string = string>(query: RawGqlString, ...options: RawGqlString extends never ? IsOptionalVariables<StorefrontQueries[RawGqlString]> extends true ? [StorefrontQuerySecondParam<RawGqlString>?] : [StorefrontQuerySecondParam<RawGqlString>] : [StorefrontQuerySecondParam<string>?]) => Promise<RawGqlString extends never ? StorefrontQueries[RawGqlString]["return"] : OverrideReturnType>',
                description: 'The function to run a query on Storefront API.',
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'mutate',
                value:
                  '<OverrideReturnType = any, RawGqlString extends string = string>(mutation: RawGqlString, ...options: RawGqlString extends never ? IsOptionalVariables<StorefrontMutations[RawGqlString]> extends true ? [StorefrontMutateSecondParam<RawGqlString>?] : [StorefrontMutateSecondParam<RawGqlString>] : [StorefrontCommonOptions<{ readonly [variable: string]: unknown; }>?]) => Promise<RawGqlString extends never ? StorefrontMutations[RawGqlString]["return"] : OverrideReturnType>',
                description:
                  'The function to run a mutation on Storefront API.',
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'cache',
                value: 'Cache',
                description:
                  'The cache instance passed in from the `createStorefrontClient` argument.',
                isOptional: true,
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'CacheNone',
                value: '() => NoStoreStrategy',
                description:
                  'Re-export of [`CacheNone`](/docs/api/hydrogen/2023-07/utilities/cachenone).',
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'CacheLong',
                value: '(overrideOptions?: AllCacheOptions) => AllCacheOptions',
                description:
                  'Re-export of [`CacheLong`](/docs/api/hydrogen/2023-07/utilities/cachelong).',
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'CacheShort',
                value: '(overrideOptions?: AllCacheOptions) => AllCacheOptions',
                description:
                  'Re-export of [`CacheShort`](/docs/api/hydrogen/2023-07/utilities/cacheshort).',
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'CacheCustom',
                value: '(overrideOptions: AllCacheOptions) => AllCacheOptions',
                description:
                  'Re-export of [`CacheCustom`](/docs/api/hydrogen/2023-07/utilities/cachecustom).',
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'generateCacheControlHeader',
                value: '(cacheOptions: AllCacheOptions) => string',
                description:
                  'Re-export of [`generateCacheControlHeader`](/docs/api/hydrogen/2023-07/utilities/generatecachecontrolheader).',
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'getPublicTokenHeaders',
                value:
                  '(props?: Partial<Pick<StorefrontClientProps, "contentType">> & Pick<StorefrontClientProps, "publicStorefrontToken">) => Record<string, string>',
                description:
                  'Returns an object that contains headers that are needed for each query to Storefront API GraphQL endpoint. See [`getPublicTokenHeaders` in Hydrogen React](/docs/api/hydrogen-react/2023-07/utilities/createstorefrontclient#:~:text=%27graphql%27.-,getPublicTokenHeaders,-(props%3F%3A) for more details.',
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'getPrivateTokenHeaders',
                value:
                  '(props?: Partial<Pick<StorefrontClientProps, "contentType">> & Pick<StorefrontClientProps, "privateStorefrontToken"> & { buyerIp?: string; }) => Record<string, string>',
                description:
                  'Returns an object that contains headers that are needed for each query to Storefront API GraphQL endpoint for API calls made from a server. See [`getPrivateTokenHeaders` in  Hydrogen React](/docs/api/hydrogen-react/2023-07/utilities/createstorefrontclient#:~:text=storefrontApiVersion-,getPrivateTokenHeaders,-(props%3F%3A) for more details.',
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'getShopifyDomain',
                value:
                  '(props?: Partial<Pick<StorefrontClientProps, "storeDomain">>) => string',
                description:
                  'Creates the fully-qualified URL to your myshopify.com domain. See [`getShopifyDomain` in  Hydrogen React](/docs/api/hydrogen-react/2023-07/utilities/createstorefrontclient#:~:text=StorefrontClientReturn-,getShopifyDomain,-(props%3F%3A) for more details.',
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'getApiUrl',
                value:
                  '(props?: Partial<Pick<StorefrontClientProps, "storeDomain" | "storefrontApiVersion">>) => string',
                description:
                  "Creates the fully-qualified URL to your store's GraphQL endpoint. See [`getStorefrontApiUrl` in  Hydrogen React](/docs/api/hydrogen-react/2023-07/utilities/createstorefrontclient#:~:text=storeDomain-,getStorefrontApiUrl,-(props%3F%3A) for more details.",
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'isApiError',
                value: '(error: any) => boolean',
                description:
                  'Determines if the error is resulted from a Storefront API call.',
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'i18n',
                value: 'TI18n',
                description:
                  'The `i18n` object passed in from the `createStorefrontClient` argument.',
              },
            ],
          },
          IsOptionalVariables: {
            filePath: '/storefront.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'IsOptionalVariables',
            value:
              "Omit<\n  OperationTypeValue['variables'],\n  AutoAddedVariableNames\n> extends EmptyVariables\n  ? true // No need to pass variables\n  : GenericVariables extends OperationTypeValue['variables']\n  ? true // We don't know what variables are needed\n  : false",
            description: '',
          },
          AutoAddedVariableNames: {
            filePath: '/storefront.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'AutoAddedVariableNames',
            value: "'country' | 'language'",
            description: '',
          },
          EmptyVariables: {
            filePath: '/storefront.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'EmptyVariables',
            value: '{[key: string]: never}',
            description: '',
            members: [],
          },
          GenericVariables: {
            filePath: '/storefront.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'GenericVariables',
            value: "ExecutionArgs['variableValues']",
            description: '',
          },
          StorefrontQueries: {
            filePath: '/storefront.ts',
            name: 'StorefrontQueries',
            description:
              'Maps all the queries found in the project to variables and return types.',
            members: [],
            value:
              "export interface StorefrontQueries {\n  // Example of how a generated query type looks like:\n  // '#graphql query q1 {...}': {return: Q1Query; variables: Q1QueryVariables};\n}",
          },
          StorefrontQuerySecondParam: {
            filePath: '/storefront.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'StorefrontQuerySecondParam',
            value:
              "(RawGqlString extends keyof StorefrontQueries\n  ? StorefrontCommonOptions<StorefrontQueries[RawGqlString]['variables']>\n  : StorefrontCommonOptions<GenericVariables>) & {cache?: CachingStrategy}",
            description: '',
          },
          StorefrontCommonOptions: {
            filePath: '/storefront.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'StorefrontCommonOptions',
            value:
              '{\n  headers?: HeadersInit;\n  storefrontApiVersion?: string;\n} & (IsOptionalVariables<{variables: Variables}> extends true\n  ? {variables?: Variables}\n  : {variables: Variables})',
            description: '',
          },
          CachingStrategy: {
            filePath: '/cache/strategies.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'CachingStrategy',
            value: 'AllCacheOptions',
            description:
              'Use the `CachingStrategy` to define a custom caching mechanism for your data. Or use one of the pre-defined caching strategies: CacheNone, CacheShort, CacheLong.',
            members: [
              {
                filePath: '/cache/strategies.ts',
                syntaxKind: 'PropertySignature',
                name: 'mode',
                value: 'string',
                description:
                  'The caching mode, generally `public`, `private`, or `no-store`.',
                isOptional: true,
              },
              {
                filePath: '/cache/strategies.ts',
                syntaxKind: 'PropertySignature',
                name: 'maxAge',
                value: 'number',
                description:
                  'The maximum amount of time in seconds that a resource will be considered fresh. See `max-age` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#:~:text=Response%20Directives-,max%2Dage,-The%20max%2Dage).',
                isOptional: true,
              },
              {
                filePath: '/cache/strategies.ts',
                syntaxKind: 'PropertySignature',
                name: 'staleWhileRevalidate',
                value: 'number',
                description:
                  'Indicate that the cache should serve the stale response in the background while revalidating the cache. See `stale-while-revalidate` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#stale-while-revalidate).',
                isOptional: true,
              },
              {
                filePath: '/cache/strategies.ts',
                syntaxKind: 'PropertySignature',
                name: 'sMaxAge',
                value: 'number',
                description:
                  'Similar to `maxAge` but specific to shared caches. See `s-maxage` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#s-maxage).',
                isOptional: true,
              },
              {
                filePath: '/cache/strategies.ts',
                syntaxKind: 'PropertySignature',
                name: 'staleIfError',
                value: 'number',
                description:
                  'Indicate that the cache should serve the stale response if an error occurs while revalidating the cache. See `stale-if-error` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#stale-if-error).',
                isOptional: true,
              },
            ],
          },
          StorefrontMutations: {
            filePath: '/storefront.ts',
            name: 'StorefrontMutations',
            description:
              'Maps all the mutations found in the project to variables and return types.',
            members: [],
            value:
              "export interface StorefrontMutations {\n  // Example of how a generated mutation type looks like:\n  // '#graphql mutation m1 {...}': {return: M1Mutation; variables: M1MutationVariables};\n}",
          },
          StorefrontMutateSecondParam: {
            filePath: '/storefront.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'StorefrontMutateSecondParam',
            value:
              "RawGqlString extends keyof StorefrontMutations\n  ? StorefrontCommonOptions<StorefrontMutations[RawGqlString]['variables']>\n  : StorefrontCommonOptions<GenericVariables>",
            description: '',
          },
          NoStoreStrategy: {
            filePath: '/cache/strategies.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'NoStoreStrategy',
            value: '{\n  mode: string;\n}',
            description: '',
            members: [
              {
                filePath: '/cache/strategies.ts',
                syntaxKind: 'PropertySignature',
                name: 'mode',
                value: 'string',
                description: '',
              },
            ],
          },
          AllCacheOptions: {
            filePath: '/cache/strategies.ts',
            name: 'AllCacheOptions',
            description: 'Override options for a cache strategy.',
            members: [
              {
                filePath: '/cache/strategies.ts',
                syntaxKind: 'PropertySignature',
                name: 'mode',
                value: 'string',
                description:
                  'The caching mode, generally `public`, `private`, or `no-store`.',
                isOptional: true,
              },
              {
                filePath: '/cache/strategies.ts',
                syntaxKind: 'PropertySignature',
                name: 'maxAge',
                value: 'number',
                description:
                  'The maximum amount of time in seconds that a resource will be considered fresh. See `max-age` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#:~:text=Response%20Directives-,max%2Dage,-The%20max%2Dage).',
                isOptional: true,
              },
              {
                filePath: '/cache/strategies.ts',
                syntaxKind: 'PropertySignature',
                name: 'staleWhileRevalidate',
                value: 'number',
                description:
                  'Indicate that the cache should serve the stale response in the background while revalidating the cache. See `stale-while-revalidate` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#stale-while-revalidate).',
                isOptional: true,
              },
              {
                filePath: '/cache/strategies.ts',
                syntaxKind: 'PropertySignature',
                name: 'sMaxAge',
                value: 'number',
                description:
                  'Similar to `maxAge` but specific to shared caches. See `s-maxage` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#s-maxage).',
                isOptional: true,
              },
              {
                filePath: '/cache/strategies.ts',
                syntaxKind: 'PropertySignature',
                name: 'staleIfError',
                value: 'number',
                description:
                  'Indicate that the cache should serve the stale response if an error occurs while revalidating the cache. See `stale-if-error` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#stale-if-error).',
                isOptional: true,
              },
            ],
            value:
              'export interface AllCacheOptions {\n  /**\n   * The caching mode, generally `public`, `private`, or `no-store`.\n   */\n  mode?: string;\n  /**\n   * The maximum amount of time in seconds that a resource will be considered fresh. See `max-age` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#:~:text=Response%20Directives-,max%2Dage,-The%20max%2Dage).\n   */\n  maxAge?: number;\n  /**\n   * Indicate that the cache should serve the stale response in the background while revalidating the cache. See `stale-while-revalidate` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#stale-while-revalidate).\n   */\n  staleWhileRevalidate?: number;\n  /**\n   * Similar to `maxAge` but specific to shared caches. See `s-maxage` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#s-maxage).\n   */\n  sMaxAge?: number;\n  /**\n   * Indicate that the cache should serve the stale response if an error occurs while revalidating the cache. See `stale-if-error` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#stale-if-error).\n   */\n  staleIfError?: number;\n}',
          },
          CartNoteUpdateFunction: {
            filePath: '/cart/queries/cartNoteUpdateDefault.ts',
            name: 'CartNoteUpdateFunction',
            description: '',
            params: [
              {
                name: 'note',
                description: '',
                value: 'string',
                filePath: '/cart/queries/cartNoteUpdateDefault.ts',
              },
              {
                name: 'optionalParams',
                description: '',
                value: 'CartOptionalInput',
                isOptional: true,
                filePath: '/cart/queries/cartNoteUpdateDefault.ts',
              },
            ],
            returns: {
              filePath: '/cart/queries/cartNoteUpdateDefault.ts',
              description: '',
              name: 'Promise<CartQueryData>',
              value: 'Promise<CartQueryData>',
            },
            value:
              'export type CartNoteUpdateFunction = (\n  note: string,\n  optionalParams?: CartOptionalInput,\n) => Promise<CartQueryData>;',
          },
          CartOptionalInput: {
            filePath: '/cart/queries/cart-types.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'CartOptionalInput',
            value:
              "{\n  /**\n   * The cart id.\n   * @default cart.getCartId();\n   */\n  cartId?: Scalars['ID'];\n  /**\n   * The country code.\n   * @default storefront.i18n.country\n   */\n  country?: CountryCode;\n  /**\n   * The language code.\n   * @default storefront.i18n.language\n   */\n  language?: LanguageCode;\n}",
            description: '',
            members: [
              {
                filePath: '/cart/queries/cart-types.ts',
                syntaxKind: 'PropertySignature',
                name: 'cartId',
                value: 'string',
                description: 'The cart id.',
                isOptional: true,
                defaultValue: 'cart.getCartId();',
              },
              {
                filePath: '/cart/queries/cart-types.ts',
                syntaxKind: 'PropertySignature',
                name: 'country',
                value: 'CountryCode',
                description: 'The country code.',
                isOptional: true,
                defaultValue: 'storefront.i18n.country',
              },
              {
                filePath: '/cart/queries/cart-types.ts',
                syntaxKind: 'PropertySignature',
                name: 'language',
                value: 'LanguageCode',
                description: 'The language code.',
                isOptional: true,
                defaultValue: 'storefront.i18n.language',
              },
            ],
          },
          CartQueryData: {
            filePath: '/cart/queries/cart-types.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'CartQueryData',
            value:
              '{\n  cart: Cart;\n  errors?:\n    | CartUserError[]\n    | MetafieldsSetUserError[]\n    | MetafieldDeleteUserError[];\n}',
            description: '',
            members: [
              {
                filePath: '/cart/queries/cart-types.ts',
                syntaxKind: 'PropertySignature',
                name: 'cart',
                value: 'Cart',
                description: '',
              },
              {
                filePath: '/cart/queries/cart-types.ts',
                syntaxKind: 'PropertySignature',
                name: 'errors',
                value:
                  'CartUserError[] | MetafieldsSetUserError[] | MetafieldDeleteUserError[]',
                description: '',
                isOptional: true,
              },
            ],
          },
          Cart: {
            description: '',
            name: 'Cart',
            value: 'Cart',
            members: [],
            override:
              '[Cart](/docs/api/storefront/2023-07/objects/Cart) - Storefront API type',
          },
          CartUserError: {
            description: '',
            name: 'CartUserError',
            value: 'CartUserError',
            members: [],
            override:
              '[CartUserError](/docs/api/storefront/2023-07/objects/CartUserError) - Storefront API type',
          },
          MetafieldsSetUserError: {
            description: '',
            name: 'MetafieldsSetUserError',
            value: 'MetafieldsSetUserError',
            members: [],
            override:
              '[MetafieldsSetUserError](/docs/api/storefront/2023-07/objects/MetafieldsSetUserError) - Storefront API type',
          },
          MetafieldDeleteUserError: {
            description: '',
            name: 'MetafieldDeleteUserError',
            value: 'MetafieldDeleteUserError',
            members: [],
            override:
              '[MetafieldDeleteUserError](/docs/api/storefront/2023-07/objects/MetafieldDeleteUserError) - Storefront API type',
          },
        },
      },
    ],
  },
  {
    name: 'cartSelectedDeliveryOptionsUpdateDefault',
    category: 'utilities',
    isVisualComponent: false,
    related: [],
    description:
      'Creates a function that accepts an object of [CartSelectedDeliveryOptionInput](/docs/api/storefront/2023-07/input-objects/CartSelectedDeliveryOptionInput) and updates the selected delivery option of a cart',
    type: 'utility',
    defaultExample: {
      description: 'This is the default example',
      codeblock: {
        tabs: [
          {
            title: 'JavaScript',
            code: "import {cartSelectedDeliveryOptionsUpdateDefault} from '@shopify/hydrogen';\n\nconst cartDeliveryOption = cartSelectedDeliveryOptionsUpdateDefault({\n  storefront,\n  getCartId,\n});\n\nconst result = await cartDeliveryOption([\n  {\n    deliveryGroupId: '123',\n    deliveryOptionHandle: 'Canada Post',\n  },\n]);\n",
            language: 'js',
          },
        ],
        title: 'example',
      },
    },
    definitions: [
      {
        title: 'cartSelectedDeliveryOptionsUpdateDefault',
        description: '',
        type: 'CartSelectedDeliveryOptionsUpdateDefaultGeneratedType',
        typeDefinitions: {
          CartSelectedDeliveryOptionsUpdateDefaultGeneratedType: {
            filePath:
              '/cart/queries/cartSelectedDeliveryOptionsUpdateDefault.ts',
            name: 'CartSelectedDeliveryOptionsUpdateDefaultGeneratedType',
            description: '',
            params: [
              {
                name: 'options',
                description: '',
                value: 'CartQueryOptions',
                filePath:
                  '/cart/queries/cartSelectedDeliveryOptionsUpdateDefault.ts',
              },
            ],
            returns: {
              filePath:
                '/cart/queries/cartSelectedDeliveryOptionsUpdateDefault.ts',
              description: '',
              name: 'CartSelectedDeliveryOptionsUpdateFunction',
              value: 'CartSelectedDeliveryOptionsUpdateFunction',
            },
            value:
              'export function cartSelectedDeliveryOptionsUpdateDefault(\n  options: CartQueryOptions,\n): CartSelectedDeliveryOptionsUpdateFunction {\n  return async (selectedDeliveryOptions, optionalParams) => {\n    const {cartSelectedDeliveryOptionsUpdate} =\n      await options.storefront.mutate<{\n        cartSelectedDeliveryOptionsUpdate: CartQueryData;\n      }>(CART_SELECTED_DELIVERY_OPTIONS_UPDATE_MUTATION(options.cartFragment), {\n        variables: {\n          cartId: options.getCartId(),\n          selectedDeliveryOptions,\n          ...optionalParams,\n        },\n      });\n    return cartSelectedDeliveryOptionsUpdate;\n  };\n}',
          },
          CartQueryOptions: {
            filePath: '/cart/queries/cart-types.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'CartQueryOptions',
            value:
              '{\n  /**\n   * The storefront client instance created by [`createStorefrontClient`](docs/api/hydrogen/latest/utilities/createstorefrontclient).\n   */\n  storefront: Storefront;\n  /**\n   * A function that returns the cart ID.\n   */\n  getCartId: () => string | undefined;\n  /**\n   * The cart fragment to override the one used in this query.\n   */\n  cartFragment?: string;\n}',
            description: '',
            members: [
              {
                filePath: '/cart/queries/cart-types.ts',
                syntaxKind: 'PropertySignature',
                name: 'storefront',
                value: 'Storefront',
                description:
                  'The storefront client instance created by [`createStorefrontClient`](docs/api/hydrogen/latest/utilities/createstorefrontclient).',
              },
              {
                filePath: '/cart/queries/cart-types.ts',
                syntaxKind: 'PropertySignature',
                name: 'getCartId',
                value: '() => string',
                description: 'A function that returns the cart ID.',
              },
              {
                filePath: '/cart/queries/cart-types.ts',
                syntaxKind: 'PropertySignature',
                name: 'cartFragment',
                value: 'string',
                description:
                  'The cart fragment to override the one used in this query.',
                isOptional: true,
              },
            ],
          },
          Storefront: {
            filePath: '/storefront.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'Storefront',
            value:
              "{\n  /** The function to run a query on Storefront API. */\n  query: <OverrideReturnType = any, RawGqlString extends string = string>(\n    query: RawGqlString,\n    ...options: RawGqlString extends keyof StorefrontQueries // Do we have any generated query types?\n      ? IsOptionalVariables<StorefrontQueries[RawGqlString]> extends true\n        ? [StorefrontQuerySecondParam<RawGqlString>?] // Using codegen, query has no variables\n        : [StorefrontQuerySecondParam<RawGqlString>] // Using codegen, query needs variables\n      : [StorefrontQuerySecondParam?] // No codegen, variables always optional\n  ) => Promise<\n    RawGqlString extends keyof StorefrontQueries // Do we have any generated query types?\n      ? StorefrontQueries[RawGqlString]['return'] // Using codegen, return type is known\n      : OverrideReturnType // No codegen, let user specify return type\n  >;\n  /** The function to run a mutation on Storefront API. */\n  mutate: <OverrideReturnType = any, RawGqlString extends string = string>(\n    mutation: RawGqlString,\n    ...options: RawGqlString extends keyof StorefrontMutations // Do we have any generated mutation types?\n      ? IsOptionalVariables<StorefrontMutations[RawGqlString]> extends true\n        ? [StorefrontMutateSecondParam<RawGqlString>?] // Using codegen, mutation has no variables\n        : [StorefrontMutateSecondParam<RawGqlString>] // Using codegen, mutation needs variables\n      : [StorefrontMutateSecondParam?] // No codegen, variables always optional\n  ) => Promise<\n    RawGqlString extends keyof StorefrontMutations // Do we have any generated mutation types?\n      ? StorefrontMutations[RawGqlString]['return'] // Using codegen, return type is known\n      : OverrideReturnType // No codegen, let user specify return type\n  >;\n  /** The cache instance passed in from the `createStorefrontClient` argument. */\n  cache?: Cache;\n  /** Re-export of [`CacheNone`](/docs/api/hydrogen/2023-07/utilities/cachenone). */\n  CacheNone: typeof CacheNone;\n  /** Re-export of [`CacheLong`](/docs/api/hydrogen/2023-07/utilities/cachelong). */\n  CacheLong: typeof CacheLong;\n  /** Re-export of [`CacheShort`](/docs/api/hydrogen/2023-07/utilities/cacheshort). */\n  CacheShort: typeof CacheShort;\n  /** Re-export of [`CacheCustom`](/docs/api/hydrogen/2023-07/utilities/cachecustom). */\n  CacheCustom: typeof CacheCustom;\n  /** Re-export of [`generateCacheControlHeader`](/docs/api/hydrogen/2023-07/utilities/generatecachecontrolheader). */\n  generateCacheControlHeader: typeof generateCacheControlHeader;\n  /** Returns an object that contains headers that are needed for each query to Storefront API GraphQL endpoint. See [`getPublicTokenHeaders` in Hydrogen React](/docs/api/hydrogen-react/2023-07/utilities/createstorefrontclient#:~:text=%27graphql%27.-,getPublicTokenHeaders,-(props%3F%3A) for more details. */\n  getPublicTokenHeaders: ReturnType<\n    typeof createStorefrontUtilities\n  >['getPublicTokenHeaders'];\n  /** Returns an object that contains headers that are needed for each query to Storefront API GraphQL endpoint for API calls made from a server. See [`getPrivateTokenHeaders` in  Hydrogen React](/docs/api/hydrogen-react/2023-07/utilities/createstorefrontclient#:~:text=storefrontApiVersion-,getPrivateTokenHeaders,-(props%3F%3A) for more details.*/\n  getPrivateTokenHeaders: ReturnType<\n    typeof createStorefrontUtilities\n  >['getPrivateTokenHeaders'];\n  /** Creates the fully-qualified URL to your myshopify.com domain. See [`getShopifyDomain` in  Hydrogen React](/docs/api/hydrogen-react/2023-07/utilities/createstorefrontclient#:~:text=StorefrontClientReturn-,getShopifyDomain,-(props%3F%3A) for more details. */\n  getShopifyDomain: ReturnType<\n    typeof createStorefrontUtilities\n  >['getShopifyDomain'];\n  /** Creates the fully-qualified URL to your store's GraphQL endpoint. See [`getStorefrontApiUrl` in  Hydrogen React](/docs/api/hydrogen-react/2023-07/utilities/createstorefrontclient#:~:text=storeDomain-,getStorefrontApiUrl,-(props%3F%3A) for more details.*/\n  getApiUrl: ReturnType<\n    typeof createStorefrontUtilities\n  >['getStorefrontApiUrl'];\n  /** Determines if the error is resulted from a Storefront API call. */\n  isApiError: (error: any) => boolean;\n  /** The `i18n` object passed in from the `createStorefrontClient` argument. */\n  i18n: TI18n;\n}",
            description: 'Interface to interact with the Storefront API.',
            members: [
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'query',
                value:
                  '<OverrideReturnType = any, RawGqlString extends string = string>(query: RawGqlString, ...options: RawGqlString extends never ? IsOptionalVariables<StorefrontQueries[RawGqlString]> extends true ? [StorefrontQuerySecondParam<RawGqlString>?] : [StorefrontQuerySecondParam<RawGqlString>] : [StorefrontQuerySecondParam<string>?]) => Promise<RawGqlString extends never ? StorefrontQueries[RawGqlString]["return"] : OverrideReturnType>',
                description: 'The function to run a query on Storefront API.',
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'mutate',
                value:
                  '<OverrideReturnType = any, RawGqlString extends string = string>(mutation: RawGqlString, ...options: RawGqlString extends never ? IsOptionalVariables<StorefrontMutations[RawGqlString]> extends true ? [StorefrontMutateSecondParam<RawGqlString>?] : [StorefrontMutateSecondParam<RawGqlString>] : [StorefrontCommonOptions<{ readonly [variable: string]: unknown; }>?]) => Promise<RawGqlString extends never ? StorefrontMutations[RawGqlString]["return"] : OverrideReturnType>',
                description:
                  'The function to run a mutation on Storefront API.',
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'cache',
                value: 'Cache',
                description:
                  'The cache instance passed in from the `createStorefrontClient` argument.',
                isOptional: true,
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'CacheNone',
                value: '() => NoStoreStrategy',
                description:
                  'Re-export of [`CacheNone`](/docs/api/hydrogen/2023-07/utilities/cachenone).',
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'CacheLong',
                value: '(overrideOptions?: AllCacheOptions) => AllCacheOptions',
                description:
                  'Re-export of [`CacheLong`](/docs/api/hydrogen/2023-07/utilities/cachelong).',
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'CacheShort',
                value: '(overrideOptions?: AllCacheOptions) => AllCacheOptions',
                description:
                  'Re-export of [`CacheShort`](/docs/api/hydrogen/2023-07/utilities/cacheshort).',
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'CacheCustom',
                value: '(overrideOptions: AllCacheOptions) => AllCacheOptions',
                description:
                  'Re-export of [`CacheCustom`](/docs/api/hydrogen/2023-07/utilities/cachecustom).',
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'generateCacheControlHeader',
                value: '(cacheOptions: AllCacheOptions) => string',
                description:
                  'Re-export of [`generateCacheControlHeader`](/docs/api/hydrogen/2023-07/utilities/generatecachecontrolheader).',
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'getPublicTokenHeaders',
                value:
                  '(props?: Partial<Pick<StorefrontClientProps, "contentType">> & Pick<StorefrontClientProps, "publicStorefrontToken">) => Record<string, string>',
                description:
                  'Returns an object that contains headers that are needed for each query to Storefront API GraphQL endpoint. See [`getPublicTokenHeaders` in Hydrogen React](/docs/api/hydrogen-react/2023-07/utilities/createstorefrontclient#:~:text=%27graphql%27.-,getPublicTokenHeaders,-(props%3F%3A) for more details.',
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'getPrivateTokenHeaders',
                value:
                  '(props?: Partial<Pick<StorefrontClientProps, "contentType">> & Pick<StorefrontClientProps, "privateStorefrontToken"> & { buyerIp?: string; }) => Record<string, string>',
                description:
                  'Returns an object that contains headers that are needed for each query to Storefront API GraphQL endpoint for API calls made from a server. See [`getPrivateTokenHeaders` in  Hydrogen React](/docs/api/hydrogen-react/2023-07/utilities/createstorefrontclient#:~:text=storefrontApiVersion-,getPrivateTokenHeaders,-(props%3F%3A) for more details.',
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'getShopifyDomain',
                value:
                  '(props?: Partial<Pick<StorefrontClientProps, "storeDomain">>) => string',
                description:
                  'Creates the fully-qualified URL to your myshopify.com domain. See [`getShopifyDomain` in  Hydrogen React](/docs/api/hydrogen-react/2023-07/utilities/createstorefrontclient#:~:text=StorefrontClientReturn-,getShopifyDomain,-(props%3F%3A) for more details.',
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'getApiUrl',
                value:
                  '(props?: Partial<Pick<StorefrontClientProps, "storeDomain" | "storefrontApiVersion">>) => string',
                description:
                  "Creates the fully-qualified URL to your store's GraphQL endpoint. See [`getStorefrontApiUrl` in  Hydrogen React](/docs/api/hydrogen-react/2023-07/utilities/createstorefrontclient#:~:text=storeDomain-,getStorefrontApiUrl,-(props%3F%3A) for more details.",
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'isApiError',
                value: '(error: any) => boolean',
                description:
                  'Determines if the error is resulted from a Storefront API call.',
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'i18n',
                value: 'TI18n',
                description:
                  'The `i18n` object passed in from the `createStorefrontClient` argument.',
              },
            ],
          },
          IsOptionalVariables: {
            filePath: '/storefront.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'IsOptionalVariables',
            value:
              "Omit<\n  OperationTypeValue['variables'],\n  AutoAddedVariableNames\n> extends EmptyVariables\n  ? true // No need to pass variables\n  : GenericVariables extends OperationTypeValue['variables']\n  ? true // We don't know what variables are needed\n  : false",
            description: '',
          },
          AutoAddedVariableNames: {
            filePath: '/storefront.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'AutoAddedVariableNames',
            value: "'country' | 'language'",
            description: '',
          },
          EmptyVariables: {
            filePath: '/storefront.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'EmptyVariables',
            value: '{[key: string]: never}',
            description: '',
            members: [],
          },
          GenericVariables: {
            filePath: '/storefront.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'GenericVariables',
            value: "ExecutionArgs['variableValues']",
            description: '',
          },
          StorefrontQueries: {
            filePath: '/storefront.ts',
            name: 'StorefrontQueries',
            description:
              'Maps all the queries found in the project to variables and return types.',
            members: [],
            value:
              "export interface StorefrontQueries {\n  // Example of how a generated query type looks like:\n  // '#graphql query q1 {...}': {return: Q1Query; variables: Q1QueryVariables};\n}",
          },
          StorefrontQuerySecondParam: {
            filePath: '/storefront.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'StorefrontQuerySecondParam',
            value:
              "(RawGqlString extends keyof StorefrontQueries\n  ? StorefrontCommonOptions<StorefrontQueries[RawGqlString]['variables']>\n  : StorefrontCommonOptions<GenericVariables>) & {cache?: CachingStrategy}",
            description: '',
          },
          StorefrontCommonOptions: {
            filePath: '/storefront.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'StorefrontCommonOptions',
            value:
              '{\n  headers?: HeadersInit;\n  storefrontApiVersion?: string;\n} & (IsOptionalVariables<{variables: Variables}> extends true\n  ? {variables?: Variables}\n  : {variables: Variables})',
            description: '',
          },
          CachingStrategy: {
            filePath: '/cache/strategies.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'CachingStrategy',
            value: 'AllCacheOptions',
            description:
              'Use the `CachingStrategy` to define a custom caching mechanism for your data. Or use one of the pre-defined caching strategies: CacheNone, CacheShort, CacheLong.',
            members: [
              {
                filePath: '/cache/strategies.ts',
                syntaxKind: 'PropertySignature',
                name: 'mode',
                value: 'string',
                description:
                  'The caching mode, generally `public`, `private`, or `no-store`.',
                isOptional: true,
              },
              {
                filePath: '/cache/strategies.ts',
                syntaxKind: 'PropertySignature',
                name: 'maxAge',
                value: 'number',
                description:
                  'The maximum amount of time in seconds that a resource will be considered fresh. See `max-age` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#:~:text=Response%20Directives-,max%2Dage,-The%20max%2Dage).',
                isOptional: true,
              },
              {
                filePath: '/cache/strategies.ts',
                syntaxKind: 'PropertySignature',
                name: 'staleWhileRevalidate',
                value: 'number',
                description:
                  'Indicate that the cache should serve the stale response in the background while revalidating the cache. See `stale-while-revalidate` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#stale-while-revalidate).',
                isOptional: true,
              },
              {
                filePath: '/cache/strategies.ts',
                syntaxKind: 'PropertySignature',
                name: 'sMaxAge',
                value: 'number',
                description:
                  'Similar to `maxAge` but specific to shared caches. See `s-maxage` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#s-maxage).',
                isOptional: true,
              },
              {
                filePath: '/cache/strategies.ts',
                syntaxKind: 'PropertySignature',
                name: 'staleIfError',
                value: 'number',
                description:
                  'Indicate that the cache should serve the stale response if an error occurs while revalidating the cache. See `stale-if-error` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#stale-if-error).',
                isOptional: true,
              },
            ],
          },
          StorefrontMutations: {
            filePath: '/storefront.ts',
            name: 'StorefrontMutations',
            description:
              'Maps all the mutations found in the project to variables and return types.',
            members: [],
            value:
              "export interface StorefrontMutations {\n  // Example of how a generated mutation type looks like:\n  // '#graphql mutation m1 {...}': {return: M1Mutation; variables: M1MutationVariables};\n}",
          },
          StorefrontMutateSecondParam: {
            filePath: '/storefront.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'StorefrontMutateSecondParam',
            value:
              "RawGqlString extends keyof StorefrontMutations\n  ? StorefrontCommonOptions<StorefrontMutations[RawGqlString]['variables']>\n  : StorefrontCommonOptions<GenericVariables>",
            description: '',
          },
          NoStoreStrategy: {
            filePath: '/cache/strategies.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'NoStoreStrategy',
            value: '{\n  mode: string;\n}',
            description: '',
            members: [
              {
                filePath: '/cache/strategies.ts',
                syntaxKind: 'PropertySignature',
                name: 'mode',
                value: 'string',
                description: '',
              },
            ],
          },
          AllCacheOptions: {
            filePath: '/cache/strategies.ts',
            name: 'AllCacheOptions',
            description: 'Override options for a cache strategy.',
            members: [
              {
                filePath: '/cache/strategies.ts',
                syntaxKind: 'PropertySignature',
                name: 'mode',
                value: 'string',
                description:
                  'The caching mode, generally `public`, `private`, or `no-store`.',
                isOptional: true,
              },
              {
                filePath: '/cache/strategies.ts',
                syntaxKind: 'PropertySignature',
                name: 'maxAge',
                value: 'number',
                description:
                  'The maximum amount of time in seconds that a resource will be considered fresh. See `max-age` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#:~:text=Response%20Directives-,max%2Dage,-The%20max%2Dage).',
                isOptional: true,
              },
              {
                filePath: '/cache/strategies.ts',
                syntaxKind: 'PropertySignature',
                name: 'staleWhileRevalidate',
                value: 'number',
                description:
                  'Indicate that the cache should serve the stale response in the background while revalidating the cache. See `stale-while-revalidate` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#stale-while-revalidate).',
                isOptional: true,
              },
              {
                filePath: '/cache/strategies.ts',
                syntaxKind: 'PropertySignature',
                name: 'sMaxAge',
                value: 'number',
                description:
                  'Similar to `maxAge` but specific to shared caches. See `s-maxage` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#s-maxage).',
                isOptional: true,
              },
              {
                filePath: '/cache/strategies.ts',
                syntaxKind: 'PropertySignature',
                name: 'staleIfError',
                value: 'number',
                description:
                  'Indicate that the cache should serve the stale response if an error occurs while revalidating the cache. See `stale-if-error` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#stale-if-error).',
                isOptional: true,
              },
            ],
            value:
              'export interface AllCacheOptions {\n  /**\n   * The caching mode, generally `public`, `private`, or `no-store`.\n   */\n  mode?: string;\n  /**\n   * The maximum amount of time in seconds that a resource will be considered fresh. See `max-age` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#:~:text=Response%20Directives-,max%2Dage,-The%20max%2Dage).\n   */\n  maxAge?: number;\n  /**\n   * Indicate that the cache should serve the stale response in the background while revalidating the cache. See `stale-while-revalidate` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#stale-while-revalidate).\n   */\n  staleWhileRevalidate?: number;\n  /**\n   * Similar to `maxAge` but specific to shared caches. See `s-maxage` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#s-maxage).\n   */\n  sMaxAge?: number;\n  /**\n   * Indicate that the cache should serve the stale response if an error occurs while revalidating the cache. See `stale-if-error` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#stale-if-error).\n   */\n  staleIfError?: number;\n}',
          },
          CartSelectedDeliveryOptionsUpdateFunction: {
            filePath:
              '/cart/queries/cartSelectedDeliveryOptionsUpdateDefault.ts',
            name: 'CartSelectedDeliveryOptionsUpdateFunction',
            description: '',
            params: [
              {
                name: 'selectedDeliveryOptions',
                description: '',
                value: 'CartSelectedDeliveryOptionInput[]',
                filePath:
                  '/cart/queries/cartSelectedDeliveryOptionsUpdateDefault.ts',
              },
              {
                name: 'optionalParams',
                description: '',
                value: 'CartOptionalInput',
                isOptional: true,
                filePath:
                  '/cart/queries/cartSelectedDeliveryOptionsUpdateDefault.ts',
              },
            ],
            returns: {
              filePath:
                '/cart/queries/cartSelectedDeliveryOptionsUpdateDefault.ts',
              description: '',
              name: 'Promise<CartQueryData>',
              value: 'Promise<CartQueryData>',
            },
            value:
              'export type CartSelectedDeliveryOptionsUpdateFunction = (\n  selectedDeliveryOptions: CartSelectedDeliveryOptionInput[],\n  optionalParams?: CartOptionalInput,\n) => Promise<CartQueryData>;',
          },
          CartSelectedDeliveryOptionInput: {
            description: '',
            name: 'CartSelectedDeliveryOptionInput',
            value: 'CartSelectedDeliveryOptionInput',
            members: [],
            override:
              '[CartSelectedDeliveryOptionInput](/docs/api/storefront/2023-07/input-objects/CartSelectedDeliveryOptionInput) - Storefront API type',
          },
          CartOptionalInput: {
            filePath: '/cart/queries/cart-types.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'CartOptionalInput',
            value:
              "{\n  /**\n   * The cart id.\n   * @default cart.getCartId();\n   */\n  cartId?: Scalars['ID'];\n  /**\n   * The country code.\n   * @default storefront.i18n.country\n   */\n  country?: CountryCode;\n  /**\n   * The language code.\n   * @default storefront.i18n.language\n   */\n  language?: LanguageCode;\n}",
            description: '',
            members: [
              {
                filePath: '/cart/queries/cart-types.ts',
                syntaxKind: 'PropertySignature',
                name: 'cartId',
                value: 'string',
                description: 'The cart id.',
                isOptional: true,
                defaultValue: 'cart.getCartId();',
              },
              {
                filePath: '/cart/queries/cart-types.ts',
                syntaxKind: 'PropertySignature',
                name: 'country',
                value: 'CountryCode',
                description: 'The country code.',
                isOptional: true,
                defaultValue: 'storefront.i18n.country',
              },
              {
                filePath: '/cart/queries/cart-types.ts',
                syntaxKind: 'PropertySignature',
                name: 'language',
                value: 'LanguageCode',
                description: 'The language code.',
                isOptional: true,
                defaultValue: 'storefront.i18n.language',
              },
            ],
          },
          CartQueryData: {
            filePath: '/cart/queries/cart-types.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'CartQueryData',
            value:
              '{\n  cart: Cart;\n  errors?:\n    | CartUserError[]\n    | MetafieldsSetUserError[]\n    | MetafieldDeleteUserError[];\n}',
            description: '',
            members: [
              {
                filePath: '/cart/queries/cart-types.ts',
                syntaxKind: 'PropertySignature',
                name: 'cart',
                value: 'Cart',
                description: '',
              },
              {
                filePath: '/cart/queries/cart-types.ts',
                syntaxKind: 'PropertySignature',
                name: 'errors',
                value:
                  'CartUserError[] | MetafieldsSetUserError[] | MetafieldDeleteUserError[]',
                description: '',
                isOptional: true,
              },
            ],
          },
          Cart: {
            description: '',
            name: 'Cart',
            value: 'Cart',
            members: [],
            override:
              '[Cart](/docs/api/storefront/2023-07/objects/Cart) - Storefront API type',
          },
          CartUserError: {
            description: '',
            name: 'CartUserError',
            value: 'CartUserError',
            members: [],
            override:
              '[CartUserError](/docs/api/storefront/2023-07/objects/CartUserError) - Storefront API type',
          },
          MetafieldsSetUserError: {
            description: '',
            name: 'MetafieldsSetUserError',
            value: 'MetafieldsSetUserError',
            members: [],
            override:
              '[MetafieldsSetUserError](/docs/api/storefront/2023-07/objects/MetafieldsSetUserError) - Storefront API type',
          },
          MetafieldDeleteUserError: {
            description: '',
            name: 'MetafieldDeleteUserError',
            value: 'MetafieldDeleteUserError',
            members: [],
            override:
              '[MetafieldDeleteUserError](/docs/api/storefront/2023-07/objects/MetafieldDeleteUserError) - Storefront API type',
          },
        },
      },
    ],
  },
  {
    name: 'createStorefrontClient',
    category: 'utilities',
    isVisualComponent: false,
    related: [
      {
        name: 'CacheNone',
        type: 'utilities',
        url: '/docs/api/hydrogen/2023-07/utilities/cachenone',
      },
      {
        name: 'CacheShort',
        type: 'utilities',
        url: '/docs/api/hydrogen/2023-07/utilities/cacheshort',
      },
      {
        name: 'CacheLong',
        type: 'utilities',
        url: '/docs/api/hydrogen/2023-07/utilities/cachelong',
      },
      {
        name: 'CacheCustom',
        type: 'utilities',
        url: '/docs/api/hydrogen/2023-07/utilities/cachecustom',
      },
      {
        name: 'InMemoryCache',
        type: 'utilities',
        url: '/docs/api/hydrogen/2023-07/utilities/inmemorycache',
      },
    ],
    description:
      'This function extends `createStorefrontClient` from [Hydrogen React](/docs/api/hydrogen-react/2023-07/utilities/createstorefrontclient). The additional arguments enable internationalization (i18n), caching, and other features particular to Remix and Oxygen.\n\nLearn more about [data fetching in Hydrogen](/docs/custom-storefronts/hydrogen/data-fetching/fetch-data).',
    type: 'utility',
    defaultExample: {
      description: 'I am the default example',
      codeblock: {
        tabs: [
          {
            title: 'JavaScript',
            code: "import {createStorefrontClient} from '@shopify/hydrogen';\nimport {\n  createRequestHandler,\n  getStorefrontHeaders,\n} from '@shopify/remix-oxygen';\nexport default {\n  async fetch(request, env, executionContext) {\n    /* Create a Storefront client with your credentials and options */\n    const {storefront} = createStorefrontClient({\n      /* Cache API instance */\n      cache: await caches.open('hydrogen'),\n      /* Runtime utility in serverless environments */\n      waitUntil: (p) =&gt; executionContext.waitUntil(p),\n      /* Private Storefront API token for your store */\n      privateStorefrontToken: env.PRIVATE_STOREFRONT_API_TOKEN,\n      /* Public Storefront API token for your store */\n      publicStorefrontToken: env.PUBLIC_STOREFRONT_API_TOKEN,\n      /* Your store domain: \"{shop}.myshopify.com\" */\n      storeDomain: env.PUBLIC_STORE_DOMAIN,\n      /**\n       * Storefront API headers containing:\n       * - buyerIp: The IP address of the customer.\n       * - requestGroupId: A unique ID to group all the logs for this request.\n       * - cookie: The 'cookie' header from the request.\n       */\n      storefrontHeaders: getStorefrontHeaders(request),\n    });\n\n    const handleRequest = createRequestHandler({\n      build: remixBuild,\n      mode: process.env.NODE_ENV,\n      /* Inject the Storefront client in the Remix context */\n      getLoadContext: () =&gt; ({storefront}),\n    });\n\n    return handleRequest(request);\n  },\n};\n",
            language: 'js',
          },
          {
            title: 'TypeScript',
            code: "import {createStorefrontClient} from '@shopify/hydrogen';\nimport * as remixBuild from '@remix-run/dev/server-build';\nimport {\n  createRequestHandler,\n  getStorefrontHeaders,\n} from '@shopify/remix-oxygen';\n\nexport default {\n  async fetch(\n    request: Request,\n    env: Record&lt;string, string&gt;,\n    executionContext: ExecutionContext,\n  ) {\n    /* Create a Storefront client with your credentials and options */\n    const {storefront} = createStorefrontClient({\n      /* Cache API instance */\n      cache: await caches.open('hydrogen'),\n      /* Runtime utility in serverless environments */\n      waitUntil: (p: Promise&lt;unknown&gt;) =&gt; executionContext.waitUntil(p),\n      /* Private Storefront API token for your store */\n      privateStorefrontToken: env.PRIVATE_STOREFRONT_API_TOKEN,\n      /* Public Storefront API token for your store */\n      publicStorefrontToken: env.PUBLIC_STOREFRONT_API_TOKEN,\n      /* Your store domain: \"{shop}.myshopify.com\" */\n      storeDomain: env.PUBLIC_STORE_DOMAIN,\n      /**\n       * Storefront API headers containing:\n       * - buyerIp: The IP address of the customer.\n       * - requestGroupId: A unique ID to group all the logs for this request.\n       * - cookie: The 'cookie' header from the request.\n       */\n      storefrontHeaders: getStorefrontHeaders(request),\n    });\n\n    const handleRequest = createRequestHandler({\n      build: remixBuild,\n      mode: process.env.NODE_ENV,\n      /* Inject the Storefront client in the Remix context */\n      getLoadContext: () =&gt; ({storefront}),\n    });\n\n    return handleRequest(request);\n  },\n};\n",
            language: 'ts',
          },
        ],
        title: 'Example code',
      },
    },
    definitions: [
      {
        title: 'Arguments',
        description: '',
        type: 'CreateStorefrontClientGeneratedType',
        typeDefinitions: {
          CreateStorefrontClientGeneratedType: {
            filePath: '/storefront.ts',
            name: 'CreateStorefrontClientGeneratedType',
            description:
              'This function extends `createStorefrontClient` from [Hydrogen React](/docs/api/hydrogen-react/2023-07/utilities/createstorefrontclient). The additional arguments enable internationalization (i18n), caching, and other features particular to Remix and Oxygen.\n\nLearn more about [data fetching in Hydrogen](/docs/custom-storefronts/hydrogen/data-fetching/fetch-data).',
            params: [
              {
                name: 'options',
                description: '',
                value: 'CreateStorefrontClientOptions<TI18n>',
                filePath: '/storefront.ts',
              },
            ],
            returns: {
              filePath: '/storefront.ts',
              description: '',
              name: 'StorefrontClient<TI18n extends I18nBase>',
              value: 'StorefrontClient<TI18n extends I18nBase>',
            },
            value:
              "export function createStorefrontClient<TI18n extends I18nBase>(\n  options: CreateStorefrontClientOptions<TI18n>,\n): StorefrontClient<TI18n> {\n  const {\n    storefrontHeaders,\n    cache,\n    waitUntil,\n    buyerIp,\n    i18n,\n    requestGroupId,\n    storefrontId,\n    ...clientOptions\n  } = options;\n  const H2_PREFIX_WARN = '[h2:warn:createStorefrontClient] ';\n\n  if (process.env.NODE_ENV === 'development' && !cache) {\n    warnOnce(\n      H2_PREFIX_WARN +\n        'Storefront API client created without a cache instance. This may slow down your sub-requests.',\n    );\n  }\n\n  const {\n    getPublicTokenHeaders,\n    getPrivateTokenHeaders,\n    getStorefrontApiUrl,\n    getShopifyDomain,\n  } = createStorefrontUtilities(clientOptions);\n\n  const getHeaders = clientOptions.privateStorefrontToken\n    ? getPrivateTokenHeaders\n    : getPublicTokenHeaders;\n\n  const defaultHeaders = getHeaders({\n    contentType: 'json',\n    buyerIp: storefrontHeaders?.buyerIp || buyerIp,\n  });\n\n  defaultHeaders[STOREFRONT_REQUEST_GROUP_ID_HEADER] =\n    storefrontHeaders?.requestGroupId || requestGroupId || generateUUID();\n\n  if (storefrontId) defaultHeaders[SHOPIFY_STOREFRONT_ID_HEADER] = storefrontId;\n  if (LIB_VERSION) defaultHeaders['user-agent'] = `Hydrogen ${LIB_VERSION}`;\n\n  if (storefrontHeaders && storefrontHeaders.cookie) {\n    const cookies = getShopifyCookies(storefrontHeaders.cookie ?? '');\n\n    if (cookies[SHOPIFY_Y])\n      defaultHeaders[SHOPIFY_STOREFRONT_Y_HEADER] = cookies[SHOPIFY_Y];\n    if (cookies[SHOPIFY_S])\n      defaultHeaders[SHOPIFY_STOREFRONT_S_HEADER] = cookies[SHOPIFY_S];\n  }\n\n  // Deprecation warning\n  if (process.env.NODE_ENV === 'development' && !storefrontHeaders) {\n    warnOnce(\n      H2_PREFIX_WARN +\n        '`requestGroupId` and `buyerIp` will be deprecated in the next calendar release. Please use `getStorefrontHeaders`',\n    );\n  }\n\n  async function fetchStorefrontApi<T>({\n    query,\n    mutation,\n    variables,\n    cache: cacheOptions,\n    headers = [],\n    storefrontApiVersion,\n    stackLine,\n  }: {stackLine?: string} & (\n    | StorefrontQueryOptions\n    | StorefrontMutationOptions\n  )): Promise<T> {\n    const userHeaders =\n      headers instanceof Headers\n        ? Object.fromEntries(headers.entries())\n        : Array.isArray(headers)\n        ? Object.fromEntries(headers)\n        : headers;\n\n    query = query ?? mutation;\n\n    const queryVariables = {...variables};\n\n    if (i18n) {\n      if (!variables?.country && /\\$country/.test(query)) {\n        queryVariables.country = i18n.country;\n      }\n\n      if (!variables?.language && /\\$language/.test(query)) {\n        queryVariables.language = i18n.language;\n      }\n    }\n\n    const url = getStorefrontApiUrl({storefrontApiVersion});\n    const graphqlData = JSON.stringify({query, variables: queryVariables});\n    const requestInit: RequestInit = {\n      method: 'POST',\n      headers: {...defaultHeaders, ...userHeaders},\n      body: graphqlData,\n    };\n\n    // Remove any headers that are identifiable to the user or request\n    const cacheKey = [\n      url,\n      {\n        method: requestInit.method,\n        headers: {\n          'content-type': defaultHeaders['content-type'],\n          'X-SDK-Variant': defaultHeaders['X-SDK-Variant'],\n          'X-SDK-Variant-Source': defaultHeaders['X-SDK-Variant-Source'],\n          'X-SDK-Version': defaultHeaders['X-SDK-Version'],\n          'X-Shopify-Storefront-Access-Token':\n            defaultHeaders['X-Shopify-Storefront-Access-Token'],\n          'user-agent': defaultHeaders['user-agent'],\n        },\n        body: requestInit.body,\n      },\n    ];\n\n    const [body, response] = await fetchWithServerCache(url, requestInit, {\n      cacheInstance: mutation ? undefined : cache,\n      cache: cacheOptions || CacheShort(),\n      cacheKey,\n      shouldCacheResponse: checkGraphQLErrors,\n      waitUntil,\n      debugInfo: {stackLine, graphql: graphqlData},\n    });\n\n    const errorOptions: StorefrontErrorOptions<T> = {\n      response,\n      type: mutation ? 'mutation' : 'query',\n      query,\n      queryVariables,\n      errors: undefined,\n    };\n\n    if (!response.ok) {\n      /**\n       * The Storefront API might return a string error, or a JSON-formatted {error: string}.\n       * We try both and conform them to a single {errors} format.\n       */\n      let errors;\n      try {\n        errors = parseJSON(body);\n      } catch (_e) {\n        errors = [{message: body}];\n      }\n\n      throwError({...errorOptions, errors});\n    }\n\n    const {data, errors} = body as StorefrontApiResponse<T>;\n\n    if (errors?.length) {\n      throwError({\n        ...errorOptions,\n        errors,\n        ErrorConstructor: StorefrontApiError,\n      });\n    }\n\n    return data as T;\n  }\n\n  return {\n    storefront: {\n      /**\n       * Sends a GraphQL query to the Storefront API.\n       *\n       * Example:\n       *\n       * ```js\n       * async function loader ({context: {storefront}}) {\n       *   const data = await storefront.query('query { ... }', {\n       *     variables: {},\n       *     cache: storefront.CacheLong()\n       *   });\n       * }\n       * ```\n       */\n      query: <Storefront['query']>((query: string, payload) => {\n        query = minifyQuery(query);\n        if (isMutationRE.test(query)) {\n          throw new Error(\n            '[h2:error:storefront.query] Cannot execute mutations',\n          );\n        }\n\n        const result = fetchStorefrontApi({\n          ...payload,\n          query,\n          stackLine: getCallerStackLine?.(),\n        });\n\n        // This is a no-op, but we need to catch the promise to avoid unhandled rejections\n        // we cannot return the catch no-op, or it would swallow the error\n        result.catch(() => {});\n\n        return result;\n      }),\n      /**\n       * Sends a GraphQL mutation to the Storefront API.\n       *\n       * Example:\n       *\n       * ```js\n       * async function loader ({context: {storefront}}) {\n       *   await storefront.mutate('mutation { ... }', {\n       *     variables: {},\n       *   });\n       * }\n       * ```\n       */\n      mutate: <Storefront['mutate']>((mutation: string, payload) => {\n        mutation = minifyQuery(mutation);\n        if (isQueryRE.test(mutation)) {\n          throw new Error(\n            '[h2:error:storefront.mutate] Cannot execute queries',\n          );\n        }\n\n        const result = fetchStorefrontApi({\n          ...payload,\n          mutation,\n          stackLine: getCallerStackLine?.(),\n        });\n\n        // This is a no-op, but we need to catch the promise to avoid unhandled rejections\n        // we cannot return the catch no-op, or it would swallow the error\n        result.catch(() => {});\n\n        return result;\n      }),\n      cache,\n      CacheNone,\n      CacheLong,\n      CacheShort,\n      CacheCustom,\n      generateCacheControlHeader,\n      getPublicTokenHeaders,\n      getPrivateTokenHeaders,\n      getShopifyDomain,\n      getApiUrl: getStorefrontApiUrl,\n      /**\n       * Wether it's a GraphQL error returned in the Storefront API response.\n       *\n       * Example:\n       *\n       * ```js\n       * async function loader ({context: {storefront}}) {\n       *   try {\n       *     await storefront.query(...);\n       *   } catch(error) {\n       *     if (storefront.isApiError(error)) {\n       *       // ...\n       *     }\n       *\n       *     throw error;\n       *   }\n       * }\n       * ```\n       */\n      isApiError: isStorefrontApiError,\n      i18n: (i18n ?? defaultI18n) as TI18n,\n    },\n  };\n}",
          },
          CreateStorefrontClientOptions: {
            filePath: '/storefront.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'CreateStorefrontClientOptions',
            value: 'HydrogenClientProps<TI18n> & StorefrontClientProps',
            description: '',
          },
          HydrogenClientProps: {
            filePath: '/storefront.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'HydrogenClientProps',
            value:
              "{\n  /** Storefront API headers. If on Oxygen, use `getStorefrontHeaders()` */\n  storefrontHeaders?: StorefrontHeaders;\n  /** An instance that implements the [Cache API](https://developer.mozilla.org/en-US/docs/Web/API/Cache) */\n  cache?: Cache;\n  /** @deprecated use storefrontHeaders instead */\n  buyerIp?: string;\n  /** @deprecated use storefrontHeaders instead */\n  requestGroupId?: string | null;\n  /** The globally unique identifier for the Shop */\n  storefrontId?: string;\n  /** The `waitUntil` function is used to keep the current request/response lifecycle alive even after a response has been sent. It should be provided by your platform. */\n  waitUntil?: ExecutionContext['waitUntil'];\n  /** An object containing a country code and language code */\n  i18n?: TI18n;\n}",
            description: '',
            members: [
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'storefrontHeaders',
                value: 'StorefrontHeaders',
                description:
                  'Storefront API headers. If on Oxygen, use `getStorefrontHeaders()`',
                isOptional: true,
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'cache',
                value: 'Cache',
                description:
                  'An instance that implements the [Cache API](https://developer.mozilla.org/en-US/docs/Web/API/Cache)',
                isOptional: true,
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'buyerIp',
                value: 'string',
                description: '',
                isOptional: true,
                deprecationMessage: 'use storefrontHeaders instead',
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'requestGroupId',
                value: 'string',
                description: '',
                isOptional: true,
                deprecationMessage: 'use storefrontHeaders instead',
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'storefrontId',
                value: 'string',
                description: 'The globally unique identifier for the Shop',
                isOptional: true,
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'waitUntil',
                value: 'ExecutionContext',
                description:
                  'The `waitUntil` function is used to keep the current request/response lifecycle alive even after a response has been sent. It should be provided by your platform.',
                isOptional: true,
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'i18n',
                value: 'TI18n',
                description:
                  'An object containing a country code and language code',
                isOptional: true,
              },
            ],
          },
          StorefrontHeaders: {
            filePath: '/storefront.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'StorefrontHeaders',
            value:
              '{\n  /** A unique ID that correlates all sub-requests together. */\n  requestGroupId: string | null;\n  /** The IP address of the client. */\n  buyerIp: string | null;\n  /** The cookie header from the client  */\n  cookie: string | null;\n}',
            description: '',
            members: [
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'requestGroupId',
                value: 'string',
                description:
                  'A unique ID that correlates all sub-requests together.',
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'buyerIp',
                value: 'string',
                description: 'The IP address of the client.',
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'cookie',
                value: 'string',
                description: 'The cookie header from the client',
              },
            ],
          },
          StorefrontClient: {
            filePath: '/storefront.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'StorefrontClient',
            value: '{\n  storefront: Storefront<TI18n>;\n}',
            description:
              'Wraps all the returned utilities from `createStorefrontClient`.',
            members: [
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'storefront',
                value: 'Storefront<TI18n>',
                description: '',
              },
            ],
          },
          Storefront: {
            filePath: '/storefront.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'Storefront',
            value:
              "{\n  /** The function to run a query on Storefront API. */\n  query: <OverrideReturnType = any, RawGqlString extends string = string>(\n    query: RawGqlString,\n    ...options: RawGqlString extends keyof StorefrontQueries // Do we have any generated query types?\n      ? IsOptionalVariables<StorefrontQueries[RawGqlString]> extends true\n        ? [StorefrontQuerySecondParam<RawGqlString>?] // Using codegen, query has no variables\n        : [StorefrontQuerySecondParam<RawGqlString>] // Using codegen, query needs variables\n      : [StorefrontQuerySecondParam?] // No codegen, variables always optional\n  ) => Promise<\n    RawGqlString extends keyof StorefrontQueries // Do we have any generated query types?\n      ? StorefrontQueries[RawGqlString]['return'] // Using codegen, return type is known\n      : OverrideReturnType // No codegen, let user specify return type\n  >;\n  /** The function to run a mutation on Storefront API. */\n  mutate: <OverrideReturnType = any, RawGqlString extends string = string>(\n    mutation: RawGqlString,\n    ...options: RawGqlString extends keyof StorefrontMutations // Do we have any generated mutation types?\n      ? IsOptionalVariables<StorefrontMutations[RawGqlString]> extends true\n        ? [StorefrontMutateSecondParam<RawGqlString>?] // Using codegen, mutation has no variables\n        : [StorefrontMutateSecondParam<RawGqlString>] // Using codegen, mutation needs variables\n      : [StorefrontMutateSecondParam?] // No codegen, variables always optional\n  ) => Promise<\n    RawGqlString extends keyof StorefrontMutations // Do we have any generated mutation types?\n      ? StorefrontMutations[RawGqlString]['return'] // Using codegen, return type is known\n      : OverrideReturnType // No codegen, let user specify return type\n  >;\n  /** The cache instance passed in from the `createStorefrontClient` argument. */\n  cache?: Cache;\n  /** Re-export of [`CacheNone`](/docs/api/hydrogen/2023-07/utilities/cachenone). */\n  CacheNone: typeof CacheNone;\n  /** Re-export of [`CacheLong`](/docs/api/hydrogen/2023-07/utilities/cachelong). */\n  CacheLong: typeof CacheLong;\n  /** Re-export of [`CacheShort`](/docs/api/hydrogen/2023-07/utilities/cacheshort). */\n  CacheShort: typeof CacheShort;\n  /** Re-export of [`CacheCustom`](/docs/api/hydrogen/2023-07/utilities/cachecustom). */\n  CacheCustom: typeof CacheCustom;\n  /** Re-export of [`generateCacheControlHeader`](/docs/api/hydrogen/2023-07/utilities/generatecachecontrolheader). */\n  generateCacheControlHeader: typeof generateCacheControlHeader;\n  /** Returns an object that contains headers that are needed for each query to Storefront API GraphQL endpoint. See [`getPublicTokenHeaders` in Hydrogen React](/docs/api/hydrogen-react/2023-07/utilities/createstorefrontclient#:~:text=%27graphql%27.-,getPublicTokenHeaders,-(props%3F%3A) for more details. */\n  getPublicTokenHeaders: ReturnType<\n    typeof createStorefrontUtilities\n  >['getPublicTokenHeaders'];\n  /** Returns an object that contains headers that are needed for each query to Storefront API GraphQL endpoint for API calls made from a server. See [`getPrivateTokenHeaders` in  Hydrogen React](/docs/api/hydrogen-react/2023-07/utilities/createstorefrontclient#:~:text=storefrontApiVersion-,getPrivateTokenHeaders,-(props%3F%3A) for more details.*/\n  getPrivateTokenHeaders: ReturnType<\n    typeof createStorefrontUtilities\n  >['getPrivateTokenHeaders'];\n  /** Creates the fully-qualified URL to your myshopify.com domain. See [`getShopifyDomain` in  Hydrogen React](/docs/api/hydrogen-react/2023-07/utilities/createstorefrontclient#:~:text=StorefrontClientReturn-,getShopifyDomain,-(props%3F%3A) for more details. */\n  getShopifyDomain: ReturnType<\n    typeof createStorefrontUtilities\n  >['getShopifyDomain'];\n  /** Creates the fully-qualified URL to your store's GraphQL endpoint. See [`getStorefrontApiUrl` in  Hydrogen React](/docs/api/hydrogen-react/2023-07/utilities/createstorefrontclient#:~:text=storeDomain-,getStorefrontApiUrl,-(props%3F%3A) for more details.*/\n  getApiUrl: ReturnType<\n    typeof createStorefrontUtilities\n  >['getStorefrontApiUrl'];\n  /** Determines if the error is resulted from a Storefront API call. */\n  isApiError: (error: any) => boolean;\n  /** The `i18n` object passed in from the `createStorefrontClient` argument. */\n  i18n: TI18n;\n}",
            description: 'Interface to interact with the Storefront API.',
            members: [
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'query',
                value:
                  '<OverrideReturnType = any, RawGqlString extends string = string>(query: RawGqlString, ...options: RawGqlString extends never ? IsOptionalVariables<StorefrontQueries[RawGqlString]> extends true ? [StorefrontQuerySecondParam<RawGqlString>?] : [StorefrontQuerySecondParam<RawGqlString>] : [StorefrontQuerySecondParam<string>?]) => Promise<RawGqlString extends never ? StorefrontQueries[RawGqlString]["return"] : OverrideReturnType>',
                description: 'The function to run a query on Storefront API.',
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'mutate',
                value:
                  '<OverrideReturnType = any, RawGqlString extends string = string>(mutation: RawGqlString, ...options: RawGqlString extends never ? IsOptionalVariables<StorefrontMutations[RawGqlString]> extends true ? [StorefrontMutateSecondParam<RawGqlString>?] : [StorefrontMutateSecondParam<RawGqlString>] : [StorefrontCommonOptions<{ readonly [variable: string]: unknown; }>?]) => Promise<RawGqlString extends never ? StorefrontMutations[RawGqlString]["return"] : OverrideReturnType>',
                description:
                  'The function to run a mutation on Storefront API.',
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'cache',
                value: 'Cache',
                description:
                  'The cache instance passed in from the `createStorefrontClient` argument.',
                isOptional: true,
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'CacheNone',
                value: '() => NoStoreStrategy',
                description:
                  'Re-export of [`CacheNone`](/docs/api/hydrogen/2023-07/utilities/cachenone).',
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'CacheLong',
                value: '(overrideOptions?: AllCacheOptions) => AllCacheOptions',
                description:
                  'Re-export of [`CacheLong`](/docs/api/hydrogen/2023-07/utilities/cachelong).',
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'CacheShort',
                value: '(overrideOptions?: AllCacheOptions) => AllCacheOptions',
                description:
                  'Re-export of [`CacheShort`](/docs/api/hydrogen/2023-07/utilities/cacheshort).',
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'CacheCustom',
                value: '(overrideOptions: AllCacheOptions) => AllCacheOptions',
                description:
                  'Re-export of [`CacheCustom`](/docs/api/hydrogen/2023-07/utilities/cachecustom).',
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'generateCacheControlHeader',
                value: '(cacheOptions: AllCacheOptions) => string',
                description:
                  'Re-export of [`generateCacheControlHeader`](/docs/api/hydrogen/2023-07/utilities/generatecachecontrolheader).',
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'getPublicTokenHeaders',
                value:
                  '(props?: Partial<Pick<StorefrontClientProps, "contentType">> & Pick<StorefrontClientProps, "publicStorefrontToken">) => Record<string, string>',
                description:
                  'Returns an object that contains headers that are needed for each query to Storefront API GraphQL endpoint. See [`getPublicTokenHeaders` in Hydrogen React](/docs/api/hydrogen-react/2023-07/utilities/createstorefrontclient#:~:text=%27graphql%27.-,getPublicTokenHeaders,-(props%3F%3A) for more details.',
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'getPrivateTokenHeaders',
                value:
                  '(props?: Partial<Pick<StorefrontClientProps, "contentType">> & Pick<StorefrontClientProps, "privateStorefrontToken"> & { buyerIp?: string; }) => Record<string, string>',
                description:
                  'Returns an object that contains headers that are needed for each query to Storefront API GraphQL endpoint for API calls made from a server. See [`getPrivateTokenHeaders` in  Hydrogen React](/docs/api/hydrogen-react/2023-07/utilities/createstorefrontclient#:~:text=storefrontApiVersion-,getPrivateTokenHeaders,-(props%3F%3A) for more details.',
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'getShopifyDomain',
                value:
                  '(props?: Partial<Pick<StorefrontClientProps, "storeDomain">>) => string',
                description:
                  'Creates the fully-qualified URL to your myshopify.com domain. See [`getShopifyDomain` in  Hydrogen React](/docs/api/hydrogen-react/2023-07/utilities/createstorefrontclient#:~:text=StorefrontClientReturn-,getShopifyDomain,-(props%3F%3A) for more details.',
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'getApiUrl',
                value:
                  '(props?: Partial<Pick<StorefrontClientProps, "storeDomain" | "storefrontApiVersion">>) => string',
                description:
                  "Creates the fully-qualified URL to your store's GraphQL endpoint. See [`getStorefrontApiUrl` in  Hydrogen React](/docs/api/hydrogen-react/2023-07/utilities/createstorefrontclient#:~:text=storeDomain-,getStorefrontApiUrl,-(props%3F%3A) for more details.",
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'isApiError',
                value: '(error: any) => boolean',
                description:
                  'Determines if the error is resulted from a Storefront API call.',
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'i18n',
                value: 'TI18n',
                description:
                  'The `i18n` object passed in from the `createStorefrontClient` argument.',
              },
            ],
          },
          IsOptionalVariables: {
            filePath: '/storefront.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'IsOptionalVariables',
            value:
              "Omit<\n  OperationTypeValue['variables'],\n  AutoAddedVariableNames\n> extends EmptyVariables\n  ? true // No need to pass variables\n  : GenericVariables extends OperationTypeValue['variables']\n  ? true // We don't know what variables are needed\n  : false",
            description: '',
          },
          AutoAddedVariableNames: {
            filePath: '/storefront.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'AutoAddedVariableNames',
            value: "'country' | 'language'",
            description: '',
          },
          EmptyVariables: {
            filePath: '/storefront.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'EmptyVariables',
            value: '{[key: string]: never}',
            description: '',
            members: [],
          },
          GenericVariables: {
            filePath: '/storefront.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'GenericVariables',
            value: "ExecutionArgs['variableValues']",
            description: '',
          },
          StorefrontQueries: {
            filePath: '/storefront.ts',
            name: 'StorefrontQueries',
            description:
              'Maps all the queries found in the project to variables and return types.',
            members: [],
            value:
              "export interface StorefrontQueries {\n  // Example of how a generated query type looks like:\n  // '#graphql query q1 {...}': {return: Q1Query; variables: Q1QueryVariables};\n}",
          },
          StorefrontQuerySecondParam: {
            filePath: '/storefront.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'StorefrontQuerySecondParam',
            value:
              "(RawGqlString extends keyof StorefrontQueries\n  ? StorefrontCommonOptions<StorefrontQueries[RawGqlString]['variables']>\n  : StorefrontCommonOptions<GenericVariables>) & {cache?: CachingStrategy}",
            description: '',
          },
          StorefrontCommonOptions: {
            filePath: '/storefront.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'StorefrontCommonOptions',
            value:
              '{\n  headers?: HeadersInit;\n  storefrontApiVersion?: string;\n} & (IsOptionalVariables<{variables: Variables}> extends true\n  ? {variables?: Variables}\n  : {variables: Variables})',
            description: '',
          },
          CachingStrategy: {
            filePath: '/cache/strategies.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'CachingStrategy',
            value: 'AllCacheOptions',
            description:
              'Use the `CachingStrategy` to define a custom caching mechanism for your data. Or use one of the pre-defined caching strategies: CacheNone, CacheShort, CacheLong.',
            members: [
              {
                filePath: '/cache/strategies.ts',
                syntaxKind: 'PropertySignature',
                name: 'mode',
                value: 'string',
                description:
                  'The caching mode, generally `public`, `private`, or `no-store`.',
                isOptional: true,
              },
              {
                filePath: '/cache/strategies.ts',
                syntaxKind: 'PropertySignature',
                name: 'maxAge',
                value: 'number',
                description:
                  'The maximum amount of time in seconds that a resource will be considered fresh. See `max-age` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#:~:text=Response%20Directives-,max%2Dage,-The%20max%2Dage).',
                isOptional: true,
              },
              {
                filePath: '/cache/strategies.ts',
                syntaxKind: 'PropertySignature',
                name: 'staleWhileRevalidate',
                value: 'number',
                description:
                  'Indicate that the cache should serve the stale response in the background while revalidating the cache. See `stale-while-revalidate` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#stale-while-revalidate).',
                isOptional: true,
              },
              {
                filePath: '/cache/strategies.ts',
                syntaxKind: 'PropertySignature',
                name: 'sMaxAge',
                value: 'number',
                description:
                  'Similar to `maxAge` but specific to shared caches. See `s-maxage` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#s-maxage).',
                isOptional: true,
              },
              {
                filePath: '/cache/strategies.ts',
                syntaxKind: 'PropertySignature',
                name: 'staleIfError',
                value: 'number',
                description:
                  'Indicate that the cache should serve the stale response if an error occurs while revalidating the cache. See `stale-if-error` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#stale-if-error).',
                isOptional: true,
              },
            ],
          },
          StorefrontMutations: {
            filePath: '/storefront.ts',
            name: 'StorefrontMutations',
            description:
              'Maps all the mutations found in the project to variables and return types.',
            members: [],
            value:
              "export interface StorefrontMutations {\n  // Example of how a generated mutation type looks like:\n  // '#graphql mutation m1 {...}': {return: M1Mutation; variables: M1MutationVariables};\n}",
          },
          StorefrontMutateSecondParam: {
            filePath: '/storefront.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'StorefrontMutateSecondParam',
            value:
              "RawGqlString extends keyof StorefrontMutations\n  ? StorefrontCommonOptions<StorefrontMutations[RawGqlString]['variables']>\n  : StorefrontCommonOptions<GenericVariables>",
            description: '',
          },
          NoStoreStrategy: {
            filePath: '/cache/strategies.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'NoStoreStrategy',
            value: '{\n  mode: string;\n}',
            description: '',
            members: [
              {
                filePath: '/cache/strategies.ts',
                syntaxKind: 'PropertySignature',
                name: 'mode',
                value: 'string',
                description: '',
              },
            ],
          },
          AllCacheOptions: {
            filePath: '/cache/strategies.ts',
            name: 'AllCacheOptions',
            description: 'Override options for a cache strategy.',
            members: [
              {
                filePath: '/cache/strategies.ts',
                syntaxKind: 'PropertySignature',
                name: 'mode',
                value: 'string',
                description:
                  'The caching mode, generally `public`, `private`, or `no-store`.',
                isOptional: true,
              },
              {
                filePath: '/cache/strategies.ts',
                syntaxKind: 'PropertySignature',
                name: 'maxAge',
                value: 'number',
                description:
                  'The maximum amount of time in seconds that a resource will be considered fresh. See `max-age` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#:~:text=Response%20Directives-,max%2Dage,-The%20max%2Dage).',
                isOptional: true,
              },
              {
                filePath: '/cache/strategies.ts',
                syntaxKind: 'PropertySignature',
                name: 'staleWhileRevalidate',
                value: 'number',
                description:
                  'Indicate that the cache should serve the stale response in the background while revalidating the cache. See `stale-while-revalidate` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#stale-while-revalidate).',
                isOptional: true,
              },
              {
                filePath: '/cache/strategies.ts',
                syntaxKind: 'PropertySignature',
                name: 'sMaxAge',
                value: 'number',
                description:
                  'Similar to `maxAge` but specific to shared caches. See `s-maxage` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#s-maxage).',
                isOptional: true,
              },
              {
                filePath: '/cache/strategies.ts',
                syntaxKind: 'PropertySignature',
                name: 'staleIfError',
                value: 'number',
                description:
                  'Indicate that the cache should serve the stale response if an error occurs while revalidating the cache. See `stale-if-error` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#stale-if-error).',
                isOptional: true,
              },
            ],
            value:
              'export interface AllCacheOptions {\n  /**\n   * The caching mode, generally `public`, `private`, or `no-store`.\n   */\n  mode?: string;\n  /**\n   * The maximum amount of time in seconds that a resource will be considered fresh. See `max-age` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#:~:text=Response%20Directives-,max%2Dage,-The%20max%2Dage).\n   */\n  maxAge?: number;\n  /**\n   * Indicate that the cache should serve the stale response in the background while revalidating the cache. See `stale-while-revalidate` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#stale-while-revalidate).\n   */\n  staleWhileRevalidate?: number;\n  /**\n   * Similar to `maxAge` but specific to shared caches. See `s-maxage` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#s-maxage).\n   */\n  sMaxAge?: number;\n  /**\n   * Indicate that the cache should serve the stale response if an error occurs while revalidating the cache. See `stale-if-error` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#stale-if-error).\n   */\n  staleIfError?: number;\n}',
          },
          I18nBase: {
            filePath: '/storefront.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'I18nBase',
            value: '{\n  language: LanguageCode;\n  country: CountryCode;\n}',
            description: '',
            members: [
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'language',
                value: 'LanguageCode',
                description: '',
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'country',
                value: 'CountryCode',
                description: '',
              },
            ],
          },
        },
      },
    ],
  },
  {
    name: 'Script',
    category: 'components',
    isVisualComponent: false,
    related: [
      {
        name: 'createContentSecurityPolicy',
        type: 'utilities',
        url: '/docs/api/hydrogen/2023-07/utilities/createcontentsecuritypolicy',
      },
      {
        name: 'useNonce',
        type: 'hooks',
        url: '/docs/api/hydrogen/2023-07/hooks/usenonce',
      },
    ],
    description:
      'Use the `Script` component to add third-party scripts to your app. It automatically adds a nonce attribute from your [content security policy](/docs/custom-storefronts/hydrogen/content-security-policy).',
    type: 'component',
    defaultExample: {
      description: 'I am the default example',
      codeblock: {
        tabs: [
          {
            title: 'JavaScript',
            code: 'import {\n  Links,\n  LiveReload,\n  Meta,\n  Outlet,\n  Scripts,\n  ScrollRestoration,\n} from \'@remix-run/react\';\nimport {useNonce, Script} from \'@shopify/hydrogen\';\nexport default function App() {\n  const nonce = useNonce();\n\n  return (\n    &lt;html lang="en"&gt;\n      &lt;head&gt;\n        &lt;meta charSet="utf-8" /&gt;\n        &lt;meta name="viewport" content="width=device-width,initial-scale=1" /&gt;\n        &lt;Meta /&gt;\n        &lt;Links /&gt;\n      &lt;/head&gt;\n      &lt;body&gt;\n        &lt;Outlet /&gt;\n        {/* Note you don\'t need to pass a nonce to the script component \n        because it\'s automatically added */}\n        &lt;Script src="https://some-custom-script.js" /&gt;\n        &lt;ScrollRestoration nonce={nonce} /&gt;\n        &lt;Scripts nonce={nonce} /&gt;\n        &lt;LiveReload nonce={nonce} /&gt;\n      &lt;/body&gt;\n    &lt;/html&gt;\n  );\n}\n',
            language: 'jsx',
          },
          {
            title: 'TypeScript',
            code: 'import {\n  Links,\n  LiveReload,\n  Meta,\n  Outlet,\n  Scripts,\n  ScrollRestoration,\n} from \'@remix-run/react\';\nimport {useNonce, Script} from \'@shopify/hydrogen\';\nexport default function App() {\n  const nonce = useNonce();\n\n  return (\n    &lt;html lang="en"&gt;\n      &lt;head&gt;\n        &lt;meta charSet="utf-8" /&gt;\n        &lt;meta name="viewport" content="width=device-width,initial-scale=1" /&gt;\n        &lt;Meta /&gt;\n        &lt;Links /&gt;\n      &lt;/head&gt;\n      &lt;body&gt;\n        &lt;Outlet /&gt;\n        {/* Note you don\'t need to pass a nonce to the script component \n        because it\'s automatically added */}\n        &lt;Script src="https://some-custom-script.js" /&gt;\n        &lt;ScrollRestoration nonce={nonce} /&gt;\n        &lt;Scripts nonce={nonce} /&gt;\n        &lt;LiveReload nonce={nonce} /&gt;\n      &lt;/body&gt;\n    &lt;/html&gt;\n  );\n}\n',
            language: 'tsx',
          },
        ],
        title: 'Example code',
      },
    },
    definitions: [
      {
        title: 'Props',
        description: '',
        type: 'ScriptProps',
        typeDefinitions: {
          ScriptProps: {
            filePath: '/csp/Script.tsx',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'ScriptProps',
            value: "JSX.IntrinsicElements['script']",
            description: '',
          },
        },
      },
    ],
  },
  {
    name: 'createContentSecurityPolicy',
    category: 'utilities',
    isVisualComponent: false,
    related: [
      {
        name: 'useNonce',
        type: 'hooks',
        url: '/docs/api/hydrogen/2023-07/hooks/usenonce',
      },
      {
        name: 'Script',
        type: 'components',
        url: '/docs/api/hydrogen/2023-07/components/script',
      },
    ],
    description:
      'Create a [content security policy](/docs/custom-storefronts/hydrogen/content-security-policy) to secure your application. The default content security policy includes exclusions for cdn.shopify.com and a script nonce.',
    type: 'utility',
    defaultExample: {
      description: 'I am the default example',
      codeblock: {
        tabs: [
          {
            title: 'JavaScript',
            code: "import {RemixServer} from '@remix-run/react';\nimport isbot from 'isbot';\nimport {renderToReadableStream} from 'react-dom/server';\nimport {createContentSecurityPolicy} from '@shopify/hydrogen';\n\nexport default async function handleRequest(\n  request,\n  responseStatusCode,\n  responseHeaders,\n  remixContext,\n) {\n  const {nonce, header, NonceProvider} = createContentSecurityPolicy({\n    // pass a custom directive to load content from a third party domain\n    styleSrc: [\n      \"'self'\",\n      'https://cdn.shopify.com',\n      'https://some-custom-css.cdn',\n    ],\n  });\n  const body = await renderToReadableStream(\n    &lt;NonceProvider&gt;\n      &lt;RemixServer context={remixContext} url={request.url} /&gt;\n    &lt;/NonceProvider&gt;,\n    {\n      nonce,\n      signal: request.signal,\n      onError(error) {\n        // eslint-disable-next-line no-console\n        console.error(error);\n        responseStatusCode = 500;\n      },\n    },\n  );\n\n  if (isbot(request.headers.get('user-agent'))) {\n    await body.allReady;\n  }\n\n  responseHeaders.set('Content-Type', 'text/html');\n  responseHeaders.set('Content-Security-Policy', header);\n\n  return new Response(body, {\n    headers: responseHeaders,\n    status: responseStatusCode,\n  });\n}\n",
            language: 'jsx',
          },
          {
            title: 'TypeScript',
            code: "import type {EntryContext} from '@shopify/remix-oxygen';\nimport {RemixServer} from '@remix-run/react';\nimport isbot from 'isbot';\nimport {renderToReadableStream} from 'react-dom/server';\nimport {createContentSecurityPolicy} from '@shopify/hydrogen';\n\nexport default async function handleRequest(\n  request: Request,\n  responseStatusCode: number,\n  responseHeaders: Headers,\n  remixContext: EntryContext,\n) {\n  const {nonce, header, NonceProvider} = createContentSecurityPolicy({\n    // pass a custom directive to load content from a third party domain\n    styleSrc: [\n      \"'self'\",\n      'https://cdn.shopify.com',\n      'https://some-custom-css.cdn',\n    ],\n  });\n  const body = await renderToReadableStream(\n    &lt;NonceProvider&gt;\n      &lt;RemixServer context={remixContext} url={request.url} /&gt;\n    &lt;/NonceProvider&gt;,\n    {\n      nonce,\n      signal: request.signal,\n      onError(error) {\n        // eslint-disable-next-line no-console\n        console.error(error);\n        responseStatusCode = 500;\n      },\n    },\n  );\n\n  if (isbot(request.headers.get('user-agent'))) {\n    await body.allReady;\n  }\n\n  responseHeaders.set('Content-Type', 'text/html');\n  responseHeaders.set('Content-Security-Policy', header);\n\n  return new Response(body, {\n    headers: responseHeaders,\n    status: responseStatusCode,\n  });\n}\n",
            language: 'tsx',
          },
        ],
        title: 'Example code',
      },
    },
    definitions: [
      {
        title: 'Props',
        description: '',
        type: 'CreateContentSecurityPolicyGeneratedType',
        typeDefinitions: {
          CreateContentSecurityPolicyGeneratedType: {
            filePath: '/csp/csp.ts',
            name: 'CreateContentSecurityPolicyGeneratedType',
            description: '',
            params: [
              {
                name: 'directives',
                description:
                  'Pass custom [content security policy directives](https://content-security-policy.com/). This is important if you load content in your app from third-party domains.',
                value: 'Record<string, string | boolean | string[]>',
                isOptional: true,
                defaultValue: '{}',
                filePath: '/csp/csp.ts',
              },
            ],
            returns: {
              filePath: '/csp/csp.ts',
              description: '',
              name: 'ContentSecurityPolicy',
              value: 'ContentSecurityPolicy',
            },
            value:
              'export function createContentSecurityPolicy(\n  directives: Record<string, string[] | string | boolean> = {},\n): ContentSecurityPolicy {\n  const nonce = generateNonce();\n  const header = createCSPHeader(nonce, directives);\n\n  const Provider = ({children}: {children: ReactNode}) => {\n    return createElement(NonceProvider, {value: nonce}, children);\n  };\n\n  return {\n    nonce,\n    header,\n    NonceProvider: Provider,\n  };\n}',
          },
          ContentSecurityPolicy: {
            filePath: '/csp/csp.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'ContentSecurityPolicy',
            value:
              '{\n  /** A randomly generated nonce string that should be passed to any custom `script` element */\n  nonce: string;\n  /** The content security policy header */\n  header: string;\n  NonceProvider: ComponentType<{children: ReactNode}>;\n}',
            description: '',
            members: [
              {
                filePath: '/csp/csp.ts',
                syntaxKind: 'PropertySignature',
                name: 'nonce',
                value: 'string',
                description:
                  'A randomly generated nonce string that should be passed to any custom `script` element',
              },
              {
                filePath: '/csp/csp.ts',
                syntaxKind: 'PropertySignature',
                name: 'header',
                value: 'string',
                description: 'The content security policy header',
              },
              {
                filePath: '/csp/csp.ts',
                syntaxKind: 'PropertySignature',
                name: 'NonceProvider',
                value: 'ComponentType<{children: ReactNode}>',
                description: '',
              },
            ],
          },
        },
      },
    ],
  },
  {
    name: 'useNonce',
    category: 'hooks',
    isVisualComponent: false,
    related: [
      {
        name: 'createContentSecurityPolicy',
        type: 'utilities',
        url: '/docs/api/hydrogen/2023-07/utilities/createcontentsecuritypolicy',
      },
      {
        name: 'Script',
        type: 'components',
        url: '/docs/api/hydrogen/2023-07/components/script',
      },
    ],
    description:
      'The `useNonce` hook returns the [content security policy](/docs/custom-storefronts/hydrogen/content-security-policy) nonce. Use the hook to manually add a nonce to third party scripts. The `Script` component automatically does this for you. Note, the nonce should never be available in the client, and should always return undefined in the browser.',
    type: 'hook',
    defaultExample: {
      description: 'I am the default example',
      codeblock: {
        tabs: [
          {
            title: 'JavaScript',
            code: 'import {\n  Links,\n  LiveReload,\n  Meta,\n  Outlet,\n  Scripts,\n  ScrollRestoration,\n} from \'@remix-run/react\';\nimport {useNonce} from \'@shopify/hydrogen\';\n\nexport default function App() {\n  const nonce = useNonce();\n\n  return (\n    &lt;html lang="en"&gt;\n      &lt;head&gt;\n        &lt;meta charSet="utf-8" /&gt;\n        &lt;meta name="viewport" content="width=device-width,initial-scale=1" /&gt;\n        &lt;Meta /&gt;\n        &lt;Links /&gt;\n      &lt;/head&gt;\n      &lt;body&gt;\n        &lt;Outlet /&gt;\n        &lt;ScrollRestoration nonce={nonce} /&gt;\n        &lt;Scripts nonce={nonce} /&gt;\n        &lt;LiveReload nonce={nonce} /&gt;\n      &lt;/body&gt;\n    &lt;/html&gt;\n  );\n}\n',
            language: 'jsx',
          },
          {
            title: 'TypeScript',
            code: 'import {\n  Links,\n  LiveReload,\n  Meta,\n  Outlet,\n  Scripts,\n  ScrollRestoration,\n} from \'@remix-run/react\';\nimport {useNonce} from \'@shopify/hydrogen\';\n\nexport default function App() {\n  const nonce = useNonce();\n\n  return (\n    &lt;html lang="en"&gt;\n      &lt;head&gt;\n        &lt;meta charSet="utf-8" /&gt;\n        &lt;meta name="viewport" content="width=device-width,initial-scale=1" /&gt;\n        &lt;Meta /&gt;\n        &lt;Links /&gt;\n      &lt;/head&gt;\n      &lt;body&gt;\n        &lt;Outlet /&gt;\n        &lt;ScrollRestoration nonce={nonce} /&gt;\n        &lt;Scripts nonce={nonce} /&gt;\n        &lt;LiveReload nonce={nonce} /&gt;\n      &lt;/body&gt;\n    &lt;/html&gt;\n  );\n}\n',
            language: 'tsx',
          },
        ],
        title: 'Example code',
      },
    },
    definitions: [
      {
        title: 'Props',
        description: '',
        type: 'UseNonceGeneratedType',
        typeDefinitions: {
          UseNonceGeneratedType: {
            filePath: '/csp/csp.ts',
            name: 'UseNonceGeneratedType',
            description: '',
            params: [],
            returns: {
              filePath: '/csp/csp.ts',
              description: '',
              name: '',
              value: '',
            },
            value: 'useNonce = () => useContext(NonceContext)',
          },
        },
      },
    ],
  },
  {
    name: 'OptimisticInput',
    category: 'components',
    isVisualComponent: false,
    related: [],
    description:
      'Creates a form input for optimistic UI updates. Use `useOptimisticData` to update the UI with the latest optimistic data.',
    type: 'component',
    defaultExample: {
      description: 'This is the default example',
      codeblock: {
        tabs: [
          {
            title: 'JavaScript',
            code: "import {CartForm, OptimisticInput, useOptimisticData} from '@shopify/hydrogen';\n\nexport default function Cart({line}) {\n  const optimisticId = line.id;\n  const optimisticData = useOptimisticData(optimisticId);\n\n  return (\n    &lt;div\n      style={{\n        // Hide the line item if the optimistic data action is remove\n        // Do not remove the form from the DOM\n        display: optimisticData?.action === 'remove' ? 'none' : 'block',\n      }}\n    &gt;\n      &lt;CartForm\n        route=\"/cart\"\n        action={CartForm.ACTIONS.LinesRemove}\n        inputs={{\n          lineIds: [line.id],\n        }}\n      &gt;\n        &lt;button type=\"submit\"&gt;Remove&lt;/button&gt;\n        &lt;OptimisticInput id={optimisticId} data={{action: 'remove'}} /&gt;\n      &lt;/CartForm&gt;\n    &lt;/div&gt;\n  );\n}\n",
            language: 'js',
          },
          {
            title: 'TypeScript',
            code: "import {CartForm, OptimisticInput, useOptimisticData} from '@shopify/hydrogen';\nimport {CartLine} from '@shopify/hydrogen-react/storefront-api-types';\n\ntype OptimisticData = {\n  action: string;\n};\n\nexport default function Cart({line}: {line: CartLine}) {\n  const optimisticId = line.id;\n  const optimisticData = useOptimisticData&lt;OptimisticData&gt;(optimisticId);\n\n  return (\n    &lt;div\n      style={{\n        // Hide the line item if the optimistic data action is remove\n        // Do not remove the form from the DOM\n        display: optimisticData?.action === 'remove' ? 'none' : 'block',\n      }}\n    &gt;\n      &lt;CartForm\n        route=\"/cart\"\n        action={CartForm.ACTIONS.LinesRemove}\n        inputs={{\n          lineIds: [line.id],\n        }}\n      &gt;\n        &lt;button type=\"submit\"&gt;Remove&lt;/button&gt;\n        &lt;OptimisticInput id={optimisticId} data={{action: 'remove'}} /&gt;\n      &lt;/CartForm&gt;\n    &lt;/div&gt;\n  );\n}\n",
            language: 'ts',
          },
        ],
        title: 'example',
      },
    },
    definitions: [
      {
        title: 'Props',
        description: '',
        type: 'OptimisticInputProps',
        typeDefinitions: {
          OptimisticInputProps: {
            filePath: '/optimistic-ui/optimistic-ui.tsx',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'OptimisticInputProps',
            value:
              '{\n  /**\n   * A unique identifier for the optimistic input. Use the same identifier in `useOptimisticData`\n   * to retrieve the optimistic data from actions.\n   */\n  id: string;\n  /**\n   * The data to be stored in the optimistic input. Use for creating an optimistic successful state\n   * of this form action.\n   */\n  data: Record<string, unknown>;\n}',
            description: '',
            members: [
              {
                filePath: '/optimistic-ui/optimistic-ui.tsx',
                syntaxKind: 'PropertySignature',
                name: 'id',
                value: 'string',
                description:
                  'A unique identifier for the optimistic input. Use the same identifier in `useOptimisticData` to retrieve the optimistic data from actions.',
              },
              {
                filePath: '/optimistic-ui/optimistic-ui.tsx',
                syntaxKind: 'PropertySignature',
                name: 'data',
                value: 'Record<string, unknown>',
                description:
                  'The data to be stored in the optimistic input. Use for creating an optimistic successful state of this form action.',
              },
            ],
          },
        },
      },
    ],
  },
  {
    name: 'useOptimisticData',
    category: 'hooks',
    isVisualComponent: false,
    related: [],
    description:
      'Gets the latest optimistic data with matching optimistic id from actions. Use `OptimisticInput` to accept optimistic data in forms.',
    type: 'component',
    defaultExample: {
      description: 'This is the default example',
      codeblock: {
        tabs: [
          {
            title: 'JavaScript',
            code: "import {CartForm, OptimisticInput, useOptimisticData} from '@shopify/hydrogen';\n\nexport default function Cart({line}) {\n  const optimisticId = line.id;\n  const optimisticData = useOptimisticData(optimisticId);\n\n  return (\n    &lt;div\n      style={{\n        // Hide the line item if the optimistic data action is remove\n        // Do not remove the form from the DOM\n        display: optimisticData?.action === 'remove' ? 'none' : 'block',\n      }}\n    &gt;\n      &lt;CartForm\n        route=\"/cart\"\n        action={CartForm.ACTIONS.LinesRemove}\n        inputs={{\n          lineIds: [line.id],\n        }}\n      &gt;\n        &lt;button type=\"submit\"&gt;Remove&lt;/button&gt;\n        &lt;OptimisticInput id={optimisticId} data={{action: 'remove'}} /&gt;\n      &lt;/CartForm&gt;\n    &lt;/div&gt;\n  );\n}\n",
            language: 'js',
          },
          {
            title: 'TypeScript',
            code: "import {CartForm, OptimisticInput, useOptimisticData} from '@shopify/hydrogen';\nimport {CartLine} from '@shopify/hydrogen-react/storefront-api-types';\n\ntype OptimisticData = {\n  action: string;\n};\n\nexport default function Cart({line}: {line: CartLine}) {\n  const optimisticId = line.id;\n  const optimisticData = useOptimisticData&lt;OptimisticData&gt;(optimisticId);\n\n  return (\n    &lt;div\n      style={{\n        // Hide the line item if the optimistic data action is remove\n        // Do not remove the form from the DOM\n        display: optimisticData?.action === 'remove' ? 'none' : 'block',\n      }}\n    &gt;\n      &lt;CartForm\n        route=\"/cart\"\n        action={CartForm.ACTIONS.LinesRemove}\n        inputs={{\n          lineIds: [line.id],\n        }}\n      &gt;\n        &lt;button type=\"submit\"&gt;Remove&lt;/button&gt;\n        &lt;OptimisticInput id={optimisticId} data={{action: 'remove'}} /&gt;\n      &lt;/CartForm&gt;\n    &lt;/div&gt;\n  );\n}\n",
            language: 'ts',
          },
        ],
        title: 'example',
      },
    },
    definitions: [
      {
        title: 'Props',
        description: '',
        type: 'UseOptimisticDataGeneratedType',
        typeDefinitions: {
          UseOptimisticDataGeneratedType: {
            filePath: '/optimistic-ui/optimistic-ui.tsx',
            name: 'UseOptimisticDataGeneratedType',
            description: '',
            params: [
              {
                name: 'identifier',
                description: '',
                value: 'string',
                filePath: '/optimistic-ui/optimistic-ui.tsx',
              },
            ],
            returns: {
              filePath: '/optimistic-ui/optimistic-ui.tsx',
              description: '',
              name: '',
              value: '',
            },
            value:
              "export function useOptimisticData<T>(identifier: string) {\n  const fetchers = useFetchers();\n  const data: Record<string, unknown> = {};\n\n  for (const fetcher of fetchers) {\n    const formData = fetcher.submission?.formData;\n    if (formData && formData.get('optimistic-identifier') === identifier) {\n      try {\n        if (formData.has('optimistic-data')) {\n          const dataInForm: unknown = JSON.parse(\n            String(formData.get('optimistic-data')),\n          );\n          Object.assign(data, dataInForm);\n        }\n      } catch {\n        // do nothing\n      }\n    }\n  }\n  return data as T;\n}",
          },
        },
      },
    ],
  },
  {
    name: 'Pagination',
    category: 'components',
    isVisualComponent: false,
    related: [
      {
        name: 'getPaginationVariables',
        type: 'utilities',
        url: '/docs/api/hydrogen/2023-07/utilities/getpaginationvariables',
      },
    ],
    description:
      'The [Storefront API uses cursors](https://shopify.dev/docs/api/usage/pagination-graphql) to paginate through lists of data and the `<Pagination />` component makes it easy to paginate data from the Storefront API. It is important for pagination state to be maintained in the URL, so that the user can navigate to a product and return back to the same scrolled position in a list. It is also important that the list state is shareable via URL. The `<Pagination>` component provides a render prop with properties to load more elements into your list.',
    type: 'component',
    defaultExample: {
      description: 'I am the default example',
      codeblock: {
        tabs: [
          {
            title: 'JavaScript',
            code: "import {json} from '@shopify/remix-oxygen';\nimport {Pagination, getPaginationVariables} from '@shopify/hydrogen';\nimport {useLoaderData, Link} from '@remix-run/react';\n\nexport async function loader({request, context: {storefront}}) {\n  const variables = getPaginationVariables(request, {pageBy: 8});\n\n  const data = await storefront.query(ALL_PRODUCTS_QUERY, {\n    variables,\n  });\n\n  return json({products: data.products});\n}\n\nexport default function List() {\n  const {products} = useLoaderData();\n\n  return (\n    &lt;Pagination connection={products}&gt;\n      {({nodes, PreviousLink, NextLink}) =&gt; (\n        &lt;&gt;\n          &lt;PreviousLink&gt;Previous&lt;/PreviousLink&gt;\n          &lt;div&gt;\n            {nodes.map((product) =&gt; (\n              &lt;Link key={product.id} to={`/products/${product.handle}`}&gt;\n                {product.title}\n              &lt;/Link&gt;\n            ))}\n          &lt;/div&gt;\n          &lt;NextLink&gt;Next&lt;/NextLink&gt;\n        &lt;/&gt;\n      )}\n    &lt;/Pagination&gt;\n  );\n}\n\nconst ALL_PRODUCTS_QUERY = `#graphql\n  query AllProducts(\n    $country: CountryCode\n    $language: LanguageCode\n    $first: Int\n    $last: Int\n    $startCursor: String\n    $endCursor: String\n  ) @inContext(country: $country, language: $language) {\n    products(first: $first, last: $last, before: $startCursor, after: $endCursor) {\n      nodes { id\n        title\n        handle\n      }\n      pageInfo {\n        hasPreviousPage\n        hasNextPage\n        startCursor\n        endCursor\n      }\n    }\n  }\n`;\n",
            language: 'jsx',
          },
          {
            title: 'TypeScript',
            code: "import {json, type LoaderArgs} from '@shopify/remix-oxygen';\nimport {Pagination, getPaginationVariables} from '@shopify/hydrogen';\nimport {useLoaderData, Link} from '@remix-run/react';\nimport {ProductConnection} from '@shopify/hydrogen/storefront-api-types';\n\nexport async function loader({request, context: {storefront}}: LoaderArgs) {\n  const variables = getPaginationVariables(request, {pageBy: 8});\n\n  const data = await storefront.query&lt;{products: ProductConnection}&gt;(\n    ALL_PRODUCTS_QUERY,\n    {\n      variables,\n    },\n  );\n\n  return json({products: data.products});\n}\n\nexport default function List() {\n  const {products} = useLoaderData&lt;typeof loader&gt;();\n\n  return (\n    &lt;Pagination connection={products}&gt;\n      {({nodes, NextLink, PreviousLink}) =&gt; (\n        &lt;&gt;\n          &lt;PreviousLink&gt;Previous&lt;/PreviousLink&gt;\n          &lt;div&gt;\n            {nodes.map((product) =&gt; (\n              &lt;Link key={product.id} to={`/products/${product.handle}`}&gt;\n                {product.title}\n              &lt;/Link&gt;\n            ))}\n          &lt;/div&gt;\n          &lt;NextLink&gt;Next&lt;/NextLink&gt;\n        &lt;/&gt;\n      )}\n    &lt;/Pagination&gt;\n  );\n}\n\nconst ALL_PRODUCTS_QUERY = `#graphql\n  query AllProducts(\n    $country: CountryCode\n    $language: LanguageCode\n    $first: Int\n    $last: Int\n    $startCursor: String\n    $endCursor: String\n  ) @inContext(country: $country, language: $language) {\n    products(first: $first, last: $last, before: $startCursor, after: $endCursor) {\n      nodes { id\n        title\n        handle\n      }\n      pageInfo {\n        hasPreviousPage\n        hasNextPage\n        startCursor\n        endCursor\n      }\n    }\n  }\n`;\n",
            language: 'tsx',
          },
        ],
        title: 'Example code',
      },
    },
    definitions: [
      {
        title: 'Props',
        description: '',
        type: 'PaginationProps',
        typeDefinitions: {
          PaginationProps: {
            filePath: '/pagination/Pagination.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'PaginationProps',
            value:
              '{\n  /** The response from `storefront.query` for a paginated request. Make sure the query is passed pagination variables and that the query has `pageInfo` with `hasPreviousPage`, `hasNextpage`, `startCursor`, and `endCursor` defined. */\n  connection: Connection<NodesType>;\n  /** A render prop that includes pagination data and helpers. */\n  children: PaginationRenderProp<NodesType>;\n}',
            description: '',
            members: [
              {
                filePath: '/pagination/Pagination.ts',
                syntaxKind: 'PropertySignature',
                name: 'connection',
                value: 'Connection<NodesType>',
                description:
                  'The response from `storefront.query` for a paginated request. Make sure the query is passed pagination variables and that the query has `pageInfo` with `hasPreviousPage`, `hasNextpage`, `startCursor`, and `endCursor` defined.',
              },
              {
                filePath: '/pagination/Pagination.ts',
                syntaxKind: 'PropertySignature',
                name: 'children',
                value: 'PaginationRenderProp<NodesType>',
                description:
                  'A render prop that includes pagination data and helpers.',
              },
            ],
          },
          Connection: {
            filePath: '/pagination/Pagination.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'Connection',
            value:
              '{\n      nodes: Array<NodesType>;\n      pageInfo: PageInfo;\n    } | {\n      edges: Array<{\n        node: NodesType;\n      }>;\n      pageInfo: PageInfo;\n    }',
            description: '',
          },
          PaginationRenderProp: {
            filePath: '/pagination/Pagination.ts',
            name: 'PaginationRenderProp',
            description: '',
            params: [
              {
                name: 'props',
                description: '',
                value: 'PaginationInfo<NodesType>',
                filePath: '/pagination/Pagination.ts',
              },
            ],
            returns: {
              filePath: '/pagination/Pagination.ts',
              description: '',
              name: 'ReactNode',
              value: 'ReactNode',
            },
            value:
              'type PaginationRenderProp<NodesType> = (\n  props: PaginationInfo<NodesType>,\n) => ReactNode;',
          },
          PaginationInfo: {
            filePath: '/pagination/Pagination.ts',
            name: 'PaginationInfo',
            description: '',
            members: [
              {
                filePath: '/pagination/Pagination.ts',
                syntaxKind: 'PropertySignature',
                name: 'nodes',
                value: 'Array<NodesType>',
                description:
                  'The paginated array of nodes. You should map over and render this array.',
              },
              {
                filePath: '/pagination/Pagination.ts',
                syntaxKind: 'PropertySignature',
                name: 'NextLink',
                value:
                  '(props: Omit<RemixLinkProps, "to"> & { ref?: Ref<HTMLAnchorElement>; }) => ReactNode',
                description:
                  'The `<NextLink>` is a helper component that makes it easy to navigate to the next page of paginated data. Alternatively you can build your own `<Link>` component: `<Link to={nextPageUrl} state={state} preventScrollReset />`',
              },
              {
                filePath: '/pagination/Pagination.ts',
                syntaxKind: 'PropertySignature',
                name: 'PreviousLink',
                value:
                  '(props: Omit<RemixLinkProps, "to"> & { ref?: Ref<HTMLAnchorElement>; }) => ReactNode',
                description:
                  'The `<PreviousLink>` is a helper component that makes it easy to navigate to the previous page of paginated data. Alternatively you can build your own `<Link>` component: `<Link to={previousPageUrl} state={state} preventScrollReset />`',
              },
              {
                filePath: '/pagination/Pagination.ts',
                syntaxKind: 'PropertySignature',
                name: 'previousPageUrl',
                value: 'string',
                description:
                  'The URL to the previous page of paginated data. Use this prop to build your own `<Link>` component.',
              },
              {
                filePath: '/pagination/Pagination.ts',
                syntaxKind: 'PropertySignature',
                name: 'nextPageUrl',
                value: 'string',
                description:
                  'The URL to the next page of paginated data. Use this prop to build your own `<Link>` component.',
              },
              {
                filePath: '/pagination/Pagination.ts',
                syntaxKind: 'PropertySignature',
                name: 'hasNextPage',
                value: 'boolean',
                description: 'True if the cursor has next paginated data',
              },
              {
                filePath: '/pagination/Pagination.ts',
                syntaxKind: 'PropertySignature',
                name: 'hasPreviousPage',
                value: 'boolean',
                description: 'True if the cursor has previous paginated data',
              },
              {
                filePath: '/pagination/Pagination.ts',
                syntaxKind: 'PropertySignature',
                name: 'isLoading',
                value: 'boolean',
                description:
                  'True if we are in the process of fetching another page of data',
              },
              {
                filePath: '/pagination/Pagination.ts',
                syntaxKind: 'PropertySignature',
                name: 'state',
                value:
                  '{ nodes: NodesType[]; pageInfo: { endCursor: string; startCursor: string; hasPreviousPage: boolean; }; }',
                description:
                  'The `state` property is important to use when building your own `<Link>` component if you want paginated data to continuously append to the page. This means that every time the user clicks "Next page", the next page of data will be apppended inline with the previous page. If you want the whole page to re-render with only the next page results, do not pass the `state` prop to the Remix `<Link>` component.',
              },
            ],
            value:
              "interface PaginationInfo<NodesType> {\n  /** The paginated array of nodes. You should map over and render this array. */\n  nodes: Array<NodesType>;\n  /** The `<NextLink>` is a helper component that makes it easy to navigate to the next page of paginated data. Alternatively you can build your own `<Link>` component: `<Link to={nextPageUrl} state={state} preventScrollReset />` */\n  NextLink: (\n    props: Omit<LinkProps, 'to'> & {ref?: Ref<HTMLAnchorElement>},\n  ) => ReactNode;\n  /** The `<PreviousLink>` is a helper component that makes it easy to navigate to the previous page of paginated data. Alternatively you can build your own `<Link>` component: `<Link to={previousPageUrl} state={state} preventScrollReset />` */\n  PreviousLink: (\n    props: Omit<LinkProps, 'to'> & {ref?: Ref<HTMLAnchorElement>},\n  ) => ReactNode;\n  /** The URL to the previous page of paginated data. Use this prop to build your own `<Link>` component. */\n  previousPageUrl: string;\n  /** The URL to the next page of paginated data. Use this prop to build your own `<Link>` component. */\n  nextPageUrl: string;\n  /** True if the cursor has next paginated data */\n  hasNextPage: boolean;\n  /** True if the cursor has previous paginated data */\n  hasPreviousPage: boolean;\n  /** True if we are in the process of fetching another page of data */\n  isLoading: boolean;\n  /** The `state` property is important to use when building your own `<Link>` component if you want paginated data to continuously append to the page. This means that every time the user clicks \"Next page\", the next page of data will be apppended inline with the previous page. If you want the whole page to re-render with only the next page results, do not pass the `state` prop to the Remix `<Link>` component. */\n  state: {\n    nodes: Array<NodesType>;\n    pageInfo: {\n      endCursor: Maybe<string> | undefined;\n      startCursor: Maybe<string> | undefined;\n      hasPreviousPage: boolean;\n    };\n  };\n}",
          },
        },
      },
    ],
  },
  {
    name: 'getPaginationVariables',
    category: 'utilities',
    isVisualComponent: false,
    related: [
      {
        name: 'Pagination',
        type: 'components',
        url: '/docs/api/hydrogen/2023-07/components/pagination',
      },
    ],
    description:
      '> Caution:\n> This component is in an unstable pre-release state and may have breaking changes in a future release.\n\nThe `getPaginationVariables` function is used with the [`<Pagination>`](/docs/api/hydrogen/components/pagnination) component to generate the variables needed to fetch paginated data from the Storefront API. The returned variables should be used within your storefront GraphQL query.',
    type: 'utility',
    defaultExample: {
      description: 'I am the default example',
      codeblock: {
        tabs: [
          {
            title: 'JavaScript',
            code: "import {json} from '@shopify/remix-oxygen';\nimport {Pagination, getPaginationVariables} from '@shopify/hydrogen';\nimport {useLoaderData, Link} from '@remix-run/react';\n\nexport async function loader({request, context: {storefront}}) {\n  const variables = getPaginationVariables(request, {pageBy: 8});\n\n  const data = await storefront.query(ALL_PRODUCTS_QUERY, {\n    variables,\n  });\n\n  return json({products: data.products});\n}\n\nexport default function List() {\n  const {products} = useLoaderData();\n\n  return (\n    &lt;Pagination connection={products}&gt;\n      {({nodes, PreviousLink, NextLink}) =&gt; (\n        &lt;&gt;\n          &lt;PreviousLink&gt;Previous&lt;/PreviousLink&gt;\n          &lt;div&gt;\n            {nodes.map((product) =&gt; (\n              &lt;Link key={product.id} to={`/products/${product.handle}`}&gt;\n                {product.title}\n              &lt;/Link&gt;\n            ))}\n          &lt;/div&gt;\n          &lt;NextLink&gt;Next&lt;/NextLink&gt;\n        &lt;/&gt;\n      )}\n    &lt;/Pagination&gt;\n  );\n}\n\nconst ALL_PRODUCTS_QUERY = `#graphql\n  query AllProducts(\n    $country: CountryCode\n    $language: LanguageCode\n    $first: Int\n    $last: Int\n    $startCursor: String\n    $endCursor: String\n  ) @inContext(country: $country, language: $language) {\n    products(first: $first, last: $last, before: $startCursor, after: $endCursor) {\n      nodes { id\n        title\n        handle\n      }\n      pageInfo {\n        hasPreviousPage\n        hasNextPage\n        startCursor\n        endCursor\n      }\n    }\n  }\n`;\n",
            language: 'jsx',
          },
          {
            title: 'TypeScript',
            code: "import {json, type LoaderArgs} from '@shopify/remix-oxygen';\nimport {Pagination, getPaginationVariables} from '@shopify/hydrogen';\nimport {useLoaderData, Link} from '@remix-run/react';\nimport {ProductConnection} from '@shopify/hydrogen/storefront-api-types';\n\nexport async function loader({request, context: {storefront}}: LoaderArgs) {\n  const variables = getPaginationVariables(request, {pageBy: 8});\n\n  const data = await storefront.query&lt;{products: ProductConnection}&gt;(\n    ALL_PRODUCTS_QUERY,\n    {\n      variables,\n    },\n  );\n\n  return json({products: data.products});\n}\n\nexport default function List() {\n  const {products} = useLoaderData&lt;typeof loader&gt;();\n\n  return (\n    &lt;Pagination connection={products}&gt;\n      {({nodes, NextLink, PreviousLink}) =&gt; (\n        &lt;&gt;\n          &lt;PreviousLink&gt;Previous&lt;/PreviousLink&gt;\n          &lt;div&gt;\n            {nodes.map((product) =&gt; (\n              &lt;Link key={product.id} to={`/products/${product.handle}`}&gt;\n                {product.title}\n              &lt;/Link&gt;\n            ))}\n          &lt;/div&gt;\n          &lt;NextLink&gt;Next&lt;/NextLink&gt;\n        &lt;/&gt;\n      )}\n    &lt;/Pagination&gt;\n  );\n}\n\nconst ALL_PRODUCTS_QUERY = `#graphql\n  query AllProducts(\n    $country: CountryCode\n    $language: LanguageCode\n    $first: Int\n    $last: Int\n    $startCursor: String\n    $endCursor: String\n  ) @inContext(country: $country, language: $language) {\n    products(first: $first, last: $last, before: $startCursor, after: $endCursor) {\n      nodes { id\n        title\n        handle\n      }\n      pageInfo {\n        hasPreviousPage\n        hasNextPage\n        startCursor\n        endCursor\n      }\n    }\n  }\n`;\n",
            language: 'tsx',
          },
        ],
        title: 'Example code',
      },
    },
    definitions: [
      {
        title: 'Props',
        description: '',
        type: 'GetPaginationVariablesGeneratedType',
        typeDefinitions: {
          GetPaginationVariablesGeneratedType: {
            filePath: '/pagination/Pagination.ts',
            name: 'GetPaginationVariablesGeneratedType',
            description: '',
            params: [
              {
                name: 'request',
                description:
                  'The request object passed to your Remix loader function.',
                value: 'Request',
                filePath: '/pagination/Pagination.ts',
              },
              {
                name: 'options',
                description:
                  'Options for how to configure the pagination variables. Includes the ability to change how many nodes are within each page.',
                value: '{ pageBy: number; }',
                isOptional: true,
                defaultValue: '{pageBy: 20}',
                filePath: '/pagination/Pagination.ts',
              },
            ],
            returns: {
              filePath: '/pagination/Pagination.ts',
              description:
                'Variables to be used with the `storefront.query` function',
              name: '',
              value: '',
            },
            value:
              "export function getPaginationVariables(\n  request: Request,\n  options: {pageBy: number} = {pageBy: 20},\n) {\n  if (typeof request?.url === 'undefined') {\n    throw new Error(\n      'getPaginationVariables must be called with the Request object passed to your loader function',\n    );\n  }\n\n  const {pageBy} = options;\n  const searchParams = new URLSearchParams(new URL(request.url).search);\n\n  const cursor = searchParams.get('cursor') ?? undefined;\n  const direction =\n    searchParams.get('direction') === 'previous' ? 'previous' : 'next';\n  const isPrevious = direction === 'previous';\n\n  const prevPage = {\n    last: pageBy,\n    startCursor: cursor ?? null,\n  };\n\n  const nextPage = {\n    first: pageBy,\n    endCursor: cursor ?? null,\n  };\n\n  const variables = isPrevious ? prevPage : nextPage;\n\n  return variables;\n}",
          },
        },
      },
    ],
  },
  {
    name: 'VariantSelector',
    category: 'components',
    isVisualComponent: true,
    related: [
      {
        name: 'getSelectedProductOptions',
        type: 'utilities',
        url: '/docs/api/hydrogen/2023-07/utilities/getselectedproductoptions',
      },
    ],
    description:
      'The `VariantSelector` component helps you build a form for selecting available variants of a product. It is important for variant selection state to be maintained in the URL, so that the user can navigate to a product and return back to the same variant selection. It is also important that the variant selection state is shareable via URL. The `VariantSelector` component provides a render prop that renders for each product option.',
    type: 'component',
    defaultExample: {
      description: 'I am the default example',
      codeblock: {
        tabs: [
          {
            title: 'JavaScript',
            code: "import {VariantSelector} from '@shopify/hydrogen';\nimport {Link} from '@remix-run/react';\n\nconst ProductForm = ({product}) =&gt; {\n  return (\n    &lt;VariantSelector\n      handle={product.handle}\n      options={product.options}\n      variants={product.variants}\n    &gt;\n      {({option}) =&gt; (\n        &lt;&gt;\n          &lt;div&gt;{option.name}&lt;/div&gt;\n          &lt;div&gt;\n            {option.values.map(({value, isAvailable, path, isActive}) =&gt; (\n              &lt;Link\n                to={path}\n                prefetch=\"intent\"\n                className={\n                  isActive ? 'active' : isAvailable ? '' : 'opacity-80'\n                }\n              &gt;\n                {value}\n              &lt;/Link&gt;\n            ))}\n          &lt;/div&gt;\n        &lt;/&gt;\n      )}\n    &lt;/VariantSelector&gt;\n  );\n};\n",
            language: 'jsx',
          },
          {
            title: 'TypeScript',
            code: "import {VariantSelector} from '@shopify/hydrogen';\nimport type {Product} from '@shopify/hydrogen/storefront-api-types';\nimport {Link} from '@remix-run/react';\n\n// A comment\nconst ProductForm = ({product}: {product: Product}) =&gt; {\n  return (\n    &lt;VariantSelector\n      handle={product.handle}\n      options={product.options}\n      variants={product.variants}\n    &gt;\n      {({option}) =&gt; (\n        &lt;&gt;\n          &lt;div&gt;{option.name}&lt;/div&gt;\n          &lt;div&gt;\n            {option.values.map(({value, isAvailable, to, isActive}) =&gt; (\n              &lt;Link\n                to={to}\n                prefetch=\"intent\"\n                className={\n                  isActive ? 'active' : isAvailable ? '' : 'opacity-80'\n                }\n              &gt;\n                {value}\n              &lt;/Link&gt;\n            ))}\n          &lt;/div&gt;\n        &lt;/&gt;\n      )}\n    &lt;/VariantSelector&gt;\n  );\n};\n",
            language: 'tsx',
          },
        ],
        title: 'Example code',
      },
    },
    definitions: [
      {
        title: 'Props',
        description: '',
        type: 'VariantSelectorProps',
        typeDefinitions: {
          VariantSelectorProps: {
            filePath: '/product/VariantSelector.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'VariantSelectorProps',
            value:
              '{\n  /** The product handle for all of the variants */\n  handle: string;\n  /** Product options from the [Storefront API](/docs/api/storefront/2023-07/objects/ProductOption). Make sure both `name` and `values` are apart of your query. */\n  options: Array<PartialDeep<ProductOption>> | undefined;\n  /** Product variants from the [Storefront API](/docs/api/storefront/2023-07/objects/ProductVariant). You only need to pass this prop if you want to show product availability. If a product option combination is not found within `variants`, it is assumed to be available. Make sure to include `availableForSale` and `selectedOptions.name` and `selectedOptions.value`. */\n  variants?:\n    | PartialDeep<ProductVariantConnection>\n    | Array<PartialDeep<ProductVariant>>;\n  /** By default all products are under /products. Use this prop to provide a custom path. */\n  productPath?: string;\n  /** Some description */\n  someNewProp?: string;\n  children: ({option}: {option: VariantOption}) => ReactNode;\n}',
            description: '',
            members: [
              {
                filePath: '/product/VariantSelector.ts',
                syntaxKind: 'PropertySignature',
                name: 'handle',
                value: 'string',
                description: 'The product handle for all of the variants',
              },
              {
                filePath: '/product/VariantSelector.ts',
                syntaxKind: 'PropertySignature',
                name: 'options',
                value: 'PartialObjectDeep<ProductOption, {}>[]',
                description:
                  'Product options from the [Storefront API](/docs/api/storefront/2023-07/objects/ProductOption). Make sure both `name` and `values` are apart of your query.',
              },
              {
                filePath: '/product/VariantSelector.ts',
                syntaxKind: 'PropertySignature',
                name: 'variants',
                value:
                  'PartialObjectDeep<ProductVariantConnection, {}> | PartialObjectDeep<ProductVariant, {}>[]',
                description:
                  'Product variants from the [Storefront API](/docs/api/storefront/2023-07/objects/ProductVariant). You only need to pass this prop if you want to show product availability. If a product option combination is not found within `variants`, it is assumed to be available. Make sure to include `availableForSale` and `selectedOptions.name` and `selectedOptions.value`.',
                isOptional: true,
              },
              {
                filePath: '/product/VariantSelector.ts',
                syntaxKind: 'PropertySignature',
                name: 'productPath',
                value: 'string',
                description:
                  'By default all products are under /products. Use this prop to provide a custom path.',
                isOptional: true,
              },
              {
                filePath: '/product/VariantSelector.ts',
                syntaxKind: 'PropertySignature',
                name: 'someNewProp',
                value: 'string',
                description: 'Some description',
                isOptional: true,
              },
              {
                filePath: '/product/VariantSelector.ts',
                syntaxKind: 'PropertySignature',
                name: 'children',
                value: '({ option }: { option: VariantOption; }) => ReactNode',
                description: '',
              },
            ],
          },
          VariantOption: {
            filePath: '/product/VariantSelector.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'VariantOption',
            value:
              '{\n  name: string;\n  value?: string;\n  values: Array<VariantOptionValue>;\n}',
            description: '',
            members: [
              {
                filePath: '/product/VariantSelector.ts',
                syntaxKind: 'PropertySignature',
                name: 'name',
                value: 'string',
                description: '',
              },
              {
                filePath: '/product/VariantSelector.ts',
                syntaxKind: 'PropertySignature',
                name: 'value',
                value: 'string',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/product/VariantSelector.ts',
                syntaxKind: 'PropertySignature',
                name: 'values',
                value: 'Array<VariantOptionValue>',
                description: '',
              },
            ],
          },
          VariantOptionValue: {
            filePath: '/product/VariantSelector.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'VariantOptionValue',
            value:
              '{\n  value: string;\n  isAvailable: boolean;\n  to: string;\n  search: string;\n  isActive: boolean;\n}',
            description: '',
            members: [
              {
                filePath: '/product/VariantSelector.ts',
                syntaxKind: 'PropertySignature',
                name: 'value',
                value: 'string',
                description: '',
              },
              {
                filePath: '/product/VariantSelector.ts',
                syntaxKind: 'PropertySignature',
                name: 'isAvailable',
                value: 'boolean',
                description: '',
              },
              {
                filePath: '/product/VariantSelector.ts',
                syntaxKind: 'PropertySignature',
                name: 'to',
                value: 'string',
                description: '',
              },
              {
                filePath: '/product/VariantSelector.ts',
                syntaxKind: 'PropertySignature',
                name: 'search',
                value: 'string',
                description: '',
              },
              {
                filePath: '/product/VariantSelector.ts',
                syntaxKind: 'PropertySignature',
                name: 'isActive',
                value: 'boolean',
                description: '',
              },
            ],
          },
        },
      },
    ],
  },
  {
    name: 'getSelectedProductOptions',
    category: 'utilities',
    isVisualComponent: false,
    related: [
      {
        name: 'VariantSelector',
        type: 'components',
        url: '/docs/api/hydrogen/2023-07/components/variantselector',
      },
    ],
    description:
      'The `getSelectedProductOptions` returns the selected options from the Request search parameters. The selected options can then be easily passed to your GraphQL query with [`variantBySelectedOptions`](https://shopify.dev/docs/api/storefront/2023-07/objects/product#field-product-variantbyselectedoptions).',
    type: 'component',
    defaultExample: {
      description: 'I am the default example',
      codeblock: {
        tabs: [
          {
            title: 'JavaScript',
            code: "import {getSelectedProductOptions} from '@shopify/hydrogen';\nimport {json} from '@shopify/remix-oxygen';\n\nexport async function loader({request, params, context}) {\n  const selectedOptions = getSelectedProductOptions(request);\n\n  const {product} = await context.storefront.query(PRODUCT_QUERY, {\n    variables: {\n      handle: params.productHandle,\n      selectedOptions,\n    },\n  });\n\n  return json({product});\n}\n\nconst PRODUCT_QUERY = `#graphql\n  query Product($handle: String!, $selectedOptions: [SelectedOptionInput!]!) {\n    product(handle: $handle) {\n      title\n      description\n      options {\n        name\n        values \n      }\n      selectedVariant: variantBySelectedOptions(selectedOptions: $selectedOptions) {\n        ...ProductVariantFragment\n      }\n    }\n  }\n`;\n",
            language: 'jsx',
          },
          {
            title: 'TypeScript',
            code: "import {getSelectedProductOptions} from '@shopify/hydrogen';\nimport {json, type LoaderArgs} from '@shopify/remix-oxygen';\n\nexport async function loader({request, params, context}: LoaderArgs) {\n  const selectedOptions = getSelectedProductOptions(request);\n\n  const {product} = await context.storefront.query(PRODUCT_QUERY, {\n    variables: {\n      handle: params.productHandle,\n      selectedOptions,\n    },\n  });\n\n  return json({product});\n}\n\nconst PRODUCT_QUERY = `#graphql\n  query Product($handle: String!, $selectedOptions: [SelectedOptionInput!]!) {\n    product(handle: $handle) {\n      title\n      description\n      options {\n        name\n        values \n      }\n      selectedVariant: variantBySelectedOptions(selectedOptions: $selectedOptions) {\n        ...ProductVariantFragment\n      }\n    }\n  }\n`;\n",
            language: 'tsx',
          },
        ],
        title: 'Example code',
      },
    },
    definitions: [
      {
        title: 'Props',
        description: '',
        type: 'GetSelectedProductOptions',
        typeDefinitions: {
          GetSelectedProductOptions: {
            filePath: '/product/VariantSelector.ts',
            name: 'GetSelectedProductOptions',
            description: '',
            params: [
              {
                name: 'request',
                description: '',
                value: 'Request',
                filePath: '/product/VariantSelector.ts',
              },
            ],
            returns: {
              filePath: '/product/VariantSelector.ts',
              description: '',
              name: 'SelectedOptionInput[]',
              value: 'SelectedOptionInput[]',
            },
            value:
              'type GetSelectedProductOptions = (request: Request) => SelectedOptionInput[];',
          },
        },
      },
    ],
  },
  {
    name: 'graphiqlLoader',
    category: 'utilities',
    isVisualComponent: false,
    related: [],
    description:
      "This function creates an instance of [GraphiQL](https://graphql.org/swapi-graphql) in your Hydrogen app when running on a development server. This enables you to explore, write, and test GraphQL queries using your store's live data from the Storefront API. You can visit the GraphiQL app at your storefront route /graphiql. Learn more about [using GraphiQL in Hydrogen](/docs/custom-storefronts/hydrogen/data-fetching/graphiql).",
    type: 'utility',
    defaultExample: {
      description: 'I am the default example',
      codeblock: {
        tabs: [
          {
            title: 'JavaScript',
            code: "import {graphiqlLoader} from '@shopify/hydrogen';\nimport {redirect} from '@shopify/remix-oxygen';\n\nexport async function loader(args) {\n  if (process.env.NODE_ENV === 'development') {\n    return graphiqlLoader(args);\n  }\n\n  return redirect('/');\n}\n",
            language: 'js',
          },
          {
            title: 'TypeScript',
            code: "import {graphiqlLoader} from '@shopify/hydrogen';\nimport {redirect, type LoaderArgs} from '@shopify/remix-oxygen';\n\nexport async function loader(args: LoaderArgs) {\n  if (process.env.NODE_ENV === 'development') {\n    return graphiqlLoader(args);\n  }\n\n  return redirect('/');\n}\n",
            language: 'ts',
          },
        ],
        title: 'Example code',
      },
    },
    definitions: [
      {
        title: 'Arguments',
        description: '',
        type: 'GraphiQLLoader',
        typeDefinitions: {
          GraphiQLLoader: {
            filePath: '/routing/graphiql.ts',
            name: 'GraphiQLLoader',
            description: '',
            params: [
              {
                name: 'args',
                description: '',
                value: 'DataFunctionArgs',
                filePath: '/routing/graphiql.ts',
              },
            ],
            returns: {
              filePath: '/routing/graphiql.ts',
              description: '',
              name: 'Promise<Response>',
              value: 'Promise<Response>',
            },
            value:
              'type GraphiQLLoader = (args: LoaderArgs) => Promise<Response>;',
          },
        },
      },
    ],
  },
  {
    name: 'storefrontRedirect',
    category: 'utilities',
    isVisualComponent: false,
    related: [],
    description:
      'Queries the Storefront API to see if there is any redirect [created for the current route](https://help.shopify.com/en/manual/online-store/menus-and-links/url-redirect) and performs it. Otherwise, it returns the response passed in the parameters. Useful for conditionally redirecting after a 404 response.',
    type: 'utility',
    defaultExample: {
      description: 'I am the default example',
      codeblock: {
        tabs: [
          {
            title: 'JavaScript',
            code: "import {storefrontRedirect, createStorefrontClient} from '@shopify/hydrogen';\nimport * as remixBuild from '@remix-run/dev/server-build';\nimport {\n  createRequestHandler,\n  getStorefrontHeaders,\n} from '@shopify/remix-oxygen';\n\nexport default {\n  async fetch(request, env, executionContext) {\n    const {storefront} = createStorefrontClient({\n      cache: await caches.open('hydrogen'),\n      waitUntil: (p) =&gt; executionContext.waitUntil(p),\n      privateStorefrontToken: env.PRIVATE_STOREFRONT_API_TOKEN,\n      publicStorefrontToken: env.PUBLIC_STOREFRONT_API_TOKEN,\n      storeDomain: env.PUBLIC_STORE_DOMAIN,\n      storefrontHeaders: getStorefrontHeaders(request),\n    });\n\n    const handleRequest = createRequestHandler({\n      build: remixBuild,\n      mode: process.env.NODE_ENV,\n    });\n\n    const response = await handleRequest(request);\n\n    if (response.status === 404) {\n      /**\n       * Check for redirects only when there's a 404 from\n       * the app. If the redirect doesn't exist, then\n       * `storefrontRedirect` will pass through the 404\n       * response.\n       */\n      return storefrontRedirect({request, response, storefront});\n    }\n\n    return response;\n  },\n};\n",
            language: 'js',
          },
          {
            title: 'TypeScript',
            code: "import {storefrontRedirect, createStorefrontClient} from '@shopify/hydrogen';\nimport * as remixBuild from '@remix-run/dev/server-build';\nimport {\n  createRequestHandler,\n  getStorefrontHeaders,\n} from '@shopify/remix-oxygen';\n\nexport default {\n  async fetch(request: Request, env: Env, executionContext: ExecutionContext) {\n    const {storefront} = createStorefrontClient({\n      cache: await caches.open('hydrogen'),\n      waitUntil: (p: Promise&lt;unknown&gt;) =&gt; executionContext.waitUntil(p),\n      privateStorefrontToken: env.PRIVATE_STOREFRONT_API_TOKEN,\n      publicStorefrontToken: env.PUBLIC_STOREFRONT_API_TOKEN,\n      storeDomain: env.PUBLIC_STORE_DOMAIN,\n      storefrontHeaders: getStorefrontHeaders(request),\n    });\n\n    const handleRequest = createRequestHandler({\n      build: remixBuild,\n      mode: process.env.NODE_ENV,\n    });\n\n    const response = await handleRequest(request);\n\n    if (response.status === 404) {\n      /**\n       * Check for redirects only when there's a 404 from\n       * the app. If the redirect doesn't exist, then\n       * `storefrontRedirect` will pass through the 404\n       * response.\n       */\n      return storefrontRedirect({request, response, storefront});\n    }\n\n    return response;\n  },\n};\n",
            language: 'ts',
          },
        ],
        title: 'Example code',
      },
    },
    definitions: [
      {
        title: 'Arguments',
        description: '',
        type: 'StorefrontRedirectGeneratedType',
        typeDefinitions: {
          StorefrontRedirectGeneratedType: {
            filePath: '/routing/redirect.ts',
            name: 'StorefrontRedirectGeneratedType',
            description:
              'Queries the Storefront API to see if there is any redirect created for the current route and performs it. Otherwise, it returns the response passed in the parameters. Useful for conditionally redirecting after a 404 response.',
            params: [
              {
                name: 'options',
                description: '',
                value: 'StorefrontRedirect',
                filePath: '/routing/redirect.ts',
              },
            ],
            returns: {
              filePath: '/routing/redirect.ts',
              description: '',
              name: 'Promise<Response>',
              value: 'Promise<Response>',
            },
            value:
              "export async function storefrontRedirect(\n  options: StorefrontRedirect,\n): Promise<Response> {\n  const {\n    storefront,\n    request,\n    noAdminRedirect,\n    response = new Response('Not Found', {status: 404}),\n  } = options;\n\n  const {pathname, search} = new URL(request.url);\n  const redirectFrom = pathname + search;\n\n  if (pathname === '/admin' && !noAdminRedirect) {\n    return redirect(`${storefront.getShopifyDomain()}/admin`);\n  }\n\n  try {\n    const {urlRedirects} = await storefront.query<{\n      urlRedirects: UrlRedirectConnection;\n    }>(REDIRECT_QUERY, {\n      variables: {query: 'path:' + redirectFrom},\n    });\n\n    const location = urlRedirects?.edges?.[0]?.node?.target;\n\n    if (location) {\n      return new Response(null, {status: 301, headers: {location}});\n    }\n\n    const searchParams = new URLSearchParams(search);\n    const redirectTo =\n      searchParams.get('return_to') || searchParams.get('redirect');\n\n    if (redirectTo) {\n      if (isLocalPath(redirectTo)) {\n        return redirect(redirectTo);\n      } else {\n        console.warn(\n          `Cross-domain redirects are not supported. Tried to redirect from ${redirectFrom} to ${redirectTo}`,\n        );\n      }\n    }\n  } catch (error) {\n    console.error(\n      `Failed to fetch redirects from Storefront API for route ${redirectFrom}`,\n      error,\n    );\n  }\n\n  return response;\n}",
          },
          StorefrontRedirect: {
            filePath: '/routing/redirect.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'StorefrontRedirect',
            value:
              '{\n  /** The [Storefront client](/docs/api/hydrogen/2023-07/utilities/createstorefrontclient) instance */\n  storefront: Storefront<I18nBase>;\n  /** The [MDN Request](https://developer.mozilla.org/en-US/docs/Web/API/Request) object that was passed to the `server.ts` request handler. */\n  request: Request;\n  /** The [MDN Response](https://developer.mozilla.org/en-US/docs/Web/API/Response) object created by `handleRequest` */\n  response?: Response;\n  /** By default the `/admin` route is redirected to the Shopify Admin page for the current storefront. Disable this redirect by passing `true`. */\n  noAdminRedirect?: boolean;\n}',
            description: '',
            members: [
              {
                filePath: '/routing/redirect.ts',
                syntaxKind: 'PropertySignature',
                name: 'storefront',
                value: 'Storefront<I18nBase>',
                description:
                  'The [Storefront client](/docs/api/hydrogen/2023-07/utilities/createstorefrontclient) instance',
              },
              {
                filePath: '/routing/redirect.ts',
                syntaxKind: 'PropertySignature',
                name: 'request',
                value: 'Request',
                description:
                  'The [MDN Request](https://developer.mozilla.org/en-US/docs/Web/API/Request) object that was passed to the `server.ts` request handler.',
              },
              {
                filePath: '/routing/redirect.ts',
                syntaxKind: 'PropertySignature',
                name: 'response',
                value: 'Response',
                description:
                  'The [MDN Response](https://developer.mozilla.org/en-US/docs/Web/API/Response) object created by `handleRequest`',
                isOptional: true,
              },
              {
                filePath: '/routing/redirect.ts',
                syntaxKind: 'PropertySignature',
                name: 'noAdminRedirect',
                value: 'boolean',
                description:
                  'By default the `/admin` route is redirected to the Shopify Admin page for the current storefront. Disable this redirect by passing `true`.',
                isOptional: true,
              },
            ],
          },
          Storefront: {
            filePath: '/storefront.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'Storefront',
            value:
              "{\n  /** The function to run a query on Storefront API. */\n  query: <OverrideReturnType = any, RawGqlString extends string = string>(\n    query: RawGqlString,\n    ...options: RawGqlString extends keyof StorefrontQueries // Do we have any generated query types?\n      ? IsOptionalVariables<StorefrontQueries[RawGqlString]> extends true\n        ? [StorefrontQuerySecondParam<RawGqlString>?] // Using codegen, query has no variables\n        : [StorefrontQuerySecondParam<RawGqlString>] // Using codegen, query needs variables\n      : [StorefrontQuerySecondParam?] // No codegen, variables always optional\n  ) => Promise<\n    RawGqlString extends keyof StorefrontQueries // Do we have any generated query types?\n      ? StorefrontQueries[RawGqlString]['return'] // Using codegen, return type is known\n      : OverrideReturnType // No codegen, let user specify return type\n  >;\n  /** The function to run a mutation on Storefront API. */\n  mutate: <OverrideReturnType = any, RawGqlString extends string = string>(\n    mutation: RawGqlString,\n    ...options: RawGqlString extends keyof StorefrontMutations // Do we have any generated mutation types?\n      ? IsOptionalVariables<StorefrontMutations[RawGqlString]> extends true\n        ? [StorefrontMutateSecondParam<RawGqlString>?] // Using codegen, mutation has no variables\n        : [StorefrontMutateSecondParam<RawGqlString>] // Using codegen, mutation needs variables\n      : [StorefrontMutateSecondParam?] // No codegen, variables always optional\n  ) => Promise<\n    RawGqlString extends keyof StorefrontMutations // Do we have any generated mutation types?\n      ? StorefrontMutations[RawGqlString]['return'] // Using codegen, return type is known\n      : OverrideReturnType // No codegen, let user specify return type\n  >;\n  /** The cache instance passed in from the `createStorefrontClient` argument. */\n  cache?: Cache;\n  /** Re-export of [`CacheNone`](/docs/api/hydrogen/2023-07/utilities/cachenone). */\n  CacheNone: typeof CacheNone;\n  /** Re-export of [`CacheLong`](/docs/api/hydrogen/2023-07/utilities/cachelong). */\n  CacheLong: typeof CacheLong;\n  /** Re-export of [`CacheShort`](/docs/api/hydrogen/2023-07/utilities/cacheshort). */\n  CacheShort: typeof CacheShort;\n  /** Re-export of [`CacheCustom`](/docs/api/hydrogen/2023-07/utilities/cachecustom). */\n  CacheCustom: typeof CacheCustom;\n  /** Re-export of [`generateCacheControlHeader`](/docs/api/hydrogen/2023-07/utilities/generatecachecontrolheader). */\n  generateCacheControlHeader: typeof generateCacheControlHeader;\n  /** Returns an object that contains headers that are needed for each query to Storefront API GraphQL endpoint. See [`getPublicTokenHeaders` in Hydrogen React](/docs/api/hydrogen-react/2023-07/utilities/createstorefrontclient#:~:text=%27graphql%27.-,getPublicTokenHeaders,-(props%3F%3A) for more details. */\n  getPublicTokenHeaders: ReturnType<\n    typeof createStorefrontUtilities\n  >['getPublicTokenHeaders'];\n  /** Returns an object that contains headers that are needed for each query to Storefront API GraphQL endpoint for API calls made from a server. See [`getPrivateTokenHeaders` in  Hydrogen React](/docs/api/hydrogen-react/2023-07/utilities/createstorefrontclient#:~:text=storefrontApiVersion-,getPrivateTokenHeaders,-(props%3F%3A) for more details.*/\n  getPrivateTokenHeaders: ReturnType<\n    typeof createStorefrontUtilities\n  >['getPrivateTokenHeaders'];\n  /** Creates the fully-qualified URL to your myshopify.com domain. See [`getShopifyDomain` in  Hydrogen React](/docs/api/hydrogen-react/2023-07/utilities/createstorefrontclient#:~:text=StorefrontClientReturn-,getShopifyDomain,-(props%3F%3A) for more details. */\n  getShopifyDomain: ReturnType<\n    typeof createStorefrontUtilities\n  >['getShopifyDomain'];\n  /** Creates the fully-qualified URL to your store's GraphQL endpoint. See [`getStorefrontApiUrl` in  Hydrogen React](/docs/api/hydrogen-react/2023-07/utilities/createstorefrontclient#:~:text=storeDomain-,getStorefrontApiUrl,-(props%3F%3A) for more details.*/\n  getApiUrl: ReturnType<\n    typeof createStorefrontUtilities\n  >['getStorefrontApiUrl'];\n  /** Determines if the error is resulted from a Storefront API call. */\n  isApiError: (error: any) => boolean;\n  /** The `i18n` object passed in from the `createStorefrontClient` argument. */\n  i18n: TI18n;\n}",
            description: 'Interface to interact with the Storefront API.',
            members: [
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'query',
                value:
                  '<OverrideReturnType = any, RawGqlString extends string = string>(query: RawGqlString, ...options: RawGqlString extends never ? IsOptionalVariables<StorefrontQueries[RawGqlString]> extends true ? [StorefrontQuerySecondParam<RawGqlString>?] : [StorefrontQuerySecondParam<RawGqlString>] : [StorefrontQuerySecondParam<string>?]) => Promise<RawGqlString extends never ? StorefrontQueries[RawGqlString]["return"] : OverrideReturnType>',
                description: 'The function to run a query on Storefront API.',
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'mutate',
                value:
                  '<OverrideReturnType = any, RawGqlString extends string = string>(mutation: RawGqlString, ...options: RawGqlString extends never ? IsOptionalVariables<StorefrontMutations[RawGqlString]> extends true ? [StorefrontMutateSecondParam<RawGqlString>?] : [StorefrontMutateSecondParam<RawGqlString>] : [StorefrontCommonOptions<{ readonly [variable: string]: unknown; }>?]) => Promise<RawGqlString extends never ? StorefrontMutations[RawGqlString]["return"] : OverrideReturnType>',
                description:
                  'The function to run a mutation on Storefront API.',
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'cache',
                value: 'Cache',
                description:
                  'The cache instance passed in from the `createStorefrontClient` argument.',
                isOptional: true,
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'CacheNone',
                value: '() => NoStoreStrategy',
                description:
                  'Re-export of [`CacheNone`](/docs/api/hydrogen/2023-07/utilities/cachenone).',
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'CacheLong',
                value: '(overrideOptions?: AllCacheOptions) => AllCacheOptions',
                description:
                  'Re-export of [`CacheLong`](/docs/api/hydrogen/2023-07/utilities/cachelong).',
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'CacheShort',
                value: '(overrideOptions?: AllCacheOptions) => AllCacheOptions',
                description:
                  'Re-export of [`CacheShort`](/docs/api/hydrogen/2023-07/utilities/cacheshort).',
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'CacheCustom',
                value: '(overrideOptions: AllCacheOptions) => AllCacheOptions',
                description:
                  'Re-export of [`CacheCustom`](/docs/api/hydrogen/2023-07/utilities/cachecustom).',
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'generateCacheControlHeader',
                value: '(cacheOptions: AllCacheOptions) => string',
                description:
                  'Re-export of [`generateCacheControlHeader`](/docs/api/hydrogen/2023-07/utilities/generatecachecontrolheader).',
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'getPublicTokenHeaders',
                value:
                  '(props?: Partial<Pick<StorefrontClientProps, "contentType">> & Pick<StorefrontClientProps, "publicStorefrontToken">) => Record<string, string>',
                description:
                  'Returns an object that contains headers that are needed for each query to Storefront API GraphQL endpoint. See [`getPublicTokenHeaders` in Hydrogen React](/docs/api/hydrogen-react/2023-07/utilities/createstorefrontclient#:~:text=%27graphql%27.-,getPublicTokenHeaders,-(props%3F%3A) for more details.',
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'getPrivateTokenHeaders',
                value:
                  '(props?: Partial<Pick<StorefrontClientProps, "contentType">> & Pick<StorefrontClientProps, "privateStorefrontToken"> & { buyerIp?: string; }) => Record<string, string>',
                description:
                  'Returns an object that contains headers that are needed for each query to Storefront API GraphQL endpoint for API calls made from a server. See [`getPrivateTokenHeaders` in  Hydrogen React](/docs/api/hydrogen-react/2023-07/utilities/createstorefrontclient#:~:text=storefrontApiVersion-,getPrivateTokenHeaders,-(props%3F%3A) for more details.',
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'getShopifyDomain',
                value:
                  '(props?: Partial<Pick<StorefrontClientProps, "storeDomain">>) => string',
                description:
                  'Creates the fully-qualified URL to your myshopify.com domain. See [`getShopifyDomain` in  Hydrogen React](/docs/api/hydrogen-react/2023-07/utilities/createstorefrontclient#:~:text=StorefrontClientReturn-,getShopifyDomain,-(props%3F%3A) for more details.',
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'getApiUrl',
                value:
                  '(props?: Partial<Pick<StorefrontClientProps, "storeDomain" | "storefrontApiVersion">>) => string',
                description:
                  "Creates the fully-qualified URL to your store's GraphQL endpoint. See [`getStorefrontApiUrl` in  Hydrogen React](/docs/api/hydrogen-react/2023-07/utilities/createstorefrontclient#:~:text=storeDomain-,getStorefrontApiUrl,-(props%3F%3A) for more details.",
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'isApiError',
                value: '(error: any) => boolean',
                description:
                  'Determines if the error is resulted from a Storefront API call.',
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'i18n',
                value: 'TI18n',
                description:
                  'The `i18n` object passed in from the `createStorefrontClient` argument.',
              },
            ],
          },
          IsOptionalVariables: {
            filePath: '/storefront.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'IsOptionalVariables',
            value:
              "Omit<\n  OperationTypeValue['variables'],\n  AutoAddedVariableNames\n> extends EmptyVariables\n  ? true // No need to pass variables\n  : GenericVariables extends OperationTypeValue['variables']\n  ? true // We don't know what variables are needed\n  : false",
            description: '',
          },
          AutoAddedVariableNames: {
            filePath: '/storefront.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'AutoAddedVariableNames',
            value: "'country' | 'language'",
            description: '',
          },
          EmptyVariables: {
            filePath: '/storefront.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'EmptyVariables',
            value: '{[key: string]: never}',
            description: '',
            members: [],
          },
          GenericVariables: {
            filePath: '/storefront.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'GenericVariables',
            value: "ExecutionArgs['variableValues']",
            description: '',
          },
          StorefrontQueries: {
            filePath: '/storefront.ts',
            name: 'StorefrontQueries',
            description:
              'Maps all the queries found in the project to variables and return types.',
            members: [],
            value:
              "export interface StorefrontQueries {\n  // Example of how a generated query type looks like:\n  // '#graphql query q1 {...}': {return: Q1Query; variables: Q1QueryVariables};\n}",
          },
          StorefrontQuerySecondParam: {
            filePath: '/storefront.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'StorefrontQuerySecondParam',
            value:
              "(RawGqlString extends keyof StorefrontQueries\n  ? StorefrontCommonOptions<StorefrontQueries[RawGqlString]['variables']>\n  : StorefrontCommonOptions<GenericVariables>) & {cache?: CachingStrategy}",
            description: '',
          },
          StorefrontCommonOptions: {
            filePath: '/storefront.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'StorefrontCommonOptions',
            value:
              '{\n  headers?: HeadersInit;\n  storefrontApiVersion?: string;\n} & (IsOptionalVariables<{variables: Variables}> extends true\n  ? {variables?: Variables}\n  : {variables: Variables})',
            description: '',
          },
          CachingStrategy: {
            filePath: '/cache/strategies.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'CachingStrategy',
            value: 'AllCacheOptions',
            description:
              'Use the `CachingStrategy` to define a custom caching mechanism for your data. Or use one of the pre-defined caching strategies: CacheNone, CacheShort, CacheLong.',
            members: [
              {
                filePath: '/cache/strategies.ts',
                syntaxKind: 'PropertySignature',
                name: 'mode',
                value: 'string',
                description:
                  'The caching mode, generally `public`, `private`, or `no-store`.',
                isOptional: true,
              },
              {
                filePath: '/cache/strategies.ts',
                syntaxKind: 'PropertySignature',
                name: 'maxAge',
                value: 'number',
                description:
                  'The maximum amount of time in seconds that a resource will be considered fresh. See `max-age` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#:~:text=Response%20Directives-,max%2Dage,-The%20max%2Dage).',
                isOptional: true,
              },
              {
                filePath: '/cache/strategies.ts',
                syntaxKind: 'PropertySignature',
                name: 'staleWhileRevalidate',
                value: 'number',
                description:
                  'Indicate that the cache should serve the stale response in the background while revalidating the cache. See `stale-while-revalidate` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#stale-while-revalidate).',
                isOptional: true,
              },
              {
                filePath: '/cache/strategies.ts',
                syntaxKind: 'PropertySignature',
                name: 'sMaxAge',
                value: 'number',
                description:
                  'Similar to `maxAge` but specific to shared caches. See `s-maxage` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#s-maxage).',
                isOptional: true,
              },
              {
                filePath: '/cache/strategies.ts',
                syntaxKind: 'PropertySignature',
                name: 'staleIfError',
                value: 'number',
                description:
                  'Indicate that the cache should serve the stale response if an error occurs while revalidating the cache. See `stale-if-error` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#stale-if-error).',
                isOptional: true,
              },
            ],
          },
          StorefrontMutations: {
            filePath: '/storefront.ts',
            name: 'StorefrontMutations',
            description:
              'Maps all the mutations found in the project to variables and return types.',
            members: [],
            value:
              "export interface StorefrontMutations {\n  // Example of how a generated mutation type looks like:\n  // '#graphql mutation m1 {...}': {return: M1Mutation; variables: M1MutationVariables};\n}",
          },
          StorefrontMutateSecondParam: {
            filePath: '/storefront.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'StorefrontMutateSecondParam',
            value:
              "RawGqlString extends keyof StorefrontMutations\n  ? StorefrontCommonOptions<StorefrontMutations[RawGqlString]['variables']>\n  : StorefrontCommonOptions<GenericVariables>",
            description: '',
          },
          NoStoreStrategy: {
            filePath: '/cache/strategies.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'NoStoreStrategy',
            value: '{\n  mode: string;\n}',
            description: '',
            members: [
              {
                filePath: '/cache/strategies.ts',
                syntaxKind: 'PropertySignature',
                name: 'mode',
                value: 'string',
                description: '',
              },
            ],
          },
          AllCacheOptions: {
            filePath: '/cache/strategies.ts',
            name: 'AllCacheOptions',
            description: 'Override options for a cache strategy.',
            members: [
              {
                filePath: '/cache/strategies.ts',
                syntaxKind: 'PropertySignature',
                name: 'mode',
                value: 'string',
                description:
                  'The caching mode, generally `public`, `private`, or `no-store`.',
                isOptional: true,
              },
              {
                filePath: '/cache/strategies.ts',
                syntaxKind: 'PropertySignature',
                name: 'maxAge',
                value: 'number',
                description:
                  'The maximum amount of time in seconds that a resource will be considered fresh. See `max-age` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#:~:text=Response%20Directives-,max%2Dage,-The%20max%2Dage).',
                isOptional: true,
              },
              {
                filePath: '/cache/strategies.ts',
                syntaxKind: 'PropertySignature',
                name: 'staleWhileRevalidate',
                value: 'number',
                description:
                  'Indicate that the cache should serve the stale response in the background while revalidating the cache. See `stale-while-revalidate` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#stale-while-revalidate).',
                isOptional: true,
              },
              {
                filePath: '/cache/strategies.ts',
                syntaxKind: 'PropertySignature',
                name: 'sMaxAge',
                value: 'number',
                description:
                  'Similar to `maxAge` but specific to shared caches. See `s-maxage` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#s-maxage).',
                isOptional: true,
              },
              {
                filePath: '/cache/strategies.ts',
                syntaxKind: 'PropertySignature',
                name: 'staleIfError',
                value: 'number',
                description:
                  'Indicate that the cache should serve the stale response if an error occurs while revalidating the cache. See `stale-if-error` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#stale-if-error).',
                isOptional: true,
              },
            ],
            value:
              'export interface AllCacheOptions {\n  /**\n   * The caching mode, generally `public`, `private`, or `no-store`.\n   */\n  mode?: string;\n  /**\n   * The maximum amount of time in seconds that a resource will be considered fresh. See `max-age` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#:~:text=Response%20Directives-,max%2Dage,-The%20max%2Dage).\n   */\n  maxAge?: number;\n  /**\n   * Indicate that the cache should serve the stale response in the background while revalidating the cache. See `stale-while-revalidate` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#stale-while-revalidate).\n   */\n  staleWhileRevalidate?: number;\n  /**\n   * Similar to `maxAge` but specific to shared caches. See `s-maxage` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#s-maxage).\n   */\n  sMaxAge?: number;\n  /**\n   * Indicate that the cache should serve the stale response if an error occurs while revalidating the cache. See `stale-if-error` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#stale-if-error).\n   */\n  staleIfError?: number;\n}',
          },
          I18nBase: {
            filePath: '/storefront.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'I18nBase',
            value: '{\n  language: LanguageCode;\n  country: CountryCode;\n}',
            description: '',
            members: [
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'language',
                value: 'LanguageCode',
                description: '',
              },
              {
                filePath: '/storefront.ts',
                syntaxKind: 'PropertySignature',
                name: 'country',
                value: 'CountryCode',
                description: '',
              },
            ],
          },
        },
      },
    ],
  },
  {
    name: 'Seo',
    category: 'components',
    isVisualComponent: false,
    related: [],
    description:
      'The `<Seo />` component renders SEO meta tags in the document `head`. Add the `<Seo />` to your `root.jsx` before the `<Meta />` and `<Link />` components. SEO metadata is set on a per-route basis using Remix [loader functions](https://remix.run/docs/en/v1/guides/data-loading). Learn more about [how SEO works in Hydrogen](https://shopify.dev/docs/custom-storefronts/hydrogen/seo).',
    type: 'component',
    defaultExample: {
      description: 'I am the default example',
      codeblock: {
        tabs: [
          {
            title: 'JavaScript',
            code: 'import {Seo} from \'@shopify/hydrogen\';\nimport {\n  Links,\n  Meta,\n  Outlet,\n  Scripts,\n  ScrollRestoration,\n} from \'@remix-run/react\';\n\nexport default function App() {\n  /** ... */\n  return (\n    &lt;html&gt;\n      &lt;head&gt;\n        &lt;meta charSet="utf-8" /&gt;\n        &lt;meta name="viewport" content="width=device-width,initial-scale=1" /&gt;\n        {/* Add &lt;Seo /&gt; before &lt;Meta /&gt; and &lt;Link /&gt; */}\n        &lt;Seo /&gt;\n        &lt;Meta /&gt;\n        &lt;Links /&gt;\n      &lt;/head&gt;\n      &lt;body&gt;\n        &lt;Outlet /&gt;\n        &lt;ScrollRestoration /&gt;\n        &lt;Scripts /&gt;\n      &lt;/body&gt;\n    &lt;/html&gt;\n  );\n}\n',
            language: 'js',
          },
          {
            title: 'TypeScript',
            code: 'import {Seo} from \'@shopify/hydrogen\';\nimport {\n  Links,\n  Meta,\n  Outlet,\n  Scripts,\n  ScrollRestoration,\n} from \'@remix-run/react\';\n\nexport default function App() {\n  /** ... */\n  return (\n    &lt;html&gt;\n      &lt;head&gt;\n        &lt;meta charSet="utf-8" /&gt;\n        &lt;meta name="viewport" content="width=device-width,initial-scale=1" /&gt;\n        {/* Add &lt;Seo /&gt; before &lt;Meta /&gt; and &lt;Link /&gt; */}\n        &lt;Seo /&gt;\n        &lt;Meta /&gt;\n        &lt;Links /&gt;\n      &lt;/head&gt;\n      &lt;body&gt;\n        &lt;Outlet /&gt;\n        &lt;ScrollRestoration /&gt;\n        &lt;Scripts /&gt;\n      &lt;/body&gt;\n    &lt;/html&gt;\n  );\n}\n',
            language: 'ts',
          },
        ],
        title: 'Example code',
      },
    },
    definitions: [
      {
        title: 'Props',
        description: '',
        type: 'SeoProps',
        typeDefinitions: {
          SeoProps: {
            filePath: '/seo/seo.ts',
            name: 'SeoProps',
            description: '',
            members: [
              {
                filePath: '/seo/seo.ts',
                syntaxKind: 'PropertySignature',
                name: 'debug',
                value: 'boolean',
                description:
                  'Enable debug mode that prints SEO properties for route in the console',
                isOptional: true,
              },
            ],
            value:
              'interface SeoProps {\n  /** Enable debug mode that prints SEO properties for route in the console */\n  debug?: boolean;\n}',
          },
        },
      },
    ],
  },
  {
    name: 'createWithCache',
    category: 'utilities',
    isVisualComponent: false,
    related: [],
    description:
      'Creates a utility function that executes an asynchronous operation \n like `fetch` and caches the result according to the strategy provided.\nUse this to call any third-party APIs from loaders or actions.\nBy default, it uses the `CacheShort` strategy.',
    type: 'utility',
    defaultExample: {
      description: 'I am the default example',
      codeblock: {
        tabs: [
          {
            title: 'JavaScript',
            code: "// In your app's `server.ts` file:\nimport * as remixBuild from '@remix-run/dev/server-build';\nimport {createWithCache, CacheLong} from '@shopify/hydrogen';\n// Use another `createRequestHandler` if deploying off oxygen\nimport {createRequestHandler} from '@shopify/remix-oxygen';\n\nexport default {\n  async fetch(request, env, executionContext) {\n    const cache = await caches.open('my-cms');\n    const withCache = createWithCache({\n      cache,\n      waitUntil: executionContext.waitUntil,\n    });\n\n    // Create a custom utility to query a third-party API:\n    const fetchMyCMS = (query) =&gt; {\n      // Prefix the cache key and make it unique based on arguments.\n      return withCache(['my-cms', query], CacheLong(), async () =&gt; {\n        return await (\n          await fetch('my-cms.com/api', {\n            method: 'POST',\n            body: query,\n          })\n        ).json();\n      });\n    };\n\n    const handleRequest = createRequestHandler({\n      build: remixBuild,\n      mode: process.env.NODE_ENV,\n      getLoadContext: () =&gt; ({\n        /* ... */\n        fetchMyCMS,\n      }),\n    });\n\n    return handleRequest(request);\n  },\n};\n",
            language: 'js',
          },
          {
            title: 'TypeScript',
            code: "// In your app's `server.ts` file:\nimport * as remixBuild from '@remix-run/dev/server-build';\nimport {createWithCache, CacheLong} from '@shopify/hydrogen';\n// Use another `createRequestHandler` if deploying off oxygen\nimport {createRequestHandler} from '@shopify/remix-oxygen';\n\nexport default {\n  async fetch(\n    request: Request,\n    env: Record&lt;string, string&gt;,\n    executionContext: ExecutionContext,\n  ) {\n    const cache = await caches.open('my-cms');\n    const withCache = createWithCache({\n      cache,\n      waitUntil: executionContext.waitUntil,\n    });\n\n    // Create a custom utility to query a third-party API:\n    const fetchMyCMS = (query: string) =&gt; {\n      // Prefix the cache key and make it unique based on arguments.\n      return withCache(['my-cms', query], CacheLong(), async () =&gt; {\n        return await (\n          await fetch('my-cms.com/api', {\n            method: 'POST',\n            body: query,\n          })\n        ).json();\n      });\n    };\n\n    const handleRequest = createRequestHandler({\n      build: remixBuild,\n      mode: process.env.NODE_ENV,\n      getLoadContext: () =&gt; ({\n        // Make sure to update remix.env.d.ts to include `fetchMyCMS`\n        fetchMyCMS,\n      }),\n    });\n\n    return handleRequest(request);\n  },\n};\n",
            language: 'ts',
          },
        ],
        title: 'Example code',
      },
    },
    definitions: [
      {
        title: 'Arguments',
        description: '',
        type: 'CreateWithCacheGeneratedType',
        typeDefinitions: {
          CreateWithCacheGeneratedType: {
            filePath: '/with-cache.ts',
            name: 'CreateWithCacheGeneratedType',
            description:
              'Creates a utility function that executes an asynchronous operation like `fetch` and caches the result according to the strategy provided. Use this to call any third-party APIs from loaders or actions. By default, it uses the `CacheShort` strategy.',
            params: [
              {
                name: 'options',
                description: '',
                value: 'CreateWithCacheOptions',
                filePath: '/with-cache.ts',
              },
            ],
            returns: {
              filePath: '/with-cache.ts',
              description: '',
              name: 'CreateWithCacheReturn<T = unknown>',
              value: 'CreateWithCacheReturn<T = unknown>',
            },
            value:
              'export function createWithCache<T = unknown>(\n  options: CreateWithCacheOptions,\n): CreateWithCacheReturn<T> {\n  const {cache, waitUntil} = options;\n  return function withCache<T = unknown>(\n    cacheKey: CacheKey,\n    strategy: CachingStrategy,\n    actionFn: () => T | Promise<T>,\n  ) {\n    return runWithCache<T>(cacheKey, actionFn, {\n      strategy,\n      cacheInstance: cache,\n      waitUntil,\n      debugInfo: {\n        stackLine: getCallerStackLine?.(),\n      },\n    });\n  };\n}',
          },
          CreateWithCacheOptions: {
            filePath: '/with-cache.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'CreateWithCacheOptions',
            value:
              "{\n  /** An instance that implements the [Cache API](https://developer.mozilla.org/en-US/docs/Web/API/Cache) */\n  cache: Cache;\n  /** The `waitUntil` function is used to keep the current request/response lifecycle alive even after a response has been sent. It should be provided by your platform. */\n  waitUntil: ExecutionContext['waitUntil'];\n}",
            description: '',
            members: [
              {
                filePath: '/with-cache.ts',
                syntaxKind: 'PropertySignature',
                name: 'cache',
                value: 'Cache',
                description:
                  'An instance that implements the [Cache API](https://developer.mozilla.org/en-US/docs/Web/API/Cache)',
              },
              {
                filePath: '/with-cache.ts',
                syntaxKind: 'PropertySignature',
                name: 'waitUntil',
                value: 'ExecutionContext',
                description:
                  'The `waitUntil` function is used to keep the current request/response lifecycle alive even after a response has been sent. It should be provided by your platform.',
              },
            ],
          },
          CreateWithCacheReturn: {
            filePath: '/with-cache.ts',
            name: 'CreateWithCacheReturn',
            description:
              'This is a caching async function. Whatever data is returned from the `actionFn` will be cached according to the strategy provided.\n\nUse the `CachingStrategy` to define a custom caching mechanism for your data. Or use one of the built-in caching strategies: `CacheNone`, `CacheShort`, `CacheLong`.',
            params: [
              {
                name: 'cacheKey',
                description: '',
                value: 'CacheKey',
                filePath: '/with-cache.ts',
              },
              {
                name: 'strategy',
                description: '',
                value: 'AllCacheOptions',
                filePath: '/with-cache.ts',
              },
              {
                name: 'actionFn',
                description: '',
                value: '() => U | Promise<U>',
                filePath: '/with-cache.ts',
              },
            ],
            returns: {
              filePath: '/with-cache.ts',
              description: '',
              name: 'interface Promise<T> {\r\n    /**\r\n     * Attaches callbacks for the resolution and/or rejection of the Promise.\r\n     * @param onfulfilled The callback to execute when the Promise is resolved.\r\n     * @param onrejected The callback to execute when the Promise is rejected.\r\n     * @returns A Promise for the completion of which ever callback is executed.\r\n     */\r\n    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): Promise<TResult1 | TResult2>;\r\n\r\n    /**\r\n     * Attaches a callback for only the rejection of the Promise.\r\n     * @param onrejected The callback to execute when the Promise is rejected.\r\n     * @returns A Promise for the completion of the callback.\r\n     */\r\n    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): Promise<T | TResult>;\r\n}, interface Promise<T> { }, Promise: PromiseConstructor, interface Promise<T> {\r\n    readonly [Symbol.toStringTag]: string;\r\n}, interface Promise<T> {\r\n    /**\r\n     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The\r\n     * resolved value cannot be modified from the callback.\r\n     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).\r\n     * @returns A Promise for the completion of the callback.\r\n     */\r\n    finally(onfinally?: (() => void) | undefined | null): Promise<T>\r\n}',
              value:
                'interface Promise<T> {\r\n    /**\r\n     * Attaches callbacks for the resolution and/or rejection of the Promise.\r\n     * @param onfulfilled The callback to execute when the Promise is resolved.\r\n     * @param onrejected The callback to execute when the Promise is rejected.\r\n     * @returns A Promise for the completion of which ever callback is executed.\r\n     */\r\n    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): Promise<TResult1 | TResult2>;\r\n\r\n    /**\r\n     * Attaches a callback for only the rejection of the Promise.\r\n     * @param onrejected The callback to execute when the Promise is rejected.\r\n     * @returns A Promise for the completion of the callback.\r\n     */\r\n    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): Promise<T | TResult>;\r\n}, interface Promise<T> { }, Promise: PromiseConstructor, interface Promise<T> {\r\n    readonly [Symbol.toStringTag]: string;\r\n}, interface Promise<T> {\r\n    /**\r\n     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The\r\n     * resolved value cannot be modified from the callback.\r\n     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).\r\n     * @returns A Promise for the completion of the callback.\r\n     */\r\n    finally(onfinally?: (() => void) | undefined | null): Promise<T>\r\n}',
            },
            value:
              'type CreateWithCacheReturn<T> = <U = T>(\n  cacheKey: CacheKey,\n  strategy: CachingStrategy,\n  actionFn: () => U | Promise<U>,\n) => Promise<U>;',
          },
          CacheKey: {
            filePath: '/cache/fetch.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'CacheKey',
            value: 'string | readonly unknown[]',
            description:
              'The cache key is used to uniquely identify a value in the cache.',
          },
          AllCacheOptions: {
            filePath: '/cache/strategies.ts',
            name: 'AllCacheOptions',
            description: 'Override options for a cache strategy.',
            members: [
              {
                filePath: '/cache/strategies.ts',
                syntaxKind: 'PropertySignature',
                name: 'mode',
                value: 'string',
                description:
                  'The caching mode, generally `public`, `private`, or `no-store`.',
                isOptional: true,
              },
              {
                filePath: '/cache/strategies.ts',
                syntaxKind: 'PropertySignature',
                name: 'maxAge',
                value: 'number',
                description:
                  'The maximum amount of time in seconds that a resource will be considered fresh. See `max-age` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#:~:text=Response%20Directives-,max%2Dage,-The%20max%2Dage).',
                isOptional: true,
              },
              {
                filePath: '/cache/strategies.ts',
                syntaxKind: 'PropertySignature',
                name: 'staleWhileRevalidate',
                value: 'number',
                description:
                  'Indicate that the cache should serve the stale response in the background while revalidating the cache. See `stale-while-revalidate` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#stale-while-revalidate).',
                isOptional: true,
              },
              {
                filePath: '/cache/strategies.ts',
                syntaxKind: 'PropertySignature',
                name: 'sMaxAge',
                value: 'number',
                description:
                  'Similar to `maxAge` but specific to shared caches. See `s-maxage` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#s-maxage).',
                isOptional: true,
              },
              {
                filePath: '/cache/strategies.ts',
                syntaxKind: 'PropertySignature',
                name: 'staleIfError',
                value: 'number',
                description:
                  'Indicate that the cache should serve the stale response if an error occurs while revalidating the cache. See `stale-if-error` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#stale-if-error).',
                isOptional: true,
              },
            ],
            value:
              'export interface AllCacheOptions {\n  /**\n   * The caching mode, generally `public`, `private`, or `no-store`.\n   */\n  mode?: string;\n  /**\n   * The maximum amount of time in seconds that a resource will be considered fresh. See `max-age` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#:~:text=Response%20Directives-,max%2Dage,-The%20max%2Dage).\n   */\n  maxAge?: number;\n  /**\n   * Indicate that the cache should serve the stale response in the background while revalidating the cache. See `stale-while-revalidate` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#stale-while-revalidate).\n   */\n  staleWhileRevalidate?: number;\n  /**\n   * Similar to `maxAge` but specific to shared caches. See `s-maxage` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#s-maxage).\n   */\n  sMaxAge?: number;\n  /**\n   * Indicate that the cache should serve the stale response if an error occurs while revalidating the cache. See `stale-if-error` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#stale-if-error).\n   */\n  staleIfError?: number;\n}',
          },
        },
      },
    ],
  },
  {
    name: 'Image',
    category: 'components',
    isVisualComponent: false,
    related: [
      {
        name: 'MediaFile',
        type: 'component',
        url: '/api/hydrogen/components/mediafile',
      },
    ],
    description:
      "The `Image` component renders an image for the Storefront API's\n[Image object](https://shopify.dev/api/storefront/reference/common-objects/image) by using the `data` prop. You can [customize this component](https://shopify.dev/api/hydrogen/components#customizing-hydrogen-components) using passthrough props.\n\nImages default to being responsive automatically (`width: 100%, height: auto`), and expect an `aspectRatio` prop, which ensures your image doesn't create any layout shift. For fixed-size images, you can set `width` to an exact value, and a `srcSet` with 1x, 2x, and 3x DPI variants will automatically be generated for you.",
    type: 'component',
    defaultExample: {
      description: 'I am the default example',
      codeblock: {
        tabs: [
          {
            title: 'JavaScript',
            code: 'import {Image} from \'@shopify/hydrogen\';\n\n// An example query\nconst IMAGE_QUERY = `#graphql\n  query {\n    product {\n      featuredImage {\n        altText\n        url\n        height\n        width\n      }\n    }\n  }\n`;\n\nexport default function ProductImage({product}) {\n  if (!product.featuredImage) {\n    return null;\n  }\n\n  return (\n    &lt;Image\n      data={product.featuredImage}\n      sizes="(min-width: 45em) 50vw, 100vw"\n      aspectRatio="4/5"\n    /&gt;\n  );\n}\n',
            language: 'jsx',
          },
          {
            title: 'TypeScript',
            code: "import React from 'react';\nimport {Image} from '@shopify/hydrogen';\nimport type {Product} from '@shopify/hydrogen/storefront-api-types';\n\n// An example query\nconst IMAGE_QUERY = `#graphql\n  query {\n    product {\n      featuredImage {\n        altText\n        url\n        height\n        width\n      }\n    }\n  }\n`;\n\nexport default function ProductImage({product}: {product: Product}) {\n  if (!product.featuredImage) {\n    return null;\n  }\n\n  return (\n    &lt;Image\n      data={product.featuredImage}\n      sizes=\"(min-width: 45em) 50vw, 100vw\"\n      aspectRatio=\"4/5\"\n    /&gt;\n  );\n}\n",
            language: 'tsx',
          },
        ],
        title: 'Example code',
      },
    },
    definitions: [
      {
        title: 'Props',
        description: '',
        type: 'HydrogenImageBaseProps',
        typeDefinitions: {
          HydrogenImageBaseProps: {
            filePath: '/Image.tsx',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'HydrogenImageBaseProps',
            value:
              "{\n  /** The aspect ratio of the image, in the format of `width/height`.\n   *\n   * @example\n   * ```\n   * <Image data={productImage} aspectRatio=\"4/5\" />\n   * ```\n   */\n  aspectRatio?: string;\n  /** The crop position of the image.\n   *\n   * @remarks\n   * In the event that AspectRatio is set, without specifying a crop,\n   * the Shopify CDN won't return the expected image.\n   *\n   * @defaultValue `center`\n   */\n  crop?: Crop;\n  /** Data mapping to the [Storefront API `Image`](https://shopify.dev/docs/api/storefront/2023-07/objects/Image) object. Must be an Image object.\n   *\n   * @example\n   * ```\n   * import {IMAGE_FRAGMENT, Image} from '@shopify/hydrogen';\n   *\n   * export const IMAGE_QUERY = `#graphql\n   * ${IMAGE_FRAGMENT}\n   * query {\n   *   product {\n   *     featuredImage {\n   *       ...Image\n   *     }\n   *   }\n   * }`\n   *\n   * <Image\n   *   data={productImage}\n   *   sizes=\"(min-width: 45em) 50vw, 100vw\"\n   *   aspectRatio=\"4/5\"\n   * />\n   * ```\n   *\n   * Image: {@link https://shopify.dev/api/storefront/reference/common-objects/image}\n   */\n  data?: PartialDeep<ImageType, {recurseIntoArrays: true}>;\n  /** A function that returns a URL string for an image.\n   *\n   * @remarks\n   * By default, this uses Shopify’s CDN {@link https://cdn.shopify.com/} but you can provide\n   * your own function to use a another provider, as long as they support URL based image transformations.\n   */\n  loader?: Loader;\n  /** An optional prop you can use to change the default srcSet generation behaviour */\n  srcSetOptions?: SrcSetOptions;\n  /** @deprecated Use `crop`, `width`, `height`, and `src` props, and/or `data` prop */\n  loaderOptions?: ShopifyLoaderOptions;\n  /** @deprecated Autocalculated, use only `width` prop, or srcSetOptions */\n  widths?: (HtmlImageProps['width'] | ImageType['width'])[];\n}",
            description: '',
            members: [
              {
                filePath: '/Image.tsx',
                syntaxKind: 'PropertySignature',
                name: 'aspectRatio',
                value: 'string',
                description:
                  'The aspect ratio of the image, in the format of `width/height`.',
                isOptional: true,
                examples: [
                  {
                    title: 'Example',
                    description: '',
                    tabs: [
                      {
                        code: '<Image data={productImage} aspectRatio="4/5" />',
                        title: 'Example',
                      },
                    ],
                  },
                ],
              },
              {
                filePath: '/Image.tsx',
                syntaxKind: 'PropertySignature',
                name: 'crop',
                value: 'Crop',
                description: 'The crop position of the image.',
                isOptional: true,
                defaultValue: '`center`',
              },
              {
                filePath: '/Image.tsx',
                syntaxKind: 'PropertySignature',
                name: 'data',
                value: 'PartialDeep<ImageType, {recurseIntoArrays: true}>',
                description:
                  'Data mapping to the [Storefront API `Image`](https://shopify.dev/docs/api/storefront/2023-07/objects/Image) object. Must be an Image object.',
                isOptional: true,
                examples: [
                  {
                    title: 'Example',
                    description: '',
                    tabs: [
                      {
                        code: 'import {IMAGE_FRAGMENT, Image} from \'@shopify/hydrogen\';\n\nexport const IMAGE_QUERY = `#graphql\n${IMAGE_FRAGMENT}\nquery {\n  product {\n    featuredImage {\n      ...Image\n    }\n  }\n}`\n\n<Image\n  data={productImage}\n  sizes="(min-width: 45em) 50vw, 100vw"\n  aspectRatio="4/5"\n/>',
                        title: 'Example',
                      },
                      {
                        code: 'Image:',
                        title: 'Example',
                      },
                    ],
                  },
                ],
              },
              {
                filePath: '/Image.tsx',
                syntaxKind: 'PropertySignature',
                name: 'loader',
                value: 'Loader',
                description:
                  'A function that returns a URL string for an image.',
                isOptional: true,
              },
              {
                filePath: '/Image.tsx',
                syntaxKind: 'PropertySignature',
                name: 'srcSetOptions',
                value: 'SrcSetOptions',
                description:
                  'An optional prop you can use to change the default srcSet generation behaviour',
                isOptional: true,
              },
              {
                filePath: '/Image.tsx',
                syntaxKind: 'PropertySignature',
                name: 'loaderOptions',
                value: 'ShopifyLoaderOptions',
                description: '',
                isOptional: true,
                deprecationMessage:
                  'Use `crop`, `width`, `height`, and `src` props, and/or `data` prop',
              },
              {
                filePath: '/Image.tsx',
                syntaxKind: 'PropertySignature',
                name: 'widths',
                value: '(string | number)[]',
                description: '',
                isOptional: true,
                deprecationMessage:
                  'Autocalculated, use only `width` prop, or srcSetOptions',
              },
            ],
          },
          Crop: {
            filePath: '/Image.tsx',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'Crop',
            value: "'center' | 'top' | 'bottom' | 'left' | 'right'",
            description: '',
          },
          Loader: {
            filePath: '/Image.tsx',
            name: 'Loader',
            description: '',
            params: [
              {
                name: 'params',
                description: '',
                value: 'LoaderParams',
                filePath: '/Image.tsx',
              },
            ],
            returns: {
              filePath: '/Image.tsx',
              description: '',
              name: 'string',
              value: 'string',
            },
            value: 'export type Loader = (params: LoaderParams) => string;',
          },
          LoaderParams: {
            filePath: '/Image.tsx',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'LoaderParams',
            value:
              "{\n  /** The base URL of the image */\n  src?: ImageType['url'];\n  /** The URL param that controls width */\n  width?: number;\n  /** The URL param that controls height */\n  height?: number;\n  /** The URL param that controls the cropping region */\n  crop?: Crop;\n}",
            description: '',
            members: [
              {
                filePath: '/Image.tsx',
                syntaxKind: 'PropertySignature',
                name: 'src',
                value: 'string',
                description: 'The base URL of the image',
                isOptional: true,
              },
              {
                filePath: '/Image.tsx',
                syntaxKind: 'PropertySignature',
                name: 'width',
                value: 'number',
                description: 'The URL param that controls width',
                isOptional: true,
              },
              {
                filePath: '/Image.tsx',
                syntaxKind: 'PropertySignature',
                name: 'height',
                value: 'number',
                description: 'The URL param that controls height',
                isOptional: true,
              },
              {
                filePath: '/Image.tsx',
                syntaxKind: 'PropertySignature',
                name: 'crop',
                value: 'Crop',
                description: 'The URL param that controls the cropping region',
                isOptional: true,
              },
            ],
          },
          SrcSetOptions: {
            filePath: '/Image.tsx',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'SrcSetOptions',
            value:
              '{\n  /** The number of sizes to generate */\n  intervals: number;\n  /** The smallest image size */\n  startingWidth: number;\n  /** The increment by which to increase for each size, in pixels */\n  incrementSize: number;\n  /** The size used for placeholder fallback images */\n  placeholderWidth: number;\n}',
            description: '',
            members: [
              {
                filePath: '/Image.tsx',
                syntaxKind: 'PropertySignature',
                name: 'intervals',
                value: 'number',
                description: 'The number of sizes to generate',
              },
              {
                filePath: '/Image.tsx',
                syntaxKind: 'PropertySignature',
                name: 'startingWidth',
                value: 'number',
                description: 'The smallest image size',
              },
              {
                filePath: '/Image.tsx',
                syntaxKind: 'PropertySignature',
                name: 'incrementSize',
                value: 'number',
                description:
                  'The increment by which to increase for each size, in pixels',
              },
              {
                filePath: '/Image.tsx',
                syntaxKind: 'PropertySignature',
                name: 'placeholderWidth',
                value: 'number',
                description: 'The size used for placeholder fallback images',
              },
            ],
          },
          ShopifyLoaderOptions: {
            filePath: '/Image.tsx',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'ShopifyLoaderOptions',
            value:
              "{\n  /** The base URL of the image */\n  src?: ImageType['url'];\n  /** The URL param that controls width */\n  width?: HtmlImageProps['width'] | ImageType['width'];\n  /** The URL param that controls height */\n  height?: HtmlImageProps['height'] | ImageType['height'];\n  /** The URL param that controls the cropping region */\n  crop?: Crop;\n}",
            description: 'Legacy type for backwards compatibility *',
            members: [
              {
                filePath: '/Image.tsx',
                syntaxKind: 'PropertySignature',
                name: 'src',
                value: 'string',
                description: 'The base URL of the image',
                isOptional: true,
              },
              {
                filePath: '/Image.tsx',
                syntaxKind: 'PropertySignature',
                name: 'width',
                value: 'string | number',
                description: 'The URL param that controls width',
                isOptional: true,
              },
              {
                filePath: '/Image.tsx',
                syntaxKind: 'PropertySignature',
                name: 'height',
                value: 'string | number',
                description: 'The URL param that controls height',
                isOptional: true,
              },
              {
                filePath: '/Image.tsx',
                syntaxKind: 'PropertySignature',
                name: 'crop',
                value: 'Crop',
                description: 'The URL param that controls the cropping region',
                isOptional: true,
              },
            ],
          },
        },
      },
    ],
  },
  {
    name: 'ExternalVideo',
    category: 'components',
    isVisualComponent: false,
    related: [
      {
        name: 'MediaFile',
        type: 'component',
        url: '/api/hydrogen/components/mediafile',
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
            code: "import {ExternalVideo} from '@shopify/hydrogen';\n\nexport default function MyProductVideo({products}) {\n  const firstMediaElement = products.nodes[0].media.nodes[0];\n\n  if (firstMediaElement.__typename === 'ExternalVideo') {\n    return &lt;ExternalVideo data={firstMediaElement} /&gt;;\n  }\n}\n",
            language: 'jsx',
          },
          {
            title: 'TypeScript',
            code: "import {ExternalVideo} from '@shopify/hydrogen';\nimport type {ProductConnection} from '@shopify/hydrogen/storefront-api-types';\n\nexport default function MyProductVideo({\n  products,\n}: {\n  products: ProductConnection;\n}) {\n  const firstMediaElement = products.nodes[0].media.nodes[0];\n  if (firstMediaElement.__typename === 'ExternalVideo') {\n    return &lt;ExternalVideo data={firstMediaElement} /&gt;;\n  }\n}\n",
            language: 'tsx',
          },
        ],
        title: 'ExternalVideo example',
      },
    },
    definitions: [
      {
        title: 'Props',
        description:
          'Takes in the same props as a native `<iframe>` element, except for `src`.',
        type: 'ExternalVideoBaseProps',
        typeDefinitions: {
          ExternalVideoBaseProps: {
            filePath: '/ExternalVideo.tsx',
            name: 'ExternalVideoBaseProps',
            description: '',
            members: [
              {
                filePath: '/ExternalVideo.tsx',
                syntaxKind: 'PropertySignature',
                name: 'data',
                value:
                  'PartialDeep<ExternalVideoType, {recurseIntoArrays: true}>',
                description:
                  "An object with fields that correspond to the Storefront API's [ExternalVideo object](https://shopify.dev/api/storefront/reference/products/externalvideo).",
              },
              {
                filePath: '/ExternalVideo.tsx',
                syntaxKind: 'PropertySignature',
                name: 'options',
                value: 'YouTube | Vimeo',
                description:
                  'An object containing the options available for either [YouTube](https://developers.google.com/youtube/player_parameters#Parameters) or [Vimeo](https://vimeo.zendesk.com/hc/en-us/articles/360001494447-Using-Player-Parameters).',
                isOptional: true,
              },
            ],
            value:
              "interface ExternalVideoBaseProps {\n  /**\n   * An object with fields that correspond to the Storefront API's [ExternalVideo object](https://shopify.dev/api/storefront/reference/products/externalvideo).\n   */\n  data: PartialDeep<ExternalVideoType, {recurseIntoArrays: true}>;\n  /** An object containing the options available for either\n   * [YouTube](https://developers.google.com/youtube/player_parameters#Parameters) or\n   * [Vimeo](https://vimeo.zendesk.com/hc/en-us/articles/360001494447-Using-Player-Parameters).\n   */\n  options?: YouTube | Vimeo;\n}",
          },
          YouTube: {
            filePath: '/ExternalVideo.tsx',
            name: 'YouTube',
            description: '',
            members: [
              {
                filePath: '/ExternalVideo.tsx',
                syntaxKind: 'PropertySignature',
                name: 'autoplay',
                value: '0 | 1',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/ExternalVideo.tsx',
                syntaxKind: 'PropertySignature',
                name: 'cc_lang_pref',
                value: 'string',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/ExternalVideo.tsx',
                syntaxKind: 'PropertySignature',
                name: 'cc_load_policy',
                value: '1',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/ExternalVideo.tsx',
                syntaxKind: 'PropertySignature',
                name: 'color',
                value: '"red" | "white"',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/ExternalVideo.tsx',
                syntaxKind: 'PropertySignature',
                name: 'controls',
                value: '0 | 1',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/ExternalVideo.tsx',
                syntaxKind: 'PropertySignature',
                name: 'disablekb',
                value: '0 | 1',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/ExternalVideo.tsx',
                syntaxKind: 'PropertySignature',
                name: 'enablejsapi',
                value: '0 | 1',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/ExternalVideo.tsx',
                syntaxKind: 'PropertySignature',
                name: 'end',
                value: 'number',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/ExternalVideo.tsx',
                syntaxKind: 'PropertySignature',
                name: 'fs',
                value: '0 | 1',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/ExternalVideo.tsx',
                syntaxKind: 'PropertySignature',
                name: 'hl',
                value: 'string',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/ExternalVideo.tsx',
                syntaxKind: 'PropertySignature',
                name: 'iv_load_policy',
                value: '1 | 3',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/ExternalVideo.tsx',
                syntaxKind: 'PropertySignature',
                name: 'list',
                value: 'string',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/ExternalVideo.tsx',
                syntaxKind: 'PropertySignature',
                name: 'list_type',
                value: '"playlist" | "user_uploads"',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/ExternalVideo.tsx',
                syntaxKind: 'PropertySignature',
                name: 'loop',
                value: '0 | 1',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/ExternalVideo.tsx',
                syntaxKind: 'PropertySignature',
                name: 'modest_branding',
                value: '1',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/ExternalVideo.tsx',
                syntaxKind: 'PropertySignature',
                name: 'origin',
                value: 'string',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/ExternalVideo.tsx',
                syntaxKind: 'PropertySignature',
                name: 'playlist',
                value: 'string',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/ExternalVideo.tsx',
                syntaxKind: 'PropertySignature',
                name: 'plays_inline',
                value: '0 | 1',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/ExternalVideo.tsx',
                syntaxKind: 'PropertySignature',
                name: 'rel',
                value: '0 | 1',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/ExternalVideo.tsx',
                syntaxKind: 'PropertySignature',
                name: 'start',
                value: 'number',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/ExternalVideo.tsx',
                syntaxKind: 'PropertySignature',
                name: 'widget_referrer',
                value: 'string',
                description: '',
                isOptional: true,
              },
            ],
            value:
              "interface YouTube {\n  autoplay?: 0 | 1;\n  cc_lang_pref?: string;\n  cc_load_policy?: 1;\n  color?: 'red' | 'white';\n  controls?: 0 | 1;\n  disablekb?: 0 | 1;\n  enablejsapi?: 0 | 1;\n  end?: number;\n  fs?: 0 | 1;\n  hl?: string;\n  iv_load_policy?: 1 | 3;\n  list?: string;\n  list_type?: 'playlist' | 'user_uploads';\n  loop?: 0 | 1;\n  modest_branding?: 1;\n  origin?: string;\n  playlist?: string;\n  plays_inline?: 0 | 1;\n  rel?: 0 | 1;\n  start?: number;\n  widget_referrer?: string;\n}",
          },
          Vimeo: {
            filePath: '/ExternalVideo.tsx',
            name: 'Vimeo',
            description: '',
            members: [
              {
                filePath: '/ExternalVideo.tsx',
                syntaxKind: 'PropertySignature',
                name: 'autopause',
                value: 'VimeoBoolean',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/ExternalVideo.tsx',
                syntaxKind: 'PropertySignature',
                name: 'autoplay',
                value: 'VimeoBoolean',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/ExternalVideo.tsx',
                syntaxKind: 'PropertySignature',
                name: 'background',
                value: 'VimeoBoolean',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/ExternalVideo.tsx',
                syntaxKind: 'PropertySignature',
                name: 'byline',
                value: 'VimeoBoolean',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/ExternalVideo.tsx',
                syntaxKind: 'PropertySignature',
                name: 'color',
                value: 'string',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/ExternalVideo.tsx',
                syntaxKind: 'PropertySignature',
                name: 'controls',
                value: 'VimeoBoolean',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/ExternalVideo.tsx',
                syntaxKind: 'PropertySignature',
                name: 'dnt',
                value: 'VimeoBoolean',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/ExternalVideo.tsx',
                syntaxKind: 'PropertySignature',
                name: 'loop',
                value: 'VimeoBoolean',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/ExternalVideo.tsx',
                syntaxKind: 'PropertySignature',
                name: 'muted',
                value: 'VimeoBoolean',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/ExternalVideo.tsx',
                syntaxKind: 'PropertySignature',
                name: 'pip',
                value: 'VimeoBoolean',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/ExternalVideo.tsx',
                syntaxKind: 'PropertySignature',
                name: 'playsinline',
                value: 'VimeoBoolean',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/ExternalVideo.tsx',
                syntaxKind: 'PropertySignature',
                name: 'portrait',
                value: 'VimeoBoolean',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/ExternalVideo.tsx',
                syntaxKind: 'PropertySignature',
                name: 'quality',
                value:
                  '"240p" | "360p" | "540p" | "720p" | "1080p" | "2k" | "4k"',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/ExternalVideo.tsx',
                syntaxKind: 'PropertySignature',
                name: 'speed',
                value: 'VimeoBoolean',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/ExternalVideo.tsx',
                syntaxKind: 'PropertySignature',
                name: '#t',
                value: 'string',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/ExternalVideo.tsx',
                syntaxKind: 'PropertySignature',
                name: 'texttrack',
                value: 'string',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/ExternalVideo.tsx',
                syntaxKind: 'PropertySignature',
                name: 'title',
                value: 'VimeoBoolean',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/ExternalVideo.tsx',
                syntaxKind: 'PropertySignature',
                name: 'transparent',
                value: 'VimeoBoolean',
                description: '',
                isOptional: true,
              },
            ],
            value:
              "interface Vimeo {\n  autopause?: VimeoBoolean;\n  autoplay?: VimeoBoolean;\n  background?: VimeoBoolean;\n  byline?: VimeoBoolean;\n  color?: string;\n  controls?: VimeoBoolean;\n  dnt?: VimeoBoolean;\n  loop?: VimeoBoolean;\n  muted?: VimeoBoolean;\n  pip?: VimeoBoolean;\n  playsinline?: VimeoBoolean;\n  portrait?: VimeoBoolean;\n  quality?: '240p' | '360p' | '540p' | '720p' | '1080p' | '2k' | '4k';\n  speed?: VimeoBoolean;\n  '#t'?: string;\n  texttrack?: string;\n  title?: VimeoBoolean;\n  transparent?: VimeoBoolean;\n}",
          },
          VimeoBoolean: {
            filePath: '/ExternalVideo.tsx',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'VimeoBoolean',
            value: '0 | 1 | boolean',
            description: '',
          },
        },
      },
    ],
  },
  {
    name: 'MediaFile',
    category: 'components',
    isVisualComponent: false,
    related: [
      {
        name: 'Image',
        type: 'component',
        url: '/api/hydrogen/components/image',
      },
      {
        name: 'Video',
        type: 'component',
        url: '/api/hydrogen/components/video',
      },
      {
        name: 'ExternalVideo',
        type: 'component',
        url: '/api/hydrogen/components/externalvideo',
      },
      {
        name: 'ModelViewer',
        type: 'component',
        url: '/api/hydrogen/components/modelviewer',
      },
    ],
    description:
      "The `MediaFile` component renders the media for the Storefront API's\n[Media object](https://shopify.dev/api/storefront/reference/products/media). It renders an `Image`, `Video`, an `ExternalVideo`, or a `ModelViewer` depending on the `__typename` of the `data` prop.",
    type: 'component',
    defaultExample: {
      description: 'I am the default example',
      codeblock: {
        tabs: [
          {
            title: 'JavaScript',
            code: "import {MediaFile} from '@shopify/hydrogen';\n\nexport function ProductsMediaFiles({products}) {\n  return (\n    &lt;ul&gt;\n      {products.nodes.map((product) =&gt; {\n        return &lt;MediaFile data={product.media.nodes[0]} key={product.id} /&gt;;\n      })}\n    &lt;/ul&gt;\n  );\n}\n",
            language: 'jsx',
          },
          {
            title: 'TypeScript',
            code: "import {MediaFile} from '@shopify/hydrogen';\nimport type {ProductConnection} from '@shopify/hydrogen/storefront-api-types';\n\nexport function ProductsMediaFiles({products}: {products: ProductConnection}) {\n  return (\n    &lt;ul&gt;\n      {products.nodes.map((product) =&gt; {\n        return &lt;MediaFile data={product.media.nodes[0]} key={product.id} /&gt;;\n      })}\n    &lt;/ul&gt;\n  );\n}\n",
            language: 'tsx',
          },
        ],
        title: 'Example code',
      },
    },
    definitions: [
      {
        title: 'Props',
        description:
          'MediaFile renders an `Image`, `Video`, `ExternalVideo`, or `ModelViewer` component. Use the `mediaOptions` prop to customize the props sent to each of these components.',
        type: 'MediaFileProps',
        typeDefinitions: {
          MediaFileProps: {
            filePath: '/MediaFile.tsx',
            name: 'MediaFileProps',
            description: '',
            members: [
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'data',
                value:
                  "PartialDeep<MediaEdgeType['node'], {recurseIntoArrays: true}>",
                description:
                  "An object with fields that correspond to the Storefront API's [Media object](https://shopify.dev/api/storefront/reference/products/media).",
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'mediaOptions',
                value: 'MediaOptions',
                description:
                  'The options for the `Image`, `Video`, `ExternalVideo`, or `ModelViewer` components.',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'defaultChecked',
                value: 'boolean',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'defaultValue',
                value: 'string | number | readonly string[]',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'suppressContentEditableWarning',
                value: 'boolean',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'suppressHydrationWarning',
                value: 'boolean',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'accessKey',
                value: 'string',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'autoFocus',
                value: 'boolean',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'className',
                value: 'string',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'contentEditable',
                value: '"inherit" | Booleanish',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'contextMenu',
                value: 'string',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'dir',
                value: 'string',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'draggable',
                value: 'Booleanish',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'hidden',
                value: 'boolean',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'id',
                value: 'string',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'lang',
                value: 'string',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'nonce',
                value: 'string',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'placeholder',
                value: 'string',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'slot',
                value: 'string',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'spellCheck',
                value: 'Booleanish',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'style',
                value: 'CSSProperties',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'tabIndex',
                value: 'number',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'title',
                value: 'string',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'translate',
                value: '"no" | "yes"',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'radioGroup',
                value: 'string',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'role',
                value: 'AriaRole',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'about',
                value: 'string',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'content',
                value: 'string',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'datatype',
                value: 'string',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'inlist',
                value: 'any',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'prefix',
                value: 'string',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'property',
                value: 'string',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'rel',
                value: 'string',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'resource',
                value: 'string',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'rev',
                value: 'string',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'typeof',
                value: 'string',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'vocab',
                value: 'string',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'autoCapitalize',
                value: 'string',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'autoCorrect',
                value: 'string',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'autoSave',
                value: 'string',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'color',
                value: 'string',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'itemProp',
                value: 'string',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'itemScope',
                value: 'boolean',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'itemType',
                value: 'string',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'itemID',
                value: 'string',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'itemRef',
                value: 'string',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'results',
                value: 'number',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'security',
                value: 'string',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'unselectable',
                value: '"off" | "on"',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'inputMode',
                value:
                  '"search" | "text" | "none" | "email" | "tel" | "url" | "numeric" | "decimal"',
                description:
                  'Hints at the type of data that might be entered by the user while editing the element or its contents',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'is',
                value: 'string',
                description:
                  'Specify that a standard HTML element should behave like a defined custom built-in element',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'aria-activedescendant',
                value: 'string',
                description:
                  'Identifies the currently active element when DOM focus is on a composite widget, textbox, group, or application.',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'aria-atomic',
                value: 'Booleanish',
                description:
                  'Indicates whether assistive technologies will present all, or only parts of, the changed region based on the change notifications defined by the aria-relevant attribute.',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'aria-autocomplete',
                value: '"list" | "none" | "inline" | "both"',
                description:
                  "Indicates whether inputting text could trigger display of one or more predictions of the user's intended value for an input and specifies how predictions would be presented if they are made.",
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'aria-braillelabel',
                value: 'string',
                description:
                  'Defines a string value that labels the current element, which is intended to be converted into Braille.',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'aria-brailleroledescription',
                value: 'string',
                description:
                  'Defines a human-readable, author-localized abbreviated description for the role of an element, which is intended to be converted into Braille.',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'aria-busy',
                value: 'Booleanish',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'aria-checked',
                value: 'boolean | "true" | "false" | "mixed"',
                description:
                  'Indicates the current "checked" state of checkboxes, radio buttons, and other widgets.',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'aria-colcount',
                value: 'number',
                description:
                  'Defines the total number of columns in a table, grid, or treegrid.',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'aria-colindex',
                value: 'number',
                description:
                  "Defines an element's column index or position with respect to the total number of columns within a table, grid, or treegrid.",
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'aria-colindextext',
                value: 'string',
                description:
                  'Defines a human readable text alternative of aria-colindex.',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'aria-colspan',
                value: 'number',
                description:
                  'Defines the number of columns spanned by a cell or gridcell within a table, grid, or treegrid.',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'aria-controls',
                value: 'string',
                description:
                  'Identifies the element (or elements) whose contents or presence are controlled by the current element.',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'aria-current',
                value:
                  'boolean | "time" | "step" | "date" | "true" | "false" | "page" | "location"',
                description:
                  'Indicates the element that represents the current item within a container or set of related elements.',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'aria-describedby',
                value: 'string',
                description:
                  'Identifies the element (or elements) that describes the object.',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'aria-description',
                value: 'string',
                description:
                  'Defines a string value that describes or annotates the current element.',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'aria-details',
                value: 'string',
                description:
                  'Identifies the element that provides a detailed, extended description for the object.',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'aria-disabled',
                value: 'Booleanish',
                description:
                  'Indicates that the element is perceivable but disabled, so it is not editable or otherwise operable.',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'aria-dropeffect',
                value:
                  '"link" | "none" | "copy" | "execute" | "move" | "popup"',
                description:
                  'Indicates what functions can be performed when a dragged object is released on the drop target.',
                isOptional: true,
                deprecationMessage: 'in ARIA 1.1',
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'aria-errormessage',
                value: 'string',
                description:
                  'Identifies the element that provides an error message for the object.',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'aria-expanded',
                value: 'Booleanish',
                description:
                  'Indicates whether the element, or another grouping element it controls, is currently expanded or collapsed.',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'aria-flowto',
                value: 'string',
                description:
                  "Identifies the next element (or elements) in an alternate reading order of content which, at the user's discretion, allows assistive technology to override the general default of reading in document source order.",
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'aria-grabbed',
                value: 'Booleanish',
                description:
                  'Indicates an element\'s "grabbed" state in a drag-and-drop operation.',
                isOptional: true,
                deprecationMessage: 'in ARIA 1.1',
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'aria-haspopup',
                value:
                  'boolean | "dialog" | "menu" | "grid" | "listbox" | "tree" | "true" | "false"',
                description:
                  'Indicates the availability and type of interactive popup element, such as menu or dialog, that can be triggered by an element.',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'aria-hidden',
                value: 'Booleanish',
                description:
                  'Indicates whether the element is exposed to an accessibility API.',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'aria-invalid',
                value: 'boolean | "true" | "false" | "grammar" | "spelling"',
                description:
                  'Indicates the entered value does not conform to the format expected by the application.',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'aria-keyshortcuts',
                value: 'string',
                description:
                  'Indicates keyboard shortcuts that an author has implemented to activate or give focus to an element.',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'aria-label',
                value: 'string',
                description:
                  'Defines a string value that labels the current element.',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'aria-labelledby',
                value: 'string',
                description:
                  'Identifies the element (or elements) that labels the current element.',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'aria-level',
                value: 'number',
                description:
                  'Defines the hierarchical level of an element within a structure.',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'aria-live',
                value: '"off" | "assertive" | "polite"',
                description:
                  'Indicates that an element will be updated, and describes the types of updates the user agents, assistive technologies, and user can expect from the live region.',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'aria-modal',
                value: 'Booleanish',
                description:
                  'Indicates whether an element is modal when displayed.',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'aria-multiline',
                value: 'Booleanish',
                description:
                  'Indicates whether a text box accepts multiple lines of input or only a single line.',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'aria-multiselectable',
                value: 'Booleanish',
                description:
                  'Indicates that the user may select more than one item from the current selectable descendants.',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'aria-orientation',
                value: '"horizontal" | "vertical"',
                description:
                  "Indicates whether the element's orientation is horizontal, vertical, or unknown/ambiguous.",
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'aria-owns',
                value: 'string',
                description:
                  'Identifies an element (or elements) in order to define a visual, functional, or contextual parent/child relationship between DOM elements where the DOM hierarchy cannot be used to represent the relationship.',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'aria-placeholder',
                value: 'string',
                description:
                  'Defines a short hint (a word or short phrase) intended to aid the user with data entry when the control has no value. A hint could be a sample value or a brief description of the expected format.',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'aria-posinset',
                value: 'number',
                description:
                  "Defines an element's number or position in the current set of listitems or treeitems. Not required if all elements in the set are present in the DOM.",
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'aria-pressed',
                value: 'boolean | "true" | "false" | "mixed"',
                description:
                  'Indicates the current "pressed" state of toggle buttons.',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'aria-readonly',
                value: 'Booleanish',
                description:
                  'Indicates that the element is not editable, but is otherwise operable.',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'aria-relevant',
                value:
                  '"text" | "all" | "additions" | "additions removals" | "additions text" | "removals" | "removals additions" | "removals text" | "text additions" | "text removals"',
                description:
                  'Indicates what notifications the user agent will trigger when the accessibility tree within a live region is modified.',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'aria-required',
                value: 'Booleanish',
                description:
                  'Indicates that user input is required on the element before a form may be submitted.',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'aria-roledescription',
                value: 'string',
                description:
                  'Defines a human-readable, author-localized description for the role of an element.',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'aria-rowcount',
                value: 'number',
                description:
                  'Defines the total number of rows in a table, grid, or treegrid.',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'aria-rowindex',
                value: 'number',
                description:
                  "Defines an element's row index or position with respect to the total number of rows within a table, grid, or treegrid.",
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'aria-rowindextext',
                value: 'string',
                description:
                  'Defines a human readable text alternative of aria-rowindex.',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'aria-rowspan',
                value: 'number',
                description:
                  'Defines the number of rows spanned by a cell or gridcell within a table, grid, or treegrid.',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'aria-selected',
                value: 'Booleanish',
                description:
                  'Indicates the current "selected" state of various widgets.',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'aria-setsize',
                value: 'number',
                description:
                  'Defines the number of items in the current set of listitems or treeitems. Not required if all elements in the set are present in the DOM.',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'aria-sort',
                value: '"none" | "ascending" | "descending" | "other"',
                description:
                  'Indicates if items in a table or grid are sorted in ascending or descending order.',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'aria-valuemax',
                value: 'number',
                description:
                  'Defines the maximum allowed value for a range widget.',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'aria-valuemin',
                value: 'number',
                description:
                  'Defines the minimum allowed value for a range widget.',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'aria-valuenow',
                value: 'number',
                description: 'Defines the current value for a range widget.',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'aria-valuetext',
                value: 'string',
                description:
                  'Defines the human readable text alternative of aria-valuenow for a range widget.',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'children',
                value: 'ReactNode',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'dangerouslySetInnerHTML',
                value: '{ __html: string | TrustedHTML; }',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'onCopy',
                value:
                  'ClipboardEventHandler<HTMLIFrameElement | HTMLImageElement | HTMLVideoElement | (AnnotationInterface & SceneGraphInterface & StagingInterface & EnvironmentInterface & ControlsInterface & ARInterface & LoadingInterface & AnimationInterface & ModelViewerElementBase)>',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'onCopyCapture',
                value:
                  'ClipboardEventHandler<HTMLIFrameElement | HTMLImageElement | HTMLVideoElement | (AnnotationInterface & SceneGraphInterface & StagingInterface & EnvironmentInterface & ControlsInterface & ARInterface & LoadingInterface & AnimationInterface & ModelViewerElementBase)>',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'onCut',
                value:
                  'ClipboardEventHandler<HTMLIFrameElement | HTMLImageElement | HTMLVideoElement | (AnnotationInterface & SceneGraphInterface & StagingInterface & EnvironmentInterface & ControlsInterface & ARInterface & LoadingInterface & AnimationInterface & ModelViewerElementBase)>',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'onCutCapture',
                value:
                  'ClipboardEventHandler<HTMLIFrameElement | HTMLImageElement | HTMLVideoElement | (AnnotationInterface & SceneGraphInterface & StagingInterface & EnvironmentInterface & ControlsInterface & ARInterface & LoadingInterface & AnimationInterface & ModelViewerElementBase)>',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'onPaste',
                value:
                  'ClipboardEventHandler<HTMLIFrameElement | HTMLImageElement | HTMLVideoElement | (AnnotationInterface & SceneGraphInterface & StagingInterface & EnvironmentInterface & ControlsInterface & ARInterface & LoadingInterface & AnimationInterface & ModelViewerElementBase)>',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'onPasteCapture',
                value:
                  'ClipboardEventHandler<HTMLIFrameElement | HTMLImageElement | HTMLVideoElement | (AnnotationInterface & SceneGraphInterface & StagingInterface & EnvironmentInterface & ControlsInterface & ARInterface & LoadingInterface & AnimationInterface & ModelViewerElementBase)>',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'onCompositionEnd',
                value:
                  'CompositionEventHandler<HTMLIFrameElement | HTMLImageElement | HTMLVideoElement | (AnnotationInterface & SceneGraphInterface & StagingInterface & EnvironmentInterface & ControlsInterface & ARInterface & LoadingInterface & AnimationInterface & ModelViewerElementBase)>',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'onCompositionEndCapture',
                value:
                  'CompositionEventHandler<HTMLIFrameElement | HTMLImageElement | HTMLVideoElement | (AnnotationInterface & SceneGraphInterface & StagingInterface & EnvironmentInterface & ControlsInterface & ARInterface & LoadingInterface & AnimationInterface & ModelViewerElementBase)>',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'onCompositionStart',
                value:
                  'CompositionEventHandler<HTMLIFrameElement | HTMLImageElement | HTMLVideoElement | (AnnotationInterface & SceneGraphInterface & StagingInterface & EnvironmentInterface & ControlsInterface & ARInterface & LoadingInterface & AnimationInterface & ModelViewerElementBase)>',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'onCompositionStartCapture',
                value:
                  'CompositionEventHandler<HTMLIFrameElement | HTMLImageElement | HTMLVideoElement | (AnnotationInterface & SceneGraphInterface & StagingInterface & EnvironmentInterface & ControlsInterface & ARInterface & LoadingInterface & AnimationInterface & ModelViewerElementBase)>',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'onCompositionUpdate',
                value:
                  'CompositionEventHandler<HTMLIFrameElement | HTMLImageElement | HTMLVideoElement | (AnnotationInterface & SceneGraphInterface & StagingInterface & EnvironmentInterface & ControlsInterface & ARInterface & LoadingInterface & AnimationInterface & ModelViewerElementBase)>',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'onCompositionUpdateCapture',
                value:
                  'CompositionEventHandler<HTMLIFrameElement | HTMLImageElement | HTMLVideoElement | (AnnotationInterface & SceneGraphInterface & StagingInterface & EnvironmentInterface & ControlsInterface & ARInterface & LoadingInterface & AnimationInterface & ModelViewerElementBase)>',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'onFocus',
                value:
                  'FocusEventHandler<HTMLIFrameElement | HTMLImageElement | HTMLVideoElement | (AnnotationInterface & SceneGraphInterface & StagingInterface & EnvironmentInterface & ControlsInterface & ARInterface & LoadingInterface & AnimationInterface & ModelViewerElementBase)>',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'onFocusCapture',
                value:
                  'FocusEventHandler<HTMLIFrameElement | HTMLImageElement | HTMLVideoElement | (AnnotationInterface & SceneGraphInterface & StagingInterface & EnvironmentInterface & ControlsInterface & ARInterface & LoadingInterface & AnimationInterface & ModelViewerElementBase)>',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'onBlur',
                value:
                  'FocusEventHandler<HTMLIFrameElement | HTMLImageElement | HTMLVideoElement | (AnnotationInterface & SceneGraphInterface & StagingInterface & EnvironmentInterface & ControlsInterface & ARInterface & LoadingInterface & AnimationInterface & ModelViewerElementBase)>',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'onBlurCapture',
                value:
                  'FocusEventHandler<HTMLIFrameElement | HTMLImageElement | HTMLVideoElement | (AnnotationInterface & SceneGraphInterface & StagingInterface & EnvironmentInterface & ControlsInterface & ARInterface & LoadingInterface & AnimationInterface & ModelViewerElementBase)>',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'onChange',
                value:
                  'FormEventHandler<HTMLIFrameElement | HTMLImageElement | HTMLVideoElement | (AnnotationInterface & SceneGraphInterface & StagingInterface & EnvironmentInterface & ControlsInterface & ARInterface & LoadingInterface & AnimationInterface & ModelViewerElementBase)>',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'onChangeCapture',
                value:
                  'FormEventHandler<HTMLIFrameElement | HTMLImageElement | HTMLVideoElement | (AnnotationInterface & SceneGraphInterface & StagingInterface & EnvironmentInterface & ControlsInterface & ARInterface & LoadingInterface & AnimationInterface & ModelViewerElementBase)>',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'onBeforeInput',
                value:
                  'FormEventHandler<HTMLIFrameElement | HTMLImageElement | HTMLVideoElement | (AnnotationInterface & SceneGraphInterface & StagingInterface & EnvironmentInterface & ControlsInterface & ARInterface & LoadingInterface & AnimationInterface & ModelViewerElementBase)>',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'onBeforeInputCapture',
                value:
                  'FormEventHandler<HTMLIFrameElement | HTMLImageElement | HTMLVideoElement | (AnnotationInterface & SceneGraphInterface & StagingInterface & EnvironmentInterface & ControlsInterface & ARInterface & LoadingInterface & AnimationInterface & ModelViewerElementBase)>',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'onInput',
                value:
                  'FormEventHandler<HTMLIFrameElement | HTMLImageElement | HTMLVideoElement | (AnnotationInterface & SceneGraphInterface & StagingInterface & EnvironmentInterface & ControlsInterface & ARInterface & LoadingInterface & AnimationInterface & ModelViewerElementBase)>',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'onInputCapture',
                value:
                  'FormEventHandler<HTMLIFrameElement | HTMLImageElement | HTMLVideoElement | (AnnotationInterface & SceneGraphInterface & StagingInterface & EnvironmentInterface & ControlsInterface & ARInterface & LoadingInterface & AnimationInterface & ModelViewerElementBase)>',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'onReset',
                value:
                  'FormEventHandler<HTMLIFrameElement | HTMLImageElement | HTMLVideoElement | (AnnotationInterface & SceneGraphInterface & StagingInterface & EnvironmentInterface & ControlsInterface & ARInterface & LoadingInterface & AnimationInterface & ModelViewerElementBase)>',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'onResetCapture',
                value:
                  'FormEventHandler<HTMLIFrameElement | HTMLImageElement | HTMLVideoElement | (AnnotationInterface & SceneGraphInterface & StagingInterface & EnvironmentInterface & ControlsInterface & ARInterface & LoadingInterface & AnimationInterface & ModelViewerElementBase)>',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'onSubmit',
                value:
                  'FormEventHandler<HTMLIFrameElement | HTMLImageElement | HTMLVideoElement | (AnnotationInterface & SceneGraphInterface & StagingInterface & EnvironmentInterface & ControlsInterface & ARInterface & LoadingInterface & AnimationInterface & ModelViewerElementBase)>',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'onSubmitCapture',
                value:
                  'FormEventHandler<HTMLIFrameElement | HTMLImageElement | HTMLVideoElement | (AnnotationInterface & SceneGraphInterface & StagingInterface & EnvironmentInterface & ControlsInterface & ARInterface & LoadingInterface & AnimationInterface & ModelViewerElementBase)>',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'onInvalid',
                value:
                  'FormEventHandler<HTMLIFrameElement | HTMLImageElement | HTMLVideoElement | (AnnotationInterface & SceneGraphInterface & StagingInterface & EnvironmentInterface & ControlsInterface & ARInterface & LoadingInterface & AnimationInterface & ModelViewerElementBase)>',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'onInvalidCapture',
                value:
                  'FormEventHandler<HTMLIFrameElement | HTMLImageElement | HTMLVideoElement | (AnnotationInterface & SceneGraphInterface & StagingInterface & EnvironmentInterface & ControlsInterface & ARInterface & LoadingInterface & AnimationInterface & ModelViewerElementBase)>',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'onLoad',
                value:
                  'ReactEventHandler<HTMLIFrameElement | HTMLImageElement | HTMLVideoElement | (AnnotationInterface & SceneGraphInterface & StagingInterface & EnvironmentInterface & ControlsInterface & ARInterface & LoadingInterface & AnimationInterface & ModelViewerElementBase)>',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'onLoadCapture',
                value:
                  'ReactEventHandler<HTMLIFrameElement | HTMLImageElement | HTMLVideoElement | (AnnotationInterface & SceneGraphInterface & StagingInterface & EnvironmentInterface & ControlsInterface & ARInterface & LoadingInterface & AnimationInterface & ModelViewerElementBase)>',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'onError',
                value:
                  'ReactEventHandler<HTMLIFrameElement | HTMLImageElement | HTMLVideoElement | (AnnotationInterface & SceneGraphInterface & StagingInterface & EnvironmentInterface & ControlsInterface & ARInterface & LoadingInterface & AnimationInterface & ModelViewerElementBase)>',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'onErrorCapture',
                value:
                  'ReactEventHandler<HTMLIFrameElement | HTMLImageElement | HTMLVideoElement | (AnnotationInterface & SceneGraphInterface & StagingInterface & EnvironmentInterface & ControlsInterface & ARInterface & LoadingInterface & AnimationInterface & ModelViewerElementBase)>',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'onKeyDown',
                value:
                  'KeyboardEventHandler<HTMLIFrameElement | HTMLImageElement | HTMLVideoElement | (AnnotationInterface & SceneGraphInterface & StagingInterface & EnvironmentInterface & ControlsInterface & ARInterface & LoadingInterface & AnimationInterface & ModelViewerElementBase)>',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'onKeyDownCapture',
                value:
                  'KeyboardEventHandler<HTMLIFrameElement | HTMLImageElement | HTMLVideoElement | (AnnotationInterface & SceneGraphInterface & StagingInterface & EnvironmentInterface & ControlsInterface & ARInterface & LoadingInterface & AnimationInterface & ModelViewerElementBase)>',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'onKeyPress',
                value:
                  'KeyboardEventHandler<HTMLIFrameElement | HTMLImageElement | HTMLVideoElement | (AnnotationInterface & SceneGraphInterface & StagingInterface & EnvironmentInterface & ControlsInterface & ARInterface & LoadingInterface & AnimationInterface & ModelViewerElementBase)>',
                description: '',
                isOptional: true,
                deprecationMessage: 'Deprecated',
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'onKeyPressCapture',
                value:
                  'KeyboardEventHandler<HTMLIFrameElement | HTMLImageElement | HTMLVideoElement | (AnnotationInterface & SceneGraphInterface & StagingInterface & EnvironmentInterface & ControlsInterface & ARInterface & LoadingInterface & AnimationInterface & ModelViewerElementBase)>',
                description: '',
                isOptional: true,
                deprecationMessage: 'Deprecated',
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'onKeyUp',
                value:
                  'KeyboardEventHandler<HTMLIFrameElement | HTMLImageElement | HTMLVideoElement | (AnnotationInterface & SceneGraphInterface & StagingInterface & EnvironmentInterface & ControlsInterface & ARInterface & LoadingInterface & AnimationInterface & ModelViewerElementBase)>',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'onKeyUpCapture',
                value:
                  'KeyboardEventHandler<HTMLIFrameElement | HTMLImageElement | HTMLVideoElement | (AnnotationInterface & SceneGraphInterface & StagingInterface & EnvironmentInterface & ControlsInterface & ARInterface & LoadingInterface & AnimationInterface & ModelViewerElementBase)>',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'onAbort',
                value:
                  'ReactEventHandler<HTMLIFrameElement | HTMLImageElement | HTMLVideoElement | (AnnotationInterface & SceneGraphInterface & StagingInterface & EnvironmentInterface & ControlsInterface & ARInterface & LoadingInterface & AnimationInterface & ModelViewerElementBase)>',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'onAbortCapture',
                value:
                  'ReactEventHandler<HTMLIFrameElement | HTMLImageElement | HTMLVideoElement | (AnnotationInterface & SceneGraphInterface & StagingInterface & EnvironmentInterface & ControlsInterface & ARInterface & LoadingInterface & AnimationInterface & ModelViewerElementBase)>',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'onCanPlay',
                value:
                  'ReactEventHandler<HTMLIFrameElement | HTMLImageElement | HTMLVideoElement | (AnnotationInterface & SceneGraphInterface & StagingInterface & EnvironmentInterface & ControlsInterface & ARInterface & LoadingInterface & AnimationInterface & ModelViewerElementBase)>',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'onCanPlayCapture',
                value:
                  'ReactEventHandler<HTMLIFrameElement | HTMLImageElement | HTMLVideoElement | (AnnotationInterface & SceneGraphInterface & StagingInterface & EnvironmentInterface & ControlsInterface & ARInterface & LoadingInterface & AnimationInterface & ModelViewerElementBase)>',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'onCanPlayThrough',
                value:
                  'ReactEventHandler<HTMLIFrameElement | HTMLImageElement | HTMLVideoElement | (AnnotationInterface & SceneGraphInterface & StagingInterface & EnvironmentInterface & ControlsInterface & ARInterface & LoadingInterface & AnimationInterface & ModelViewerElementBase)>',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'onCanPlayThroughCapture',
                value:
                  'ReactEventHandler<HTMLIFrameElement | HTMLImageElement | HTMLVideoElement | (AnnotationInterface & SceneGraphInterface & StagingInterface & EnvironmentInterface & ControlsInterface & ARInterface & LoadingInterface & AnimationInterface & ModelViewerElementBase)>',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'onDurationChange',
                value:
                  'ReactEventHandler<HTMLIFrameElement | HTMLImageElement | HTMLVideoElement | (AnnotationInterface & SceneGraphInterface & StagingInterface & EnvironmentInterface & ControlsInterface & ARInterface & LoadingInterface & AnimationInterface & ModelViewerElementBase)>',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'onDurationChangeCapture',
                value:
                  'ReactEventHandler<HTMLIFrameElement | HTMLImageElement | HTMLVideoElement | (AnnotationInterface & SceneGraphInterface & StagingInterface & EnvironmentInterface & ControlsInterface & ARInterface & LoadingInterface & AnimationInterface & ModelViewerElementBase)>',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'onEmptied',
                value:
                  'ReactEventHandler<HTMLIFrameElement | HTMLImageElement | HTMLVideoElement | (AnnotationInterface & SceneGraphInterface & StagingInterface & EnvironmentInterface & ControlsInterface & ARInterface & LoadingInterface & AnimationInterface & ModelViewerElementBase)>',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'onEmptiedCapture',
                value:
                  'ReactEventHandler<HTMLIFrameElement | HTMLImageElement | HTMLVideoElement | (AnnotationInterface & SceneGraphInterface & StagingInterface & EnvironmentInterface & ControlsInterface & ARInterface & LoadingInterface & AnimationInterface & ModelViewerElementBase)>',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'onEncrypted',
                value:
                  'ReactEventHandler<HTMLIFrameElement | HTMLImageElement | HTMLVideoElement | (AnnotationInterface & SceneGraphInterface & StagingInterface & EnvironmentInterface & ControlsInterface & ARInterface & LoadingInterface & AnimationInterface & ModelViewerElementBase)>',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'onEncryptedCapture',
                value:
                  'ReactEventHandler<HTMLIFrameElement | HTMLImageElement | HTMLVideoElement | (AnnotationInterface & SceneGraphInterface & StagingInterface & EnvironmentInterface & ControlsInterface & ARInterface & LoadingInterface & AnimationInterface & ModelViewerElementBase)>',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'onEnded',
                value:
                  'ReactEventHandler<HTMLIFrameElement | HTMLImageElement | HTMLVideoElement | (AnnotationInterface & SceneGraphInterface & StagingInterface & EnvironmentInterface & ControlsInterface & ARInterface & LoadingInterface & AnimationInterface & ModelViewerElementBase)>',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'onEndedCapture',
                value:
                  'ReactEventHandler<HTMLIFrameElement | HTMLImageElement | HTMLVideoElement | (AnnotationInterface & SceneGraphInterface & StagingInterface & EnvironmentInterface & ControlsInterface & ARInterface & LoadingInterface & AnimationInterface & ModelViewerElementBase)>',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'onLoadedData',
                value:
                  'ReactEventHandler<HTMLIFrameElement | HTMLImageElement | HTMLVideoElement | (AnnotationInterface & SceneGraphInterface & StagingInterface & EnvironmentInterface & ControlsInterface & ARInterface & LoadingInterface & AnimationInterface & ModelViewerElementBase)>',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'onLoadedDataCapture',
                value:
                  'ReactEventHandler<HTMLIFrameElement | HTMLImageElement | HTMLVideoElement | (AnnotationInterface & SceneGraphInterface & StagingInterface & EnvironmentInterface & ControlsInterface & ARInterface & LoadingInterface & AnimationInterface & ModelViewerElementBase)>',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'onLoadedMetadata',
                value:
                  'ReactEventHandler<HTMLIFrameElement | HTMLImageElement | HTMLVideoElement | (AnnotationInterface & SceneGraphInterface & StagingInterface & EnvironmentInterface & ControlsInterface & ARInterface & LoadingInterface & AnimationInterface & ModelViewerElementBase)>',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'onLoadedMetadataCapture',
                value:
                  'ReactEventHandler<HTMLIFrameElement | HTMLImageElement | HTMLVideoElement | (AnnotationInterface & SceneGraphInterface & StagingInterface & EnvironmentInterface & ControlsInterface & ARInterface & LoadingInterface & AnimationInterface & ModelViewerElementBase)>',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'onLoadStart',
                value:
                  'ReactEventHandler<HTMLIFrameElement | HTMLImageElement | HTMLVideoElement | (AnnotationInterface & SceneGraphInterface & StagingInterface & EnvironmentInterface & ControlsInterface & ARInterface & LoadingInterface & AnimationInterface & ModelViewerElementBase)>',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'onLoadStartCapture',
                value:
                  'ReactEventHandler<HTMLIFrameElement | HTMLImageElement | HTMLVideoElement | (AnnotationInterface & SceneGraphInterface & StagingInterface & EnvironmentInterface & ControlsInterface & ARInterface & LoadingInterface & AnimationInterface & ModelViewerElementBase)>',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'onPause',
                value:
                  'ReactEventHandler<HTMLIFrameElement | HTMLImageElement | HTMLVideoElement | (AnnotationInterface & SceneGraphInterface & StagingInterface & EnvironmentInterface & ControlsInterface & ARInterface & LoadingInterface & AnimationInterface & ModelViewerElementBase)>',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'onPauseCapture',
                value:
                  'ReactEventHandler<HTMLIFrameElement | HTMLImageElement | HTMLVideoElement | (AnnotationInterface & SceneGraphInterface & StagingInterface & EnvironmentInterface & ControlsInterface & ARInterface & LoadingInterface & AnimationInterface & ModelViewerElementBase)>',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'onPlay',
                value:
                  'ReactEventHandler<HTMLIFrameElement | HTMLImageElement | HTMLVideoElement | (AnnotationInterface & SceneGraphInterface & StagingInterface & EnvironmentInterface & ControlsInterface & ARInterface & LoadingInterface & AnimationInterface & ModelViewerElementBase)>',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'onPlayCapture',
                value:
                  'ReactEventHandler<HTMLIFrameElement | HTMLImageElement | HTMLVideoElement | (AnnotationInterface & SceneGraphInterface & StagingInterface & EnvironmentInterface & ControlsInterface & ARInterface & LoadingInterface & AnimationInterface & ModelViewerElementBase)>',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'onPlaying',
                value:
                  'ReactEventHandler<HTMLIFrameElement | HTMLImageElement | HTMLVideoElement | (AnnotationInterface & SceneGraphInterface & StagingInterface & EnvironmentInterface & ControlsInterface & ARInterface & LoadingInterface & AnimationInterface & ModelViewerElementBase)>',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'onPlayingCapture',
                value:
                  'ReactEventHandler<HTMLIFrameElement | HTMLImageElement | HTMLVideoElement | (AnnotationInterface & SceneGraphInterface & StagingInterface & EnvironmentInterface & ControlsInterface & ARInterface & LoadingInterface & AnimationInterface & ModelViewerElementBase)>',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'onProgress',
                value:
                  'ReactEventHandler<HTMLIFrameElement | HTMLImageElement | HTMLVideoElement | (AnnotationInterface & SceneGraphInterface & StagingInterface & EnvironmentInterface & ControlsInterface & ARInterface & LoadingInterface & AnimationInterface & ModelViewerElementBase)>',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'onProgressCapture',
                value:
                  'ReactEventHandler<HTMLIFrameElement | HTMLImageElement | HTMLVideoElement | (AnnotationInterface & SceneGraphInterface & StagingInterface & EnvironmentInterface & ControlsInterface & ARInterface & LoadingInterface & AnimationInterface & ModelViewerElementBase)>',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'onRateChange',
                value:
                  'ReactEventHandler<HTMLIFrameElement | HTMLImageElement | HTMLVideoElement | (AnnotationInterface & SceneGraphInterface & StagingInterface & EnvironmentInterface & ControlsInterface & ARInterface & LoadingInterface & AnimationInterface & ModelViewerElementBase)>',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'onRateChangeCapture',
                value:
                  'ReactEventHandler<HTMLIFrameElement | HTMLImageElement | HTMLVideoElement | (AnnotationInterface & SceneGraphInterface & StagingInterface & EnvironmentInterface & ControlsInterface & ARInterface & LoadingInterface & AnimationInterface & ModelViewerElementBase)>',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'onResize',
                value:
                  'ReactEventHandler<HTMLIFrameElement | HTMLImageElement | HTMLVideoElement | (AnnotationInterface & SceneGraphInterface & StagingInterface & EnvironmentInterface & ControlsInterface & ARInterface & LoadingInterface & AnimationInterface & ModelViewerElementBase)>',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'onResizeCapture',
                value:
                  'ReactEventHandler<HTMLIFrameElement | HTMLImageElement | HTMLVideoElement | (AnnotationInterface & SceneGraphInterface & StagingInterface & EnvironmentInterface & ControlsInterface & ARInterface & LoadingInterface & AnimationInterface & ModelViewerElementBase)>',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'onSeeked',
                value:
                  'ReactEventHandler<HTMLIFrameElement | HTMLImageElement | HTMLVideoElement | (AnnotationInterface & SceneGraphInterface & StagingInterface & EnvironmentInterface & ControlsInterface & ARInterface & LoadingInterface & AnimationInterface & ModelViewerElementBase)>',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'onSeekedCapture',
                value:
                  'ReactEventHandler<HTMLIFrameElement | HTMLImageElement | HTMLVideoElement | (AnnotationInterface & SceneGraphInterface & StagingInterface & EnvironmentInterface & ControlsInterface & ARInterface & LoadingInterface & AnimationInterface & ModelViewerElementBase)>',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'onSeeking',
                value:
                  'ReactEventHandler<HTMLIFrameElement | HTMLImageElement | HTMLVideoElement | (AnnotationInterface & SceneGraphInterface & StagingInterface & EnvironmentInterface & ControlsInterface & ARInterface & LoadingInterface & AnimationInterface & ModelViewerElementBase)>',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'onSeekingCapture',
                value:
                  'ReactEventHandler<HTMLIFrameElement | HTMLImageElement | HTMLVideoElement | (AnnotationInterface & SceneGraphInterface & StagingInterface & EnvironmentInterface & ControlsInterface & ARInterface & LoadingInterface & AnimationInterface & ModelViewerElementBase)>',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'onStalled',
                value:
                  'ReactEventHandler<HTMLIFrameElement | HTMLImageElement | HTMLVideoElement | (AnnotationInterface & SceneGraphInterface & StagingInterface & EnvironmentInterface & ControlsInterface & ARInterface & LoadingInterface & AnimationInterface & ModelViewerElementBase)>',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'onStalledCapture',
                value:
                  'ReactEventHandler<HTMLIFrameElement | HTMLImageElement | HTMLVideoElement | (AnnotationInterface & SceneGraphInterface & StagingInterface & EnvironmentInterface & ControlsInterface & ARInterface & LoadingInterface & AnimationInterface & ModelViewerElementBase)>',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'onSuspend',
                value:
                  'ReactEventHandler<HTMLIFrameElement | HTMLImageElement | HTMLVideoElement | (AnnotationInterface & SceneGraphInterface & StagingInterface & EnvironmentInterface & ControlsInterface & ARInterface & LoadingInterface & AnimationInterface & ModelViewerElementBase)>',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'onSuspendCapture',
                value:
                  'ReactEventHandler<HTMLIFrameElement | HTMLImageElement | HTMLVideoElement | (AnnotationInterface & SceneGraphInterface & StagingInterface & EnvironmentInterface & ControlsInterface & ARInterface & LoadingInterface & AnimationInterface & ModelViewerElementBase)>',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'onTimeUpdate',
                value:
                  'ReactEventHandler<HTMLIFrameElement | HTMLImageElement | HTMLVideoElement | (AnnotationInterface & SceneGraphInterface & StagingInterface & EnvironmentInterface & ControlsInterface & ARInterface & LoadingInterface & AnimationInterface & ModelViewerElementBase)>',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'onTimeUpdateCapture',
                value:
                  'ReactEventHandler<HTMLIFrameElement | HTMLImageElement | HTMLVideoElement | (AnnotationInterface & SceneGraphInterface & StagingInterface & EnvironmentInterface & ControlsInterface & ARInterface & LoadingInterface & AnimationInterface & ModelViewerElementBase)>',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'onVolumeChange',
                value:
                  'ReactEventHandler<HTMLIFrameElement | HTMLImageElement | HTMLVideoElement | (AnnotationInterface & SceneGraphInterface & StagingInterface & EnvironmentInterface & ControlsInterface & ARInterface & LoadingInterface & AnimationInterface & ModelViewerElementBase)>',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'onVolumeChangeCapture',
                value:
                  'ReactEventHandler<HTMLIFrameElement | HTMLImageElement | HTMLVideoElement | (AnnotationInterface & SceneGraphInterface & StagingInterface & EnvironmentInterface & ControlsInterface & ARInterface & LoadingInterface & AnimationInterface & ModelViewerElementBase)>',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'onWaiting',
                value:
                  'ReactEventHandler<HTMLIFrameElement | HTMLImageElement | HTMLVideoElement | (AnnotationInterface & SceneGraphInterface & StagingInterface & EnvironmentInterface & ControlsInterface & ARInterface & LoadingInterface & AnimationInterface & ModelViewerElementBase)>',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'onWaitingCapture',
                value:
                  'ReactEventHandler<HTMLIFrameElement | HTMLImageElement | HTMLVideoElement | (AnnotationInterface & SceneGraphInterface & StagingInterface & EnvironmentInterface & ControlsInterface & ARInterface & LoadingInterface & AnimationInterface & ModelViewerElementBase)>',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'onAuxClick',
                value:
                  'MouseEventHandler<HTMLIFrameElement | HTMLImageElement | HTMLVideoElement | (AnnotationInterface & SceneGraphInterface & StagingInterface & EnvironmentInterface & ControlsInterface & ARInterface & LoadingInterface & AnimationInterface & ModelViewerElementBase)>',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'onAuxClickCapture',
                value:
                  'MouseEventHandler<HTMLIFrameElement | HTMLImageElement | HTMLVideoElement | (AnnotationInterface & SceneGraphInterface & StagingInterface & EnvironmentInterface & ControlsInterface & ARInterface & LoadingInterface & AnimationInterface & ModelViewerElementBase)>',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'onClick',
                value:
                  'MouseEventHandler<HTMLIFrameElement | HTMLImageElement | HTMLVideoElement | (AnnotationInterface & SceneGraphInterface & StagingInterface & EnvironmentInterface & ControlsInterface & ARInterface & LoadingInterface & AnimationInterface & ModelViewerElementBase)>',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'onClickCapture',
                value:
                  'MouseEventHandler<HTMLIFrameElement | HTMLImageElement | HTMLVideoElement | (AnnotationInterface & SceneGraphInterface & StagingInterface & EnvironmentInterface & ControlsInterface & ARInterface & LoadingInterface & AnimationInterface & ModelViewerElementBase)>',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'onContextMenu',
                value:
                  'MouseEventHandler<HTMLIFrameElement | HTMLImageElement | HTMLVideoElement | (AnnotationInterface & SceneGraphInterface & StagingInterface & EnvironmentInterface & ControlsInterface & ARInterface & LoadingInterface & AnimationInterface & ModelViewerElementBase)>',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'onContextMenuCapture',
                value:
                  'MouseEventHandler<HTMLIFrameElement | HTMLImageElement | HTMLVideoElement | (AnnotationInterface & SceneGraphInterface & StagingInterface & EnvironmentInterface & ControlsInterface & ARInterface & LoadingInterface & AnimationInterface & ModelViewerElementBase)>',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'onDoubleClick',
                value:
                  'MouseEventHandler<HTMLIFrameElement | HTMLImageElement | HTMLVideoElement | (AnnotationInterface & SceneGraphInterface & StagingInterface & EnvironmentInterface & ControlsInterface & ARInterface & LoadingInterface & AnimationInterface & ModelViewerElementBase)>',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'onDoubleClickCapture',
                value:
                  'MouseEventHandler<HTMLIFrameElement | HTMLImageElement | HTMLVideoElement | (AnnotationInterface & SceneGraphInterface & StagingInterface & EnvironmentInterface & ControlsInterface & ARInterface & LoadingInterface & AnimationInterface & ModelViewerElementBase)>',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'onDrag',
                value:
                  'DragEventHandler<HTMLIFrameElement | HTMLImageElement | HTMLVideoElement | (AnnotationInterface & SceneGraphInterface & StagingInterface & EnvironmentInterface & ControlsInterface & ARInterface & LoadingInterface & AnimationInterface & ModelViewerElementBase)>',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'onDragCapture',
                value:
                  'DragEventHandler<HTMLIFrameElement | HTMLImageElement | HTMLVideoElement | (AnnotationInterface & SceneGraphInterface & StagingInterface & EnvironmentInterface & ControlsInterface & ARInterface & LoadingInterface & AnimationInterface & ModelViewerElementBase)>',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'onDragEnd',
                value:
                  'DragEventHandler<HTMLIFrameElement | HTMLImageElement | HTMLVideoElement | (AnnotationInterface & SceneGraphInterface & StagingInterface & EnvironmentInterface & ControlsInterface & ARInterface & LoadingInterface & AnimationInterface & ModelViewerElementBase)>',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'onDragEndCapture',
                value:
                  'DragEventHandler<HTMLIFrameElement | HTMLImageElement | HTMLVideoElement | (AnnotationInterface & SceneGraphInterface & StagingInterface & EnvironmentInterface & ControlsInterface & ARInterface & LoadingInterface & AnimationInterface & ModelViewerElementBase)>',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'onDragEnter',
                value:
                  'DragEventHandler<HTMLIFrameElement | HTMLImageElement | HTMLVideoElement | (AnnotationInterface & SceneGraphInterface & StagingInterface & EnvironmentInterface & ControlsInterface & ARInterface & LoadingInterface & AnimationInterface & ModelViewerElementBase)>',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'onDragEnterCapture',
                value:
                  'DragEventHandler<HTMLIFrameElement | HTMLImageElement | HTMLVideoElement | (AnnotationInterface & SceneGraphInterface & StagingInterface & EnvironmentInterface & ControlsInterface & ARInterface & LoadingInterface & AnimationInterface & ModelViewerElementBase)>',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'onDragExit',
                value:
                  'DragEventHandler<HTMLIFrameElement | HTMLImageElement | HTMLVideoElement | (AnnotationInterface & SceneGraphInterface & StagingInterface & EnvironmentInterface & ControlsInterface & ARInterface & LoadingInterface & AnimationInterface & ModelViewerElementBase)>',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'onDragExitCapture',
                value:
                  'DragEventHandler<HTMLIFrameElement | HTMLImageElement | HTMLVideoElement | (AnnotationInterface & SceneGraphInterface & StagingInterface & EnvironmentInterface & ControlsInterface & ARInterface & LoadingInterface & AnimationInterface & ModelViewerElementBase)>',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'onDragLeave',
                value:
                  'DragEventHandler<HTMLIFrameElement | HTMLImageElement | HTMLVideoElement | (AnnotationInterface & SceneGraphInterface & StagingInterface & EnvironmentInterface & ControlsInterface & ARInterface & LoadingInterface & AnimationInterface & ModelViewerElementBase)>',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'onDragLeaveCapture',
                value:
                  'DragEventHandler<HTMLIFrameElement | HTMLImageElement | HTMLVideoElement | (AnnotationInterface & SceneGraphInterface & StagingInterface & EnvironmentInterface & ControlsInterface & ARInterface & LoadingInterface & AnimationInterface & ModelViewerElementBase)>',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'onDragOver',
                value:
                  'DragEventHandler<HTMLIFrameElement | HTMLImageElement | HTMLVideoElement | (AnnotationInterface & SceneGraphInterface & StagingInterface & EnvironmentInterface & ControlsInterface & ARInterface & LoadingInterface & AnimationInterface & ModelViewerElementBase)>',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'onDragOverCapture',
                value:
                  'DragEventHandler<HTMLIFrameElement | HTMLImageElement | HTMLVideoElement | (AnnotationInterface & SceneGraphInterface & StagingInterface & EnvironmentInterface & ControlsInterface & ARInterface & LoadingInterface & AnimationInterface & ModelViewerElementBase)>',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'onDragStart',
                value:
                  'DragEventHandler<HTMLIFrameElement | HTMLImageElement | HTMLVideoElement | (AnnotationInterface & SceneGraphInterface & StagingInterface & EnvironmentInterface & ControlsInterface & ARInterface & LoadingInterface & AnimationInterface & ModelViewerElementBase)>',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'onDragStartCapture',
                value:
                  'DragEventHandler<HTMLIFrameElement | HTMLImageElement | HTMLVideoElement | (AnnotationInterface & SceneGraphInterface & StagingInterface & EnvironmentInterface & ControlsInterface & ARInterface & LoadingInterface & AnimationInterface & ModelViewerElementBase)>',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'onDrop',
                value:
                  'DragEventHandler<HTMLIFrameElement | HTMLImageElement | HTMLVideoElement | (AnnotationInterface & SceneGraphInterface & StagingInterface & EnvironmentInterface & ControlsInterface & ARInterface & LoadingInterface & AnimationInterface & ModelViewerElementBase)>',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'onDropCapture',
                value:
                  'DragEventHandler<HTMLIFrameElement | HTMLImageElement | HTMLVideoElement | (AnnotationInterface & SceneGraphInterface & StagingInterface & EnvironmentInterface & ControlsInterface & ARInterface & LoadingInterface & AnimationInterface & ModelViewerElementBase)>',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'onMouseDown',
                value:
                  'MouseEventHandler<HTMLIFrameElement | HTMLImageElement | HTMLVideoElement | (AnnotationInterface & SceneGraphInterface & StagingInterface & EnvironmentInterface & ControlsInterface & ARInterface & LoadingInterface & AnimationInterface & ModelViewerElementBase)>',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'onMouseDownCapture',
                value:
                  'MouseEventHandler<HTMLIFrameElement | HTMLImageElement | HTMLVideoElement | (AnnotationInterface & SceneGraphInterface & StagingInterface & EnvironmentInterface & ControlsInterface & ARInterface & LoadingInterface & AnimationInterface & ModelViewerElementBase)>',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'onMouseEnter',
                value:
                  'MouseEventHandler<HTMLIFrameElement | HTMLImageElement | HTMLVideoElement | (AnnotationInterface & SceneGraphInterface & StagingInterface & EnvironmentInterface & ControlsInterface & ARInterface & LoadingInterface & AnimationInterface & ModelViewerElementBase)>',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'onMouseLeave',
                value:
                  'MouseEventHandler<HTMLIFrameElement | HTMLImageElement | HTMLVideoElement | (AnnotationInterface & SceneGraphInterface & StagingInterface & EnvironmentInterface & ControlsInterface & ARInterface & LoadingInterface & AnimationInterface & ModelViewerElementBase)>',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'onMouseMove',
                value:
                  'MouseEventHandler<HTMLIFrameElement | HTMLImageElement | HTMLVideoElement | (AnnotationInterface & SceneGraphInterface & StagingInterface & EnvironmentInterface & ControlsInterface & ARInterface & LoadingInterface & AnimationInterface & ModelViewerElementBase)>',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'onMouseMoveCapture',
                value:
                  'MouseEventHandler<HTMLIFrameElement | HTMLImageElement | HTMLVideoElement | (AnnotationInterface & SceneGraphInterface & StagingInterface & EnvironmentInterface & ControlsInterface & ARInterface & LoadingInterface & AnimationInterface & ModelViewerElementBase)>',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'onMouseOut',
                value:
                  'MouseEventHandler<HTMLIFrameElement | HTMLImageElement | HTMLVideoElement | (AnnotationInterface & SceneGraphInterface & StagingInterface & EnvironmentInterface & ControlsInterface & ARInterface & LoadingInterface & AnimationInterface & ModelViewerElementBase)>',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'onMouseOutCapture',
                value:
                  'MouseEventHandler<HTMLIFrameElement | HTMLImageElement | HTMLVideoElement | (AnnotationInterface & SceneGraphInterface & StagingInterface & EnvironmentInterface & ControlsInterface & ARInterface & LoadingInterface & AnimationInterface & ModelViewerElementBase)>',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'onMouseOver',
                value:
                  'MouseEventHandler<HTMLIFrameElement | HTMLImageElement | HTMLVideoElement | (AnnotationInterface & SceneGraphInterface & StagingInterface & EnvironmentInterface & ControlsInterface & ARInterface & LoadingInterface & AnimationInterface & ModelViewerElementBase)>',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'onMouseOverCapture',
                value:
                  'MouseEventHandler<HTMLIFrameElement | HTMLImageElement | HTMLVideoElement | (AnnotationInterface & SceneGraphInterface & StagingInterface & EnvironmentInterface & ControlsInterface & ARInterface & LoadingInterface & AnimationInterface & ModelViewerElementBase)>',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'onMouseUp',
                value:
                  'MouseEventHandler<HTMLIFrameElement | HTMLImageElement | HTMLVideoElement | (AnnotationInterface & SceneGraphInterface & StagingInterface & EnvironmentInterface & ControlsInterface & ARInterface & LoadingInterface & AnimationInterface & ModelViewerElementBase)>',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'onMouseUpCapture',
                value:
                  'MouseEventHandler<HTMLIFrameElement | HTMLImageElement | HTMLVideoElement | (AnnotationInterface & SceneGraphInterface & StagingInterface & EnvironmentInterface & ControlsInterface & ARInterface & LoadingInterface & AnimationInterface & ModelViewerElementBase)>',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'onSelect',
                value:
                  'ReactEventHandler<HTMLIFrameElement | HTMLImageElement | HTMLVideoElement | (AnnotationInterface & SceneGraphInterface & StagingInterface & EnvironmentInterface & ControlsInterface & ARInterface & LoadingInterface & AnimationInterface & ModelViewerElementBase)>',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'onSelectCapture',
                value:
                  'ReactEventHandler<HTMLIFrameElement | HTMLImageElement | HTMLVideoElement | (AnnotationInterface & SceneGraphInterface & StagingInterface & EnvironmentInterface & ControlsInterface & ARInterface & LoadingInterface & AnimationInterface & ModelViewerElementBase)>',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'onTouchCancel',
                value:
                  'TouchEventHandler<HTMLIFrameElement | HTMLImageElement | HTMLVideoElement | (AnnotationInterface & SceneGraphInterface & StagingInterface & EnvironmentInterface & ControlsInterface & ARInterface & LoadingInterface & AnimationInterface & ModelViewerElementBase)>',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'onTouchCancelCapture',
                value:
                  'TouchEventHandler<HTMLIFrameElement | HTMLImageElement | HTMLVideoElement | (AnnotationInterface & SceneGraphInterface & StagingInterface & EnvironmentInterface & ControlsInterface & ARInterface & LoadingInterface & AnimationInterface & ModelViewerElementBase)>',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'onTouchEnd',
                value:
                  'TouchEventHandler<HTMLIFrameElement | HTMLImageElement | HTMLVideoElement | (AnnotationInterface & SceneGraphInterface & StagingInterface & EnvironmentInterface & ControlsInterface & ARInterface & LoadingInterface & AnimationInterface & ModelViewerElementBase)>',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'onTouchEndCapture',
                value:
                  'TouchEventHandler<HTMLIFrameElement | HTMLImageElement | HTMLVideoElement | (AnnotationInterface & SceneGraphInterface & StagingInterface & EnvironmentInterface & ControlsInterface & ARInterface & LoadingInterface & AnimationInterface & ModelViewerElementBase)>',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'onTouchMove',
                value:
                  'TouchEventHandler<HTMLIFrameElement | HTMLImageElement | HTMLVideoElement | (AnnotationInterface & SceneGraphInterface & StagingInterface & EnvironmentInterface & ControlsInterface & ARInterface & LoadingInterface & AnimationInterface & ModelViewerElementBase)>',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'onTouchMoveCapture',
                value:
                  'TouchEventHandler<HTMLIFrameElement | HTMLImageElement | HTMLVideoElement | (AnnotationInterface & SceneGraphInterface & StagingInterface & EnvironmentInterface & ControlsInterface & ARInterface & LoadingInterface & AnimationInterface & ModelViewerElementBase)>',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'onTouchStart',
                value:
                  'TouchEventHandler<HTMLIFrameElement | HTMLImageElement | HTMLVideoElement | (AnnotationInterface & SceneGraphInterface & StagingInterface & EnvironmentInterface & ControlsInterface & ARInterface & LoadingInterface & AnimationInterface & ModelViewerElementBase)>',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'onTouchStartCapture',
                value:
                  'TouchEventHandler<HTMLIFrameElement | HTMLImageElement | HTMLVideoElement | (AnnotationInterface & SceneGraphInterface & StagingInterface & EnvironmentInterface & ControlsInterface & ARInterface & LoadingInterface & AnimationInterface & ModelViewerElementBase)>',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'onPointerDown',
                value:
                  'PointerEventHandler<HTMLIFrameElement | HTMLImageElement | HTMLVideoElement | (AnnotationInterface & SceneGraphInterface & StagingInterface & EnvironmentInterface & ControlsInterface & ARInterface & LoadingInterface & AnimationInterface & ModelViewerElementBase)>',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'onPointerDownCapture',
                value:
                  'PointerEventHandler<HTMLIFrameElement | HTMLImageElement | HTMLVideoElement | (AnnotationInterface & SceneGraphInterface & StagingInterface & EnvironmentInterface & ControlsInterface & ARInterface & LoadingInterface & AnimationInterface & ModelViewerElementBase)>',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'onPointerMove',
                value:
                  'PointerEventHandler<HTMLIFrameElement | HTMLImageElement | HTMLVideoElement | (AnnotationInterface & SceneGraphInterface & StagingInterface & EnvironmentInterface & ControlsInterface & ARInterface & LoadingInterface & AnimationInterface & ModelViewerElementBase)>',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'onPointerMoveCapture',
                value:
                  'PointerEventHandler<HTMLIFrameElement | HTMLImageElement | HTMLVideoElement | (AnnotationInterface & SceneGraphInterface & StagingInterface & EnvironmentInterface & ControlsInterface & ARInterface & LoadingInterface & AnimationInterface & ModelViewerElementBase)>',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'onPointerUp',
                value:
                  'PointerEventHandler<HTMLIFrameElement | HTMLImageElement | HTMLVideoElement | (AnnotationInterface & SceneGraphInterface & StagingInterface & EnvironmentInterface & ControlsInterface & ARInterface & LoadingInterface & AnimationInterface & ModelViewerElementBase)>',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'onPointerUpCapture',
                value:
                  'PointerEventHandler<HTMLIFrameElement | HTMLImageElement | HTMLVideoElement | (AnnotationInterface & SceneGraphInterface & StagingInterface & EnvironmentInterface & ControlsInterface & ARInterface & LoadingInterface & AnimationInterface & ModelViewerElementBase)>',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'onPointerCancel',
                value:
                  'PointerEventHandler<HTMLIFrameElement | HTMLImageElement | HTMLVideoElement | (AnnotationInterface & SceneGraphInterface & StagingInterface & EnvironmentInterface & ControlsInterface & ARInterface & LoadingInterface & AnimationInterface & ModelViewerElementBase)>',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'onPointerCancelCapture',
                value:
                  'PointerEventHandler<HTMLIFrameElement | HTMLImageElement | HTMLVideoElement | (AnnotationInterface & SceneGraphInterface & StagingInterface & EnvironmentInterface & ControlsInterface & ARInterface & LoadingInterface & AnimationInterface & ModelViewerElementBase)>',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'onPointerEnter',
                value:
                  'PointerEventHandler<HTMLIFrameElement | HTMLImageElement | HTMLVideoElement | (AnnotationInterface & SceneGraphInterface & StagingInterface & EnvironmentInterface & ControlsInterface & ARInterface & LoadingInterface & AnimationInterface & ModelViewerElementBase)>',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'onPointerEnterCapture',
                value:
                  'PointerEventHandler<HTMLIFrameElement | HTMLImageElement | HTMLVideoElement | (AnnotationInterface & SceneGraphInterface & StagingInterface & EnvironmentInterface & ControlsInterface & ARInterface & LoadingInterface & AnimationInterface & ModelViewerElementBase)>',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'onPointerLeave',
                value:
                  'PointerEventHandler<HTMLIFrameElement | HTMLImageElement | HTMLVideoElement | (AnnotationInterface & SceneGraphInterface & StagingInterface & EnvironmentInterface & ControlsInterface & ARInterface & LoadingInterface & AnimationInterface & ModelViewerElementBase)>',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'onPointerLeaveCapture',
                value:
                  'PointerEventHandler<HTMLIFrameElement | HTMLImageElement | HTMLVideoElement | (AnnotationInterface & SceneGraphInterface & StagingInterface & EnvironmentInterface & ControlsInterface & ARInterface & LoadingInterface & AnimationInterface & ModelViewerElementBase)>',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'onPointerOver',
                value:
                  'PointerEventHandler<HTMLIFrameElement | HTMLImageElement | HTMLVideoElement | (AnnotationInterface & SceneGraphInterface & StagingInterface & EnvironmentInterface & ControlsInterface & ARInterface & LoadingInterface & AnimationInterface & ModelViewerElementBase)>',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'onPointerOverCapture',
                value:
                  'PointerEventHandler<HTMLIFrameElement | HTMLImageElement | HTMLVideoElement | (AnnotationInterface & SceneGraphInterface & StagingInterface & EnvironmentInterface & ControlsInterface & ARInterface & LoadingInterface & AnimationInterface & ModelViewerElementBase)>',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'onPointerOut',
                value:
                  'PointerEventHandler<HTMLIFrameElement | HTMLImageElement | HTMLVideoElement | (AnnotationInterface & SceneGraphInterface & StagingInterface & EnvironmentInterface & ControlsInterface & ARInterface & LoadingInterface & AnimationInterface & ModelViewerElementBase)>',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'onPointerOutCapture',
                value:
                  'PointerEventHandler<HTMLIFrameElement | HTMLImageElement | HTMLVideoElement | (AnnotationInterface & SceneGraphInterface & StagingInterface & EnvironmentInterface & ControlsInterface & ARInterface & LoadingInterface & AnimationInterface & ModelViewerElementBase)>',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'onGotPointerCapture',
                value:
                  'PointerEventHandler<HTMLIFrameElement | HTMLImageElement | HTMLVideoElement | (AnnotationInterface & SceneGraphInterface & StagingInterface & EnvironmentInterface & ControlsInterface & ARInterface & LoadingInterface & AnimationInterface & ModelViewerElementBase)>',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'onGotPointerCaptureCapture',
                value:
                  'PointerEventHandler<HTMLIFrameElement | HTMLImageElement | HTMLVideoElement | (AnnotationInterface & SceneGraphInterface & StagingInterface & EnvironmentInterface & ControlsInterface & ARInterface & LoadingInterface & AnimationInterface & ModelViewerElementBase)>',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'onLostPointerCapture',
                value:
                  'PointerEventHandler<HTMLIFrameElement | HTMLImageElement | HTMLVideoElement | (AnnotationInterface & SceneGraphInterface & StagingInterface & EnvironmentInterface & ControlsInterface & ARInterface & LoadingInterface & AnimationInterface & ModelViewerElementBase)>',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'onLostPointerCaptureCapture',
                value:
                  'PointerEventHandler<HTMLIFrameElement | HTMLImageElement | HTMLVideoElement | (AnnotationInterface & SceneGraphInterface & StagingInterface & EnvironmentInterface & ControlsInterface & ARInterface & LoadingInterface & AnimationInterface & ModelViewerElementBase)>',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'onScroll',
                value:
                  'UIEventHandler<HTMLIFrameElement | HTMLImageElement | HTMLVideoElement | (AnnotationInterface & SceneGraphInterface & StagingInterface & EnvironmentInterface & ControlsInterface & ARInterface & LoadingInterface & AnimationInterface & ModelViewerElementBase)>',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'onScrollCapture',
                value:
                  'UIEventHandler<HTMLIFrameElement | HTMLImageElement | HTMLVideoElement | (AnnotationInterface & SceneGraphInterface & StagingInterface & EnvironmentInterface & ControlsInterface & ARInterface & LoadingInterface & AnimationInterface & ModelViewerElementBase)>',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'onWheel',
                value:
                  'WheelEventHandler<HTMLIFrameElement | HTMLImageElement | HTMLVideoElement | (AnnotationInterface & SceneGraphInterface & StagingInterface & EnvironmentInterface & ControlsInterface & ARInterface & LoadingInterface & AnimationInterface & ModelViewerElementBase)>',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'onWheelCapture',
                value:
                  'WheelEventHandler<HTMLIFrameElement | HTMLImageElement | HTMLVideoElement | (AnnotationInterface & SceneGraphInterface & StagingInterface & EnvironmentInterface & ControlsInterface & ARInterface & LoadingInterface & AnimationInterface & ModelViewerElementBase)>',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'onAnimationStart',
                value:
                  'AnimationEventHandler<HTMLIFrameElement | HTMLImageElement | HTMLVideoElement | (AnnotationInterface & SceneGraphInterface & StagingInterface & EnvironmentInterface & ControlsInterface & ARInterface & LoadingInterface & AnimationInterface & ModelViewerElementBase)>',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'onAnimationStartCapture',
                value:
                  'AnimationEventHandler<HTMLIFrameElement | HTMLImageElement | HTMLVideoElement | (AnnotationInterface & SceneGraphInterface & StagingInterface & EnvironmentInterface & ControlsInterface & ARInterface & LoadingInterface & AnimationInterface & ModelViewerElementBase)>',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'onAnimationEnd',
                value:
                  'AnimationEventHandler<HTMLIFrameElement | HTMLImageElement | HTMLVideoElement | (AnnotationInterface & SceneGraphInterface & StagingInterface & EnvironmentInterface & ControlsInterface & ARInterface & LoadingInterface & AnimationInterface & ModelViewerElementBase)>',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'onAnimationEndCapture',
                value:
                  'AnimationEventHandler<HTMLIFrameElement | HTMLImageElement | HTMLVideoElement | (AnnotationInterface & SceneGraphInterface & StagingInterface & EnvironmentInterface & ControlsInterface & ARInterface & LoadingInterface & AnimationInterface & ModelViewerElementBase)>',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'onAnimationIteration',
                value:
                  'AnimationEventHandler<HTMLIFrameElement | HTMLImageElement | HTMLVideoElement | (AnnotationInterface & SceneGraphInterface & StagingInterface & EnvironmentInterface & ControlsInterface & ARInterface & LoadingInterface & AnimationInterface & ModelViewerElementBase)>',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'onAnimationIterationCapture',
                value:
                  'AnimationEventHandler<HTMLIFrameElement | HTMLImageElement | HTMLVideoElement | (AnnotationInterface & SceneGraphInterface & StagingInterface & EnvironmentInterface & ControlsInterface & ARInterface & LoadingInterface & AnimationInterface & ModelViewerElementBase)>',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'onTransitionEnd',
                value:
                  'TransitionEventHandler<HTMLIFrameElement | HTMLImageElement | HTMLVideoElement | (AnnotationInterface & SceneGraphInterface & StagingInterface & EnvironmentInterface & ControlsInterface & ARInterface & LoadingInterface & AnimationInterface & ModelViewerElementBase)>',
                description: '',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'onTransitionEndCapture',
                value:
                  'TransitionEventHandler<HTMLIFrameElement | HTMLImageElement | HTMLVideoElement | (AnnotationInterface & SceneGraphInterface & StagingInterface & EnvironmentInterface & ControlsInterface & ARInterface & LoadingInterface & AnimationInterface & ModelViewerElementBase)>',
                description: '',
                isOptional: true,
              },
            ],
            value:
              "export interface MediaFileProps extends BaseProps {\n  /** An object with fields that correspond to the Storefront API's [Media object](https://shopify.dev/api/storefront/reference/products/media). */\n  data: PartialDeep<MediaEdgeType['node'], {recurseIntoArrays: true}>;\n  /** The options for the `Image`, `Video`, `ExternalVideo`, or `ModelViewer` components. */\n  mediaOptions?: MediaOptions;\n}",
          },
          MediaOptions: {
            filePath: '/MediaFile.tsx',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'MediaOptions',
            value:
              "{\n  /** Props that will only apply when an `<Image />` is rendered */\n  image?: Omit<HydrogenImageProps, 'data'>;\n  /** Props that will only apply when a `<Video />` is rendered */\n  video?: Omit<React.ComponentProps<typeof Video>, 'data'>;\n  /** Props that will only apply when an `<ExternalVideo />` is rendered */\n  externalVideo?: Omit<\n    React.ComponentProps<typeof ExternalVideo>['options'],\n    'data'\n  >;\n  /** Props that will only apply when a `<ModelViewer />` is rendered */\n  modelViewer?: Omit<typeof ModelViewer, 'data'>;\n}",
            description: '',
            members: [
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'image',
                value: "Omit<HydrogenImageProps, 'data'>",
                description:
                  'Props that will only apply when an `<Image />` is rendered',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'video',
                value: "Omit<React.ComponentProps<typeof Video>, 'data'>",
                description:
                  'Props that will only apply when a `<Video />` is rendered',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'externalVideo',
                value:
                  "Omit<\n    React.ComponentProps<typeof ExternalVideo>['options'],\n    'data'\n  >",
                description:
                  'Props that will only apply when an `<ExternalVideo />` is rendered',
                isOptional: true,
              },
              {
                filePath: '/MediaFile.tsx',
                syntaxKind: 'PropertySignature',
                name: 'modelViewer',
                value: "Omit<typeof ModelViewer, 'data'>",
                description:
                  'Props that will only apply when a `<ModelViewer />` is rendered',
                isOptional: true,
              },
            ],
          },
          HydrogenImageProps: {
            filePath: '/Image.tsx',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'HydrogenImageProps',
            value:
              "React.ComponentPropsWithRef<'img'> & HydrogenImageBaseProps",
            description: '',
          },
          HydrogenImageBaseProps: {
            filePath: '/Image.tsx',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'HydrogenImageBaseProps',
            value:
              "{\n  /** The aspect ratio of the image, in the format of `width/height`.\n   *\n   * @example\n   * ```\n   * <Image data={productImage} aspectRatio=\"4/5\" />\n   * ```\n   */\n  aspectRatio?: string;\n  /** The crop position of the image.\n   *\n   * @remarks\n   * In the event that AspectRatio is set, without specifying a crop,\n   * the Shopify CDN won't return the expected image.\n   *\n   * @defaultValue `center`\n   */\n  crop?: Crop;\n  /** Data mapping to the [Storefront API `Image`](https://shopify.dev/docs/api/storefront/2023-07/objects/Image) object. Must be an Image object.\n   *\n   * @example\n   * ```\n   * import {IMAGE_FRAGMENT, Image} from '@shopify/hydrogen';\n   *\n   * export const IMAGE_QUERY = `#graphql\n   * ${IMAGE_FRAGMENT}\n   * query {\n   *   product {\n   *     featuredImage {\n   *       ...Image\n   *     }\n   *   }\n   * }`\n   *\n   * <Image\n   *   data={productImage}\n   *   sizes=\"(min-width: 45em) 50vw, 100vw\"\n   *   aspectRatio=\"4/5\"\n   * />\n   * ```\n   *\n   * Image: {@link https://shopify.dev/api/storefront/reference/common-objects/image}\n   */\n  data?: PartialDeep<ImageType, {recurseIntoArrays: true}>;\n  /** A function that returns a URL string for an image.\n   *\n   * @remarks\n   * By default, this uses Shopify’s CDN {@link https://cdn.shopify.com/} but you can provide\n   * your own function to use a another provider, as long as they support URL based image transformations.\n   */\n  loader?: Loader;\n  /** An optional prop you can use to change the default srcSet generation behaviour */\n  srcSetOptions?: SrcSetOptions;\n  /** @deprecated Use `crop`, `width`, `height`, and `src` props, and/or `data` prop */\n  loaderOptions?: ShopifyLoaderOptions;\n  /** @deprecated Autocalculated, use only `width` prop, or srcSetOptions */\n  widths?: (HtmlImageProps['width'] | ImageType['width'])[];\n}",
            description: '',
            members: [
              {
                filePath: '/Image.tsx',
                syntaxKind: 'PropertySignature',
                name: 'aspectRatio',
                value: 'string',
                description:
                  'The aspect ratio of the image, in the format of `width/height`.',
                isOptional: true,
                examples: [
                  {
                    title: 'Example',
                    description: '',
                    tabs: [
                      {
                        code: '<Image data={productImage} aspectRatio="4/5" />',
                        title: 'Example',
                      },
                    ],
                  },
                ],
              },
              {
                filePath: '/Image.tsx',
                syntaxKind: 'PropertySignature',
                name: 'crop',
                value: 'Crop',
                description: 'The crop position of the image.',
                isOptional: true,
                defaultValue: '`center`',
              },
              {
                filePath: '/Image.tsx',
                syntaxKind: 'PropertySignature',
                name: 'data',
                value: 'PartialDeep<ImageType, {recurseIntoArrays: true}>',
                description:
                  'Data mapping to the [Storefront API `Image`](https://shopify.dev/docs/api/storefront/2023-07/objects/Image) object. Must be an Image object.',
                isOptional: true,
                examples: [
                  {
                    title: 'Example',
                    description: '',
                    tabs: [
                      {
                        code: 'import {IMAGE_FRAGMENT, Image} from \'@shopify/hydrogen\';\n\nexport const IMAGE_QUERY = `#graphql\n${IMAGE_FRAGMENT}\nquery {\n  product {\n    featuredImage {\n      ...Image\n    }\n  }\n}`\n\n<Image\n  data={productImage}\n  sizes="(min-width: 45em) 50vw, 100vw"\n  aspectRatio="4/5"\n/>',
                        title: 'Example',
                      },
                      {
                        code: 'Image:',
                        title: 'Example',
                      },
                    ],
                  },
                ],
              },
              {
                filePath: '/Image.tsx',
                syntaxKind: 'PropertySignature',
                name: 'loader',
                value: 'Loader',
                description:
                  'A function that returns a URL string for an image.',
                isOptional: true,
              },
              {
                filePath: '/Image.tsx',
                syntaxKind: 'PropertySignature',
                name: 'srcSetOptions',
                value: 'SrcSetOptions',
                description:
                  'An optional prop you can use to change the default srcSet generation behaviour',
                isOptional: true,
              },
              {
                filePath: '/Image.tsx',
                syntaxKind: 'PropertySignature',
                name: 'loaderOptions',
                value: 'ShopifyLoaderOptions',
                description: '',
                isOptional: true,
                deprecationMessage:
                  'Use `crop`, `width`, `height`, and `src` props, and/or `data` prop',
              },
              {
                filePath: '/Image.tsx',
                syntaxKind: 'PropertySignature',
                name: 'widths',
                value: '(string | number)[]',
                description: '',
                isOptional: true,
                deprecationMessage:
                  'Autocalculated, use only `width` prop, or srcSetOptions',
              },
            ],
          },
          Crop: {
            filePath: '/Image.tsx',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'Crop',
            value: "'center' | 'top' | 'bottom' | 'left' | 'right'",
            description: '',
          },
          Loader: {
            filePath: '/Image.tsx',
            name: 'Loader',
            description: '',
            params: [
              {
                name: 'params',
                description: '',
                value: 'LoaderParams',
                filePath: '/Image.tsx',
              },
            ],
            returns: {
              filePath: '/Image.tsx',
              description: '',
              name: 'string',
              value: 'string',
            },
            value: 'export type Loader = (params: LoaderParams) => string;',
          },
          LoaderParams: {
            filePath: '/Image.tsx',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'LoaderParams',
            value:
              "{\n  /** The base URL of the image */\n  src?: ImageType['url'];\n  /** The URL param that controls width */\n  width?: number;\n  /** The URL param that controls height */\n  height?: number;\n  /** The URL param that controls the cropping region */\n  crop?: Crop;\n}",
            description: '',
            members: [
              {
                filePath: '/Image.tsx',
                syntaxKind: 'PropertySignature',
                name: 'src',
                value: 'string',
                description: 'The base URL of the image',
                isOptional: true,
              },
              {
                filePath: '/Image.tsx',
                syntaxKind: 'PropertySignature',
                name: 'width',
                value: 'number',
                description: 'The URL param that controls width',
                isOptional: true,
              },
              {
                filePath: '/Image.tsx',
                syntaxKind: 'PropertySignature',
                name: 'height',
                value: 'number',
                description: 'The URL param that controls height',
                isOptional: true,
              },
              {
                filePath: '/Image.tsx',
                syntaxKind: 'PropertySignature',
                name: 'crop',
                value: 'Crop',
                description: 'The URL param that controls the cropping region',
                isOptional: true,
              },
            ],
          },
          SrcSetOptions: {
            filePath: '/Image.tsx',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'SrcSetOptions',
            value:
              '{\n  /** The number of sizes to generate */\n  intervals: number;\n  /** The smallest image size */\n  startingWidth: number;\n  /** The increment by which to increase for each size, in pixels */\n  incrementSize: number;\n  /** The size used for placeholder fallback images */\n  placeholderWidth: number;\n}',
            description: '',
            members: [
              {
                filePath: '/Image.tsx',
                syntaxKind: 'PropertySignature',
                name: 'intervals',
                value: 'number',
                description: 'The number of sizes to generate',
              },
              {
                filePath: '/Image.tsx',
                syntaxKind: 'PropertySignature',
                name: 'startingWidth',
                value: 'number',
                description: 'The smallest image size',
              },
              {
                filePath: '/Image.tsx',
                syntaxKind: 'PropertySignature',
                name: 'incrementSize',
                value: 'number',
                description:
                  'The increment by which to increase for each size, in pixels',
              },
              {
                filePath: '/Image.tsx',
                syntaxKind: 'PropertySignature',
                name: 'placeholderWidth',
                value: 'number',
                description: 'The size used for placeholder fallback images',
              },
            ],
          },
          ShopifyLoaderOptions: {
            filePath: '/Image.tsx',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'ShopifyLoaderOptions',
            value:
              "{\n  /** The base URL of the image */\n  src?: ImageType['url'];\n  /** The URL param that controls width */\n  width?: HtmlImageProps['width'] | ImageType['width'];\n  /** The URL param that controls height */\n  height?: HtmlImageProps['height'] | ImageType['height'];\n  /** The URL param that controls the cropping region */\n  crop?: Crop;\n}",
            description: 'Legacy type for backwards compatibility *',
            members: [
              {
                filePath: '/Image.tsx',
                syntaxKind: 'PropertySignature',
                name: 'src',
                value: 'string',
                description: 'The base URL of the image',
                isOptional: true,
              },
              {
                filePath: '/Image.tsx',
                syntaxKind: 'PropertySignature',
                name: 'width',
                value: 'string | number',
                description: 'The URL param that controls width',
                isOptional: true,
              },
              {
                filePath: '/Image.tsx',
                syntaxKind: 'PropertySignature',
                name: 'height',
                value: 'string | number',
                description: 'The URL param that controls height',
                isOptional: true,
              },
              {
                filePath: '/Image.tsx',
                syntaxKind: 'PropertySignature',
                name: 'crop',
                value: 'Crop',
                description: 'The URL param that controls the cropping region',
                isOptional: true,
              },
            ],
          },
        },
      },
    ],
  },
  {
    name: 'Money',
    category: 'components',
    isVisualComponent: false,
    related: [
      {
        name: 'useMoney',
        type: 'hook',
        url: '/api/hydrogen/hooks/useMoney',
      },
    ],
    description:
      "The `Money` component renders a string of the Storefront API's[MoneyV2 object](https://shopify.dev/api/storefront/reference/common-objects/moneyv2) according to the `locale` in the [`ShopifyProvider` component](/api/hydrogen/components/global/shopifyprovider).\nThe component outputs a `<div>`. You can [customize this component](https://api/hydrogen/components#customizing-hydrogen-components) using passthrough props.",
    type: 'component',
    defaultExample: {
      description: 'I am the default example',
      codeblock: {
        tabs: [
          {
            title: 'JavaScript',
            code: "import {Money} from '@shopify/hydrogen';\n\nexport default function ProductMoney({product}) {\n  const price = product.variants.nodes[0].price;\n\n  return &lt;Money data={price} /&gt;;\n}\n",
            language: 'jsx',
          },
          {
            title: 'TypeScript',
            code: "import {Money} from '@shopify/hydrogen';\nimport type {Product} from '@shopify/hydrogen/storefront-api-types';\n\nexport default function ProductMoney({product}: {product: Product}) {\n  const price = product.variants.nodes[0].price;\n\n  return &lt;Money data={price} /&gt;;\n}\n",
            language: 'tsx',
          },
        ],
        title: 'Example code',
      },
    },
    definitions: [
      {
        title: 'Props',
        description: '',
        type: 'MoneyPropsBase',
        typeDefinitions: {
          MoneyPropsBase: {
            filePath: '/Money.tsx',
            name: 'MoneyPropsBase',
            description: '',
            members: [
              {
                filePath: '/Money.tsx',
                syntaxKind: 'PropertySignature',
                name: 'as',
                value: 'ComponentGeneric',
                description:
                  'An HTML tag or React Component to be rendered as the base element wrapper. The default is `div`.',
                isOptional: true,
              },
              {
                filePath: '/Money.tsx',
                syntaxKind: 'PropertySignature',
                name: 'data',
                value: 'PartialDeep<MoneyV2, {recurseIntoArrays: true}>',
                description:
                  "An object with fields that correspond to the Storefront API's [MoneyV2 object](https://shopify.dev/api/storefront/reference/common-objects/moneyv2).",
              },
              {
                filePath: '/Money.tsx',
                syntaxKind: 'PropertySignature',
                name: 'withoutCurrency',
                value: 'boolean',
                description:
                  'Whether to remove the currency symbol from the output.',
                isOptional: true,
              },
              {
                filePath: '/Money.tsx',
                syntaxKind: 'PropertySignature',
                name: 'withoutTrailingZeros',
                value: 'boolean',
                description:
                  'Whether to remove trailing zeros (fractional money) from the output.',
                isOptional: true,
              },
              {
                filePath: '/Money.tsx',
                syntaxKind: 'PropertySignature',
                name: 'measurement',
                value:
                  'PartialDeep<UnitPriceMeasurement, {recurseIntoArrays: true}>',
                description:
                  'A [UnitPriceMeasurement object](https://shopify.dev/api/storefront/2023-07/objects/unitpricemeasurement).',
                isOptional: true,
              },
              {
                filePath: '/Money.tsx',
                syntaxKind: 'PropertySignature',
                name: 'measurementSeparator',
                value: 'ReactNode',
                description:
                  "Customizes the separator between the money output and the measurement output. Used with the `measurement` prop. Defaults to `'/'`.",
                isOptional: true,
              },
            ],
            value:
              "export interface MoneyPropsBase<ComponentGeneric extends React.ElementType> {\n  /** An HTML tag or React Component to be rendered as the base element wrapper. The default is `div`. */\n  as?: ComponentGeneric;\n  /** An object with fields that correspond to the Storefront API's [MoneyV2 object](https://shopify.dev/api/storefront/reference/common-objects/moneyv2). */\n  data: PartialDeep<MoneyV2, {recurseIntoArrays: true}>;\n  /** Whether to remove the currency symbol from the output. */\n  withoutCurrency?: boolean;\n  /** Whether to remove trailing zeros (fractional money) from the output. */\n  withoutTrailingZeros?: boolean;\n  /** A [UnitPriceMeasurement object](https://shopify.dev/api/storefront/2023-07/objects/unitpricemeasurement). */\n  measurement?: PartialDeep<UnitPriceMeasurement, {recurseIntoArrays: true}>;\n  /** Customizes the separator between the money output and the measurement output. Used with the `measurement` prop. Defaults to `'/'`. */\n  measurementSeparator?: ReactNode;\n}",
          },
        },
      },
    ],
  },
  {
    name: 'ModelViewer',
    category: 'components',
    isVisualComponent: false,
    related: [
      {
        name: 'MediaFile',
        type: 'component',
        url: '/api/hydrogen/components/mediafile',
      },
    ],
    description:
      "The `ModelViewer` component renders a 3D model (with the `model-viewer` custom element) for the Storefront API's [Model3d object](https://shopify.dev/api/storefront/reference/products/model3d). The `model-viewer` custom element is lazily downloaded through a dynamically-injected `<script type='module'>` tag when the `<ModelViewer />` component is rendered. ModelViewer is using version `1.21.1` of the `@google/model-viewer` library.",
    type: 'component',
    defaultExample: {
      description: 'I am the default example',
      codeblock: {
        tabs: [
          {
            title: 'JavaScript',
            code: "import {ModelViewer} from '@shopify/hydrogen';\n\nexport default function MyProductModel({products}) {\n  const firstMediaElement = products.nodes[0].media.nodes[0];\n\n  if (firstMediaElement.__typename === 'Model3d') {\n    return &lt;ModelViewer data={firstMediaElement} /&gt;;\n  }\n}\n",
            language: 'jsx',
          },
          {
            title: 'TypeScript',
            code: "import {ModelViewer} from '@shopify/hydrogen';\nimport type {ProductConnection} from '@shopify/hydrogen/storefront-api-types';\n\nexport default function MyProductModel({\n  products,\n}: {\n  products: ProductConnection;\n}) {\n  const firstMediaElement = products.nodes[0].media.nodes[0];\n  if (firstMediaElement.__typename === 'Model3d') {\n    return &lt;ModelViewer data={firstMediaElement} /&gt;;\n  }\n}\n",
            language: 'tsx',
          },
        ],
        title: 'Example code',
      },
    },
    definitions: [
      {
        title: 'Props',
        description: '',
        type: 'ModelViewerBaseProps',
        typeDefinitions: {
          ModelViewerBaseProps: {
            filePath: '/ModelViewer.tsx',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'ModelViewerBaseProps',
            value:
              "{\n  /** An object with fields that correspond to the Storefront API's [Model3D object](https://shopify.dev/api/storefront/2023-07/objects/model3d). */\n  data: PartialDeep<Model3d, {recurseIntoArrays: true}>;\n  /** The callback to invoke when the 'error' event is triggered. Refer to [error in the <model-viewer> documentation](https://modelviewer.dev/docs/index.html#entrydocs-loading-events-error). */\n  onError?: (event: Event) => void;\n  /** The callback to invoke when the `load` event is triggered. Refer to [load in the <model-viewer> documentation](https://modelviewer.dev/docs/index.html#entrydocs-loading-events-load). */\n  onLoad?: (event: Event) => void;\n  /** The callback to invoke when the 'preload' event is triggered. Refer to [preload in the <model-viewer> documentation](https://modelviewer.dev/docs/index.html#entrydocs-loading-events-preload). */\n  onPreload?: (event: Event) => void;\n  /** The callback to invoke when the 'model-visibility' event is triggered. Refer to [model-visibility in the <model-viewer> documentation](https://modelviewer.dev/docs/index.html#entrydocs-loading-events-modelVisibility). */\n  onModelVisibility?: (event: Event) => void;\n  /** The callback to invoke when the 'progress' event is triggered. Refer to [progress in the <model-viewer> documentation](https://modelviewer.dev/docs/index.html#entrydocs-loading-events-progress). */\n  onProgress?: (event: Event) => void;\n  /** The callback to invoke when the 'ar-status' event is triggered. Refer to [ar-status in the <model-viewer> documentation](https://modelviewer.dev/docs/index.html#entrydocs-augmentedreality-events-arStatus). */\n  onArStatus?: (event: Event) => void;\n  /** The callback to invoke when the 'ar-tracking' event is triggered. Refer to [ar-tracking in the <model-viewer> documentation](https://modelviewer.dev/docs/index.html#entrydocs-augmentedreality-events-arTracking). */\n  onArTracking?: (event: Event) => void;\n  /** The callback to invoke when the 'quick-look-button-tapped' event is triggered. Refer to [quick-look-button-tapped in the <model-viewer> documentation](https://modelviewer.dev/docs/index.html#entrydocs-augmentedreality-events-quickLookButtonTapped). */\n  onQuickLookButtonTapped?: (event: Event) => void;\n  /** The callback to invoke when the 'camera-change' event is triggered. Refer to [camera-change in the <model-viewer> documentation](https://modelviewer.dev/docs/index.html#entrydocs-stagingandcameras-events-cameraChange). */\n  onCameraChange?: (event: Event) => void;\n  /** The callback to invoke when the 'environment-change' event is triggered. Refer to [environment-change in the <model-viewer> documentation](https://modelviewer.dev/docs/index.html#entrydocs-lightingandenv-events-environmentChange).  */\n  onEnvironmentChange?: (event: Event) => void;\n  /**  The callback to invoke when the 'play' event is triggered. Refer to [play in the <model-viewer> documentation](https://modelviewer.dev/docs/index.html#entrydocs-animation-events-play). */\n  onPlay?: (event: Event) => void;\n  /**  The callback to invoke when the 'pause' event is triggered. Refer to [pause in the <model-viewer> documentation](https://modelviewer.dev/docs/index.html#entrydocs-animation-events-pause). */\n  onPause?: (event: Event) => void;\n  /** The callback to invoke when the 'scene-graph-ready' event is triggered. Refer to [scene-graph-ready in the <model-viewer> documentation](https://modelviewer.dev/docs/index.html#entrydocs-scenegraph-events-sceneGraphReady). */\n  onSceneGraphReady?: (event: Event) => void;\n}",
            description: '',
            members: [
              {
                filePath: '/ModelViewer.tsx',
                syntaxKind: 'PropertySignature',
                name: 'data',
                value: 'PartialDeep<Model3d, {recurseIntoArrays: true}>',
                description:
                  "An object with fields that correspond to the Storefront API's [Model3D object](https://shopify.dev/api/storefront/2023-07/objects/model3d).",
              },
              {
                filePath: '/ModelViewer.tsx',
                syntaxKind: 'PropertySignature',
                name: 'onError',
                value: '(event: Event) => void',
                description:
                  "The callback to invoke when the 'error' event is triggered. Refer to [error in the <model-viewer> documentation](https://modelviewer.dev/docs/index.html#entrydocs-loading-events-error).",
                isOptional: true,
              },
              {
                filePath: '/ModelViewer.tsx',
                syntaxKind: 'PropertySignature',
                name: 'onLoad',
                value: '(event: Event) => void',
                description:
                  'The callback to invoke when the `load` event is triggered. Refer to [load in the <model-viewer> documentation](https://modelviewer.dev/docs/index.html#entrydocs-loading-events-load).',
                isOptional: true,
              },
              {
                filePath: '/ModelViewer.tsx',
                syntaxKind: 'PropertySignature',
                name: 'onPreload',
                value: '(event: Event) => void',
                description:
                  "The callback to invoke when the 'preload' event is triggered. Refer to [preload in the <model-viewer> documentation](https://modelviewer.dev/docs/index.html#entrydocs-loading-events-preload).",
                isOptional: true,
              },
              {
                filePath: '/ModelViewer.tsx',
                syntaxKind: 'PropertySignature',
                name: 'onModelVisibility',
                value: '(event: Event) => void',
                description:
                  "The callback to invoke when the 'model-visibility' event is triggered. Refer to [model-visibility in the <model-viewer> documentation](https://modelviewer.dev/docs/index.html#entrydocs-loading-events-modelVisibility).",
                isOptional: true,
              },
              {
                filePath: '/ModelViewer.tsx',
                syntaxKind: 'PropertySignature',
                name: 'onProgress',
                value: '(event: Event) => void',
                description:
                  "The callback to invoke when the 'progress' event is triggered. Refer to [progress in the <model-viewer> documentation](https://modelviewer.dev/docs/index.html#entrydocs-loading-events-progress).",
                isOptional: true,
              },
              {
                filePath: '/ModelViewer.tsx',
                syntaxKind: 'PropertySignature',
                name: 'onArStatus',
                value: '(event: Event) => void',
                description:
                  "The callback to invoke when the 'ar-status' event is triggered. Refer to [ar-status in the <model-viewer> documentation](https://modelviewer.dev/docs/index.html#entrydocs-augmentedreality-events-arStatus).",
                isOptional: true,
              },
              {
                filePath: '/ModelViewer.tsx',
                syntaxKind: 'PropertySignature',
                name: 'onArTracking',
                value: '(event: Event) => void',
                description:
                  "The callback to invoke when the 'ar-tracking' event is triggered. Refer to [ar-tracking in the <model-viewer> documentation](https://modelviewer.dev/docs/index.html#entrydocs-augmentedreality-events-arTracking).",
                isOptional: true,
              },
              {
                filePath: '/ModelViewer.tsx',
                syntaxKind: 'PropertySignature',
                name: 'onQuickLookButtonTapped',
                value: '(event: Event) => void',
                description:
                  "The callback to invoke when the 'quick-look-button-tapped' event is triggered. Refer to [quick-look-button-tapped in the <model-viewer> documentation](https://modelviewer.dev/docs/index.html#entrydocs-augmentedreality-events-quickLookButtonTapped).",
                isOptional: true,
              },
              {
                filePath: '/ModelViewer.tsx',
                syntaxKind: 'PropertySignature',
                name: 'onCameraChange',
                value: '(event: Event) => void',
                description:
                  "The callback to invoke when the 'camera-change' event is triggered. Refer to [camera-change in the <model-viewer> documentation](https://modelviewer.dev/docs/index.html#entrydocs-stagingandcameras-events-cameraChange).",
                isOptional: true,
              },
              {
                filePath: '/ModelViewer.tsx',
                syntaxKind: 'PropertySignature',
                name: 'onEnvironmentChange',
                value: '(event: Event) => void',
                description:
                  "The callback to invoke when the 'environment-change' event is triggered. Refer to [environment-change in the <model-viewer> documentation](https://modelviewer.dev/docs/index.html#entrydocs-lightingandenv-events-environmentChange).",
                isOptional: true,
              },
              {
                filePath: '/ModelViewer.tsx',
                syntaxKind: 'PropertySignature',
                name: 'onPlay',
                value: '(event: Event) => void',
                description:
                  "The callback to invoke when the 'play' event is triggered. Refer to [play in the <model-viewer> documentation](https://modelviewer.dev/docs/index.html#entrydocs-animation-events-play).",
                isOptional: true,
              },
              {
                filePath: '/ModelViewer.tsx',
                syntaxKind: 'PropertySignature',
                name: 'onPause',
                value: '(event: Event) => void',
                description:
                  "The callback to invoke when the 'pause' event is triggered. Refer to [pause in the <model-viewer> documentation](https://modelviewer.dev/docs/index.html#entrydocs-animation-events-pause).",
                isOptional: true,
              },
              {
                filePath: '/ModelViewer.tsx',
                syntaxKind: 'PropertySignature',
                name: 'onSceneGraphReady',
                value: '(event: Event) => void',
                description:
                  "The callback to invoke when the 'scene-graph-ready' event is triggered. Refer to [scene-graph-ready in the <model-viewer> documentation](https://modelviewer.dev/docs/index.html#entrydocs-scenegraph-events-sceneGraphReady).",
                isOptional: true,
              },
            ],
          },
        },
      },
    ],
  },
  {
    name: 'ShopPayButton',
    category: 'components',
    isVisualComponent: false,
    related: [],
    description:
      'The `ShopPayButton` component renders a button that redirects to the Shop Pay checkout. It renders a [`<shop-pay-button>`](https://shopify.dev/custom-storefronts/tools/web-components) custom element, for which it will lazy-load the source code automatically.',
    type: 'component',
    defaultExample: {
      description: '<ShopPayButton> without <ShopifyProvider>',
      codeblock: {
        tabs: [
          {
            title: 'JavaScript',
            code: "import {ShopPayButton} from '@shopify/hydrogen';\n\nexport function AddVariantQuantity1({variantId, storeDomain}) {\n  return &lt;ShopPayButton variantIds={[variantId]} storeDomain={storeDomain} /&gt;;\n}\n\nexport function AddVariantQuantityMultiple({variantId, quantity, storeDomain}) {\n  return (\n    &lt;ShopPayButton\n      variantIdsAndQuantities={[{id: variantId, quantity}]}\n      storeDomain={storeDomain}\n    /&gt;\n  );\n}\n",
            language: 'jsx',
          },
          {
            title: 'TypeScript',
            code: "import {ShopPayButton} from '@shopify/hydrogen';\n\nexport function AddVariantQuantity1({\n  variantId,\n  storeDomain,\n}: {\n  variantId: string;\n  storeDomain: string;\n}) {\n  return &lt;ShopPayButton variantIds={[variantId]} storeDomain={storeDomain} /&gt;;\n}\n\nexport function AddVariantQuantityMultiple({\n  variantId,\n  quantity,\n  storeDomain,\n}: {\n  variantId: string;\n  quantity: number;\n  storeDomain: string;\n}) {\n  return (\n    &lt;ShopPayButton\n      variantIdsAndQuantities={[{id: variantId, quantity}]}\n      storeDomain={storeDomain}\n    /&gt;\n  );\n}\n",
            language: 'tsx',
          },
        ],
        title: '<ShopPayButton> without <ShopifyProvider>',
      },
    },
    examples: {
      description: '',
      examples: [
        {
          description:
            'If `<ShopifyProvider>` context provider is used in your app, you can use the `<ShopPayButton>` without supplying a `storeDomain` prop',
          codeblock: {
            tabs: [
              {
                title: 'JavaScript',
                code: 'import {ShopifyProvider, ShopPayButton} from \'@shopify/hydrogen\';\n\nexport default function App() {\n  return (\n    &lt;ShopifyProvider\n      storeDomain="my-store"\n      storefrontToken="abc123"\n      storefrontApiVersion="2023-01"\n      countryIsoCode="CA"\n      languageIsoCode="EN"\n    &gt;\n      &lt;AddVariantQuantity1 variantId="gid://shopify/ProductVariant/1" /&gt;\n    &lt;/ShopifyProvider&gt;\n  );\n}\n\nexport function AddVariantQuantity1({variantId}) {\n  return &lt;ShopPayButton variantIds={[variantId]} /&gt;;\n}\n',
                language: 'jsx',
              },
              {
                title: 'TypeScript',
                code: 'import {ShopifyProvider, ShopPayButton} from \'@shopify/hydrogen\';\n\nexport default function App() {\n  return (\n    &lt;ShopifyProvider\n      storeDomain="my-store"\n      storefrontToken="abc123"\n      storefrontApiVersion="2023-01"\n      countryIsoCode="CA"\n      languageIsoCode="EN"\n    &gt;\n      &lt;AddVariantQuantity1 variantId="gid://shopify/ProductVariant/1" /&gt;\n    &lt;/ShopifyProvider&gt;\n  );\n}\n\nexport function AddVariantQuantity1({variantId}: {variantId: string}) {\n  return &lt;ShopPayButton variantIds={[variantId]} /&gt;;\n}\n',
                language: 'tsx',
              },
            ],
            title: '<ShopPayButton> with <ShopifyProvider>',
          },
        },
      ],
    },
    definitions: [
      {
        title: 'Props',
        description: '',
        type: 'ShopPayButtonProps',
        typeDefinitions: {
          ShopPayButtonProps: {
            filePath: '/ShopPayButton.tsx',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'ShopPayButtonProps',
            value:
              'ShopPayButtonStyleProps & ShopPayDomainProps & (ShopPayVariantIds | ShopPayVariantAndQuantities)',
            description: '',
          },
          ShopPayButtonStyleProps: {
            filePath: '/ShopPayButton.tsx',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'ShopPayButtonStyleProps',
            value:
              "{\n  /** A string of classes to apply to the `div` that wraps the Shop Pay button. */\n  className?: string;\n  /** A string that's applied to the [CSS custom property (variable)](https://developer.mozilla.org/en-US/docs/Web/CSS/--*) `--shop-pay-button-width` for the [Buy with Shop Pay component](https://shopify.dev/custom-storefronts/tools/web-components#buy-with-shop-pay-component). */\n  width?: string;\n}",
            description: '',
            members: [
              {
                filePath: '/ShopPayButton.tsx',
                syntaxKind: 'PropertySignature',
                name: 'className',
                value: 'string',
                description:
                  'A string of classes to apply to the `div` that wraps the Shop Pay button.',
                isOptional: true,
              },
              {
                filePath: '/ShopPayButton.tsx',
                syntaxKind: 'PropertySignature',
                name: 'width',
                value: 'string',
                description:
                  "A string that's applied to the [CSS custom property (variable)](https://developer.mozilla.org/en-US/docs/Web/CSS/--*) `--shop-pay-button-width` for the [Buy with Shop Pay component](https://shopify.dev/custom-storefronts/tools/web-components#buy-with-shop-pay-component).",
                isOptional: true,
              },
            ],
          },
          ShopPayDomainProps: {
            filePath: '/ShopPayButton.tsx',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'ShopPayDomainProps',
            value:
              '{\n  /** The domain of your Shopify storefront URL (eg: `your-store.myshopify.com`). */\n  storeDomain?: string;\n}',
            description: '',
            members: [
              {
                filePath: '/ShopPayButton.tsx',
                syntaxKind: 'PropertySignature',
                name: 'storeDomain',
                value: 'string',
                description:
                  'The domain of your Shopify storefront URL (eg: `your-store.myshopify.com`).',
                isOptional: true,
              },
            ],
          },
          ShopPayVariantIds: {
            filePath: '/ShopPayButton.tsx',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'ShopPayVariantIds',
            value:
              '{\n  /** An array of IDs of the variants to purchase with Shop Pay. This will only ever have a quantity of 1 for each variant. If you want to use other quantities, then use `variantIdsAndQuantities`. */\n  variantIds: string[];\n  /** An array of variant IDs and quantities to purchase with Shop Pay. */\n  variantIdsAndQuantities?: never;\n}',
            description: '',
            members: [
              {
                filePath: '/ShopPayButton.tsx',
                syntaxKind: 'PropertySignature',
                name: 'variantIds',
                value: 'string[]',
                description:
                  'An array of IDs of the variants to purchase with Shop Pay. This will only ever have a quantity of 1 for each variant. If you want to use other quantities, then use `variantIdsAndQuantities`.',
              },
              {
                filePath: '/ShopPayButton.tsx',
                syntaxKind: 'PropertySignature',
                name: 'variantIdsAndQuantities',
                value: 'never',
                description:
                  'An array of variant IDs and quantities to purchase with Shop Pay.',
                isOptional: true,
              },
            ],
          },
          ShopPayVariantAndQuantities: {
            filePath: '/ShopPayButton.tsx',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'ShopPayVariantAndQuantities',
            value:
              '{\n  /** An array of IDs of the variants to purchase with Shop Pay. This will only ever have a quantity of 1 for each variant. If you want to use other quantities, then use `variantIdsAndQuantities`. */\n  variantIds?: never;\n  /** An array of variant IDs and quantities to purchase with Shop Pay. */\n  variantIdsAndQuantities: Array<{\n    id: string;\n    quantity: number;\n  }>;\n}',
            description: '',
            members: [
              {
                filePath: '/ShopPayButton.tsx',
                syntaxKind: 'PropertySignature',
                name: 'variantIds',
                value: 'never',
                description:
                  'An array of IDs of the variants to purchase with Shop Pay. This will only ever have a quantity of 1 for each variant. If you want to use other quantities, then use `variantIdsAndQuantities`.',
                isOptional: true,
              },
              {
                filePath: '/ShopPayButton.tsx',
                syntaxKind: 'PropertySignature',
                name: 'variantIdsAndQuantities',
                value: 'Array<{\n    id: string;\n    quantity: number;\n  }>',
                description:
                  'An array of variant IDs and quantities to purchase with Shop Pay.',
              },
            ],
          },
        },
      },
    ],
  },
  {
    name: 'Video',
    category: 'components',
    isVisualComponent: false,
    related: [
      {
        name: 'MediaFile',
        type: 'component',
        url: '/api/hydrogen/hooks/mediafile',
      },
      {
        name: 'Image',
        type: 'component',
        url: '/api/hydrogen/hooks/image',
      },
    ],
    description:
      "The `Video` component renders a video for the Storefront API's [Video object](https://shopify.dev/api/storefront/reference/products/video).\nThe component outputs a `video` element. You can [customize this component](https://shopify.dev/api/hydrogen/components#customizing-hydrogen-components) using passthrough props.",
    type: 'component',
    defaultExample: {
      description: 'I am the default example',
      codeblock: {
        tabs: [
          {
            title: 'JavaScript',
            code: "import {Video} from '@shopify/hydrogen';\n\nexport default function MyProductVideo({products}) {\n  const firstMediaElement = products.edges[0].node.media.edges[0].node;\n\n  if (firstMediaElement.__typename === 'Video') {\n    return &lt;Video data={firstMediaElement} /&gt;;\n  }\n}\n",
            language: 'jsx',
          },
          {
            title: 'TypeScript',
            code: "import {Video} from '@shopify/hydrogen';\nimport type {ProductConnection} from '@shopify/hydrogen/storefront-api-types';\n\nexport default function MyProductVideo({\n  products,\n}: {\n  products: ProductConnection;\n}) {\n  const firstMediaElement = products.edges[0].node.media.edges[0].node;\n\n  if (firstMediaElement.__typename === 'Video') {\n    return &lt;Video data={firstMediaElement} /&gt;;\n  }\n}\n",
            language: 'tsx',
          },
        ],
        title: 'Example code',
      },
    },
    definitions: [
      {
        title: 'Props',
        description: '',
        type: 'VideoProps',
        typeDefinitions: {
          VideoProps: {
            filePath: '/Video.tsx',
            name: 'VideoProps',
            description: '',
            members: [
              {
                filePath: '/Video.tsx',
                syntaxKind: 'PropertySignature',
                name: 'data',
                value: 'PartialDeep<VideoType, {recurseIntoArrays: true}>',
                description:
                  "An object with fields that correspond to the Storefront API's [Video object](https://shopify.dev/api/storefront/2023-07/objects/video).",
              },
              {
                filePath: '/Video.tsx',
                syntaxKind: 'PropertySignature',
                name: 'previewImageOptions',
                value: 'LoaderParams',
                description:
                  "An object of image size options for the video's `previewImage`. Uses `shopifyImageLoader` to generate the `poster` URL.",
                isOptional: true,
              },
              {
                filePath: '/Video.tsx',
                syntaxKind: 'PropertySignature',
                name: 'sourceProps',
                value:
                  "HTMLAttributes<HTMLSourceElement> & { 'data-testid'?: string; }",
                description:
                  "Props that will be passed to the `video` element's `source` children elements.",
                isOptional: true,
              },
            ],
            value:
              "export interface VideoProps {\n  /** An object with fields that correspond to the Storefront API's [Video object](https://shopify.dev/api/storefront/2023-07/objects/video). */\n  data: PartialDeep<VideoType, {recurseIntoArrays: true}>;\n  /** An object of image size options for the video's `previewImage`. Uses `shopifyImageLoader` to generate the `poster` URL. */\n  previewImageOptions?: Parameters<typeof shopifyLoader>[0];\n  /** Props that will be passed to the `video` element's `source` children elements. */\n  sourceProps?: HTMLAttributes<HTMLSourceElement> & {\n    'data-testid'?: string;\n  };\n}",
          },
          LoaderParams: {
            filePath: '/Image.tsx',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'LoaderParams',
            value:
              "{\n  /** The base URL of the image */\n  src?: ImageType['url'];\n  /** The URL param that controls width */\n  width?: number;\n  /** The URL param that controls height */\n  height?: number;\n  /** The URL param that controls the cropping region */\n  crop?: Crop;\n}",
            description: '',
            members: [
              {
                filePath: '/Image.tsx',
                syntaxKind: 'PropertySignature',
                name: 'src',
                value: 'string',
                description: 'The base URL of the image',
                isOptional: true,
              },
              {
                filePath: '/Image.tsx',
                syntaxKind: 'PropertySignature',
                name: 'width',
                value: 'number',
                description: 'The URL param that controls width',
                isOptional: true,
              },
              {
                filePath: '/Image.tsx',
                syntaxKind: 'PropertySignature',
                name: 'height',
                value: 'number',
                description: 'The URL param that controls height',
                isOptional: true,
              },
              {
                filePath: '/Image.tsx',
                syntaxKind: 'PropertySignature',
                name: 'crop',
                value: 'Crop',
                description: 'The URL param that controls the cropping region',
                isOptional: true,
              },
            ],
          },
          Crop: {
            filePath: '/Image.tsx',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'Crop',
            value: "'center' | 'top' | 'bottom' | 'left' | 'right'",
            description: '',
          },
        },
      },
    ],
  },
  {
    name: 'useMoney',
    category: 'hooks',
    isVisualComponent: false,
    related: [
      {
        name: 'Money',
        type: 'component',
        url: '/api/hydrogen/components/money',
      },
    ],
    description:
      '\n    The `useMoney` hook takes a [MoneyV2 object](https://shopify.dev/api/storefront/reference/common-objects/moneyv2) and returns a\n    default-formatted string of the amount with the correct currency indicator, along with some of the parts provided by\n    [Intl.NumberFormat](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat).\n  ',
    type: 'hook',
    defaultExample: {
      description: 'I am the default example',
      codeblock: {
        tabs: [
          {
            title: 'JavaScript',
            code: "import {useMoney, ShopifyProvider} from '@shopify/hydrogen';\n\nexport function App() {\n  return (\n    &lt;ShopifyProvider languageIsoCode=\"EN\" countryIsoCode=\"US\"&gt;\n      &lt;UsingMoney /&gt;\n    &lt;/ShopifyProvider&gt;\n  );\n}\n\nfunction UsingMoney() {\n  const myMoney = {amount: '100', currencyCode: 'USD'};\n  const money = useMoney(myMoney);\n  return (\n    &lt;&gt;\n      &lt;div&gt;Localized money: {money.localizedString}&lt;/div&gt;\n      &lt;div&gt;Money without trailing zeros: {money.withoutTrailingZeros}&lt;/div&gt;\n    &lt;/&gt;\n  );\n}\n",
            language: 'jsx',
          },
          {
            title: 'TypeScript',
            code: "import {useMoney, ShopifyProvider} from '@shopify/hydrogen';\nimport type {MoneyV2} from '@shopify/hydrogen/storefront-api-types';\n\nexport function App() {\n  return (\n    // @ts-expect-error intentionally missing the rest of the props\n    &lt;ShopifyProvider countryIsoCode=\"US\" languageIsoCode=\"EN\"&gt;\n      &lt;UsingMoney /&gt;\n    &lt;/ShopifyProvider&gt;\n  );\n}\n\nfunction UsingMoney() {\n  const myMoney = {amount: '100', currencyCode: 'USD'} satisfies MoneyV2;\n  const money = useMoney(myMoney);\n  return (\n    &lt;&gt;\n      &lt;div&gt;Localized money: {money.localizedString}&lt;/div&gt;\n      &lt;div&gt;Money without trailing zeros: {money.withoutTrailingZeros}&lt;/div&gt;\n    &lt;/&gt;\n  );\n}\n",
            language: 'tsx',
          },
        ],
        title: 'Example code',
      },
    },
    definitions: [
      {
        title: 'Props',
        description:
          '`useMoney` must be a descendent of a `ShopifyProvider` component.',
        type: 'UseMoneyGeneratedType',
        typeDefinitions: {
          UseMoneyGeneratedType: {
            filePath: '/useMoney.tsx',
            name: 'UseMoneyGeneratedType',
            description:
              'The `useMoney` hook takes a [MoneyV2 object](https://shopify.dev/api/storefront/reference/common-objects/moneyv2) and returns a default-formatted string of the amount with the correct currency indicator, along with some of the parts provided by [Intl.NumberFormat](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat). Uses `locale` from `ShopifyProvider` &nbsp;',
            params: [
              {
                name: 'money',
                description: '',
                value: 'MoneyV2',
                filePath: '/useMoney.tsx',
              },
            ],
            returns: {
              filePath: '/useMoney.tsx',
              description: '',
              name: 'UseMoneyValue',
              value: 'UseMoneyValue',
            },
            value:
              "export function useMoney(money: MoneyV2): UseMoneyValue {\n  const {countryIsoCode, languageIsoCode} = useShop();\n  const locale = languageIsoCode.includes('_')\n    ? languageIsoCode.replace('_', '-')\n    : `${languageIsoCode}-${countryIsoCode}`;\n\n  if (!locale) {\n    throw new Error(\n      `useMoney(): Unable to get 'locale' from 'useShop()', which means that 'locale' was not passed to '<ShopifyProvider/>'. 'locale' is required for 'useMoney()' to work`,\n    );\n  }\n\n  const amount = parseFloat(money.amount);\n\n  const options = useMemo(\n    () => ({\n      style: 'currency',\n      currency: money.currencyCode,\n    }),\n    [money.currencyCode],\n  );\n\n  const defaultFormatter = useLazyFormatter(locale, options);\n\n  const nameFormatter = useLazyFormatter(locale, {\n    ...options,\n    currencyDisplay: 'name',\n  });\n\n  const narrowSymbolFormatter = useLazyFormatter(locale, {\n    ...options,\n    currencyDisplay: 'narrowSymbol',\n  });\n\n  const withoutTrailingZerosFormatter = useLazyFormatter(locale, {\n    ...options,\n    minimumFractionDigits: 0,\n    maximumFractionDigits: 0,\n  });\n\n  const withoutCurrencyFormatter = useLazyFormatter(locale);\n\n  const withoutTrailingZerosOrCurrencyFormatter = useLazyFormatter(locale, {\n    minimumFractionDigits: 0,\n    maximumFractionDigits: 0,\n  });\n\n  const isPartCurrency = (part: Intl.NumberFormatPart): boolean =>\n    part.type === 'currency';\n\n  // By wrapping these properties in functions, we only\n  // create formatters if they are going to be used.\n  const lazyFormatters = useMemo(\n    () => ({\n      original: () => money,\n      currencyCode: () => money.currencyCode,\n\n      localizedString: () => defaultFormatter().format(amount),\n\n      parts: () => defaultFormatter().formatToParts(amount),\n\n      withoutTrailingZeros: () =>\n        amount % 1 === 0\n          ? withoutTrailingZerosFormatter().format(amount)\n          : defaultFormatter().format(amount),\n\n      withoutTrailingZerosAndCurrency: () =>\n        amount % 1 === 0\n          ? withoutTrailingZerosOrCurrencyFormatter().format(amount)\n          : withoutCurrencyFormatter().format(amount),\n\n      currencyName: () =>\n        nameFormatter().formatToParts(amount).find(isPartCurrency)?.value ??\n        money.currencyCode, // e.g. \"US dollars\"\n\n      currencySymbol: () =>\n        defaultFormatter().formatToParts(amount).find(isPartCurrency)?.value ??\n        money.currencyCode, // e.g. \"USD\"\n\n      currencyNarrowSymbol: () =>\n        narrowSymbolFormatter().formatToParts(amount).find(isPartCurrency)\n          ?.value ?? '', // e.g. \"$\"\n\n      amount: () =>\n        defaultFormatter()\n          .formatToParts(amount)\n          .filter((part) =>\n            ['decimal', 'fraction', 'group', 'integer', 'literal'].includes(\n              part.type,\n            ),\n          )\n          .map((part) => part.value)\n          .join(''),\n    }),\n    [\n      money,\n      amount,\n      nameFormatter,\n      defaultFormatter,\n      narrowSymbolFormatter,\n      withoutCurrencyFormatter,\n      withoutTrailingZerosFormatter,\n      withoutTrailingZerosOrCurrencyFormatter,\n    ],\n  );\n\n  // Call functions automatically when the properties are accessed\n  // to keep these functions as an implementation detail.\n  return useMemo(\n    () =>\n      new Proxy(lazyFormatters as unknown as UseMoneyValue, {\n        // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call\n        get: (target, key) => Reflect.get(target, key)?.call(null),\n      }),\n    [lazyFormatters],\n  );\n}",
            examples: [
              {
                title: 'Example',
                description: '',
                tabs: [
                  {
                    code: 'initialize the money object',
                    title: 'Example',
                  },
                  {
                    code: "const money = useMoney({\namount: '100.00',\ncurrencyCode: 'USD'\n})",
                    title: 'Example',
                  },
                  {
                    code: '&nbsp;',
                    title: 'Example',
                  },
                ],
              },
              {
                title: 'Example',
                description: '',
                tabs: [
                  {
                    code: 'basic usage, outputs: $100.00',
                    title: 'Example',
                  },
                  {
                    code: 'money.localizedString',
                    title: 'Example',
                  },
                  {
                    code: '&nbsp;',
                    title: 'Example',
                  },
                ],
              },
              {
                title: 'Example',
                description: '',
                tabs: [
                  {
                    code: 'without currency, outputs: 100.00',
                    title: 'Example',
                  },
                  {
                    code: 'money.amount',
                    title: 'Example',
                  },
                  {
                    code: '&nbsp;',
                    title: 'Example',
                  },
                ],
              },
              {
                title: 'Example',
                description: '',
                tabs: [
                  {
                    code: 'without trailing zeros, outputs: $100',
                    title: 'Example',
                  },
                  {
                    code: 'money.withoutTrailingZeros',
                    title: 'Example',
                  },
                  {
                    code: '&nbsp;',
                    title: 'Example',
                  },
                ],
              },
              {
                title: 'Example',
                description: '',
                tabs: [
                  {
                    code: 'currency name, outputs: US dollars',
                    title: 'Example',
                  },
                  {
                    code: 'money.currencyCode',
                    title: 'Example',
                  },
                  {
                    code: '&nbsp;',
                    title: 'Example',
                  },
                ],
              },
              {
                title: 'Example',
                description: '',
                tabs: [
                  {
                    code: 'currency symbol, outputs: $',
                    title: 'Example',
                  },
                  {
                    code: 'money.currencySymbol',
                    title: 'Example',
                  },
                  {
                    code: '&nbsp;',
                    title: 'Example',
                  },
                ],
              },
              {
                title: 'Example',
                description: '',
                tabs: [
                  {
                    code: 'without currency and without trailing zeros, outputs: 100',
                    title: 'Example',
                  },
                  {
                    code: 'money.withoutTrailingZerosAndCurrency',
                    title: 'Example',
                  },
                ],
              },
            ],
          },
          UseMoneyValue: {
            filePath: '/useMoney.tsx',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'UseMoneyValue',
            value:
              '{\n  /**\n   * The currency code from the `MoneyV2` object.\n   */\n  currencyCode: CurrencyCode;\n  /**\n   * The name for the currency code, returned by `Intl.NumberFormat`.\n   */\n  currencyName?: string;\n  /**\n   * The currency symbol returned by `Intl.NumberFormat`.\n   */\n  currencySymbol?: string;\n  /**\n   * The currency narrow symbol returned by `Intl.NumberFormat`.\n   */\n  currencyNarrowSymbol?: string;\n  /**\n   * The localized amount, without any currency symbols or non-number types from the `Intl.NumberFormat.formatToParts` parts.\n   */\n  amount: string;\n  /**\n   * All parts returned by `Intl.NumberFormat.formatToParts`.\n   */\n  parts: Intl.NumberFormatPart[];\n  /**\n   * A string returned by `new Intl.NumberFormat` for the amount and currency code,\n   * using the `locale` value in the [`LocalizationProvider` component](https://shopify.dev/api/hydrogen/components/localization/localizationprovider).\n   */\n  localizedString: string;\n  /**\n   * The `MoneyV2` object provided as an argument to the hook.\n   */\n  original: MoneyV2;\n  /**\n   * A string with trailing zeros removed from the fractional part, if any exist. If there are no trailing zeros, then the fractional part remains.\n   * For example, `$640.00` turns into `$640`.\n   * `$640.42` remains `$640.42`.\n   */\n  withoutTrailingZeros: string;\n  /**\n   * A string without currency and without trailing zeros removed from the fractional part, if any exist. If there are no trailing zeros, then the fractional part remains.\n   * For example, `$640.00` turns into `640`.\n   * `$640.42` turns into `640.42`.\n   */\n  withoutTrailingZerosAndCurrency: string;\n}',
            description: '',
            members: [
              {
                filePath: '/useMoney.tsx',
                syntaxKind: 'PropertySignature',
                name: 'currencyCode',
                value: 'CurrencyCode',
                description: 'The currency code from the `MoneyV2` object.',
              },
              {
                filePath: '/useMoney.tsx',
                syntaxKind: 'PropertySignature',
                name: 'currencyName',
                value: 'string',
                description:
                  'The name for the currency code, returned by `Intl.NumberFormat`.',
                isOptional: true,
              },
              {
                filePath: '/useMoney.tsx',
                syntaxKind: 'PropertySignature',
                name: 'currencySymbol',
                value: 'string',
                description:
                  'The currency symbol returned by `Intl.NumberFormat`.',
                isOptional: true,
              },
              {
                filePath: '/useMoney.tsx',
                syntaxKind: 'PropertySignature',
                name: 'currencyNarrowSymbol',
                value: 'string',
                description:
                  'The currency narrow symbol returned by `Intl.NumberFormat`.',
                isOptional: true,
              },
              {
                filePath: '/useMoney.tsx',
                syntaxKind: 'PropertySignature',
                name: 'amount',
                value: 'string',
                description:
                  'The localized amount, without any currency symbols or non-number types from the `Intl.NumberFormat.formatToParts` parts.',
              },
              {
                filePath: '/useMoney.tsx',
                syntaxKind: 'PropertySignature',
                name: 'parts',
                value: 'NumberFormatPart[]',
                description:
                  'All parts returned by `Intl.NumberFormat.formatToParts`.',
              },
              {
                filePath: '/useMoney.tsx',
                syntaxKind: 'PropertySignature',
                name: 'localizedString',
                value: 'string',
                description:
                  'A string returned by `new Intl.NumberFormat` for the amount and currency code, using the `locale` value in the [`LocalizationProvider` component](https://shopify.dev/api/hydrogen/components/localization/localizationprovider).',
              },
              {
                filePath: '/useMoney.tsx',
                syntaxKind: 'PropertySignature',
                name: 'original',
                value: 'MoneyV2',
                description:
                  'The `MoneyV2` object provided as an argument to the hook.',
              },
              {
                filePath: '/useMoney.tsx',
                syntaxKind: 'PropertySignature',
                name: 'withoutTrailingZeros',
                value: 'string',
                description:
                  'A string with trailing zeros removed from the fractional part, if any exist. If there are no trailing zeros, then the fractional part remains. For example, `$640.00` turns into `$640`. `$640.42` remains `$640.42`.',
              },
              {
                filePath: '/useMoney.tsx',
                syntaxKind: 'PropertySignature',
                name: 'withoutTrailingZerosAndCurrency',
                value: 'string',
                description:
                  'A string without currency and without trailing zeros removed from the fractional part, if any exist. If there are no trailing zeros, then the fractional part remains. For example, `$640.00` turns into `640`. `$640.42` turns into `640.42`.',
              },
            ],
          },
        },
      },
    ],
  },
  {
    name: 'useLoadScript',
    category: 'hooks',
    isVisualComponent: false,
    related: [],
    description:
      'The `useLoadScript` hook loads an external script tag in the browser. It allows React components to lazy-load third-party dependencies.',
    type: 'hook',
    defaultExample: {
      description: 'I am the default example',
      codeblock: {
        tabs: [
          {
            title: 'JavaScript',
            code: "import React, {useEffect} from 'react';\nimport {useLoadScript} from '@shopify/hydrogen';\n\nexport default function Homepage() {\n  const scriptStatus = useLoadScript('https://some-cdn.com/some-script.js');\n\n  useEffect(() =&gt; {\n    if (scriptStatus === 'done') {\n      // do something\n    }\n  }, [scriptStatus]);\n\n  return &lt;div&gt;{scriptStatus === 'done' && &lt;p&gt;Script loaded!&lt;/p&gt;}&lt;/div&gt;;\n}\n",
            language: 'jsx',
          },
          {
            title: 'TypeScript',
            code: "import React, {useEffect} from 'react';\nimport {useLoadScript} from '@shopify/hydrogen';\n\nexport default function Homepage() {\n  const scriptStatus = useLoadScript('https://some-cdn.com/some-script.js');\n\n  useEffect(() =&gt; {\n    if (scriptStatus === 'done') {\n      // do something\n    }\n  }, [scriptStatus]);\n\n  return &lt;div&gt;{scriptStatus === 'done' && &lt;p&gt;Script loaded!&lt;/p&gt;}&lt;/div&gt;;\n}\n",
            language: 'tsx',
          },
        ],
        title: 'Example code',
      },
    },
    definitions: [
      {
        title: 'Props',
        description: '',
        type: 'LoadScriptParams',
        typeDefinitions: {
          LoadScriptParams: {
            filePath: '/load-script.tsx',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'LoadScriptParams',
            value:
              '[src: string, options?: { module?: boolean; in?: "body" | "head"; }]',
            description: '',
          },
        },
      },
    ],
  },
  {
    name: 'useShopifyCookies',
    category: 'hooks',
    isVisualComponent: false,
    related: [
      {
        subtitle: 'Utility',
        name: 'sendShopifyAnalytics',
        url: '/api/hydrogen/utilities/sendShopifyAnalytics',
        type: 'gear',
      },
      {
        subtitle: 'Utility',
        name: 'getClientBrowserParameters',
        url: '/api/hydrogen/utilities/getclientbrowserparameters',
        type: 'gear',
      },
      {
        subtitle: 'Utility',
        name: 'getShopifyCookies',
        url: '/api/hydrogen/utilities/getShopifyCookies',
        type: 'gear',
      },
    ],
    description:
      'Sets Shopify user and session cookies and refreshes the expiry time.',
    type: 'hooks',
    defaultExample: {
      description: 'I am the default example',
      codeblock: {
        tabs: [
          {
            title: 'JavaScript',
            code: "import * as React from 'react';\nimport {useShopifyCookies} from '@shopify/hydrogen';\n\nexport default function App({Component, pageProps}) {\n  useShopifyCookies({hasUserConsent: false});\n\n  return &lt;Component {...pageProps} /&gt;;\n}\n",
            language: 'jsx',
          },
          {
            title: 'TypeScript',
            code: "import * as React from 'react';\nimport {useShopifyCookies} from '@shopify/hydrogen';\n\nexport default function App({Component, pageProps}) {\n  useShopifyCookies({hasUserConsent: false});\n\n  return &lt;Component {...pageProps} /&gt;;\n}\n",
            language: 'tsx',
          },
        ],
        title: 'Example code',
      },
    },
    definitions: [
      {
        title: 'useShopifyCookies',
        description:
          'Manages Shopify cookies. If `hasUserConsent` option is false, Shopify cookies will be removed.',
        type: 'UseShopifyCookiesGeneratedType',
        typeDefinitions: {
          UseShopifyCookiesGeneratedType: {
            filePath: '/useShopifyCookies.tsx',
            name: 'UseShopifyCookiesGeneratedType',
            description: '',
            params: [
              {
                name: 'options',
                description: '',
                value: 'UseShopifyCookiesOptions',
                isOptional: true,
                filePath: '/useShopifyCookies.tsx',
              },
            ],
            returns: {
              filePath: '/useShopifyCookies.tsx',
              description: '',
              name: 'void',
              value: 'void',
            },
            value:
              "export function useShopifyCookies(options?: UseShopifyCookiesOptions): void {\n  const {hasUserConsent = false, domain = ''} = options || {};\n  useEffect(() => {\n    const cookies = getShopifyCookies(document.cookie);\n\n    /**\n     * Set user and session cookies and refresh the expiry time\n     */\n    if (hasUserConsent) {\n      setCookie(\n        SHOPIFY_Y,\n        cookies[SHOPIFY_Y] || buildUUID(),\n        longTermLength,\n        domain,\n      );\n      setCookie(\n        SHOPIFY_S,\n        cookies[SHOPIFY_S] || buildUUID(),\n        shortTermLength,\n        domain,\n      );\n    } else {\n      setCookie(SHOPIFY_Y, '', 0, domain);\n      setCookie(SHOPIFY_S, '', 0, domain);\n    }\n  });\n}",
          },
          UseShopifyCookiesOptions: {
            filePath: '/useShopifyCookies.tsx',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'UseShopifyCookiesOptions',
            value:
              '{\n  /**\n   * If set to `false`, Shopify cookies will be removed.\n   * If set to `true`, Shopify unique user token cookie will have cookie expiry of 1 year.\n   * Defaults to false.\n   **/\n  hasUserConsent?: boolean;\n  /**\n   * The domain scope of the cookie. Defaults to empty string.\n   **/\n  domain?: string;\n}',
            description: '',
            members: [
              {
                filePath: '/useShopifyCookies.tsx',
                syntaxKind: 'PropertySignature',
                name: 'hasUserConsent',
                value: 'boolean',
                description:
                  'If set to `false`, Shopify cookies will be removed. If set to `true`, Shopify unique user token cookie will have cookie expiry of 1 year. Defaults to false.',
                isOptional: true,
              },
              {
                filePath: '/useShopifyCookies.tsx',
                syntaxKind: 'PropertySignature',
                name: 'domain',
                value: 'string',
                description:
                  'The domain scope of the cookie. Defaults to empty string.',
                isOptional: true,
              },
            ],
          },
        },
      },
    ],
  },
  {
    name: 'flattenConnection',
    category: 'utilities',
    isVisualComponent: false,
    related: [],
    description:
      '\n    The `flattenConnection` utility transforms a connection object from the Storefront API (for example, [Product-related connections](https://shopify.dev/api/storefront/reference/products/product)) into a flat array of nodes. The utility works with either `nodes` or `edges.node`.\n\nIf `connection` is null or undefined, will return an empty array instead in production. In development, an error will be thrown.\n  ',
    type: 'utility',
    defaultExample: {
      description: 'I am the default example',
      codeblock: {
        tabs: [
          {
            title: 'JavaScript',
            code: "import {flattenConnection} from '@shopify/hydrogen';\n\nexport function ProductList({productConnection}) {\n  const products = flattenConnection(productConnection);\n  return (\n    &lt;ul&gt;\n      {products.map((product) =&gt; (\n        &lt;li key={product.id}&gt;{product.title}&lt;/li&gt;\n      ))}\n    &lt;/ul&gt;\n  );\n}\n",
            language: 'jsx',
          },
          {
            title: 'TypeScript',
            code: "import {flattenConnection} from '@shopify/hydrogen';\nimport type {ProductConnection} from '@shopify/hydrogen/storefront-api-types';\n\nexport function ProductList({\n  productConnection,\n}: {\n  productConnection: ProductConnection;\n}) {\n  const products = flattenConnection(productConnection);\n  return (\n    &lt;ul&gt;\n      {products.map((product) =&gt; (\n        &lt;li key={product.id}&gt;{product.title}&lt;/li&gt;\n      ))}\n    &lt;/ul&gt;\n  );\n}\n",
            language: 'tsx',
          },
        ],
        title: 'Example code',
      },
    },
    definitions: [
      {
        title: 'Parameters',
        description: '',
        type: 'ConnectionGenericForDoc',
        typeDefinitions: {
          ConnectionGenericForDoc: {
            filePath: '/flatten-connection.ts',
            name: 'ConnectionGenericForDoc',
            description: '',
            members: [
              {
                filePath: '/flatten-connection.ts',
                syntaxKind: 'PropertySignature',
                name: 'connection',
                value: 'ConnectionEdges | ConnectionNodes',
                description: '',
                isOptional: true,
              },
            ],
            value:
              'export interface ConnectionGenericForDoc {\n  connection?: ConnectionEdges | ConnectionNodes;\n}',
          },
          ConnectionEdges: {
            filePath: '/flatten-connection.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'ConnectionEdges',
            value: '{\n  edges: Array<{node: unknown}>;\n}',
            description: '',
            members: [
              {
                filePath: '/flatten-connection.ts',
                syntaxKind: 'PropertySignature',
                name: 'edges',
                value: 'Array<{node: unknown}>',
                description: '',
              },
            ],
          },
          ConnectionNodes: {
            filePath: '/flatten-connection.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'ConnectionNodes',
            value: '{\n  nodes: Array<unknown>;\n}',
            description: '',
            members: [
              {
                filePath: '/flatten-connection.ts',
                syntaxKind: 'PropertySignature',
                name: 'nodes',
                value: 'Array<unknown>',
                description: '',
              },
            ],
          },
        },
      },
      {
        title: 'Returns',
        description: '',
        type: 'FlattenConnectionReturnForDoc',
        typeDefinitions: {
          FlattenConnectionReturnForDoc: {
            filePath: '/flatten-connection.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'FlattenConnectionReturnForDoc',
            value: 'Array<unknown>',
            description: '',
            members: [
              {
                filePath: '/flatten-connection.ts',
                syntaxKind: 'PropertySignature',
                name: 'length',
                value: 'number',
                description:
                  'Gets or sets the length of the array. This is a number one higher than the highest index in the array.',
              },
              {
                filePath: '/flatten-connection.ts',
                syntaxKind: 'MethodSignature',
                name: 'toString',
                value: '() => string',
                description: 'Returns a string representation of an array.',
              },
              {
                filePath: '/flatten-connection.ts',
                syntaxKind: 'MethodSignature',
                name: 'toLocaleString',
                value: '() => string',
                description:
                  'Returns a string representation of an array. The elements are converted to string using their toLocaleString methods.',
              },
              {
                filePath: '/flatten-connection.ts',
                syntaxKind: 'MethodSignature',
                name: 'pop',
                value: '() => unknown',
                description:
                  'Removes the last element from an array and returns it.\r\nIf the array is empty, undefined is returned and the array is not modified.',
              },
              {
                filePath: '/flatten-connection.ts',
                syntaxKind: 'MethodSignature',
                name: 'push',
                value: '(...items: unknown[]) => number',
                description:
                  'Appends new elements to the end of an array, and returns the new length of the array.',
              },
              {
                filePath: '/flatten-connection.ts',
                syntaxKind: 'MethodSignature',
                name: 'concat',
                value:
                  '{ (...items: ConcatArray<unknown>[]): unknown[]; (...items: unknown[]): unknown[]; }',
                description:
                  'Combines two or more arrays.\r\nThis method returns a new array without modifying any existing arrays.',
              },
              {
                filePath: '/flatten-connection.ts',
                syntaxKind: 'MethodSignature',
                name: 'join',
                value: '(separator?: string) => string',
                description:
                  'Adds all the elements of an array into a string, separated by the specified separator string.',
              },
              {
                filePath: '/flatten-connection.ts',
                syntaxKind: 'MethodSignature',
                name: 'reverse',
                value: '() => unknown[]',
                description:
                  'Reverses the elements in an array in place.\r\nThis method mutates the array and returns a reference to the same array.',
              },
              {
                filePath: '/flatten-connection.ts',
                syntaxKind: 'MethodSignature',
                name: 'shift',
                value: '() => unknown',
                description:
                  'Removes the first element from an array and returns it.\r\nIf the array is empty, undefined is returned and the array is not modified.',
              },
              {
                filePath: '/flatten-connection.ts',
                syntaxKind: 'MethodSignature',
                name: 'slice',
                value: '(start?: number, end?: number) => unknown[]',
                description:
                  'Returns a copy of a section of an array.\r\nFor both start and end, a negative index can be used to indicate an offset from the end of the array.\r\nFor example, -2 refers to the second to last element of the array.',
              },
              {
                filePath: '/flatten-connection.ts',
                syntaxKind: 'MethodSignature',
                name: 'sort',
                value:
                  '(compareFn?: (a: unknown, b: unknown) => number) => FlattenConnectionReturnForDoc',
                description:
                  'Sorts an array in place.\r\nThis method mutates the array and returns a reference to the same array.',
              },
              {
                filePath: '/flatten-connection.ts',
                syntaxKind: 'MethodSignature',
                name: 'splice',
                value:
                  '{ (start: number, deleteCount?: number): unknown[]; (start: number, deleteCount: number, ...items: unknown[]): unknown[]; }',
                description:
                  'Removes elements from an array and, if necessary, inserts new elements in their place, returning the deleted elements.',
              },
              {
                filePath: '/flatten-connection.ts',
                syntaxKind: 'MethodSignature',
                name: 'unshift',
                value: '(...items: unknown[]) => number',
                description:
                  'Inserts new elements at the start of an array, and returns the new length of the array.',
              },
              {
                filePath: '/flatten-connection.ts',
                syntaxKind: 'MethodSignature',
                name: 'indexOf',
                value: '(searchElement: unknown, fromIndex?: number) => number',
                description:
                  'Returns the index of the first occurrence of a value in an array, or -1 if it is not present.',
              },
              {
                filePath: '/flatten-connection.ts',
                syntaxKind: 'MethodSignature',
                name: 'lastIndexOf',
                value: '(searchElement: unknown, fromIndex?: number) => number',
                description:
                  'Returns the index of the last occurrence of a specified value in an array, or -1 if it is not present.',
              },
              {
                filePath: '/flatten-connection.ts',
                syntaxKind: 'MethodSignature',
                name: 'every',
                value:
                  '{ <S extends unknown>(predicate: (value: unknown, index: number, array: unknown[]) => value is S, thisArg?: any): this is S[]; (predicate: (value: unknown, index: number, array: unknown[]) => unknown, thisArg?: any): boolean; }',
                description:
                  'Determines whether all the members of an array satisfy the specified test.',
              },
              {
                filePath: '/flatten-connection.ts',
                syntaxKind: 'MethodSignature',
                name: 'some',
                value:
                  '(predicate: (value: unknown, index: number, array: unknown[]) => unknown, thisArg?: any) => boolean',
                description:
                  'Determines whether the specified callback function returns true for any element of an array.',
              },
              {
                filePath: '/flatten-connection.ts',
                syntaxKind: 'MethodSignature',
                name: 'forEach',
                value:
                  '(callbackfn: (value: unknown, index: number, array: unknown[]) => void, thisArg?: any) => void',
                description:
                  'Performs the specified action for each element in an array.',
              },
              {
                filePath: '/flatten-connection.ts',
                syntaxKind: 'MethodSignature',
                name: 'map',
                value:
                  '<U>(callbackfn: (value: unknown, index: number, array: unknown[]) => U, thisArg?: any) => U[]',
                description:
                  'Calls a defined callback function on each element of an array, and returns an array that contains the results.',
              },
              {
                filePath: '/flatten-connection.ts',
                syntaxKind: 'MethodSignature',
                name: 'filter',
                value:
                  '{ <S extends unknown>(predicate: (value: unknown, index: number, array: unknown[]) => value is S, thisArg?: any): S[]; (predicate: (value: unknown, index: number, array: unknown[]) => unknown, thisArg?: any): unknown[]; }',
                description:
                  'Returns the elements of an array that meet the condition specified in a callback function.',
              },
              {
                filePath: '/flatten-connection.ts',
                syntaxKind: 'MethodSignature',
                name: 'reduce',
                value:
                  '{ (callbackfn: (previousValue: unknown, currentValue: unknown, currentIndex: number, array: unknown[]) => unknown): unknown; (callbackfn: (previousValue: unknown, currentValue: unknown, currentIndex: number, array: unknown[]) => unknown, initialValue: unknown): unknown; <U>(callbackfn: (previousValue: U, currentValue: unknown, currentIndex: number, array: unknown[]) => U, initialValue: U): U; }',
                description:
                  'Calls the specified callback function for all the elements in an array. The return value of the callback function is the accumulated result, and is provided as an argument in the next call to the callback function.',
              },
              {
                filePath: '/flatten-connection.ts',
                syntaxKind: 'MethodSignature',
                name: 'reduceRight',
                value:
                  '{ (callbackfn: (previousValue: unknown, currentValue: unknown, currentIndex: number, array: unknown[]) => unknown): unknown; (callbackfn: (previousValue: unknown, currentValue: unknown, currentIndex: number, array: unknown[]) => unknown, initialValue: unknown): unknown; <U>(callbackfn: (previousValue: U, currentValue: unknown, currentIndex: number, array: unknown[]) => U, initialValue: U): U; }',
                description:
                  'Calls the specified callback function for all the elements in an array, in descending order. The return value of the callback function is the accumulated result, and is provided as an argument in the next call to the callback function.',
              },
              {
                filePath: '/flatten-connection.ts',
                syntaxKind: 'MethodSignature',
                name: 'find',
                value:
                  '{ <S extends unknown>(predicate: (this: void, value: unknown, index: number, obj: unknown[]) => value is S, thisArg?: any): S; (predicate: (value: unknown, index: number, obj: unknown[]) => unknown, thisArg?: any): unknown; }',
                description:
                  'Returns the value of the first element in the array where predicate is true, and undefined\r\notherwise.',
              },
              {
                filePath: '/flatten-connection.ts',
                syntaxKind: 'MethodSignature',
                name: 'findIndex',
                value:
                  '(predicate: (value: unknown, index: number, obj: unknown[]) => unknown, thisArg?: any) => number',
                description:
                  'Returns the index of the first element in the array where predicate is true, and -1\r\notherwise.',
              },
              {
                filePath: '/flatten-connection.ts',
                syntaxKind: 'MethodSignature',
                name: 'fill',
                value:
                  '(value: unknown, start?: number, end?: number) => FlattenConnectionReturnForDoc',
                description:
                  'Changes all array elements from `start` to `end` index to a static `value` and returns the modified array',
              },
              {
                filePath: '/flatten-connection.ts',
                syntaxKind: 'MethodSignature',
                name: 'copyWithin',
                value:
                  '(target: number, start: number, end?: number) => FlattenConnectionReturnForDoc',
                description:
                  'Returns the this object after copying a section of the array identified by start and end\r\nto the same array starting at position target',
              },
              {
                filePath: '/flatten-connection.ts',
                syntaxKind: 'MethodSignature',
                name: 'entries',
                value: '() => IterableIterator<[number, unknown]>',
                description:
                  'Returns an iterable of key, value pairs for every entry in the array',
              },
              {
                filePath: '/flatten-connection.ts',
                syntaxKind: 'MethodSignature',
                name: 'keys',
                value: '() => IterableIterator<number>',
                description: 'Returns an iterable of keys in the array',
              },
              {
                filePath: '/flatten-connection.ts',
                syntaxKind: 'MethodSignature',
                name: 'values',
                value: '() => IterableIterator<unknown>',
                description: 'Returns an iterable of values in the array',
              },
              {
                filePath: '/flatten-connection.ts',
                syntaxKind: 'MethodSignature',
                name: 'includes',
                value:
                  '(searchElement: unknown, fromIndex?: number) => boolean',
                description:
                  'Determines whether an array includes a certain element, returning true or false as appropriate.',
              },
              {
                filePath: '/flatten-connection.ts',
                syntaxKind: 'MethodSignature',
                name: 'flatMap',
                value:
                  '<U, This = undefined>(callback: (this: This, value: unknown, index: number, array: unknown[]) => U | readonly U[], thisArg?: This) => U[]',
                description:
                  'Calls a defined callback function on each element of an array. Then, flattens the result into\r\na new array.\r\nThis is identical to a map followed by flat with depth 1.',
              },
              {
                filePath: '/flatten-connection.ts',
                syntaxKind: 'MethodSignature',
                name: 'flat',
                value:
                  '<A, D extends number = 1>(this: A, depth?: D) => FlatArray<A, D>[]',
                description:
                  'Returns a new array with all sub-array elements concatenated into it recursively up to the\r\nspecified depth.',
              },
              {
                filePath: '/flatten-connection.ts',
                syntaxKind: 'MethodSignature',
                name: '__@iterator@441',
                value: '() => IterableIterator<unknown>',
                description: 'Iterator',
              },
              {
                filePath: '/flatten-connection.ts',
                syntaxKind: 'MethodSignature',
                name: '__@unscopables@443',
                value:
                  '() => { copyWithin: boolean; entries: boolean; fill: boolean; find: boolean; findIndex: boolean; keys: boolean; values: boolean; }',
                description:
                  "Returns an object whose properties have the value 'true'\r\nwhen they will be absent when used in a 'with' statement.",
              },
              {
                filePath: '/flatten-connection.ts',
                syntaxKind: 'MethodSignature',
                name: 'at',
                value: '(index: number) => unknown',
                description:
                  'Takes an integer value and returns the item at that index, allowing for positive and negative integers. Negative integers count back from the last item in the array.',
              },
            ],
          },
        },
      },
    ],
  },
  {
    name: 'getClientBrowserParameters',
    category: 'utilities',
    isVisualComponent: false,
    related: [
      {
        subtitle: 'Utility',
        name: 'sendShopifyAnalytics',
        url: '/api/hydrogen/utilities/sendShopifyAnalytics',
        type: 'gear',
      },
      {
        subtitle: 'Hook',
        name: 'useShopifyCookies',
        url: '/api/hydrogen/hooks/useShopifyCookies',
        type: 'tool',
      },
    ],
    description: 'Gathers client browser values commonly used for analytics',
    type: 'utility',
    defaultExample: {
      description: 'I am the default example',
      codeblock: {
        tabs: [
          {
            title: 'JavaScript',
            code: "import * as React from 'react';\nimport {useEffect} from 'react';\nimport {getClientBrowserParameters} from '@shopify/hydrogen';\n\nexport default function App({Component, pageProps}) {\n  useEffect(() =&gt; {\n    getClientBrowserParameters();\n  });\n\n  return &lt;Component {...pageProps} /&gt;;\n}\n",
            language: 'jsx',
          },
          {
            title: 'TypeScript',
            code: "import * as React from 'react';\nimport {useEffect} from 'react';\nimport {getClientBrowserParameters} from '@shopify/hydrogen';\n\nexport default function App({Component, pageProps}) {\n  useEffect(() =&gt; {\n    getClientBrowserParameters();\n  });\n\n  return &lt;Component {...pageProps} /&gt;;\n}\n",
            language: 'tsx',
          },
        ],
        title: 'Example code',
      },
    },
    definitions: [
      {
        title: 'getClientBrowserParameters',
        description:
          'If executed on server, this method will return empty string for each field.',
        type: 'GetClientBrowserParametersGeneratedType',
        typeDefinitions: {
          GetClientBrowserParametersGeneratedType: {
            filePath: '/analytics.ts',
            name: 'GetClientBrowserParametersGeneratedType',
            description: '',
            params: [],
            returns: {
              filePath: '/analytics.ts',
              description: '',
              name: 'ClientBrowserParameters',
              value: 'ClientBrowserParameters',
            },
            value:
              "export function getClientBrowserParameters(): ClientBrowserParameters {\n  if (errorIfServer('getClientBrowserParameters')) {\n    return {\n      uniqueToken: '',\n      visitToken: '',\n      url: '',\n      path: '',\n      search: '',\n      referrer: '',\n      title: '',\n      userAgent: '',\n      navigationType: '',\n      navigationApi: '',\n    };\n  }\n\n  const [navigationType, navigationApi] = getNavigationType();\n  const cookies = getShopifyCookies(document.cookie);\n\n  return {\n    uniqueToken: cookies[SHOPIFY_Y],\n    visitToken: cookies[SHOPIFY_S],\n    url: location.href,\n    path: location.pathname,\n    search: location.search,\n    referrer: document.referrer,\n    title: document.title,\n    userAgent: navigator.userAgent,\n    navigationType,\n    navigationApi,\n  };\n}",
          },
          ClientBrowserParameters: {
            filePath: '/analytics-types.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'ClientBrowserParameters',
            value:
              "{\n  /**\n   * Shopify unique user token: Value of `_shopify_y` cookie.\n   *\n   * Use `getClientBrowserParameters()` to collect this value.\n   **/\n  uniqueToken: string;\n  /**\n   * Shopify session token: Value of `_shopify_s` cookie.\n   *\n   * Use `getClientBrowserParameters()` to collect this value.\n   **/\n  visitToken: string;\n  /**\n   * Value of `window.location.href`.\n   *\n   * Use `getClientBrowserParameters()` to collect this value.\n   **/\n  url: string;\n  /**\n   * Value of `window.location.pathname`.\n   *\n   * Use `getClientBrowserParameters()` to collect this value.\n   **/\n  path: string;\n  /**\n   * Value of `window.location.search`.\n   *\n   * Use `getClientBrowserParameters()` to collect this value.\n   **/\n  search: string;\n  /**\n   * Value of `window.document.referrer`.\n   *\n   * Use `getClientBrowserParameters()` to collect this value.\n   **/\n  referrer: string;\n  /**\n   * Value of `document.title`.\n   *\n   * Use `getClientBrowserParameters()` to collect this value.\n   **/\n  title: string;\n  /**\n   * Value of `navigator.userAgent`.\n   *\n   * Use `getClientBrowserParameters()` to collect this value.\n   **/\n  userAgent: string;\n  /**\n   * Navigation type: `'navigate' | 'reload' | 'back_forward' | 'prerender' | 'unknown'`.\n   *\n   * Use `getClientBrowserParameters()` to collect this value.\n   **/\n  navigationType: string;\n  /**\n   * Navigation api: `'PerformanceNavigationTiming' | 'performance.navigation'`.\n   *\n   * Use `getClientBrowserParameters()` to collect this value.\n   **/\n  navigationApi: string;\n}",
            description: '',
            members: [
              {
                filePath: '/analytics-types.ts',
                syntaxKind: 'PropertySignature',
                name: 'uniqueToken',
                value: 'string',
                description:
                  'Shopify unique user token: Value of `_shopify_y` cookie.\n\nUse `getClientBrowserParameters()` to collect this value.',
              },
              {
                filePath: '/analytics-types.ts',
                syntaxKind: 'PropertySignature',
                name: 'visitToken',
                value: 'string',
                description:
                  'Shopify session token: Value of `_shopify_s` cookie.\n\nUse `getClientBrowserParameters()` to collect this value.',
              },
              {
                filePath: '/analytics-types.ts',
                syntaxKind: 'PropertySignature',
                name: 'url',
                value: 'string',
                description:
                  'Value of `window.location.href`.\n\nUse `getClientBrowserParameters()` to collect this value.',
              },
              {
                filePath: '/analytics-types.ts',
                syntaxKind: 'PropertySignature',
                name: 'path',
                value: 'string',
                description:
                  'Value of `window.location.pathname`.\n\nUse `getClientBrowserParameters()` to collect this value.',
              },
              {
                filePath: '/analytics-types.ts',
                syntaxKind: 'PropertySignature',
                name: 'search',
                value: 'string',
                description:
                  'Value of `window.location.search`.\n\nUse `getClientBrowserParameters()` to collect this value.',
              },
              {
                filePath: '/analytics-types.ts',
                syntaxKind: 'PropertySignature',
                name: 'referrer',
                value: 'string',
                description:
                  'Value of `window.document.referrer`.\n\nUse `getClientBrowserParameters()` to collect this value.',
              },
              {
                filePath: '/analytics-types.ts',
                syntaxKind: 'PropertySignature',
                name: 'title',
                value: 'string',
                description:
                  'Value of `document.title`.\n\nUse `getClientBrowserParameters()` to collect this value.',
              },
              {
                filePath: '/analytics-types.ts',
                syntaxKind: 'PropertySignature',
                name: 'userAgent',
                value: 'string',
                description:
                  'Value of `navigator.userAgent`.\n\nUse `getClientBrowserParameters()` to collect this value.',
              },
              {
                filePath: '/analytics-types.ts',
                syntaxKind: 'PropertySignature',
                name: 'navigationType',
                value: 'string',
                description:
                  "Navigation type: `'navigate' | 'reload' | 'back_forward' | 'prerender' | 'unknown'`.\n\nUse `getClientBrowserParameters()` to collect this value.",
              },
              {
                filePath: '/analytics-types.ts',
                syntaxKind: 'PropertySignature',
                name: 'navigationApi',
                value: 'string',
                description:
                  "Navigation api: `'PerformanceNavigationTiming' | 'performance.navigation'`.\n\nUse `getClientBrowserParameters()` to collect this value.",
              },
            ],
          },
        },
      },
    ],
  },
  {
    name: 'getShopifyCookies',
    category: 'utilities',
    isVisualComponent: false,
    related: [
      {
        subtitle: 'Hook',
        name: 'useShopifyCookies',
        url: '/api/hydrogen/hooks/useShopifyCookies',
        type: 'tool',
      },
    ],
    description: 'Parses cookie string and returns Shopify cookies.',
    type: 'utility',
    defaultExample: {
      description: 'I am the default example',
      codeblock: {
        tabs: [
          {
            title: 'JavaScript',
            code: "import * as React from 'react';\nimport {useEffect} from 'react';\nimport {getShopifyCookies} from '@shopify/hydrogen';\n\nexport default function App({Component, pageProps}) {\n  useEffect(() =&gt; {\n    getShopifyCookies(document.cookie);\n  });\n\n  return &lt;Component {...pageProps} /&gt;;\n}\n",
            language: 'jsx',
          },
          {
            title: 'TypeScript',
            code: "import * as React from 'react';\nimport {useEffect} from 'react';\nimport {getShopifyCookies} from '@shopify/hydrogen';\n\nexport default function App({Component, pageProps}) {\n  useEffect(() =&gt; {\n    getShopifyCookies(document.cookie);\n  });\n\n  return &lt;Component {...pageProps} /&gt;;\n}\n",
            language: 'tsx',
          },
        ],
        title: 'Example code',
      },
    },
    definitions: [
      {
        title: 'getShopifyCookies',
        description:
          "If the Shopify cookies doesn't exist, this method will return empty string for each missing cookie.",
        type: 'GetShopifyCookiesGeneratedType',
        typeDefinitions: {
          GetShopifyCookiesGeneratedType: {
            filePath: '/cookies-utils.tsx',
            name: 'GetShopifyCookiesGeneratedType',
            description: '',
            params: [
              {
                name: 'cookies',
                description: '',
                value: 'string',
                filePath: '/cookies-utils.tsx',
              },
            ],
            returns: {
              filePath: '/cookies-utils.tsx',
              description: '',
              name: 'ShopifyCookies',
              value: 'ShopifyCookies',
            },
            value:
              "export function getShopifyCookies(cookies: string): ShopifyCookies {\n  const cookieData = parse(cookies);\n  return {\n    [SHOPIFY_Y]: cookieData[SHOPIFY_Y] || '',\n    [SHOPIFY_S]: cookieData[SHOPIFY_S] || '',\n  };\n}",
          },
          ShopifyCookies: {
            filePath: '/analytics-types.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'ShopifyCookies',
            value:
              '{\n  /** Shopify unique user token: Value of `_shopify_y` cookie. */\n  [SHOPIFY_Y]: string;\n  /** Shopify session token: Value of `_shopify_s` cookie. */\n  [SHOPIFY_S]: string;\n}',
            description: '',
            members: [
              {
                filePath: '/analytics-types.ts',
                syntaxKind: 'PropertySignature',
                name: '_shopify_y',
                value: 'string',
                description:
                  'Shopify unique user token: Value of `_shopify_y` cookie.',
              },
              {
                filePath: '/analytics-types.ts',
                syntaxKind: 'PropertySignature',
                name: '_shopify_s',
                value: 'string',
                description:
                  'Shopify session token: Value of `_shopify_s` cookie.',
              },
            ],
          },
        },
      },
      {
        title: 'ShopifyCookies',
        description: 'Shopify cookies names',
        type: 'ShopifyCookies',
        typeDefinitions: {
          ShopifyCookies: {
            filePath: '/analytics-types.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'ShopifyCookies',
            value:
              '{\n  /** Shopify unique user token: Value of `_shopify_y` cookie. */\n  [SHOPIFY_Y]: string;\n  /** Shopify session token: Value of `_shopify_s` cookie. */\n  [SHOPIFY_S]: string;\n}',
            description: '',
            members: [
              {
                filePath: '/analytics-types.ts',
                syntaxKind: 'PropertySignature',
                name: '_shopify_y',
                value: 'string',
                description:
                  'Shopify unique user token: Value of `_shopify_y` cookie.',
              },
              {
                filePath: '/analytics-types.ts',
                syntaxKind: 'PropertySignature',
                name: '_shopify_s',
                value: 'string',
                description:
                  'Shopify session token: Value of `_shopify_s` cookie.',
              },
            ],
          },
        },
      },
    ],
  },
  {
    name: 'parseMetafield',
    category: 'utilities',
    isVisualComponent: false,
    related: [],
    description:
      "\n    A function that uses `metafield.type` to parse the Metafield's `value` or `reference` or `references` (depending on the `metafield.type`) and places the result in `metafield.parsedValue`.\n  ",
    type: 'gear',
    defaultExample: {
      description: 'I am the default example',
      codeblock: {
        tabs: [
          {
            title: 'JavaScript',
            code: "import {parseMetafield} from '@shopify/hydrogen';\n\nexport function DateMetafield({metafield}) {\n  const parsedMetafield = parseMetafield(metafield);\n\n  return &lt;div&gt;Date: {parsedMetafield.parsedValue?.toDateString()}&lt;/div&gt;;\n}\n\nexport function VariantReferenceMetafield({metafield}) {\n  const parsedMetafield = parseMetafield(metafield);\n\n  return &lt;div&gt;Variant title: {parsedMetafield.parsedValue?.title}&lt;/div&gt;;\n}\n\nexport function ListCollectionReferenceMetafield({metafield}) {\n  const parsedMetafield = parseMetafield(metafield);\n\n  return (\n    &lt;div&gt;\n      The first collection title: {parsedMetafield.parsedValue?.[0].title}\n    &lt;/div&gt;\n  );\n}\n",
            language: 'jsx',
          },
          {
            title: 'TypeScript',
            code: "import {parseMetafield, type ParsedMetafields} from '@shopify/hydrogen';\nimport type {Metafield} from '@shopify/hydrogen/storefront-api-types';\n\nexport function DateMetafield({metafield}: {metafield: Metafield}) {\n  const parsedMetafield = parseMetafield&lt;ParsedMetafields['date']&gt;(metafield);\n\n  return &lt;div&gt;Date: {parsedMetafield.parsedValue?.toDateString()}&lt;/div&gt;;\n}\n\nexport function VariantReferenceMetafield({metafield}: {metafield: Metafield}) {\n  const parsedMetafield =\n    parseMetafield&lt;ParsedMetafields['variant_reference']&gt;(metafield);\n\n  return &lt;div&gt;Variant title: {parsedMetafield.parsedValue?.title}&lt;/div&gt;;\n}\n\nexport function ListCollectionReferenceMetafield({\n  metafield,\n}: {\n  metafield: Metafield;\n}) {\n  const parsedMetafield =\n    parseMetafield&lt;ParsedMetafields['list.collection_reference']&gt;(metafield);\n\n  return (\n    &lt;div&gt;\n      The first collection title: {parsedMetafield.parsedValue?.[0].title}\n    &lt;/div&gt;\n  );\n}\n",
            language: 'tsx',
          },
        ],
        title: 'Example code',
      },
    },
    definitions: [
      {
        title: 'Props',
        description:
          'Use the `ParsedMetafields` type as the returned type of `parseMetafield(metafield)`',
        type: 'ParseMetafieldGeneratedType',
        typeDefinitions: {
          ParseMetafieldGeneratedType: {
            filePath: '/parse-metafield.ts',
            name: 'ParseMetafieldGeneratedType',
            description:
              "A function that uses `metafield.type` to parse the Metafield's `value` or `reference` or `references` (depending on the `metafield.type`) and places the result in `metafield.parsedValue`\n\nTypeScript developers can use the type `ParsedMetafields` from this package to get the returned object's type correct. For example:\n\n``` parseMetafield<ParsedMetafields['boolean']>({type: 'boolean', value: 'false'} ```",
            params: [
              {
                name: 'metafield',
                description: '',
                value:
                  'PartialObjectDeep<Metafield, { recurseIntoArrays: true; }>',
                filePath: '/parse-metafield.ts',
              },
            ],
            returns: {
              filePath: '/parse-metafield.ts',
              description: '',
              name: 'ReturnGeneric',
              value: 'ReturnGeneric',
            },
            value:
              "export function parseMetafield<ReturnGeneric>(\n  metafield: PartialDeep<MetafieldBaseType, {recurseIntoArrays: true}>,\n): ReturnGeneric {\n  if (!metafield.type) {\n    const noTypeError = `parseMetafield(): The 'type' field is required in order to parse the Metafield.`;\n    if (__HYDROGEN_DEV__) {\n      throw new Error(noTypeError);\n    } else {\n      console.error(`${noTypeError} Returning 'parsedValue' of 'null'`);\n      return {\n        ...metafield,\n        parsedValue: null,\n      } as ReturnGeneric;\n    }\n  }\n\n  switch (metafield.type) {\n    case 'boolean':\n      return {\n        ...metafield,\n        parsedValue: metafield.value === 'true',\n      } as ReturnGeneric;\n\n    case 'collection_reference':\n    case 'file_reference':\n    case 'page_reference':\n    case 'product_reference':\n    case 'variant_reference':\n      return {\n        ...metafield,\n        parsedValue: metafield.reference,\n      } as ReturnGeneric;\n\n    case 'color':\n    case 'multi_line_text_field':\n    case 'single_line_text_field':\n    case 'url':\n      return {\n        ...metafield,\n        parsedValue: metafield.value,\n      } as ReturnGeneric;\n\n    // TODO: 'money' should probably be parsed even further to like `useMoney()`, but that logic needs to be extracted first so it's not a hook\n    case 'dimension':\n    case 'money':\n    case 'json':\n    case 'rating':\n    case 'volume':\n    case 'weight':\n    case 'list.color':\n    case 'list.dimension':\n    case 'list.number_integer':\n    case 'list.number_decimal':\n    case 'list.rating':\n    case 'list.single_line_text_field':\n    case 'list.url':\n    case 'list.volume':\n    case 'list.weight': {\n      let parsedValue = null;\n      try {\n        parsedValue = parseJSON(metafield.value ?? '');\n      } catch (err) {\n        const parseError = `parseMetafield(): attempted to JSON.parse the 'metafield.value' property, but failed.`;\n        if (__HYDROGEN_DEV__) {\n          throw new Error(parseError);\n        } else {\n          console.error(`${parseError} Returning 'null' for 'parsedValue'`);\n        }\n        parsedValue = null;\n      }\n      return {\n        ...metafield,\n        parsedValue,\n      } as ReturnGeneric;\n    }\n\n    case 'date':\n    case 'date_time':\n      return {\n        ...metafield,\n        parsedValue: new Date(metafield.value ?? ''),\n      } as ReturnGeneric;\n\n    case 'list.date':\n    case 'list.date_time': {\n      const jsonParseValue = parseJSON(metafield?.value ?? '') as string[];\n      return {\n        ...metafield,\n        parsedValue: jsonParseValue.map((dateString) => new Date(dateString)),\n      } as ReturnGeneric;\n    }\n\n    case 'number_decimal':\n    case 'number_integer':\n      return {\n        ...metafield,\n        parsedValue: Number(metafield.value),\n      } as ReturnGeneric;\n\n    case 'list.collection_reference':\n    case 'list.file_reference':\n    case 'list.page_reference':\n    case 'list.product_reference':\n    case 'list.variant_reference':\n      return {\n        ...metafield,\n        parsedValue: flattenConnection(metafield.references ?? undefined),\n      } as ReturnGeneric;\n\n    default: {\n      const typeNotFoundError = `parseMetafield(): the 'metafield.type' you passed in is not supported. Your type: \"${metafield.type}\". If you believe this is an error, please open an issue on GitHub.`;\n      if (__HYDROGEN_DEV__) {\n        throw new Error(typeNotFoundError);\n      } else {\n        console.error(\n          `${typeNotFoundError}  Returning 'parsedValue' of 'null'`,\n        );\n        return {\n          ...metafield,\n          parsedValue: null,\n        } as ReturnGeneric;\n      }\n    }\n  }\n}",
          },
        },
      },
    ],
  },
  {
    name: 'sendShopifyAnalytics',
    category: 'utilities',
    isVisualComponent: false,
    related: [
      {
        subtitle: 'Hook',
        name: 'useShopifyCookies',
        url: '/api/hydrogen/hooks/useShopifyCookies',
        type: 'tool',
      },
      {
        subtitle: 'Utility',
        name: 'getClientBrowserParameters',
        url: '/api/hydrogen/utilities/getclientbrowserparameters',
        type: 'gear',
      },
    ],
    description: 'Sends analytics to Shopify.',
    type: 'utility',
    defaultExample: {
      description: 'I am the default example',
      codeblock: {
        tabs: [
          {
            title: 'JavaScript',
            code: "import {\n  sendShopifyAnalytics,\n  getClientBrowserParameters,\n  AnalyticsEventName,\n  useShopifyCookies,\n} from '@shopify/hydrogen';\nimport {useRouter} from 'next/router';\nimport {useEffect} from 'react';\n\nfunction sendPageView(analyticsPageData) {\n  const payload = {\n    ...getClientBrowserParameters(),\n    ...analyticsPageData,\n  };\n  sendShopifyAnalytics({\n    eventName: AnalyticsEventName.PAGE_VIEW,\n    payload,\n  });\n}\n\n// Hook into your router's page change events to fire this analytics event:\n// for example, in NextJS:\n\nconst analyticsShopData = {\n  shopId: 'gid://shopify/Shop/{your-shop-id}',\n  currency: 'USD',\n  acceptedLanguage: 'en',\n};\n\nexport default function App({Component, pageProps}) {\n  const router = useRouter();\n\n  // eslint-disable-next-line no-undef\n  const hasUserConsent = yourFunctionToDetermineIfUserHasConsent();\n\n  // eslint-disable-next-line react-hooks/exhaustive-deps\n  const analytics = {\n    hasUserConsent,\n    ...analyticsShopData,\n    ...pageProps.analytics,\n  };\n  const pagePropsWithAppAnalytics = {\n    ...pageProps,\n    analytics,\n  };\n\n  useEffect(() =&gt; {\n    const handleRouteChange = () =&gt; {\n      sendPageView(analytics);\n    };\n\n    router.events.on('routeChangeComplete', handleRouteChange);\n\n    return () =&gt; {\n      router.events.off('routeChangeComplete', handleRouteChange);\n    };\n  }, [analytics, router.events]);\n\n  useShopifyCookies();\n\n  return &lt;Component {...pagePropsWithAppAnalytics} /&gt;;\n}\n",
            language: 'jsx',
          },
          {
            title: 'TypeScript',
            code: "import * as React from 'react';\nimport {useEffect} from 'react';\nimport {\n  sendShopifyAnalytics,\n  getClientBrowserParameters,\n  AnalyticsEventName,\n  useShopifyCookies,\n} from '@shopify/hydrogen';\nimport {useRouter} from 'next/router';\n\nfunction sendPageView(analyticsPageData) {\n  const payload = {\n    ...getClientBrowserParameters(),\n    ...analyticsPageData,\n  };\n  sendShopifyAnalytics({\n    eventName: AnalyticsEventName.PAGE_VIEW,\n    payload,\n  });\n}\n\n// Hook into your router's page change events to fire this analytics event:\n// for example, in NextJS:\n\nconst analyticsShopData = {\n  shopId: 'gid://shopify/Shop/{your-shop-id}',\n  currency: 'USD',\n  acceptedLanguage: 'en',\n};\n\nexport default function App({Component, pageProps}) {\n  const router = useRouter();\n\n  // @ts-expect-error - this is an example, you should implement this function\n  const hasUserConsent = yourFunctionToDetermineIfUserHasConsent();\n\n  // eslint-disable-next-line react-hooks/exhaustive-deps\n  const analytics = {\n    hasUserConsent,\n    ...analyticsShopData,\n    ...pageProps.analytics,\n  };\n  const pagePropsWithAppAnalytics = {\n    ...pageProps,\n    analytics,\n  };\n\n  useEffect(() =&gt; {\n    const handleRouteChange = () =&gt; {\n      sendPageView(analytics);\n    };\n\n    router.events.on('routeChangeComplete', handleRouteChange);\n\n    return () =&gt; {\n      router.events.off('routeChangeComplete', handleRouteChange);\n    };\n  }, [analytics, router.events]);\n\n  useShopifyCookies();\n\n  return &lt;Component {...pagePropsWithAppAnalytics} /&gt;;\n}\n",
            language: 'tsx',
          },
        ],
        title: 'Example code',
      },
    },
    definitions: [
      {
        title: 'sendShopifyAnalytics',
        description:
          'If `event.payload.hasUserConsent` is false, no analytics event will happen.',
        type: 'SendShopifyAnalyticsGeneratedType',
        typeDefinitions: {
          SendShopifyAnalyticsGeneratedType: {
            filePath: '/analytics.ts',
            name: 'SendShopifyAnalyticsGeneratedType',
            description:
              'Set user and session cookies and refresh the expiry time',
            params: [
              {
                name: 'event',
                description: 'The analytics event.',
                value: 'ShopifyAnalytics',
                filePath: '/analytics.ts',
              },
              {
                name: 'shopDomain',
                description:
                  'The Online Store domain to sent Shopify analytics under the same\ntop level domain.',
                value: 'string',
                isOptional: true,
                filePath: '/analytics.ts',
              },
            ],
            returns: {
              filePath: '/analytics.ts',
              description: '',
              name: 'Promise<void>',
              value: 'Promise<void>',
            },
            value:
              'export function sendShopifyAnalytics(\n  event: ShopifyAnalytics,\n  shopDomain?: string,\n): Promise<void> {\n  const {eventName, payload} = event;\n  if (!payload.hasUserConsent) return Promise.resolve();\n\n  let events: ShopifyMonorailEvent[] = [];\n\n  if (eventName === AnalyticsEventName.PAGE_VIEW) {\n    const pageViewPayload = payload as ShopifyPageViewPayload;\n    events = events.concat(\n      trekkiePageView(pageViewPayload),\n      customerPageView(pageViewPayload),\n    );\n  } else if (eventName === AnalyticsEventName.ADD_TO_CART) {\n    events = events.concat(\n      customerAddToCart(payload as ShopifyAddToCartPayload),\n    );\n  }\n\n  if (events.length) {\n    return sendToShopify(events, shopDomain);\n  } else {\n    return Promise.resolve();\n  }\n}',
          },
          ShopifyAnalytics: {
            filePath: '/analytics-types.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'ShopifyAnalytics',
            value: 'ShopifyPageView | ShopifyAddToCart',
            description: '',
          },
          ShopifyPageView: {
            filePath: '/analytics-types.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'ShopifyPageView',
            value:
              '{\n  /** Use `AnalyticsEventName.PAGE_VIEW` constant. */\n  eventName: string;\n  payload: ShopifyPageViewPayload;\n}',
            description: '',
            members: [
              {
                filePath: '/analytics-types.ts',
                syntaxKind: 'PropertySignature',
                name: 'eventName',
                value: 'string',
                description: 'Use `AnalyticsEventName.PAGE_VIEW` constant.',
              },
              {
                filePath: '/analytics-types.ts',
                syntaxKind: 'PropertySignature',
                name: 'payload',
                value: 'ShopifyPageViewPayload',
                description: '',
              },
            ],
          },
          ShopifyPageViewPayload: {
            filePath: '/analytics-types.ts',
            name: 'ShopifyPageViewPayload',
            description: '',
            members: [
              {
                filePath: '/analytics-types.ts',
                syntaxKind: 'PropertySignature',
                name: 'canonicalUrl',
                value: 'string',
                description: 'Canonical url.',
                isOptional: true,
              },
              {
                filePath: '/analytics-types.ts',
                syntaxKind: 'PropertySignature',
                name: 'pageType',
                value: 'string',
                description: 'Shopify page type.',
                isOptional: true,
              },
              {
                filePath: '/analytics-types.ts',
                syntaxKind: 'PropertySignature',
                name: 'resourceId',
                value: 'string',
                description:
                  'Shopify resource id in the form of `gid://shopify/<type>/<id>`.',
                isOptional: true,
              },
              {
                filePath: '/analytics-types.ts',
                syntaxKind: 'PropertySignature',
                name: 'collectionHandle',
                value: 'string',
                description: 'Shopify collection handle.',
                isOptional: true,
              },
              {
                filePath: '/analytics-types.ts',
                syntaxKind: 'PropertySignature',
                name: 'searchString',
                value: 'string',
                description: 'Search term used on a search results page.',
                isOptional: true,
              },
              {
                filePath: '/analytics-types.ts',
                syntaxKind: 'PropertySignature',
                name: 'hasUserConsent',
                value: 'boolean',
                description:
                  'If we have consent from buyer for data collection',
              },
              {
                filePath: '/analytics-types.ts',
                syntaxKind: 'PropertySignature',
                name: 'shopId',
                value: 'string',
                description:
                  'Shopify shop id in the form of `gid://shopify/Shop/<id>`.',
              },
              {
                filePath: '/analytics-types.ts',
                syntaxKind: 'PropertySignature',
                name: 'currency',
                value: 'CurrencyCode',
                description: 'Currency code.',
              },
              {
                filePath: '/analytics-types.ts',
                syntaxKind: 'PropertySignature',
                name: 'storefrontId',
                value: 'string',
                description:
                  'Shopify storefront id generated by Hydrogen sales channel.',
                isOptional: true,
              },
              {
                filePath: '/analytics-types.ts',
                syntaxKind: 'PropertySignature',
                name: 'acceptedLanguage',
                value: 'LanguageCode',
                description: 'Language displayed to buyer.',
                isOptional: true,
              },
              {
                filePath: '/analytics-types.ts',
                syntaxKind: 'PropertySignature',
                name: 'shopifySalesChannel',
                value: 'ShopifySalesChannels',
                description: 'Shopify sales channel.',
                isOptional: true,
              },
              {
                filePath: '/analytics-types.ts',
                syntaxKind: 'PropertySignature',
                name: 'customerId',
                value: 'string',
                description:
                  'Shopify customer id in the form of `gid://shopify/Customer/<id>`.',
                isOptional: true,
              },
              {
                filePath: '/analytics-types.ts',
                syntaxKind: 'PropertySignature',
                name: 'totalValue',
                value: 'number',
                description: 'Total value of products.',
                isOptional: true,
              },
              {
                filePath: '/analytics-types.ts',
                syntaxKind: 'PropertySignature',
                name: 'products',
                value: 'ShopifyAnalyticsProduct[]',
                description: 'Product list.',
                isOptional: true,
              },
              {
                filePath: '/analytics-types.ts',
                syntaxKind: 'PropertySignature',
                name: 'uniqueToken',
                value: 'string',
                description:
                  'Shopify unique user token: Value of `_shopify_y` cookie.\n\nUse `getClientBrowserParameters()` to collect this value.',
              },
              {
                filePath: '/analytics-types.ts',
                syntaxKind: 'PropertySignature',
                name: 'visitToken',
                value: 'string',
                description:
                  'Shopify session token: Value of `_shopify_s` cookie.\n\nUse `getClientBrowserParameters()` to collect this value.',
              },
              {
                filePath: '/analytics-types.ts',
                syntaxKind: 'PropertySignature',
                name: 'url',
                value: 'string',
                description:
                  'Value of `window.location.href`.\n\nUse `getClientBrowserParameters()` to collect this value.',
              },
              {
                filePath: '/analytics-types.ts',
                syntaxKind: 'PropertySignature',
                name: 'path',
                value: 'string',
                description:
                  'Value of `window.location.pathname`.\n\nUse `getClientBrowserParameters()` to collect this value.',
              },
              {
                filePath: '/analytics-types.ts',
                syntaxKind: 'PropertySignature',
                name: 'search',
                value: 'string',
                description:
                  'Value of `window.location.search`.\n\nUse `getClientBrowserParameters()` to collect this value.',
              },
              {
                filePath: '/analytics-types.ts',
                syntaxKind: 'PropertySignature',
                name: 'referrer',
                value: 'string',
                description:
                  'Value of `window.document.referrer`.\n\nUse `getClientBrowserParameters()` to collect this value.',
              },
              {
                filePath: '/analytics-types.ts',
                syntaxKind: 'PropertySignature',
                name: 'title',
                value: 'string',
                description:
                  'Value of `document.title`.\n\nUse `getClientBrowserParameters()` to collect this value.',
              },
              {
                filePath: '/analytics-types.ts',
                syntaxKind: 'PropertySignature',
                name: 'userAgent',
                value: 'string',
                description:
                  'Value of `navigator.userAgent`.\n\nUse `getClientBrowserParameters()` to collect this value.',
              },
              {
                filePath: '/analytics-types.ts',
                syntaxKind: 'PropertySignature',
                name: 'navigationType',
                value: 'string',
                description:
                  "Navigation type: `'navigate' | 'reload' | 'back_forward' | 'prerender' | 'unknown'`.\n\nUse `getClientBrowserParameters()` to collect this value.",
              },
              {
                filePath: '/analytics-types.ts',
                syntaxKind: 'PropertySignature',
                name: 'navigationApi',
                value: 'string',
                description:
                  "Navigation api: `'PerformanceNavigationTiming' | 'performance.navigation'`.\n\nUse `getClientBrowserParameters()` to collect this value.",
              },
            ],
            value:
              'export interface ShopifyPageViewPayload\n  extends ShopifyAnalyticsBase,\n    ClientBrowserParameters {\n  /** Canonical url. */\n  canonicalUrl?: string;\n  /** Shopify page type. */\n  pageType?: string;\n  /** Shopify resource id in the form of `gid://shopify/<type>/<id>`. */\n  resourceId?: string;\n  /** Shopify collection handle. */\n  collectionHandle?: string;\n  /** Search term used on a search results page. */\n  searchString?: string;\n}',
          },
          ShopifySalesChannels: {
            filePath: '/analytics-types.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'ShopifySalesChannels',
            value: 'keyof typeof ShopifySalesChannel',
            description: '',
          },
          ShopifySalesChannel: {
            filePath: '/analytics-constants.ts',
            name: 'ShopifySalesChannel',
            description: '',
            members: [
              {
                filePath: '/analytics-constants.ts',
                syntaxKind: 'PropertySignature',
                name: 'hydrogen',
                value: '"hydrogen"',
                description: 'Shopify Hydrogen sales channel',
              },
              {
                filePath: '/analytics-constants.ts',
                syntaxKind: 'PropertySignature',
                name: 'headless',
                value: '"headless"',
                description: 'Shopify Headless sales channel',
              },
            ],
            value:
              "interface ShopifySalesChannel {\n  /** Shopify Hydrogen sales channel */\n  hydrogen: 'hydrogen';\n  /** Shopify Headless sales channel */\n  headless: 'headless';\n}",
          },
          ShopifyAnalyticsProduct: {
            filePath: '/analytics-types.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'ShopifyAnalyticsProduct',
            value:
              "{\n  /** Product id in the form of `gid://shopify/Product/<id>`. */\n  productGid: Product['id'];\n  /** Variant id in the form of `gid://shopify/ProductVariant/<id>`. */\n  variantGid?: ProductVariant['id'];\n  /** Product name. */\n  name: Product['title'];\n  /** Variant name. */\n  variantName?: ProductVariant['title'];\n  /** Product brand or vendor. */\n  brand: Product['vendor'];\n  /** Product category or type. */\n  category?: Product['productType'];\n  /** Product price. */\n  price: ProductVariant['price']['amount'];\n  /** Product sku. */\n  sku?: ProductVariant['sku'];\n  /** Quantity of the product in this event. */\n  quantity?: number;\n}",
            description: '',
            members: [
              {
                filePath: '/analytics-types.ts',
                syntaxKind: 'PropertySignature',
                name: 'productGid',
                value: 'string',
                description:
                  'Product id in the form of `gid://shopify/Product/<id>`.',
              },
              {
                filePath: '/analytics-types.ts',
                syntaxKind: 'PropertySignature',
                name: 'variantGid',
                value: 'string',
                description:
                  'Variant id in the form of `gid://shopify/ProductVariant/<id>`.',
                isOptional: true,
              },
              {
                filePath: '/analytics-types.ts',
                syntaxKind: 'PropertySignature',
                name: 'name',
                value: 'string',
                description: 'Product name.',
              },
              {
                filePath: '/analytics-types.ts',
                syntaxKind: 'PropertySignature',
                name: 'variantName',
                value: 'string',
                description: 'Variant name.',
                isOptional: true,
              },
              {
                filePath: '/analytics-types.ts',
                syntaxKind: 'PropertySignature',
                name: 'brand',
                value: 'string',
                description: 'Product brand or vendor.',
              },
              {
                filePath: '/analytics-types.ts',
                syntaxKind: 'PropertySignature',
                name: 'category',
                value: 'string',
                description: 'Product category or type.',
                isOptional: true,
              },
              {
                filePath: '/analytics-types.ts',
                syntaxKind: 'PropertySignature',
                name: 'price',
                value: 'string',
                description: 'Product price.',
              },
              {
                filePath: '/analytics-types.ts',
                syntaxKind: 'PropertySignature',
                name: 'sku',
                value: 'string',
                description: 'Product sku.',
                isOptional: true,
              },
              {
                filePath: '/analytics-types.ts',
                syntaxKind: 'PropertySignature',
                name: 'quantity',
                value: 'number',
                description: 'Quantity of the product in this event.',
                isOptional: true,
              },
            ],
          },
          ShopifyAddToCart: {
            filePath: '/analytics-types.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'ShopifyAddToCart',
            value:
              '{\n  /** Use `AnalyticsEventName.ADD_TO_CART` constant. */\n  eventName: string;\n  payload: ShopifyAddToCartPayload;\n}',
            description: '',
            members: [
              {
                filePath: '/analytics-types.ts',
                syntaxKind: 'PropertySignature',
                name: 'eventName',
                value: 'string',
                description: 'Use `AnalyticsEventName.ADD_TO_CART` constant.',
              },
              {
                filePath: '/analytics-types.ts',
                syntaxKind: 'PropertySignature',
                name: 'payload',
                value: 'ShopifyAddToCartPayload',
                description: '',
              },
            ],
          },
          ShopifyAddToCartPayload: {
            filePath: '/analytics-types.ts',
            name: 'ShopifyAddToCartPayload',
            description: '',
            members: [
              {
                filePath: '/analytics-types.ts',
                syntaxKind: 'PropertySignature',
                name: 'cartId',
                value: 'string',
                description:
                  'Shopify cart id in the form of `gid://shopify/Cart/<id>`.',
              },
              {
                filePath: '/analytics-types.ts',
                syntaxKind: 'PropertySignature',
                name: 'hasUserConsent',
                value: 'boolean',
                description:
                  'If we have consent from buyer for data collection',
              },
              {
                filePath: '/analytics-types.ts',
                syntaxKind: 'PropertySignature',
                name: 'shopId',
                value: 'string',
                description:
                  'Shopify shop id in the form of `gid://shopify/Shop/<id>`.',
              },
              {
                filePath: '/analytics-types.ts',
                syntaxKind: 'PropertySignature',
                name: 'currency',
                value: 'CurrencyCode',
                description: 'Currency code.',
              },
              {
                filePath: '/analytics-types.ts',
                syntaxKind: 'PropertySignature',
                name: 'storefrontId',
                value: 'string',
                description:
                  'Shopify storefront id generated by Hydrogen sales channel.',
                isOptional: true,
              },
              {
                filePath: '/analytics-types.ts',
                syntaxKind: 'PropertySignature',
                name: 'acceptedLanguage',
                value: 'LanguageCode',
                description: 'Language displayed to buyer.',
                isOptional: true,
              },
              {
                filePath: '/analytics-types.ts',
                syntaxKind: 'PropertySignature',
                name: 'shopifySalesChannel',
                value: 'ShopifySalesChannels',
                description: 'Shopify sales channel.',
                isOptional: true,
              },
              {
                filePath: '/analytics-types.ts',
                syntaxKind: 'PropertySignature',
                name: 'customerId',
                value: 'string',
                description:
                  'Shopify customer id in the form of `gid://shopify/Customer/<id>`.',
                isOptional: true,
              },
              {
                filePath: '/analytics-types.ts',
                syntaxKind: 'PropertySignature',
                name: 'totalValue',
                value: 'number',
                description: 'Total value of products.',
                isOptional: true,
              },
              {
                filePath: '/analytics-types.ts',
                syntaxKind: 'PropertySignature',
                name: 'products',
                value: 'ShopifyAnalyticsProduct[]',
                description: 'Product list.',
                isOptional: true,
              },
              {
                filePath: '/analytics-types.ts',
                syntaxKind: 'PropertySignature',
                name: 'uniqueToken',
                value: 'string',
                description:
                  'Shopify unique user token: Value of `_shopify_y` cookie.\n\nUse `getClientBrowserParameters()` to collect this value.',
              },
              {
                filePath: '/analytics-types.ts',
                syntaxKind: 'PropertySignature',
                name: 'visitToken',
                value: 'string',
                description:
                  'Shopify session token: Value of `_shopify_s` cookie.\n\nUse `getClientBrowserParameters()` to collect this value.',
              },
              {
                filePath: '/analytics-types.ts',
                syntaxKind: 'PropertySignature',
                name: 'url',
                value: 'string',
                description:
                  'Value of `window.location.href`.\n\nUse `getClientBrowserParameters()` to collect this value.',
              },
              {
                filePath: '/analytics-types.ts',
                syntaxKind: 'PropertySignature',
                name: 'path',
                value: 'string',
                description:
                  'Value of `window.location.pathname`.\n\nUse `getClientBrowserParameters()` to collect this value.',
              },
              {
                filePath: '/analytics-types.ts',
                syntaxKind: 'PropertySignature',
                name: 'search',
                value: 'string',
                description:
                  'Value of `window.location.search`.\n\nUse `getClientBrowserParameters()` to collect this value.',
              },
              {
                filePath: '/analytics-types.ts',
                syntaxKind: 'PropertySignature',
                name: 'referrer',
                value: 'string',
                description:
                  'Value of `window.document.referrer`.\n\nUse `getClientBrowserParameters()` to collect this value.',
              },
              {
                filePath: '/analytics-types.ts',
                syntaxKind: 'PropertySignature',
                name: 'title',
                value: 'string',
                description:
                  'Value of `document.title`.\n\nUse `getClientBrowserParameters()` to collect this value.',
              },
              {
                filePath: '/analytics-types.ts',
                syntaxKind: 'PropertySignature',
                name: 'userAgent',
                value: 'string',
                description:
                  'Value of `navigator.userAgent`.\n\nUse `getClientBrowserParameters()` to collect this value.',
              },
              {
                filePath: '/analytics-types.ts',
                syntaxKind: 'PropertySignature',
                name: 'navigationType',
                value: 'string',
                description:
                  "Navigation type: `'navigate' | 'reload' | 'back_forward' | 'prerender' | 'unknown'`.\n\nUse `getClientBrowserParameters()` to collect this value.",
              },
              {
                filePath: '/analytics-types.ts',
                syntaxKind: 'PropertySignature',
                name: 'navigationApi',
                value: 'string',
                description:
                  "Navigation api: `'PerformanceNavigationTiming' | 'performance.navigation'`.\n\nUse `getClientBrowserParameters()` to collect this value.",
              },
            ],
            value:
              'export interface ShopifyAddToCartPayload\n  extends ShopifyAnalyticsBase,\n    ClientBrowserParameters {\n  /** Shopify cart id in the form of `gid://shopify/Cart/<id>`. */\n  cartId: string;\n}',
          },
        },
      },
      {
        title: 'AnalyticsEventName',
        description: 'Analytics event names accepted by Shopify analytics.',
        type: 'AnalyticsEventName',
        typeDefinitions: {
          AnalyticsEventName: {
            filePath: '/analytics-constants.ts',
            name: 'AnalyticsEventName',
            description:
              'These duplicated interface declaration is so that we can generate proper documentation for these public facing constants',
            members: [
              {
                filePath: '/analytics-constants.ts',
                syntaxKind: 'PropertySignature',
                name: 'PAGE_VIEW',
                value: '"PAGE_VIEW"',
                description: 'Page view',
              },
              {
                filePath: '/analytics-constants.ts',
                syntaxKind: 'PropertySignature',
                name: 'ADD_TO_CART',
                value: '"ADD_TO_CART"',
                description: 'Add to cart',
              },
            ],
            value:
              "interface AnalyticsEventName {\n  /** Page view */\n  PAGE_VIEW: 'PAGE_VIEW';\n  /** Add to cart */\n  ADD_TO_CART: 'ADD_TO_CART';\n}",
          },
        },
      },
      {
        title: 'AnalyticsPageType',
        description:
          'Analytics page type values accepted by Shopify analytics.',
        type: 'AnalyticsPageType',
        typeDefinitions: {
          AnalyticsPageType: {
            filePath: '/analytics-constants.ts',
            name: 'AnalyticsPageType',
            description: '',
            members: [
              {
                filePath: '/analytics-constants.ts',
                syntaxKind: 'PropertySignature',
                name: 'article',
                value: '"article"',
                description: '',
              },
              {
                filePath: '/analytics-constants.ts',
                syntaxKind: 'PropertySignature',
                name: 'blog',
                value: '"blog"',
                description: '',
              },
              {
                filePath: '/analytics-constants.ts',
                syntaxKind: 'PropertySignature',
                name: 'captcha',
                value: '"captcha"',
                description: '',
              },
              {
                filePath: '/analytics-constants.ts',
                syntaxKind: 'PropertySignature',
                name: 'cart',
                value: '"cart"',
                description: '',
              },
              {
                filePath: '/analytics-constants.ts',
                syntaxKind: 'PropertySignature',
                name: 'collection',
                value: '"collection"',
                description: '',
              },
              {
                filePath: '/analytics-constants.ts',
                syntaxKind: 'PropertySignature',
                name: 'customersAccount',
                value: '"customers/account"',
                description: '',
              },
              {
                filePath: '/analytics-constants.ts',
                syntaxKind: 'PropertySignature',
                name: 'customersActivateAccount',
                value: '"customers/activate_account"',
                description: '',
              },
              {
                filePath: '/analytics-constants.ts',
                syntaxKind: 'PropertySignature',
                name: 'customersAddresses',
                value: '"customers/addresses"',
                description: '',
              },
              {
                filePath: '/analytics-constants.ts',
                syntaxKind: 'PropertySignature',
                name: 'customersLogin',
                value: '"customers/login"',
                description: '',
              },
              {
                filePath: '/analytics-constants.ts',
                syntaxKind: 'PropertySignature',
                name: 'customersOrder',
                value: '"customers/order"',
                description: '',
              },
              {
                filePath: '/analytics-constants.ts',
                syntaxKind: 'PropertySignature',
                name: 'customersRegister',
                value: '"customers/register"',
                description: '',
              },
              {
                filePath: '/analytics-constants.ts',
                syntaxKind: 'PropertySignature',
                name: 'customersResetPassword',
                value: '"customers/reset_password"',
                description: '',
              },
              {
                filePath: '/analytics-constants.ts',
                syntaxKind: 'PropertySignature',
                name: 'giftCard',
                value: '"gift_card"',
                description: '',
              },
              {
                filePath: '/analytics-constants.ts',
                syntaxKind: 'PropertySignature',
                name: 'home',
                value: '"index"',
                description: '',
              },
              {
                filePath: '/analytics-constants.ts',
                syntaxKind: 'PropertySignature',
                name: 'listCollections',
                value: '"list-collections"',
                description: '',
              },
              {
                filePath: '/analytics-constants.ts',
                syntaxKind: 'PropertySignature',
                name: 'forbidden',
                value: '"403"',
                description: '',
              },
              {
                filePath: '/analytics-constants.ts',
                syntaxKind: 'PropertySignature',
                name: 'notFound',
                value: '"404"',
                description: '',
              },
              {
                filePath: '/analytics-constants.ts',
                syntaxKind: 'PropertySignature',
                name: 'page',
                value: '"page"',
                description: '',
              },
              {
                filePath: '/analytics-constants.ts',
                syntaxKind: 'PropertySignature',
                name: 'password',
                value: '"password"',
                description: '',
              },
              {
                filePath: '/analytics-constants.ts',
                syntaxKind: 'PropertySignature',
                name: 'product',
                value: '"product"',
                description: '',
              },
              {
                filePath: '/analytics-constants.ts',
                syntaxKind: 'PropertySignature',
                name: 'policy',
                value: '"policy"',
                description: '',
              },
              {
                filePath: '/analytics-constants.ts',
                syntaxKind: 'PropertySignature',
                name: 'search',
                value: '"search"',
                description: '',
              },
            ],
            value:
              "interface AnalyticsPageType {\n  article: 'article';\n  blog: 'blog';\n  captcha: 'captcha';\n  cart: 'cart';\n  collection: 'collection';\n  customersAccount: 'customers/account';\n  customersActivateAccount: 'customers/activate_account';\n  customersAddresses: 'customers/addresses';\n  customersLogin: 'customers/login';\n  customersOrder: 'customers/order';\n  customersRegister: 'customers/register';\n  customersResetPassword: 'customers/reset_password';\n  giftCard: 'gift_card';\n  home: 'index';\n  listCollections: 'list-collections';\n  forbidden: '403';\n  notFound: '404';\n  page: 'page';\n  password: 'password';\n  product: 'product';\n  policy: 'policy';\n  search: 'search';\n}",
          },
        },
      },
      {
        title: 'ShopifySalesChannel',
        description:
          'Analytics sales channel values accepted by Shopify analytics.',
        type: 'ShopifySalesChannel',
        typeDefinitions: {
          ShopifySalesChannel: {
            filePath: '/analytics-constants.ts',
            name: 'ShopifySalesChannel',
            description: '',
            members: [
              {
                filePath: '/analytics-constants.ts',
                syntaxKind: 'PropertySignature',
                name: 'hydrogen',
                value: '"hydrogen"',
                description: 'Shopify Hydrogen sales channel',
              },
              {
                filePath: '/analytics-constants.ts',
                syntaxKind: 'PropertySignature',
                name: 'headless',
                value: '"headless"',
                description: 'Shopify Headless sales channel',
              },
            ],
            value:
              "interface ShopifySalesChannel {\n  /** Shopify Hydrogen sales channel */\n  hydrogen: 'hydrogen';\n  /** Shopify Headless sales channel */\n  headless: 'headless';\n}",
          },
        },
      },
    ],
  },
  {
    name: 'storefrontApiCustomScalars',
    category: 'utilities',
    isVisualComponent: false,
    related: [
      {
        name: 'Storefront Schema',
        type: 'gear',
        url: '/api/hydrogen/utilities/storefront-schema',
      },
      {
        name: 'Storefront API Types',
        type: 'gear',
        url: '/api/hydrogen/utilities/storefront-api-types',
      },
    ],
    description:
      "\n    Meant to be used with GraphQL CodeGen to type the Storefront API's custom scalars correctly when using TypeScript.By default, GraphQL CodeGen uses `any` for custom scalars; by using these definitions, GraphQL Codegen will generate the correct types for the Storefront API's custom scalars.\n\nSee more about [GraphQL CodeGen](https://graphql-code-generator.com/) and [custom scalars for TypeScript](https://the-guild.dev/graphql/codegen/plugins/typescript/typescript#scalars).\n\nNote that `@shopify/hydrogen-react` has already generated types for the Storefront API, so you may not need to setup GraphQL Codegen on your own.\n  ",
    type: 'utility',
    defaultExample: {
      description: 'I am the default example',
      codeblock: {
        tabs: [
          {
            title: 'Codegen Config',
            code: "import {storefrontApiCustomScalars} from '@shopify/hydrogen';\n\nconst config = {\n  overwrite: true,\n  schema: require.resolve('@shopify/hydrogen/storefront.schema.json'),\n  documents: 'pages/**/*.tsx',\n  generates: {\n    './gql/': {\n      preset: 'client',\n      plugins: [],\n      config: {\n        // defines the custom scalars used in the Storefront API\n        scalars: storefrontApiCustomScalars,\n      },\n    },\n  },\n};\n\nexport default config;\n",
            language: 'js',
          },
        ],
        title: 'codegen.ts',
      },
    },
    definitions: [],
  },
  {
    name: 'parseGid',
    category: 'utilities',
    isVisualComponent: false,
    related: [],
    description:
      '\n    Parses [Shopify Global ID (GID)](https://shopify.dev/api/usage/gids) and returns the resource type and ID.\n  ',
    type: 'gear',
    defaultExample: {
      description: 'I am the default example',
      codeblock: {
        tabs: [
          {
            title: 'JavaScript',
            code: "import {parseGid} from '@shopify/hydrogen';\n\nconst {id, resource} = parseGid('gid://shopify/Order/123');\n\nconsole.log(id); // 123\nconsole.log(resource); // Order\n",
            language: 'js',
          },
        ],
        title: 'Example code',
      },
    },
    definitions: [
      {
        title: 'Props',
        description: '',
        type: 'ParseGidGeneratedType',
        typeDefinitions: {
          ParseGidGeneratedType: {
            filePath: '/analytics-utils.ts',
            name: 'ParseGidGeneratedType',
            description:
              'Parses global id (gid) and returns the resource type and id.',
            params: [
              {
                name: 'gid',
                description: 'A shopify GID (string)',
                value: 'string',
                filePath: '/analytics-utils.ts',
              },
            ],
            returns: {
              filePath: '/analytics-utils.ts',
              description: '',
              name: 'ShopifyGid',
              value: 'ShopifyGid',
            },
            value:
              "export function parseGid(gid: string | undefined): ShopifyGid {\n  const defaultReturn: ShopifyGid = {\n    id: '',\n    resource: null,\n    resourceId: null,\n    search: '',\n    searchParams: new URLSearchParams(),\n    hash: '',\n  };\n\n  if (typeof gid !== 'string') {\n    return defaultReturn;\n  }\n\n  try {\n    const {search, searchParams, pathname, hash} = new URL(gid);\n    const pathnameParts = pathname.split('/');\n    const lastPathnamePart = pathnameParts[pathnameParts.length - 1];\n    const resourcePart = pathnameParts[pathnameParts.length - 2];\n\n    if (!lastPathnamePart || !resourcePart) {\n      return defaultReturn;\n    }\n\n    const id = `${lastPathnamePart}${search}${hash}` || '';\n    const resourceId = lastPathnamePart || null;\n    const resource = resourcePart ?? null;\n\n    return {id, resource, resourceId, search, searchParams, hash};\n  } catch {\n    return defaultReturn;\n  }\n}",
            examples: [
              {
                title: 'Example',
                description: '',
                tabs: [
                  {
                    code: "const {id, resource} = parseGid('gid://shopify/Order/123')\n// => id = \"123\", resource = 'Order'\n\n * const {id, resource} = parseGid('gid://shopify/Cart/abc123')\n// => id = \"abc123\", resource = 'Cart'",
                    title: 'Example',
                  },
                ],
              },
            ],
          },
          ShopifyGid: {
            filePath: '/analytics-types.ts',
            syntaxKind: 'TypeAliasDeclaration',
            name: 'ShopifyGid',
            value:
              "Pick<URL, 'search' | 'searchParams' | 'hash'> & {\n  id: string;\n  resource: string | null;\n  resourceId: string | null;\n}",
            description: '',
          },
        },
      },
    ],
  },
  {
    name: 'Storefront Schema',
    category: 'utilities',
    isVisualComponent: false,
    related: [
      {
        name: 'storefrontApiCustomScalars',
        type: 'gear',
        url: '/api/hydrogen/utilities/storefrontApiCustomScalars',
      },
      {
        name: 'Storefront API Types',
        type: 'gear',
        url: '/api/hydrogen/utilities/storefront-api-types',
      },
    ],
    description:
      "\n    Hydrogen React ships with a pre-generated GraphQL schema for the Storefront API, which can integrate with your IDE and other GraphQL tooling (such as a [GraphQL config file](https://www.graphql-config.com/docs/user/user-usage)) to provide autocompletion and validation for your Storefront API GraphQL queries.\n\nThis schema is generated using the Storefront API's introspection query, and is available at `@shopify/hydrogen-react/storefront.schema.json`.\n\nTo get these features working in your IDE, you may need to install an extension. For example, in VSCode you can install this [GraphQL extension](https://marketplace.visualstudio.com/items?itemName=GraphQL.vscode-graphql).\n  ",
    type: 'utility',
    defaultExample: {
      description: 'I am the default example',
      codeblock: {
        tabs: [
          {
            title: 'GraphQL Config File',
            code: 'schema: node_modules/@shopify/hydrogen/storefront.schema.json\n',
            language: 'yml',
          },
        ],
        title: '.graphqlrc.yml',
      },
    },
    definitions: [],
  },
  {
    name: 'Storefront API Types',
    category: 'utilities',
    isVisualComponent: false,
    related: [
      {
        name: 'storefrontApiCustomScalars',
        type: 'gear',
        url: '/api/hydrogen/utilities/storefrontApiCustomScalars',
      },
      {
        name: 'Storefront Schema',
        type: 'gear',
        url: '/api/hydrogen/utilities/storefront-schema',
      },
    ],
    description:
      "\n    If you are using TypeScript, pre-generated TypeScript types are available that match the Storefront API's GraphQL schema. These types can be used when you need to manually create an object that matches a Storefront API object's shape.\n\nThese types also work really well with the new [`satisfies` operator](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-9.html#the-satisfies-operator) introduced in TypeScript 4.9, though you don't need to use `satisfies` to use these types.\n  ",
    type: 'utility',
    defaultExample: {
      description: 'I am the default example',
      codeblock: {
        tabs: [
          {
            title: 'Storefront API Types in TypeScript',
            code: "import type {\n  Product,\n  Collection,\n} from '@shopify/hydrogen/storefront-api-types';\n\nconst myProduct = {id: '123', title: 'My Product'} satisfies Partial&lt;Product&gt;;\nconsole.log(myProduct.title);\n\nconst myCollection = {\n  id: '456',\n  title: 'My Collection',\n} satisfies Partial&lt;Collection&gt;;\nconsole.log(myCollection.title);\n\nconst myNotSatisfyingProduct: Partial&lt;Product&gt; = {\n  id: '789',\n  title: 'Other Product',\n};\nconsole.log(myNotSatisfyingProduct.title);\n",
            language: 'ts',
          },
        ],
        title: 'Example code',
      },
    },
    definitions: [],
  },
];
