import type { StorefrontApiResponseOk } from "@shopify/hydrogen-ui-alpha/dist/types/storefront-api-response.types";
import type {
  Menu,
  Product,
  ProductConnection,
  Shop,
} from "@shopify/hydrogen-ui-alpha/storefront-api-types";
import {
  getPublicTokenHeaders,
  getStorefrontApiUrl,
} from "~/lib/shopify-client";
import { parseMenu } from "~/lib/utils";
import invariant from "tiny-invariant";

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

  // TODO: handle errors

  const json: StorefrontApiResponseOk<T> = await response.json();

  invariant(json && json.data, "No data returned from Shopify API");

  return json.data;
}

export async function getLayoutData() {
  const languageCode = "EN";

  const HEADER_MENU_HANDLE = "main-menu";
  const FOOTER_MENU_HANDLE = "footer";

  const data = await getStorefrontData<{
    headerMenu: Menu;
    footerMenu: Menu;
    shop: Shop;
  }>({
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

export async function getProductData(handle: string) {
  // TODO: Figure out localization stuff
  const languageCode = "EN";
  const countryCode = "US";

  const { product, shop } = await getStorefrontData<{
    product: any;
    shop: Shop;
  }>({
    query: PRODUCT_QUERY,
    variables: {
      country: countryCode,
      language: languageCode,
      handle,
    },
  });

  if (!product) {
    throw new Response("Uh ohhhhh", { status: 404 });
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

const PRODUCT_QUERY = `#graphql
  ${MEDIA_FRAGMENT}
  query Product(
    $country: CountryCode
    $language: LanguageCode
    $handle: String!
  ) @inContext(country: $country, language: $language) {
    product(handle: $handle) {
      id
      title
      vendor
      descriptionHtml
      media(first: 7) {
        nodes {
          ...Media
        }
      }
      variants(first: 100) {
        nodes {
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
