import type {
  StorefrontApiResponseError,
  StorefrontApiResponseOk,
} from "@shopify/hydrogen-ui-alpha/dist/types/storefront-api-response.types";
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
  LanguageCode,
  Blog,
  Shop,
  CountryCode,
} from "@shopify/hydrogen-ui-alpha/storefront-api-types";
import {
  getPublicTokenHeaders,
  getStorefrontApiUrl,
} from "~/lib/shopify-client";
import { type EnhancedMenu, parseMenu } from "~/lib/utils";
import invariant from "tiny-invariant";
import { json } from "@remix-run/cloudflare";

export async function getStorefrontData<T>({
  query,
  variables,
}: {
  query: string;
  variables: Record<string, any>;
}): Promise<T> {
  const headers = getPublicTokenHeaders();
  // This needs to be application/json because we're sending JSON, not a graphql string
  headers["content-type"] = "application/json";

  const response = await fetch(getStorefrontApiUrl(), {
    body: JSON.stringify({
      query,
      variables,
    }),
    headers,
    method: "POST",
  });

  if (!response.ok) {
    // 400 or 500 level error
    return (await response.text()) as StorefrontApiResponseError; // or apiResponse.json()
  }

  const json: StorefrontApiResponseOk<T> = await response.json();

  if (json.errors) {
    console.log(json.errors);
  }

  invariant(json && json.data, "No data returned from Shopify API");

  return json.data;
}

async function notFoundWithFeaturedData(
  language: LanguageCode = "EN",
  country: CountryCode = "US"
) {
  throw json(
    { featuredData: await getFeaturedData({ language, country }) },
    { status: 404 }
  );
}

export interface LayoutData {
  headerMenu: EnhancedMenu;
  footerMenu: EnhancedMenu;
  shop: Shop;
  cart?: Promise<Cart>;
}

export async function getLayoutData() {
  const languageCode = "EN";

  const HEADER_MENU_HANDLE = "main-menu";
  const FOOTER_MENU_HANDLE = "footer";

  const data = await getStorefrontData<LayoutData>({
    query: LAYOUT_QUERY,
    variables: {
      language: languageCode,
      headerMenuHandle: HEADER_MENU_HANDLE,
      footerMenuHandle: FOOTER_MENU_HANDLE,
    },
  });

  /*
    Modify specific links/routes (optional)
    @see: https://shopify.dev/api/storefront/unstable/enums/MenuItemType
    e.g here we map:
      - /blogs/news -> /news
      - /blog/news/blog-post -> /news/blog-post
      - /collections/all -> /products
  */
  const customPrefixes = { BLOG: "", CATALOG: "products" };

  const headerMenu = data?.headerMenu
    ? parseMenu(data.headerMenu, customPrefixes)
    : undefined;

  const footerMenu = data?.footerMenu
    ? parseMenu(data.footerMenu, customPrefixes)
    : undefined;

  return { shop: data.shop, headerMenu, footerMenu };
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

export async function getProductData(
  handle: string,
  searchParams: URLSearchParams
) {
  // TODO: Figure out localization stuff
  const languageCode = "EN";
  const countryCode = "US";

  let selectedOptions: SelectedOptionInput[] = [];
  searchParams.forEach((value, name) => {
    selectedOptions.push({ name, value });
  });

  const { product, shop } = await getStorefrontData<{
    product: Product & { selectedVariant?: ProductVariant };
    shop: Shop;
  }>({
    query: PRODUCT_QUERY,
    variables: {
      country: countryCode,
      language: languageCode,
      selectedOptions,
      handle,
    },
  });

  if (!product) {
    return notFoundWithFeaturedData(languageCode, countryCode);
  }

  return { product, shop };
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

const PRODUCT_CARD_FRAGMENT = `#graphql
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
    $countryCode: CountryCode
    $languageCode: LanguageCode
  ) @inContext(country: $countryCode, language: $languageCode) {
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

export async function getRecommendedProducts(productId: string, count = 12) {
  // TODO: You know what to do
  const languageCode = "EN";
  const countryCode = "US";

  const products = await getStorefrontData<{
    recommended: Product[];
    additional: ProductConnection;
  }>({
    query: RECOMMENDED_PRODUCTS_QUERY,
    variables: {
      productId,
      count,
      language: languageCode,
      country: countryCode,
    },
  });

  const mergedProducts = products.recommended
    .concat(products.additional.nodes)
    .filter(
      (value, index, array) =>
        array.findIndex((value2) => value2.id === value.id) === index
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
  { paginationSize } = { paginationSize: 8 }
) {
  // TODO: You know what to do
  const languageCode = "EN";
  const countryCode = "US";

  const data = await getStorefrontData<{
    collections: CollectionConnection;
  }>({
    query: COLLECTIONS_QUERY,
    variables: {
      pageBy: paginationSize,
      country: countryCode,
      language: languageCode,
    },
  });

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
}: {
  handle: string;
  paginationSize?: number;
  cursor?: string;
}) {
  // TODO: You know what to do
  const languageCode = "EN";
  const countryCode = "US";

  const data = await getStorefrontData<{
    collection: Collection;
  }>({
    query: COLLECTION_QUERY,
    variables: {
      handle,
      cursor,
      language: languageCode,
      country: countryCode,
      pageBy: paginationSize,
    },
  });

  if (!data.collection) {
    return notFoundWithFeaturedData(languageCode, countryCode);
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
}: {
  paginationSize?: number;
  cursor?: string;
}) {
  // TODO: You know what to do
  const languageCode = "EN";
  const countryCode = "US";

  const data = await getStorefrontData<{
    products: ProductConnection;
  }>({
    query: ALL_PRODUCTS_QUERY,
    variables: {
      cursor,
      language: languageCode,
      country: countryCode,
      pageBy: paginationSize,
    },
  });

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

export async function createCart({ cart }: { cart: CartInput }) {
  // TODO: You know what to do
  const countryCode = "US";

  const data = await getStorefrontData<{
    cartCreate: {
      cart: Cart;
    };
  }>({
    query: CREATE_CART_MUTATION,
    variables: {
      input: cart,
      country: countryCode,
    },
  });

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
}: {
  cartId: string;
  lines: CartLineInput[];
}) {
  // TODO: You know what to do
  const countryCode = "US";

  const data = await getStorefrontData<{
    cartLinesAdd: {
      cart: Cart;
    };
  }>({
    query: ADD_LINE_ITEM_QUERY,
    variables: { cartId, lines, country: countryCode },
  });

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

export async function getCart({ cartId }: { cartId: string }) {
  // TODO: Yes
  const countryCode = "US";

  const data = await getStorefrontData<{ cart: Cart }>({
    query: CART_QUERY,
    variables: {
      cartId,
      country: countryCode,
    },
  });

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
}: {
  cartId: string;
  lineItem: CartLineUpdateInput;
}) {
  const countryCode = "US";

  const data = await getStorefrontData<{ cartLinesUpdate: { cart: Cart } }>({
    query: UPDATE_LINE_ITEM_QUERY,
    variables: {
      cartId,
      lines: [lineItem],
      country: countryCode,
    },
  });

  return data.cartLinesUpdate.cart;
}

const TOP_PRODUCTS_QUERY = `#graphql
  ${PRODUCT_CARD_FRAGMENT}
  query topProducts(
    $count: Int
    $countryCode: CountryCode
    $languageCode: LanguageCode
  ) @inContext(country: $countryCode, language: $languageCode) {
    products(first: $count, sortKey: BEST_SELLING) {
      nodes {
        ...ProductCard
      }
    }
  }
`;

export async function getTopProducts({ count = 4 }: { count?: number } = {}) {
  const countryCode = "US";
  const languageCode = "EN";

  const data = await getStorefrontData<{
    products: ProductConnection;
  }>({
    query: TOP_PRODUCTS_QUERY,
    variables: {
      count,
      countryCode,
      languageCode,
    },
  });

  return data.products;
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
  language,
  paginationSize,
  blogHandle,
}: {
  language: LanguageCode;
  blogHandle: string;
  paginationSize: number;
}) {
  const data = await getStorefrontData<{
    blog: Blog;
  }>({
    query: BLOG_QUERY,
    variables: {
      language,
      blogHandle,
      pageBy: paginationSize,
    },
  });

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

export async function getArticle(variables: {
  language: LanguageCode;
  blogHandle: string;
  articleHandle: string;
}) {
  const data = await getStorefrontData<{
    blog: Blog;
  }>({
    query: ARTICLE_QUERY,
    variables,
  });

  if (!data.blog.articleByHandle) {
    return notFoundWithFeaturedData(variables.language);
  }

  return data.blog.articleByHandle;
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

export async function getFeaturedData(variables: {
  language: LanguageCode;
  country: CountryCode;
}) {
  const data = await getStorefrontData<{
    featuredCollections: CollectionConnection;
    featuredProducts: ProductConnection;
  }>({
    query: NOT_FOUND_QUERY,
    variables,
  });

  return data;
}
