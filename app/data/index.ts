import type {StorefrontApiResponseOk} from '@shopify/hydrogen-ui-alpha/dist/types/storefront-api-response.types';
import type {
  Cart,
  CartInput,
  CartLineInput,
  CartLineUpdateInput,
  Collection,
  CollectionConnection,
  Product,
  ProductConnection,
  ProductVariant,
  SelectedOptionInput,
  Blog,
  PageConnection,
  Shop,
  Order,
  Localization,
  CustomerAccessTokenCreatePayload,
  Customer,
  CustomerUpdateInput,
  CustomerUpdatePayload,
  UserError,
  Page,
  ShopPolicy,
  CustomerAddressUpdatePayload,
  MailingAddressInput,
  CustomerAddressDeletePayload,
  CustomerDefaultAddressUpdatePayload,
  CustomerAddressCreatePayload,
  CustomerCreatePayload,
  CustomerRecoverPayload,
  CustomerResetPayload,
  CustomerActivatePayload,
} from '@shopify/hydrogen-ui-alpha/storefront-api-types';
import {getPublicTokenHeaders, getStorefrontApiUrl} from '~/lib/shopify-client';
import {
  type EnhancedMenu,
  parseMenu,
  getApiErrorMessage,
  getLocalizationFromLang,
} from '~/lib/utils';
import invariant from 'tiny-invariant';
import {logout} from '~/routes/account/__private/logout';
import type {AppLoadContext} from '@hydrogen/remix';
import {type Params} from '@remix-run/react';
import type {FeaturedData} from '~/components/FeaturedSection';
import {flattenConnection} from '@shopify/hydrogen-ui-alpha';
import {PAGINATION_SIZE} from '~/lib/const';

type StorefrontApiResponse<T> = StorefrontApiResponseOk<T>;
export interface CountriesData {
  localization: Localization;
}
interface SitemapQueryData {
  products: ProductConnection;
  collections: CollectionConnection;
  pages: PageConnection;
}

export interface LayoutData {
  headerMenu: EnhancedMenu;
  footerMenu: EnhancedMenu;
  shop: Shop;
  cart?: Promise<Cart>;
}
interface Metafield {
  value: string;
  reference?: object;
}

interface CollectionHero {
  byline: Metafield;
  cta: Metafield;
  handle: string;
  heading: Metafield;
  height?: 'full';
  loading?: 'eager' | 'lazy';
  spread: Metafield;
  spreadSecondary: Metafield;
  top?: boolean;
}
interface HomeSeoData {
  shop: {
    name: string;
    description: string;
  };
}

export async function getStorefrontData<T>({
  query,
  variables,
}: {
  query: string;
  variables: Record<string, any>;
}): Promise<StorefrontApiResponse<T>> {
  const headers = getPublicTokenHeaders();
  // This needs to be application/json because we're sending JSON, not a graphql string
  headers['content-type'] = 'application/json';

  const response = await fetch(getStorefrontApiUrl(), {
    body: JSON.stringify({
      query,
      variables,
    }),
    headers,
    method: 'POST',
  });

  if (!response.ok) {
    const error = await response.text();

    /**
     * The Storefront API might return a string error, or a JSON-formatted {error: string}.
     * We try both and conform them to a single {errors} format.
     */
    try {
      return JSON.parse(error);
    } catch (_e) {
      return {errors: [{message: error}]};
    }
  }

  return response.json() as StorefrontApiResponseOk<T>;
}

export async function getLayoutData(params: Params) {
  const {language} = getLocalizationFromLang(params.lang);

  const HEADER_MENU_HANDLE = 'main-menu';
  const FOOTER_MENU_HANDLE = 'footer';

  const {data} = await getStorefrontData<LayoutData>({
    query: LAYOUT_QUERY,
    variables: {
      language,
      headerMenuHandle: HEADER_MENU_HANDLE,
      footerMenuHandle: FOOTER_MENU_HANDLE,
    },
  });

  invariant(data, 'No data returned from Shopify API');

  /*
    Modify specific links/routes (optional)
    @see: https://shopify.dev/api/storefront/unstable/enums/MenuItemType
    e.g here we map:
      - /blogs/news -> /news
      - /blog/news/blog-post -> /news/blog-post
      - /collections/all -> /products
  */
  const customPrefixes = {BLOG: '', CATALOG: 'products'};

  const headerMenu = data?.headerMenu
    ? parseMenu(data.headerMenu, customPrefixes)
    : undefined;

  const footerMenu = data?.footerMenu
    ? parseMenu(data.footerMenu, customPrefixes)
    : undefined;

  return {shop: data.shop, headerMenu, footerMenu};
}

const LAYOUT_QUERY = `#graphql
  query layoutMenus(
    $language: LanguageCode
    $headerMenuHandle: String!
    $footerMenuHandle: String!
  ) @inContext(language: $language) {
    shop {
      name
    }
    headerMenu: menu(handle: $headerMenuHandle) {
      id
      items {
        ...MenuItem
        items {
          ...MenuItem
        }
      }
    }
    footerMenu: menu(handle: $footerMenuHandle) {
      id
      items {
        ...MenuItem
        items {
          ...MenuItem
        }
      }
    }
  }
  fragment MenuItem on MenuItem {
    id
    resourceId
    tags
    title
    type
    url
  }
`;

export async function getCountries() {
  const {data} = await getStorefrontData<CountriesData>({
    query: COUNTRIES_QUERY,
    variables: {},
  });

  invariant(data, 'No data returned from Shopify API');

  return data.localization.availableCountries.sort((a, b) =>
    a.name.localeCompare(b.name),
  );
}

const COUNTRIES_QUERY = `#graphql
  query Localization {
    localization {
      availableCountries {
        isoCode
        name
        currency {
          isoCode
          symbol
        }
      }
    }
  }
`;

export async function getProductData(
  handle: string,
  searchParams: URLSearchParams,
  params: Params,
) {
  const {language, country} = getLocalizationFromLang(params.lang);

  const selectedOptions: SelectedOptionInput[] = [];
  searchParams.forEach((value, name) => {
    selectedOptions.push({name, value});
  });

  const {data} = await getStorefrontData<{
    product: Product & {selectedVariant?: ProductVariant};
    shop: Shop;
  }>({
    query: PRODUCT_QUERY,
    variables: {
      country,
      language,
      selectedOptions,
      handle,
    },
  });

  invariant(data, 'No data returned from Shopify API');

  const {product, shop} = data;

  if (!product) {
    throw new Response('Not found', {status: 404});
  }

  return {product, shop};
}

const MEDIA_FRAGMENT = `#graphql
  fragment Media on Media {
    mediaContentType
    alt
    previewImage {
      url
    }
    ... on MediaImage {
      id
      image {
        url
        width
        height
      }
    }
    ... on Video {
      id
      sources {
        mimeType
        url
      }
    }
    ... on Model3d {
      id
      sources {
        mimeType
        url
      }
    }
    ... on ExternalVideo {
      id
      embedUrl
      host
    }
  }
`;

export const PRODUCT_CARD_FRAGMENT = `#graphql
  fragment ProductCard on Product {
    id
    title
    publishedAt
    handle
    variants(first: 1) {
      nodes {
        id
        image {
          url
          altText
          width
          height
        }
        priceV2 {
          amount
          currencyCode
        }
        compareAtPriceV2 {
          amount
          currencyCode
        }
      }
    }
  }
`;

const PRODUCT_VARIANT_FRAGMENT = `#graphql
  fragment ProductVariantFragment on ProductVariant {
    id
    availableForSale
    selectedOptions {
      name
      value
    }
    image {
      id
      url
      altText
      width
      height
    }
    priceV2 {
      amount
      currencyCode
    }
    compareAtPriceV2 {
      amount
      currencyCode
    }
    sku
    title
    unitPrice {
      amount
      currencyCode
    }
  }
`;

const PRODUCT_QUERY = `#graphql
  ${MEDIA_FRAGMENT}
  ${PRODUCT_VARIANT_FRAGMENT}
  query Product(
    $country: CountryCode
    $language: LanguageCode
    $handle: String!
    $selectedOptions: [SelectedOptionInput!]!
  ) @inContext(country: $country, language: $language) {
    product(handle: $handle) {
      id
      title
      vendor
      handle
      descriptionHtml
      options {
        name
        values
      }
      selectedVariant: variantBySelectedOptions(selectedOptions: $selectedOptions) {
        ...ProductVariantFragment
      }
      media(first: 7) {
        nodes {
          ...Media
        }
      }
      variants(first: 1) {
        nodes {
          ...ProductVariantFragment
        }
      }
      seo {
        description
        title
      }
    }
    shop {
      shippingPolicy {
        body
        handle
      }
      refundPolicy {
        body
        handle
      }
    }
  }
`;

const RECOMMENDED_PRODUCTS_QUERY = `#graphql
  ${PRODUCT_CARD_FRAGMENT}
  query productRecommendations(
    $productId: ID!
    $count: Int
    $country: CountryCode
    $language: LanguageCode
  ) @inContext(country: $country, language: $language) {
    recommended: productRecommendations(productId: $productId) {
      ...ProductCard
    }
    additional: products(first: $count, sortKey: BEST_SELLING) {
      nodes {
        ...ProductCard
      }
    }
  }
`;

export async function getRecommendedProducts(
  productId: string,
  params: Params,
  count = 12,
) {
  const {language, country} = getLocalizationFromLang(params.lang);
  const {data: products} = await getStorefrontData<{
    recommended: Product[];
    additional: ProductConnection;
  }>({
    query: RECOMMENDED_PRODUCTS_QUERY,
    variables: {
      productId,
      count,
      language,
      country,
    },
  });

  invariant(products, 'No data returned from Shopify API');

  const mergedProducts = products.recommended
    .concat(products.additional.nodes)
    .filter(
      (value, index, array) =>
        array.findIndex((value2) => value2.id === value.id) === index,
    );

  const originalProduct = mergedProducts
    .map((item) => item.id)
    .indexOf(productId);

  mergedProducts.splice(originalProduct, 1);

  return mergedProducts;
}

const COLLECTIONS_QUERY = `#graphql
  query Collections(
    $country: CountryCode
    $language: LanguageCode
    $pageBy: Int!
  ) @inContext(country: $country, language: $language) {
    collections(first: $pageBy) {
      nodes {
        id
        title
        description
        handle
        seo {
          description
          title
        }
        image {
          id
          url
          width
          height
          altText
        }
      }
    }
  }
`;

export async function getCollections(
  params: Params,
  {paginationSize} = {paginationSize: 8},
) {
  const {language, country} = getLocalizationFromLang(params.lang);

  const {data} = await getStorefrontData<{
    collections: CollectionConnection;
  }>({
    query: COLLECTIONS_QUERY,
    variables: {
      pageBy: paginationSize,
      country,
      language,
    },
  });

  invariant(data, 'No data returned from Shopify API');

  return data.collections.nodes;
}

const COLLECTION_QUERY = `#graphql
  ${PRODUCT_CARD_FRAGMENT}
  query CollectionDetails(
    $handle: String!
    $country: CountryCode
    $language: LanguageCode
    $pageBy: Int!
    $cursor: String
  ) @inContext(country: $country, language: $language) {
    collection(handle: $handle) {
      id
      handle
      title
      description
      seo {
        description
        title
      }
      image {
        id
        url
        width
        height
        altText
      }
      products(first: $pageBy, after: $cursor) {
        nodes {
          ...ProductCard
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  }
`;

export async function getCollection({
  handle,
  paginationSize = 48,
  cursor,
  params,
}: {
  handle: string;
  paginationSize?: number;
  cursor?: string;
  params: Params;
}) {
  const {language, country} = getLocalizationFromLang(params.lang);

  const {data} = await getStorefrontData<{
    collection: Collection;
  }>({
    query: COLLECTION_QUERY,
    variables: {
      handle,
      cursor,
      language,
      country,
      pageBy: paginationSize,
    },
  });

  invariant(data, 'No data returned from Shopify API');

  if (!data.collection) {
    throw new Response('Not found', {status: 404});
  }

  return data.collection;
}

const ALL_PRODUCTS_QUERY = `#graphql
  ${PRODUCT_CARD_FRAGMENT}
  query AllProducts(
    $country: CountryCode
    $language: LanguageCode
    $pageBy: Int!
    $cursor: String
  ) @inContext(country: $country, language: $language) {
    products(first: $pageBy, after: $cursor) {
      nodes {
        ...ProductCard
      }
      pageInfo {
        hasNextPage
        startCursor
        endCursor
      }
    }
  }
`;

export async function getAllProducts({
  paginationSize = 48,
  cursor,
  params,
}: {
  paginationSize?: number;
  cursor?: string;
  params: Params;
}) {
  const {language, country} = getLocalizationFromLang(params.lang);

  const {data} = await getStorefrontData<{
    products: ProductConnection;
  }>({
    query: ALL_PRODUCTS_QUERY,
    variables: {
      cursor,
      language,
      country,
      pageBy: paginationSize,
    },
  });

  invariant(data, 'No data returned from Shopify API');

  return data.products;
}

const CART_FRAGMENT = `#graphql
fragment CartFragment on Cart {
  id
  checkoutUrl
  totalQuantity
  buyerIdentity {
    countryCode
    customer {
      id
      email
      firstName
      lastName
      displayName
    }
    email
    phone
  }
  lines(first: 100) {
    edges {
      node {
        id
        quantity
        attributes {
          key
          value
        }
        cost {
          totalAmount {
            amount
            currencyCode
          }
          compareAtAmountPerQuantity {
            amount
            currencyCode
          }
        }
        merchandise {
          ... on ProductVariant {
            id
            availableForSale
            compareAtPriceV2 {
              ...MoneyFragment
            }
            priceV2 {
              ...MoneyFragment
            }
            requiresShipping
            title
            image {
              ...ImageFragment
            }
            product {
              handle
              title
              id
            }
            selectedOptions {
              name
              value
            }
          }
        }
      }
    }
  }
  cost {
    subtotalAmount {
      ...MoneyFragment
    }
    totalAmount {
      ...MoneyFragment
    }
    totalDutyAmount {
      ...MoneyFragment
    }
    totalTaxAmount {
      ...MoneyFragment
    }
  }
  note
  attributes {
    key
    value
  }
  discountCodes {
    code
  }
}

fragment MoneyFragment on MoneyV2 {
  currencyCode
  amount
}
fragment ImageFragment on Image {
  id
  url
  altText
  width
  height
}
`;

const CREATE_CART_MUTATION = `#graphql
mutation CartCreate($input: CartInput!, $country: CountryCode = ZZ) @inContext(country: $country) {
  cartCreate(input: $input) {
    cart {
      id
    }
  }
}
`;

export async function createCart({
  cart,
  params,
}: {
  cart: CartInput;
  params: Params;
}) {
  const {country} = getLocalizationFromLang(params.lang);

  const {data} = await getStorefrontData<{
    cartCreate: {
      cart: Cart;
    };
  }>({
    query: CREATE_CART_MUTATION,
    variables: {
      input: cart,
      country,
    },
  });

  invariant(data, 'No data returned from Shopify API');

  return data.cartCreate.cart;
}

const ADD_LINE_ITEM_QUERY = `#graphql
  mutation CartLineAdd($cartId: ID!, $lines: [CartLineInput!]!, $country: CountryCode = ZZ) @inContext(country: $country) {
    cartLinesAdd(cartId: $cartId, lines: $lines) {
      cart {
        id
      }
    }
  }
`;

export async function addLineItem({
  cartId,
  lines,
  params,
}: {
  cartId: string;
  lines: CartLineInput[];
  params: Params;
}) {
  const {country} = getLocalizationFromLang(params.lang);

  const {data} = await getStorefrontData<{
    cartLinesAdd: {
      cart: Cart;
    };
  }>({
    query: ADD_LINE_ITEM_QUERY,
    variables: {cartId, lines, country},
  });

  invariant(data, 'No data returned from Shopify API');

  return data.cartLinesAdd.cart;
}

const CART_QUERY = `#graphql
  query CartQuery($cartId: ID!, $country: CountryCode = ZZ) @inContext(country: $country) {
    cart(id: $cartId) {
      ...CartFragment
    }
  }

  ${CART_FRAGMENT}
`;

export async function getCart({
  cartId,
  params,
}: {
  cartId: string;
  params: Params;
}) {
  const {country} = getLocalizationFromLang(params.lang);

  const {data} = await getStorefrontData<{cart: Cart}>({
    query: CART_QUERY,
    variables: {
      cartId,
      country,
    },
  });

  invariant(data, 'No data returned from Shopify API');

  return data.cart;
}

const UPDATE_LINE_ITEM_QUERY = `#graphql
  mutation CartLineUpdate($cartId: ID!, $lines: [CartLineUpdateInput!]!, $country: CountryCode = ZZ) @inContext(country: $country) {
    cartLinesUpdate(cartId: $cartId, lines: $lines) {
      cart {
        ...CartFragment
      }
    }
  }

  ${CART_FRAGMENT}
`;

export async function updateLineItem({
  cartId,
  lineItem,
  params,
}: {
  cartId: string;
  lineItem: CartLineUpdateInput;
  params: Params;
}) {
  const {country} = getLocalizationFromLang(params.lang);

  const {data} = await getStorefrontData<{cartLinesUpdate: {cart: Cart}}>({
    query: UPDATE_LINE_ITEM_QUERY,
    variables: {
      cartId,
      lines: [lineItem],
      country,
    },
  });

  invariant(data, 'No data returned from Shopify API');

  return data.cartLinesUpdate.cart;
}

const TOP_PRODUCTS_QUERY = `#graphql
  ${PRODUCT_CARD_FRAGMENT}
  query topProducts(
    $count: Int
    $country: CountryCode
    $language: LanguageCode
  ) @inContext(country: $country, language: $language) {
    products(first: $count, sortKey: BEST_SELLING) {
      nodes {
        ...ProductCard
      }
    }
  }
`;

export async function getTopProducts({
  params,
  count = 4,
}: {
  params: Params;
  count?: number;
}) {
  const {language, country} = getLocalizationFromLang(params.lang);

  const {data} = await getStorefrontData<{
    products: ProductConnection;
  }>({
    query: TOP_PRODUCTS_QUERY,
    variables: {
      count,
      country,
      language,
    },
  });

  invariant(data, 'No data returned from Shopify API');

  return data.products;
}

const SITEMAP_QUERY = `#graphql
  query sitemaps($urlLimits: Int, $language: LanguageCode)
  @inContext(language: $language) {
    products(
      first: $urlLimits
      query: "published_status:'online_store:visible'"
    ) {
      edges {
        node {
          updatedAt
          handle
          onlineStoreUrl
          title
          featuredImage {
            url
            altText
          }
        }
      }
    }
    collections(
      first: $urlLimits
      query: "published_status:'online_store:visible'"
    ) {
      edges {
        node {
          updatedAt
          handle
          onlineStoreUrl
        }
      }
    }
    pages(first: $urlLimits, query: "published_status:'published'") {
      edges {
        node {
          updatedAt
          handle
          onlineStoreUrl
        }
      }
    }
  }
`;

export async function getSitemap({
  params,
  urlLimits,
}: {
  params: Params;
  urlLimits: number;
}) {
  const {language} = getLocalizationFromLang(params.lang);
  const {data} = await getStorefrontData<SitemapQueryData>({
    query: SITEMAP_QUERY,
    variables: {
      urlLimits,
      language,
    },
  });

  invariant(data, 'Sitemap data is missing');

  return data;
}

const BLOG_QUERY = `#graphql
query Blog(
  $language: LanguageCode
  $blogHandle: String!
  $pageBy: Int!
  $cursor: String
) @inContext(language: $language) {
  blog(handle: $blogHandle) {
    articles(first: $pageBy, after: $cursor) {
      edges {
        node {
          author: authorV2 {
            name
          }
          contentHtml
          handle
          id
          image {
            id
            altText
            url
            width
            height
          }
          publishedAt
          title
        }
      }
    }
  }
}
`;

export async function getBlog({
  params,
  paginationSize,
  blogHandle,
}: {
  params: Params;
  blogHandle: string;
  paginationSize: number;
}) {
  const {language} = getLocalizationFromLang(params.lang);
  const {data} = await getStorefrontData<{
    blog: Blog;
  }>({
    query: BLOG_QUERY,
    variables: {
      language,
      blogHandle,
      pageBy: paginationSize,
    },
  });

  invariant(data, 'No data returned from Shopify API');

  if (!data.blog?.articles) {
    throw new Response('Not found', {status: 404});
  }

  return data.blog.articles;
}

const ARTICLE_QUERY = `#graphql
  query ArticleDetails(
    $language: LanguageCode
    $blogHandle: String!
    $articleHandle: String!
  ) @inContext(language: $language) {
    blog(handle: $blogHandle) {
      articleByHandle(handle: $articleHandle) {
        title
        contentHtml
        publishedAt
        author: authorV2 {
          name
        }
        image {
          id
          altText
          url
          width
          height
        }
      }
    }
  }
`;

export async function getArticle({
  params,
  blogHandle,
  articleHandle,
}: {
  params: Params;
  blogHandle: string;
  articleHandle: string;
}) {
  const {language} = getLocalizationFromLang(params.lang);
  const {data} = await getStorefrontData<{
    blog: Blog;
  }>({
    query: ARTICLE_QUERY,
    variables: {
      blogHandle,
      articleHandle,
      language,
    },
  });

  invariant(data, 'No data returned from Shopify API');

  if (!data.blog?.articleByHandle) {
    throw new Response('Not found', {status: 404});
  }

  return data.blog.articleByHandle;
}

const PAGE_QUERY = `#graphql
  query PageDetails($language: LanguageCode, $handle: String!)
  @inContext(language: $language) {
    page(handle: $handle) {
      id
      title
      body
      seo {
        description
        title
      }
    }
  }
`;

export async function getPageData({
  params,
  handle,
}: {
  params: Params;
  handle: string;
}) {
  const {language} = getLocalizationFromLang(params.lang);
  const {data} = await getStorefrontData<{page: Page}>({
    query: PAGE_QUERY,
    variables: {
      language,
      handle,
    },
  });

  invariant(data, 'No data returned from Shopify API');
  if (!data.page) {
    throw new Response('Not found', {status: 404});
  }

  return data.page;
}

const POLICIES_QUERY = `#graphql
  fragment Policy on ShopPolicy {
    id
    title
    handle
  }

  query PoliciesQuery {
    shop {
      privacyPolicy {
        ...Policy
      }
      shippingPolicy {
        ...Policy
      }
      termsOfService {
        ...Policy
      }
      refundPolicy {
        ...Policy
      }
      subscriptionPolicy {
        id
        title
        handle
      }
    }
  }
`;

export async function getPolicies() {
  const {data} = await getStorefrontData<{
    shop: Record<string, ShopPolicy>;
  }>({
    query: POLICIES_QUERY,
    variables: {},
  });

  invariant(data, 'No data returned from Shopify API');
  const policies = Object.values(data.shop || {});

  if (policies.length === 0) {
    throw new Response('Not found', {status: 404});
  }

  return policies;
}

const POLICY_CONTENT_QUERY = `#graphql
  fragment Policy on ShopPolicy {
    body
    handle
    id
    title
    url
  }

  query PoliciesQuery(
    $languageCode: LanguageCode
    $privacyPolicy: Boolean!
    $shippingPolicy: Boolean!
    $termsOfService: Boolean!
    $refundPolicy: Boolean!
  ) @inContext(language: $languageCode) {
    shop {
      privacyPolicy @include(if: $privacyPolicy) {
        ...Policy
      }
      shippingPolicy @include(if: $shippingPolicy) {
        ...Policy
      }
      termsOfService @include(if: $termsOfService) {
        ...Policy
      }
      refundPolicy @include(if: $refundPolicy) {
        ...Policy
      }
    }
  }
`;

export async function getPolicyContent({
  params,
  handle,
}: {
  params: Params;
  handle: string;
}) {
  const {language} = getLocalizationFromLang(params.lang);

  const policyName = handle.replace(/-([a-z])/g, (_, m1) => m1.toUpperCase());

  const {data} = await getStorefrontData<{
    shop: Record<string, ShopPolicy>;
  }>({
    query: POLICY_CONTENT_QUERY,
    variables: {
      language,
      privacyPolicy: false,
      shippingPolicy: false,
      termsOfService: false,
      refundPolicy: false,
      [policyName]: true,
    },
  });

  invariant(data, 'No data returned from Shopify API');
  const policy = data.shop?.[policyName];

  if (!policy) {
    throw new Response('Not found', {status: 404});
  }

  return policy;
}

const NOT_FOUND_QUERY = `#graphql
  ${PRODUCT_CARD_FRAGMENT}
  query homepage($country: CountryCode, $language: LanguageCode)
  @inContext(country: $country, language: $language) {
    featuredCollections: collections(first: 3, sortKey: UPDATED_AT) {
      nodes {
        id
        title
        handle
        image {
          altText
          width
          height
          url
        }
      }
    }
    featuredProducts: products(first: 12) {
      nodes {
        ...ProductCard
      }
    }
  }
`;

export async function getFeaturedData({
  params,
}: {
  params: Record<string, any>;
}): Promise<FeaturedData> {
  const {language, country} = getLocalizationFromLang(params.lang);
  const {data} = await getStorefrontData<{
    featuredCollections: CollectionConnection;
    featuredProducts: ProductConnection;
  }>({
    query: NOT_FOUND_QUERY,
    variables: {
      language,
      country,
    },
  });

  invariant(data, 'No data returned from Shopify API');

  return {
    featuredCollections: flattenConnection<Collection>(
      data.featuredCollections,
    ) as Collection[],
    featuredProducts: flattenConnection<Product>(
      data.featuredProducts,
    ) as Product[],
  };
}

// shop primary domain url for /admin
export async function getPrimaryShopDomain() {
  const {data, errors} = await getStorefrontData<{shop: Shop}>({
    query: SHOP_PRIMARY_DOMAIN_QUERY,
    variables: {},
  });

  if (errors) {
    throw new Error(errors.map((error) => error).join());
  }

  invariant(data?.shop?.primaryDomain, 'Primary domain not found');

  return data.shop;
}

const SHOP_PRIMARY_DOMAIN_QUERY = `#graphql
  query {
    shop {
      primaryDomain {
        url
      }
    }
  }
`;

export const COLLECTION_CONTENT_FRAGMENT = `#graphql
  ${MEDIA_FRAGMENT}
  fragment CollectionContent on Collection {
    id
    handle
    title
    descriptionHtml
    heading: metafield(namespace: "hero", key: "title") {
      value
    }
    byline: metafield(namespace: "hero", key: "byline") {
      value
    }
    cta: metafield(namespace: "hero", key: "cta") {
      value
    }
    spread: metafield(namespace: "hero", key: "spread") {
      reference {
        ...Media
      }
    }
    spreadSecondary: metafield(namespace: "hero", key: "spread_secondary") {
      reference {
        ...Media
      }
    }
  }
`;

/*
  Account ------------------------------------------------------------------------------------------------------------------------------------------------------------------------
*/

const LOGIN_MUTATION = `#graphql
  mutation customerAccessTokenCreate($input: CustomerAccessTokenCreateInput!) {
    customerAccessTokenCreate(input: $input) {
      customerUserErrors {
        code
        field
        message
      }
      customerAccessToken {
        accessToken
        expiresAt
      }
    }
  }
`;

export class StorefrontApiError extends Error {}

export async function login({
  email,
  password,
}: {
  email: string;
  password: string;
}) {
  const {data, errors} = await getStorefrontData<{
    customerAccessTokenCreate: CustomerAccessTokenCreatePayload;
  }>({
    query: LOGIN_MUTATION,
    variables: {
      input: {
        email,
        password,
      },
    },
  });

  /**
   * Something is wrong with the API.
   */
  if (errors) {
    throw new StorefrontApiError(errors.map((e) => e.message).join(', '));
  }

  if (data?.customerAccessTokenCreate?.customerAccessToken?.accessToken) {
    return data.customerAccessTokenCreate.customerAccessToken.accessToken;
  }

  /**
   * Something is wrong with the user's input.
   */
  throw new Error(
    data?.customerAccessTokenCreate?.customerUserErrors.join(', '),
  );
}

const CUSTOMER_CREATE_MUTATION = `#graphql
  mutation customerCreate($input: CustomerCreateInput!) {
    customerCreate(input: $input) {
      customer {
        id
      }
      customerUserErrors {
        code
        field
        message
      }
    }
  }
`;

export async function registerCustomer({
  email,
  password,
}: {
  email: string;
  password: string;
}) {
  const {data, errors} = await getStorefrontData<{
    customerCreate: CustomerCreatePayload;
  }>({
    query: CUSTOMER_CREATE_MUTATION,
    variables: {
      input: {
        email,
        password,
      },
    },
  });

  if (errors && /Creating Customer Limit exceeded/i.test(errors[0]?.message)) {
    // The SFAPI throws this error when the email is already in use.
    throw new Error('User already exists or API limit exceeded');
  }

  /**
   * Something is wrong with the API.
   */
  if (errors) {
    throw new StorefrontApiError(errors.map((e) => e.message).join(', '));
  }

  if (data?.customerCreate?.customer?.id) {
    return data.customerCreate.customer.id;
  }

  /**
   * Something is wrong with the user's input.
   */
  throw new Error(data?.customerCreate?.customerUserErrors.join(', '));
}

const CUSTOMER_RECOVER_MUTATION = `#graphql
  mutation customerRecover($email: String!) {
    customerRecover(email: $email) {
      customerUserErrors {
        code
        field
        message
      }
    }
  }
`;

export async function sendPasswordResetEmail({email}: {email: string}) {
  const {errors} = await getStorefrontData<{
    customerRecover: CustomerRecoverPayload;
  }>({
    query: CUSTOMER_RECOVER_MUTATION,
    variables: {
      email,
    },
  });

  /**
   * Something is wrong with the API.
   */
  if (errors) {
    throw new StorefrontApiError(errors.map((e) => e.message).join(', '));
  }

  // User doesn't exist but we don't need to notify that.
  return null;
}

const CUSTOMER_RESET_MUTATION = `#graphql
  mutation customerReset($id: ID!, $input: CustomerResetInput!) {
    customerReset(id: $id, input: $input) {
      customerAccessToken {
        accessToken
        expiresAt
      }
      customerUserErrors {
        code
        field
        message
      }
    }
  }
`;

export async function resetPassword({
  id,
  resetToken,
  password,
}: {
  id: string;
  resetToken: string;
  password: string;
}) {
  const {data, errors} = await getStorefrontData<{
    customerReset: CustomerResetPayload;
  }>({
    query: CUSTOMER_RESET_MUTATION,
    variables: {
      id: `gid://shopify/Customer/${id}`,
      input: {
        password,
        resetToken,
      },
    },
  });

  /**
   * Something is wrong with the API.
   */
  if (errors) {
    throw new StorefrontApiError(errors.map((e) => e.message).join(', '));
  }

  if (data?.customerReset?.customerAccessToken) {
    return data.customerReset.customerAccessToken;
  }

  /**
   * Something is wrong with the user's input.
   */
  throw new Error(data?.customerReset?.customerUserErrors.join(', '));
}

const CUSTOMER_ACTIVATE_MUTATION = `#graphql
  mutation customerActivate($id: ID!, $input: CustomerActivateInput!) {
    customerActivate(id: $id, input: $input) {
      customerAccessToken {
        accessToken
        expiresAt
      }
      customerUserErrors {
        code
        field
        message
      }
    }
  }
`;

export async function activateAccount({
  id,
  password,
  activationToken,
}: {
  id: string;
  password: string;
  activationToken: string;
}) {
  const {data, errors} = await getStorefrontData<{
    customerActivate: CustomerActivatePayload;
  }>({
    query: CUSTOMER_ACTIVATE_MUTATION,
    variables: {
      id: `gid://shopify/Customer/${id}`,
      input: {
        password,
        activationToken,
      },
    },
  });

  /**
   * Something is wrong with the API.
   */
  if (errors) {
    throw new StorefrontApiError(errors.map((e) => e.message).join(', '));
  }

  if (data?.customerActivate?.customerAccessToken) {
    return data.customerActivate.customerAccessToken;
  }

  /**
   * Something is wrong with the user's input.
   */
  throw new Error(data?.customerActivate?.customerUserErrors.join(', '));
}

const CUSTOMER_QUERY = `#graphql
  query CustomerDetails(
    $customerAccessToken: String!
    $country: CountryCode
    $language: LanguageCode
  ) @inContext(country: $country, language: $language) {
    customer(customerAccessToken: $customerAccessToken) {
      firstName
      lastName
      phone
      email
      defaultAddress {
        id
        formatted
        firstName
        lastName
        company
        address1
        address2
        country
        province
        city
        zip
        phone
      }
      addresses(first: 6) {
        edges {
          node {
            id
            formatted
            firstName
            lastName
            company
            address1
            address2
            country
            province
            city
            zip
            phone
          }
        }
      }
      orders(first: 250, sortKey: PROCESSED_AT, reverse: true) {
        edges {
          node {
            id
            orderNumber
            processedAt
            financialStatus
            fulfillmentStatus
            currentTotalPrice {
              amount
              currencyCode
            }
            lineItems(first: 2) {
              edges {
                node {
                  variant {
                    image {
                      url
                      altText
                      height
                      width
                    }
                  }
                  title
                }
              }
            }
          }
        }
      }
    }
  }
`;

const CUSTOMER_ORDER_QUERY = `#graphql
  fragment Money on MoneyV2 {
    amount
    currencyCode
  }
  fragment AddressFull on MailingAddress {
    address1
    address2
    city
    company
    country
    countryCodeV2
    firstName
    formatted
    id
    lastName
    name
    phone
    province
    provinceCode
    zip
  }
  fragment DiscountApplication on DiscountApplication {
    value {
      ... on MoneyV2 {
        amount
        currencyCode
      }
      ... on PricingPercentageValue {
        percentage
      }
    }
  }
  fragment Image on Image {
    altText
    height
    src: url(transform: {crop: CENTER, maxHeight: 96, maxWidth: 96, scale: 2})
    id
    width
  }
  fragment ProductVariant on ProductVariant {
    id
    image {
      ...Image
    }
    priceV2 {
      ...Money
    }
    product {
      handle
    }
    sku
    title
  }
  fragment LineItemFull on OrderLineItem {
    title
    quantity
    discountAllocations {
      allocatedAmount {
        ...Money
      }
      discountApplication {
        ...DiscountApplication
      }
    }
    originalTotalPrice {
      ...Money
    }
    discountedTotalPrice {
      ...Money
    }
    variant {
      ...ProductVariant
    }
  }

  query CustomerOrder(
    $country: CountryCode
    $language: LanguageCode
    $orderId: ID!
  ) @inContext(country: $country, language: $language) {
    node(id: $orderId) {
      ... on Order {
        id
        name
        orderNumber
        processedAt
        fulfillmentStatus
        totalTaxV2 {
          ...Money
        }
        totalPriceV2 {
          ...Money
        }
        subtotalPriceV2 {
          ...Money
        }
        shippingAddress {
          ...AddressFull
        }
        discountApplications(first: 100) {
          nodes {
            ...DiscountApplication
          }
        }
        lineItems(first: 100) {
          nodes {
            ...LineItemFull
          }
        }
      }
    }
  }
`;

export async function getCustomerOrder({
  orderId,
  params,
}: {
  orderId: string;
  params: Params;
}): Promise<Order | undefined> {
  const {language, country} = getLocalizationFromLang(params.lang);

  const {data, errors} = await getStorefrontData<{
    node: Order;
  }>({
    query: CUSTOMER_ORDER_QUERY,
    variables: {
      country,
      language,
      orderId,
    },
  });

  if (errors) {
    const errorMessages = errors.map((error) => error.message).join('\n');
    throw new Error(errorMessages);
  }

  return data?.node;
}

export async function getCustomer({
  request,
  context,
  customerAccessToken,
  params,
}: {
  request: Request;
  context: AppLoadContext;
  customerAccessToken: string;
  params: Params;
}) {
  const {language, country} = getLocalizationFromLang(params.lang);

  const {data, errors} = await getStorefrontData<{
    customer: Customer;
  }>({
    query: CUSTOMER_QUERY,
    variables: {
      customerAccessToken,
      country,
      language,
    },
  });

  if (errors) {
    const errorMessages = errors.map((error) => error.message).join('\n');
    throw new Error(errorMessages);
  }

  /**
   * If the customer failed to load, we assume their access token is invalid.
   */
  if (!data || !data.customer) {
    throw await logout(request, context, params);
  }

  return data.customer;
}

const CUSTOMER_UPDATE_MUTATION = `#graphql
  mutation customerUpdate($customerAccessToken: String!, $customer: CustomerUpdateInput!) {
    customerUpdate(customerAccessToken: $customerAccessToken, customer: $customer) {
      customerUserErrors {
        code
        field
        message
      }
    }
  }
  `;

export async function updateCustomer({
  customerAccessToken,
  customer,
}: {
  customerAccessToken: string;
  customer: CustomerUpdateInput;
}): Promise<void> {
  const {data, errors} = await getStorefrontData<{
    customerUpdate: CustomerUpdatePayload;
  }>({
    query: CUSTOMER_UPDATE_MUTATION,
    variables: {
      customerAccessToken,
      customer,
    },
  });

  const error = getApiErrorMessage(
    'customerUpdate',
    data,
    errors as UserError[],
  );

  if (error) {
    throw new Error(error);
  }
}

const UPDATE_ADDRESS_MUTATION = `#graphql
  mutation customerAddressUpdate(
    $address: MailingAddressInput!
    $customerAccessToken: String!
    $id: ID!
  ) {
    customerAddressUpdate(
      address: $address
      customerAccessToken: $customerAccessToken
      id: $id
    ) {
      customerUserErrors {
        code
        field
        message
      }
    }
  }
`;

export async function updateCustomerAddress({
  customerAccessToken,
  addressId,
  address,
}: {
  customerAccessToken: string;
  addressId: string;
  address: MailingAddressInput;
}): Promise<void> {
  const {data, errors} = await getStorefrontData<{
    customerAddressUpdate: CustomerAddressUpdatePayload;
  }>({
    query: UPDATE_ADDRESS_MUTATION,
    variables: {
      customerAccessToken,
      id: addressId,
      address,
    },
  });

  const error = getApiErrorMessage(
    'customerAddressUpdate',
    data,
    errors as UserError[],
  );

  if (error) {
    throw new Error(error);
  }
}

const DELETE_ADDRESS_MUTATION = `#graphql
  mutation customerAddressDelete($customerAccessToken: String!, $id: ID!) {
    customerAddressDelete(customerAccessToken: $customerAccessToken, id: $id) {
      customerUserErrors {
        code
        field
        message
      }
      deletedCustomerAddressId
    }
  }
`;

export async function deleteCustomerAddress({
  customerAccessToken,
  addressId,
}: {
  customerAccessToken: string;
  addressId: string;
}): Promise<void> {
  const {data, errors} = await getStorefrontData<{
    customerAddressDelete: CustomerAddressDeletePayload;
  }>({
    query: DELETE_ADDRESS_MUTATION,
    variables: {
      customerAccessToken,
      id: addressId,
    },
  });

  const error = getApiErrorMessage(
    'customerAddressDelete',
    data,
    errors as UserError[],
  );

  if (error) {
    throw new Error(error);
  }
}

const UPDATE_DEFAULT_ADDRESS_MUTATION = `#graphql
  mutation customerDefaultAddressUpdate(
    $addressId: ID!
    $customerAccessToken: String!
  ) {
    customerDefaultAddressUpdate(
      addressId: $addressId
      customerAccessToken: $customerAccessToken
    ) {
      customerUserErrors {
        code
        field
        message
      }
    }
  }
`;

export async function updateCustomerDefaultAddress({
  customerAccessToken,
  addressId,
}: {
  customerAccessToken: string;
  addressId: string;
}): Promise<void> {
  const {data, errors} = await getStorefrontData<{
    customerDefaultAddressUpdate: CustomerDefaultAddressUpdatePayload;
  }>({
    query: UPDATE_DEFAULT_ADDRESS_MUTATION,
    variables: {
      customerAccessToken,
      addressId,
    },
  });

  const error = getApiErrorMessage(
    'customerDefaultAddressUpdate',
    data,
    errors as UserError[],
  );

  if (error) {
    throw new Error(error);
  }
}

const CREATE_ADDRESS_MUTATION = `#graphql
  mutation customerAddressCreate(
    $address: MailingAddressInput!
    $customerAccessToken: String!
  ) {
    customerAddressCreate(
      address: $address
      customerAccessToken: $customerAccessToken
    ) {
      customerAddress {
        id
      }
      customerUserErrors {
        code
        field
        message
      }
    }
  }
`;

export async function createCustomerAddress({
  customerAccessToken,
  address,
}: {
  customerAccessToken: string;
  address: MailingAddressInput;
}): Promise<string> {
  const {data, errors} = await getStorefrontData<{
    customerAddressCreate: CustomerAddressCreatePayload;
  }>({
    query: CREATE_ADDRESS_MUTATION,
    variables: {
      customerAccessToken,
      address,
    },
  });

  const error = getApiErrorMessage(
    'customerAddressCreate',
    data,
    errors as UserError[],
  );

  if (error) {
    throw new Error(error);
  }

  invariant(
    data?.customerAddressCreate?.customerAddress?.id,
    'Expected customer address to be created',
  );

  return data.customerAddressCreate.customerAddress.id;
}

export async function searchProducts(
  params: Params,
  variables: {
    searchTerm: string;
    cursor: string;
    pageBy: number;
  },
) {
  const {language, country} = getLocalizationFromLang(params.lang);

  const {data, errors} = await getStorefrontData<{
    products: Array<Product>;
  }>({
    query: SEARCH_QUERY,
    variables: {
      ...variables,
      language,
      country,
    },
  });

  if (errors) {
    console.error('Search error: ');
    console.error(errors);
  }

  invariant(data, 'No data returned from Shopify API');

  return data.products;
}

const SEARCH_QUERY = `#graphql
  ${PRODUCT_CARD_FRAGMENT}
  query search(
    $searchTerm: String
    $country: CountryCode
    $language: LanguageCode
    $pageBy: Int!
    $after: String
  ) @inContext(country: $country, language: $language) {
    products(
      first: $pageBy
      sortKey: RELEVANCE
      query: $searchTerm
      after: $after
    ) {
      nodes {
        ...ProductCard
      }
      pageInfo {
        startCursor
        endCursor
        hasNextPage
        hasPreviousPage
      }
    }
  }
`;

const PAGINATE_SEARCH_QUERY = `#graphql
  ${PRODUCT_CARD_FRAGMENT}
  query ProductsPage(
    $searchTerm: String
    $pageBy: Int!
    $cursor: String
    $country: CountryCode
    $language: LanguageCode
  ) @inContext(country: $country, language: $language) {
    products(
      sortKey: RELEVANCE
      query: $searchTerm
      first: $pageBy
      after: $cursor
    ) {
      nodes {
        ...ProductCard
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

export async function getNoResultRecommendations(params: Params) {
  const {language, country} = getLocalizationFromLang(params.lang);

  const {data, errors} = await getStorefrontData<{
    featuredCollections: Array<Collection>;
    featuredProducts: Array<Product>;
  }>({
    query: SEARCH_NO_RESULTS_QUERY,
    variables: {
      language,
      country,
      pageBy: PAGINATION_SIZE,
    },
  });

  if (errors) {
    console.error('No result recommendations error: ');
    console.error(errors);
  }

  invariant(data, 'No data returned from Shopify API');

  return data;
}

const SEARCH_NO_RESULTS_QUERY = `#graphql
  ${PRODUCT_CARD_FRAGMENT}
  query searchNoResult(
    $country: CountryCode
    $language: LanguageCode
    $pageBy: Int!
  ) @inContext(country: $country, language: $language) {
    featuredCollections: collections(first: 3, sortKey: UPDATED_AT) {
      nodes {
        id
        title
        handle
        image {
          altText
          width
          height
          url
        }
      }
    }
    featuredProducts: products(first: $pageBy) {
      nodes {
        ...ProductCard
      }
    }
  }
`;
