import {describe, it, expectTypeOf} from 'vitest';
import {createStorefrontClient, createStorefrontRequestContext, gql} from './index';
import type {
  StorefrontApi,
  StorefrontGraphqlResult,
  GenericStorefrontClient,
  GraphQLFormattedError,
  I18nConfig,
  StorefrontQueryString,
} from './index';
import type {ResultOf, VariablesOf} from 'gql.tada';

const DEFAULT_I18N = {country: 'US', language: 'EN'} as I18nConfig;

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

describe('type tests', () => {
  const publicClient = createStorefrontClient({
    type: 'public',
    config: {
      storeDomain: 'test.myshopify.com',
      publicStorefrontToken: 'pub-token',
      i18n: DEFAULT_I18N,
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
      publicClient.graphql(OPTIONAL_VARS_QUERY);
    });

    it('required variables enforce options arg', () => {
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
        config: {
          storeDomain: 'test.myshopify.com',
          i18n: DEFAULT_I18N,
          publicStorefrontToken: 'pub-token',
        },
      });
    });

    it('public client accepts all optional fields from PublicClientOptions', () => {
      createStorefrontClient({
        type: 'public',
        config: {
          storeDomain: 'test.myshopify.com',
          i18n: DEFAULT_I18N,
          publicStorefrontToken: 'pub-token',
          fetch: globalThis.fetch,
          defaultTimeoutInMs: 5000,
        },
      });
    });

    it('private client accepts all optional fields from PrivateClientOptions', () => {
      createStorefrontClient({
        type: 'private',
        config: {
          storeDomain: 'test.myshopify.com',
          i18n: DEFAULT_I18N,
          privateStorefrontToken: 'priv-token',
          buyerIp: '1.2.3.4',
          fetch: globalThis.fetch,
          defaultTimeoutInMs: 5000,
        },
      });
    });

    it('shared rate limit client accepts all optional fields', () => {
      createStorefrontClient({
        type: 'private_shared_rate_limit',
        config: {
          storeDomain: 'test.myshopify.com',
          i18n: DEFAULT_I18N,
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
          config: {
            storeDomain: 'test.myshopify.com',
            privateStorefrontToken: 'priv-token',
            i18n: DEFAULT_I18N,
          },
        });
    });

    it('rejects invalid type string', () => {
      () => createStorefrontClient({
        // @ts-expect-error — type must be a valid client type
        type: 'invalid',
        config: {
          storeDomain: 'test.myshopify.com',
          i18n: DEFAULT_I18N,
        },
      });
    });

    it('rejects plain requestContext objects', () => {
      createStorefrontClient({
        type: 'public',
        config: {
          storeDomain: 'test.myshopify.com',
          i18n: DEFAULT_I18N,
          // @ts-expect-error — requestContext must come from createStorefrontRequestContext()
          requestContext: {
            requestGroupId: 'group-id',
            getForwardedRequestHeaders() {
              return new Headers();
            },
            getSubrequestHeaders() {
              return new Headers();
            },
            captureSubrequestHeaders() {},
            applyResponseHeaders() {},
          },
        },
      });
    });

    it('accepts requestContext from the factory', () => {
      createStorefrontClient({
        type: 'public',
        config: {
          storeDomain: 'test.myshopify.com',
          i18n: DEFAULT_I18N,
          requestContext: createStorefrontRequestContext({
            headers: new Headers(),
          }),
        },
      });
    });

    it('rejects buyerIp on public clients', () => {
      createStorefrontClient({
        type: 'public',
        config: {
          storeDomain: 'test.myshopify.com',
          publicStorefrontToken: 'pub-token',
          i18n: DEFAULT_I18N,
          // @ts-expect-error — buyerIp is private-client only
          buyerIp: '1.2.3.4',
        },
      });
    });

    it('rejects buyerIp on shared rate limit clients', () => {
      createStorefrontClient({
        type: 'private_shared_rate_limit',
        config: {
          storeDomain: 'test.myshopify.com',
          privateStorefrontToken: 'priv-token',
          i18n: DEFAULT_I18N,
          // @ts-expect-error — shared rate limit clients do not carry buyer identity
          buyerIp: '1.2.3.4',
        },
      });
    });

    it('rejects both public and private tokens', () => {
      createStorefrontClient({
        type: 'private',
        config: {
          storeDomain: 'test.myshopify.com',
          privateStorefrontToken: 'priv-token',
          buyerIp: '1.2.3.4',
          i18n: DEFAULT_I18N,
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
        config: {
          storeDomain: 'test.myshopify.com',
          privateStorefrontToken: 'priv-token',
          buyerIp: '1.2.3.4',
          i18n: DEFAULT_I18N,
        },
      });
    });

    it('rejects requestGroupId next to buyerIp', () => {
      createStorefrontClient({
        type: 'private',
        config: {
          storeDomain: 'test.myshopify.com',
          privateStorefrontToken: 'priv-token',
          buyerIp: '1.2.3.4',
          // @ts-expect-error — requestGroupId belongs to requestContext
          requestGroupId: 'g',
          i18n: DEFAULT_I18N,
        },
      });
    });

    it('rejects buyerIp callbacks', () => {
      createStorefrontClient({
        type: 'private',
        config: {
          storeDomain: 'test.myshopify.com',
          privateStorefrontToken: 'priv-token',
          // @ts-expect-error — resolve request-derived buyerIp before creating the client
          buyerIp: (_request: Request) => '1.2.3.4',
          i18n: DEFAULT_I18N,
        },
      });
    });
  });

  describe('requestContext at client creation', () => {
    it('private client does not require requestContext', () => {
      const client = createStorefrontClient({
        type: 'private',
        config: {
          storeDomain: 'test.myshopify.com',
          privateStorefrontToken: 'priv-token',
          buyerIp: '1.2.3.4',
          i18n: DEFAULT_I18N,
        },
      });
      client.graphql(SHOP_QUERY);
    });

    it('private client accepts requestContext at client creation', () => {
      const client = createStorefrontClient({
        type: 'private',
        config: {
          storeDomain: 'test.myshopify.com',
          privateStorefrontToken: 'priv-token',
          requestContext: createStorefrontRequestContext(new Request('http://localhost')),
          buyerIp: '1.2.3.4',
          i18n: DEFAULT_I18N,
        },
      });
      client.graphql(SHOP_QUERY);
    });

    it('rejects raw request at client creation', () => {
      createStorefrontClient({
        type: 'private',
        config: {
          storeDomain: 'test.myshopify.com',
          privateStorefrontToken: 'priv-token',
          // @ts-expect-error — pass createStorefrontRequestContext(request) instead
          request: new Request('http://localhost'),
          buyerIp: '1.2.3.4',
          i18n: DEFAULT_I18N,
        },
      });
    });

    it('rejects i18n callbacks', () => {
      createStorefrontClient({
        type: 'public',
        config: {
          storeDomain: 'test.myshopify.com',
          publicStorefrontToken: 'pub-token',
          // @ts-expect-error — resolve request-derived i18n before creating the client
          i18n: (_req: Request) => DEFAULT_I18N,
        },
      });
    });

  });

  describe('public client graphql signature', () => {
    it('accepts no-variable query without options', () => {
      publicClient.graphql(SHOP_QUERY);
    });

    it('accepts variables-only options', () => {
      publicClient.graphql(PRODUCT_QUERY, {
        variables: {handle: 'snowboard'},
      });
    });

    it('accepts per-call abort signal', () => {
      publicClient.graphql(SHOP_QUERY, {
        signal: new AbortController().signal,
      });
      publicClient.graphql(PRODUCT_QUERY, {
        signal: new AbortController().signal,
        variables: {handle: 'snowboard'},
      });
    });

    it('rejects request in graphql options', () => {
      // @ts-expect-error — request is captured by createStorefrontRequestContext()
      publicClient.graphql(SHOP_QUERY, {request: new Request('http://localhost')});
    });
  });

  describe('private client graphql signature', () => {
    const privateClient = createStorefrontClient({
      type: 'private',
      config: {
        storeDomain: 'test.myshopify.com',
        privateStorefrontToken: 'priv-token',
        requestContext: createStorefrontRequestContext(new Request('http://localhost')),
        buyerIp: '1.2.3.4',
        i18n: DEFAULT_I18N,
      },
    });

    it('accepts no-variable query without options', () => {
      privateClient.graphql(SHOP_QUERY);
    });

    it('accepts variables', () => {
      privateClient.graphql(PRODUCT_QUERY, {
        variables: {handle: 'snowboard'},
      });
    });
  });

  describe('shared rate limit client graphql signature', () => {
    const sharedClient = createStorefrontClient({
      type: 'private_shared_rate_limit',
      config: {
        storeDomain: 'test.myshopify.com',
        privateStorefrontToken: 'priv-token',
        i18n: DEFAULT_I18N,
      },
    });

    it('accepts call without request', () => {
      sharedClient.graphql(SHOP_QUERY);
    });

    it('accepts call with variables and no request', () => {
      sharedClient.graphql(PRODUCT_QUERY, {
        variables: {handle: 'snowboard'},
      });
    });
  });

  describe('GenericStorefrontClient assignability', () => {
    it('client with no request requirement is assignable to GenericStorefrontClient', () => {
      const client = createStorefrontClient({
        type: 'public',
        config: {
          storeDomain: 'test.myshopify.com',
          publicStorefrontToken: 'pub-token',
          i18n: DEFAULT_I18N,
        },
      });
      expectTypeOf(client).toMatchTypeOf<GenericStorefrontClient>();
    });

    it('client with requestContext configured is assignable to GenericStorefrontClient', () => {
      const client = createStorefrontClient({
        type: 'private',
        config: {
          storeDomain: 'test.myshopify.com',
          privateStorefrontToken: 'priv-token',
          requestContext: createStorefrontRequestContext(new Request('http://localhost')),
          buyerIp: '1.2.3.4',
          i18n: DEFAULT_I18N,
        },
      });
      expectTypeOf(client).toMatchTypeOf<GenericStorefrontClient>();
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
      publicClient.graphql(
        `query Product($handle: String!, $country: CountryCode, $language: LanguageCode) @inContext(country: $country, language: $language) { product(handle: $handle) { title } }`,
        {variables: {handle: 'snowboard'}},
      );
    });

    it('rejects raw string with missing required variables', () => {
      // @ts-expect-error — missing required variable (handle)
      publicClient.graphql(
        `query Product($handle: String!, $country: CountryCode, $language: LanguageCode) @inContext(country: $country, language: $language) { product(handle: $handle) { title } }`,
      );
    });

    it('raw string with no variables does not require options', () => {
      publicClient.graphql(`query { shop { name } }`);
    });

    it('branded gql() query still works (overload 1 takes priority)', () => {
      const q = gql(`query { shop { name } }`);
      publicClient.graphql(q);
    });
  });
});
