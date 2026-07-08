import {beforeEach, describe, it, expectTypeOf, vi} from 'vitest';
import {
  Cache,
  createShopifyRequestContext,
  createStorefrontClient,
  gql,
} from '../core';
import type {
  StorefrontApi,
  StorefrontGraphqlResult,
  GraphQLFormattedError,
  I18nConfig,
  StorefrontQueryString,
} from './index';
import type {CachingStrategy} from '../core';
import type * as StorefrontExports from './index';
import type {ResultOf, VariablesOf} from 'gql.tada';

const DEFAULT_I18N = {country: 'US', language: 'EN', pathPrefix: ''} as const satisfies I18nConfig;

const fetchMock = vi.fn(() => Promise.resolve(new Response(JSON.stringify({data: {}}))));
vi.stubGlobal('fetch', fetchMock);

function createTestRequestContext(i18n: I18nConfig = DEFAULT_I18N) {
  return createShopifyRequestContext({request: {headers: new Headers()}, i18n});
}

const SHOP_QUERY = gql(`query { shop { name } }`);
const PRODUCT_QUERY = gql(
  `query Product($handle: String!, $country: CountryCode, $language: LanguageCode) @inContext(country: $country, language: $language) { product(handle: $handle) { title } }`,
);
const OPTIONAL_VARS_QUERY = gql(
  `query OptVars($country: CountryCode, $language: LanguageCode) @inContext(country: $country, language: $language) { shop { name } }`,
);
const PRODUCT_CARD_FRAGMENT = gql(
  `fragment ProductCard on Product { title handle }`,
);
const SHOP_FIELDS_FRAGMENT = gql(
  `fragment ShopFields on Shop { description }`,
);
const PRODUCT_WITH_COMPOSED_FRAGMENT_QUERY = gql(
  `query ProductWithComposedFragment($handle: String!) { product(handle: $handle) { ...ProductCard } }`,
  [PRODUCT_CARD_FRAGMENT],
);
const SHOP_WITH_BRANDED_COMPOSED_FRAGMENT_QUERY = gql(
  gql(`query ShopWithBrandedComposedFragment { shop { name ...ShopFields } }`),
  [SHOP_FIELDS_FRAGMENT],
);
const SHOP_WITH_COMMA_SEPARATED_BRANDED_COMPOSED_FRAGMENT_QUERY = gql(
  gql(`query { shop { name, ...ShopFields } }`),
  [SHOP_FIELDS_FRAGMENT],
);
const PRODUCT_WITH_FRAGMENT_FIRST_QUERY = gql(
  `fragment ProductSummary on Product { title handle }
   query ProductWithFragmentFirst($handle: String!) { product(handle: $handle) { ...ProductSummary } }`,
);
const CART_CREATE_MUTATION = gql(
  `mutation CartCreate($input: CartInput!) { cartCreate(input: $input) { cart { id } } }`,
);
const MULTI_OPERATION_DOCUMENT = gql(
  `query A { shop { name } } query B { shop { description } }`,
);

const keyValueCache = {
  get(_key: string) {
    return undefined;
  },
  set(_key: string, _value: unknown, _options?: {ttl?: number}) {},
};

const customFetchWithCache = async (
  _input: Parameters<typeof fetch>[0],
  _init: Parameters<typeof fetch>[1],
  _options: {key: unknown; strategy: CachingStrategy},
) => Response.json({data: {shop: {name: 'Test Shop'}}});

describe('type tests', () => {
  beforeEach(() => {
    fetchMock.mockClear();
  });

  it('does not expose the gql factory', () => {
    type StorefrontModule = typeof StorefrontExports;
    type MissingExport<Name extends string> = Name extends keyof StorefrontModule ? never : true;

    expectTypeOf<MissingExport<'createStorefrontGql'>>().toEqualTypeOf<true>();
  });

  const publicClient = createStorefrontClient({
    type: 'public',
    requestContext: createTestRequestContext(),
    config: {
      storeDomain: 'test.myshopify.com',
      publicStorefrontToken: 'pub-token',
    },
  });

  describe('result inference', () => {
    it('infers result shape as { data, errors? }', () => {
      type Result = Awaited<ReturnType<typeof publicClient.graphql<typeof SHOP_QUERY>>>;
      expectTypeOf<Result>().toHaveProperty('data');
      expectTypeOf<Result>().toHaveProperty('errors');
    });

    it('result data is ResultOf<Doc> | null before narrowing', () => {
      type Result = StorefrontGraphqlResult<typeof SHOP_QUERY>;
      expectTypeOf<Result['data']>().toEqualTypeOf<ResultOf<typeof SHOP_QUERY> | null>();
    });

    it('narrows data to non-null when errors are absent', () => {
      type Result = StorefrontGraphqlResult<typeof SHOP_QUERY>;
      type CleanSuccess = Extract<Result, { errors?: undefined }>;
      // The discriminated union's payoff: no errors ⟹ data is the full result, non-null.
      expectTypeOf<CleanSuccess['data']>().toEqualTypeOf<ResultOf<typeof SHOP_QUERY>>();
    });

    it('keeps data nullable on the errors-present branch', () => {
      type Result = StorefrontGraphqlResult<typeof SHOP_QUERY>;
      type Errored = Extract<Result, { errors: GraphQLFormattedError[] }>;
      expectTypeOf<Errored['data']>().toEqualTypeOf<ResultOf<typeof SHOP_QUERY> | null>();
    });
  });

  describe('variable ergonomics', () => {
    it('optional variables do not require options arg', () => {
      () => publicClient.graphql(OPTIONAL_VARS_QUERY);
    });

    it('required variables enforce options arg', () => {
      () =>
        // @ts-expect-error — missing required variables (handle)
        publicClient.graphql(PRODUCT_QUERY);
    });
  });

  describe('StorefrontApi namespace', () => {
    it('exports ResultOf', () => {
      type R = StorefrontApi.ResultOf<typeof SHOP_QUERY>;
      expectTypeOf<R>().toEqualTypeOf<ResultOf<typeof SHOP_QUERY>>();
    });

    it('exports VariablesOf', () => {
      type V = StorefrontApi.VariablesOf<typeof PRODUCT_QUERY>;
      expectTypeOf<V>().toEqualTypeOf<VariablesOf<typeof PRODUCT_QUERY>>();
    });
  });

  describe('per-type contextual typing (autocomplete)', () => {
    it('public client accepts publicStorefrontToken alongside required fields', () => {
      createStorefrontClient({
        type: 'public',
        requestContext: createTestRequestContext(),
        config: {
          storeDomain: 'test.myshopify.com',
          publicStorefrontToken: 'pub-token',
        },
      });
    });

    it('public client accepts all optional fields from PublicClientOptions', () => {
      createStorefrontClient({
        type: 'public',
        requestContext: createTestRequestContext(),
        config: {
          storeDomain: 'test.myshopify.com',
          publicStorefrontToken: 'pub-token',
          fetch: globalThis.fetch,
          defaultTimeoutInMs: 5000,
        },
      });
    });

    it('private client accepts all optional fields from PrivateClientOptions', () => {
      createStorefrontClient({
        type: 'private',
        requestContext: createTestRequestContext(),
        config: {
          storeDomain: 'test.myshopify.com',
          privateStorefrontToken: 'priv-token',
          buyerIp: '1.2.3.4',
          fetch: globalThis.fetch,
          defaultTimeoutInMs: 5000,
        },
      });
    });

    it('private no buyer context client accepts all optional fields', () => {
      createStorefrontClient({
        type: 'private_no_buyer_context',
        requestContext: createTestRequestContext(),
        config: {
          storeDomain: 'test.myshopify.com',
          privateStorefrontToken: 'priv-token',
          fetch: globalThis.fetch,
          defaultTimeoutInMs: 5000,
        },
      });
    });
  });

  describe('discriminated union enforcement', () => {
    it('rejects private token without buyerIp', () => {
      () =>
        // @ts-expect-error — buyerIp required with private token
        createStorefrontClient({
          type: 'private',
          requestContext: createTestRequestContext(),
          config: {
            storeDomain: 'test.myshopify.com',
            privateStorefrontToken: 'priv-token',
          },
        });
    });

    it('rejects invalid type string', () => {
      () => createStorefrontClient({
        // @ts-expect-error — type must be a valid client type
        type: 'invalid',
        requestContext: createTestRequestContext(),
        config: {
          storeDomain: 'test.myshopify.com',
        },
      });
    });

    it('rejects plain requestContext objects', () => {
      createStorefrontClient({
        type: 'public',
        // @ts-expect-error — requestContext must come from createShopifyRequestContext()
        requestContext: {
          requestGroupId: 'group-id',
          i18n: DEFAULT_I18N,
          getForwardedRequestHeaders() {
            return new Headers();
          },
          getSubrequestHeaders() {
            return new Headers();
          },
          captureSubrequestHeaders() {},
          applyResponseHeaders() {},
        },
        config: {
          storeDomain: 'test.myshopify.com',
        },
      });
    });

    it('accepts requestContext from the factory', () => {
      createStorefrontClient({
        type: 'public',
        requestContext: createTestRequestContext(),
        config: {
          storeDomain: 'test.myshopify.com',
        },
      });
    });

    it('exposes i18n from requestContext', () => {
      const requestContext = createShopifyRequestContext({
        request: {
          headers: new Headers(),
        },
        i18n: {
          country: 'ES',
          language: 'ES',
          pathPrefix: '/es-es',
          market: 'spain' as const,
        },
      });

      const client = createStorefrontClient({
        type: 'public',
        requestContext,
        config: {
          storeDomain: 'test.myshopify.com',
        },
      });

      expectTypeOf(client.requestContext).toEqualTypeOf<typeof requestContext>();
      expectTypeOf(client.i18n.pathPrefix).toEqualTypeOf<string>();
      expectTypeOf(client.i18n.market).toEqualTypeOf<'spain'>();
    });

    it('rejects clients without requestContext', () => {
      // @ts-expect-error — requestContext is required
      () => createStorefrontClient({
        type: 'public',
        config: {
          storeDomain: 'test.myshopify.com',
        },
      });
    });

    it('rejects buyerIp on public clients', () => {
      createStorefrontClient({
        type: 'public',
        requestContext: createTestRequestContext(),
        config: {
          storeDomain: 'test.myshopify.com',
          publicStorefrontToken: 'pub-token',
          // @ts-expect-error — buyerIp is private-client only
          buyerIp: '1.2.3.4',
        },
      });
    });

    it('rejects buyerIp on private no buyer context clients', () => {
      createStorefrontClient({
        type: 'private_no_buyer_context',
        requestContext: createTestRequestContext(),
        config: {
          storeDomain: 'test.myshopify.com',
          privateStorefrontToken: 'priv-token',
          // @ts-expect-error — no-buyer-context clients do not carry buyer identity
          buyerIp: '1.2.3.4',
        },
      });
    });

    it('rejects both public and private tokens', () => {
      createStorefrontClient({
        type: 'private',
        requestContext: createTestRequestContext(),
        config: {
          storeDomain: 'test.myshopify.com',
          privateStorefrontToken: 'priv-token',
          buyerIp: '1.2.3.4',
          // @ts-expect-error — choose either public or private token path
          publicStorefrontToken: 'pub-token',
        },
      });
    });
  });

  describe('buyerIp', () => {
    it('accepts a static buyer IP string', () => {
      createStorefrontClient({
        type: 'private',
        requestContext: createTestRequestContext(),
        config: {
          storeDomain: 'test.myshopify.com',
          privateStorefrontToken: 'priv-token',
          buyerIp: '1.2.3.4',
        },
      });
    });

    it('rejects requestGroupId next to buyerIp', () => {
      createStorefrontClient({
        type: 'private',
        requestContext: createTestRequestContext(),
        config: {
          storeDomain: 'test.myshopify.com',
          privateStorefrontToken: 'priv-token',
          buyerIp: '1.2.3.4',
          // @ts-expect-error — requestGroupId belongs to requestContext
          requestGroupId: 'g',
        },
      });
    });

    it('rejects buyerIp callbacks', () => {
      createStorefrontClient({
        type: 'private',
        requestContext: createTestRequestContext(),
        config: {
          storeDomain: 'test.myshopify.com',
          privateStorefrontToken: 'priv-token',
          // @ts-expect-error — resolve request-derived buyerIp before creating the client
          buyerIp: (_request: Request) => '1.2.3.4',
        },
      });
    });
  });

  describe('requestContext at client creation', () => {
    it('private client requires requestContext', () => {
      // @ts-expect-error — requestContext is required
      () => createStorefrontClient({
        type: 'private',
        config: {
          storeDomain: 'test.myshopify.com',
          privateStorefrontToken: 'priv-token',
          buyerIp: '1.2.3.4',
        },
      });
    });

    it('private client accepts requestContext at client creation', () => {
      const client = createStorefrontClient({
        type: 'private',
        requestContext: createTestRequestContext(),
        config: {
          storeDomain: 'test.myshopify.com',
          privateStorefrontToken: 'priv-token',
          buyerIp: '1.2.3.4',
        },
      });
      () => client.graphql(SHOP_QUERY);
    });

    it('rejects raw request at client creation', () => {
      createStorefrontClient({
        type: 'private',
        requestContext: createTestRequestContext(),
        config: {
          storeDomain: 'test.myshopify.com',
          privateStorefrontToken: 'priv-token',
          // @ts-expect-error — pass createShopifyRequestContext({request, i18n}) instead
          request: new Request('http://localhost'),
          buyerIp: '1.2.3.4',
        },
      });
    });

  });

  describe('public client graphql signature', () => {
    it('accepts no-variable query without options', () => {
      () => publicClient.graphql(SHOP_QUERY);
    });

    it('accepts variables-only options', () => {
      () =>
        publicClient.graphql(PRODUCT_QUERY, {
          variables: {handle: 'snowboard'},
        });
    });

    it('accepts per-call abort signal', () => {
      () =>
        publicClient.graphql(SHOP_QUERY, {
          signal: new AbortController().signal,
        });
      () =>
        publicClient.graphql(PRODUCT_QUERY, {
          signal: new AbortController().signal,
          variables: {handle: 'snowboard'},
        });
    });

    it('rejects request in graphql options', () => {
      () =>
        // @ts-expect-error — request is captured by createShopifyRequestContext()
        publicClient.graphql(SHOP_QUERY, {request: new Request('http://localhost')});
    });
  });

  describe('cache-configured graphql signature', () => {
    const cacheClient = createStorefrontClient({
      type: 'public',
      requestContext: createTestRequestContext(),
      config: {
        storeDomain: 'test.myshopify.com',
        publicStorefrontToken: 'pub-token',
        cache: keyValueCache,
      },
    });

    it('accepts cache options for query documents', () => {
      () =>
        cacheClient.graphql(SHOP_QUERY, {
          cache: Cache.long(),
        });
      () =>
        cacheClient.graphql(PRODUCT_QUERY, {
          variables: {handle: 'snowboard'},
          cache: Cache({maxAge: 60, staleWhileRevalidate: 300}),
        });
      () =>
        cacheClient.graphql(`query { shop { name } }`, {
          cache: Cache.none(),
        });
    });

    it('rejects cache options when no client cache is configured', () => {
      () =>
        // @ts-expect-error — cache is available only when the client config has cache.
        publicClient.graphql(SHOP_QUERY, {cache: Cache.long()});
    });

    it('accepts cache options when cache is configured with a custom origin fetch', () => {
      const customOriginClient = createStorefrontClient({
        type: 'public',
        requestContext: createTestRequestContext(),
        config: {
          storeDomain: 'test.myshopify.com',
          publicStorefrontToken: 'pub-token',
          cache: keyValueCache,
          fetch: async () => Response.json({data: {shop: {name: 'Test Shop'}}}),
        },
      });

      () =>
        customOriginClient.graphql(SHOP_QUERY, {
          cache: Cache.long(),
        });
    });

    it('does not infer cache options from a custom fetch third argument anymore', () => {
      const customFetchOnlyClient = createStorefrontClient({
        type: 'public',
        requestContext: createTestRequestContext(),
        config: {
          storeDomain: 'test.myshopify.com',
          publicStorefrontToken: 'pub-token',
          fetch: customFetchWithCache,
        },
      });

      () =>
        // @ts-expect-error — cache is enabled by client config, not fetch arity.
        customFetchOnlyClient.graphql(SHOP_QUERY, {cache: Cache.long()});
    });

    it('rejects cache options for mutations', () => {
      () =>
        cacheClient.graphql(CART_CREATE_MUTATION, {
          variables: {input: {}},
          // @ts-expect-error — mutations are not cacheable.
          cache: Cache.long(),
        });

      () =>
        cacheClient.graphql(`mutation CartCreate { cartCreate(input: {}) { cart { id } } }`, {
          // @ts-expect-error — raw mutation strings are not cacheable.
          cache: Cache.long(),
        });
    });

    it('rejects cache options for multi-operation documents', () => {
      () =>
        cacheClient.graphql(MULTI_OPERATION_DOCUMENT, {
          // @ts-expect-error — multi-operation documents are not cacheable in v1.
          cache: Cache.long(),
        });
    });

    it('rejects cache options for widened strings', () => {
      const query: string = 'query { shop { name } }';
      () =>
        // @ts-expect-error — operation kind is unknown for widened strings.
        cacheClient.graphql(query, {cache: Cache.long()});
    });
  });

  describe('private client graphql signature', () => {
    const privateClient = createStorefrontClient({
      type: 'private',
      requestContext: createTestRequestContext(),
      config: {
        storeDomain: 'test.myshopify.com',
        privateStorefrontToken: 'priv-token',
        buyerIp: '1.2.3.4',
      },
    });

    it('accepts no-variable query without options', () => {
      () => privateClient.graphql(SHOP_QUERY);
    });

    it('accepts variables', () => {
      () =>
        privateClient.graphql(PRODUCT_QUERY, {
          variables: {handle: 'snowboard'},
        });
    });
  });

  describe('private no buyer context client graphql signature', () => {
    const client = createStorefrontClient({
      type: 'private_no_buyer_context',
      requestContext: createTestRequestContext(),
      config: {
        storeDomain: 'test.myshopify.com',
        privateStorefrontToken: 'priv-token',
      },
    });

    it('accepts call without request', () => {
      () => client.graphql(SHOP_QUERY);
    });

    it('accepts call with variables and no request', () => {
      () =>
        client.graphql(PRODUCT_QUERY, {
          variables: {handle: 'snowboard'},
        });
    });
  });

  describe('branded string (StorefrontQueryString)', () => {
    it('gql() returns a type assignable to string', () => {
      const q = gql(`query { shop { name } }`);
      expectTypeOf(q).toMatchTypeOf<string>();
    });

    it('gql() return is a StorefrontQueryString', () => {
      const q = gql(`query { shop { name } }`);
      expectTypeOf(q).toMatchTypeOf<StorefrontQueryString>();
    });

    it('ResultOf extracts result type from StorefrontQueryString', () => {
      type R = ResultOf<typeof SHOP_QUERY>;
      expectTypeOf<R>().not.toBeNever();
      expectTypeOf<R>().toHaveProperty('shop');
    });

    it('ResultOf includes fields from composed fragment arrays', () => {
      type R = ResultOf<typeof PRODUCT_WITH_COMPOSED_FRAGMENT_QUERY>;
      type Product = NonNullable<R['product']>;

      expectTypeOf<Product>().not.toBeAny();
      expectTypeOf<Product>().toHaveProperty('title');
      expectTypeOf<Product>().toHaveProperty('handle');
    });

    it('ResultOf includes fields when composing from a StorefrontQueryString', () => {
      type R = ResultOf<typeof SHOP_WITH_BRANDED_COMPOSED_FRAGMENT_QUERY>;
      type Shop = R['shop'];

      expectTypeOf<Shop>().not.toBeAny();
      expectTypeOf<Shop>().toHaveProperty('name');
      expectTypeOf<Shop>().toHaveProperty('description');
    });

    it('ResultOf uses the operation when a document starts with a fragment', () => {
      type R = ResultOf<typeof PRODUCT_WITH_FRAGMENT_FIRST_QUERY>;
      type Product = NonNullable<R['product']>;

      expectTypeOf<Product>().not.toBeAny();
      expectTypeOf<Product>().toHaveProperty('title');
      expectTypeOf<Product>().toHaveProperty('handle');
    });

    it('client.graphql result data includes fields from composed fragment arrays', () => {
      type Result = Awaited<
        ReturnType<typeof publicClient.graphql<typeof PRODUCT_WITH_COMPOSED_FRAGMENT_QUERY>>
      >;
      type Product = NonNullable<NonNullable<Result['data']>['product']>;

      expectTypeOf<Product>().not.toBeAny();
      expectTypeOf<Product>().toHaveProperty('title');
      expectTypeOf<Product>().toHaveProperty('handle');
    });

    it('client.graphql result data includes fields when composing from a StorefrontQueryString', () => {
      type Result = Awaited<
        ReturnType<typeof publicClient.graphql<typeof SHOP_WITH_BRANDED_COMPOSED_FRAGMENT_QUERY>>
      >;
      type Shop = NonNullable<NonNullable<Result['data']>['shop']>;

      expectTypeOf<Shop>().not.toBeAny();
      expectTypeOf<Shop>().toHaveProperty('name');
      expectTypeOf<Shop>().toHaveProperty('description');
    });

    it('client.graphql infers fields from a composed StorefrontQueryString argument', () => {
      async function getShop() {
        const result = await publicClient.graphql(SHOP_WITH_BRANDED_COMPOSED_FRAGMENT_QUERY);
        type Shop = NonNullable<NonNullable<typeof result.data>['shop']>;

        expectTypeOf<Shop>().not.toBeAny();
        expectTypeOf<Shop>().toHaveProperty('name');
        expectTypeOf<Shop>().toHaveProperty('description');
      }

      void getShop;
    });

    it('client.graphql infers fields from the comma-separated composed query shape', () => {
      async function getShop() {
        const result = await publicClient.graphql(
          SHOP_WITH_COMMA_SEPARATED_BRANDED_COMPOSED_FRAGMENT_QUERY,
        );
        type Shop = NonNullable<NonNullable<typeof result.data>['shop']>;

        expectTypeOf<Shop>().not.toBeAny();
        expectTypeOf<Shop>().toHaveProperty('name');
        expectTypeOf<Shop>().toHaveProperty('description');
      }

      void getShop;
    });

    it('VariablesOf extracts variables from StorefrontQueryString', () => {
      type V = VariablesOf<typeof PRODUCT_QUERY>;
      expectTypeOf<V>().not.toBeNever();
      expectTypeOf<V>().toHaveProperty('handle');
    });

    it('arbitrary string is not assignable to StorefrontQueryString', () => {
      const s = 'random string';
      // @ts-expect-error — plain string is not assignable to StorefrontQueryString
      const _: StorefrontQueryString = s;
    });
  });

  describe('raw string overload on graphql()', () => {
    it('accepts a raw string literal and infers result', () => {
      type Result = Awaited<ReturnType<typeof publicClient.graphql<`query { shop { name } }`>>>;
      expectTypeOf<Result['data']>().not.toBeNever();
    });

    it('accepts a raw string with variables and enforces them', () => {
      () =>
        publicClient.graphql(
          `query Product($handle: String!, $country: CountryCode, $language: LanguageCode) @inContext(country: $country, language: $language) { product(handle: $handle) { title } }`,
          {variables: {handle: 'snowboard'}},
        );
    });

    it('rejects raw string with missing required variables', () => {
      () =>
        // @ts-expect-error — missing required variable (handle)
        publicClient.graphql(
          `query Product($handle: String!, $country: CountryCode, $language: LanguageCode) @inContext(country: $country, language: $language) { product(handle: $handle) { title } }`,
        );
    });

    it('raw string with no variables does not require options', () => {
      () => publicClient.graphql(`query { shop { name } }`);
    });

    it('branded gql() query still works (overload 1 takes priority)', () => {
      const q = gql(`query { shop { name } }`);
      () => publicClient.graphql(q);
    });
  });
});
