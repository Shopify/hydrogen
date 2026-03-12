import {createStorefrontClient} from '@shopify/hydrogen/core';
import {HIDDEN_PRODUCT_TAG, TAGS} from 'lib/constants';
import {ensureStartsWith} from 'lib/utils';
import {
  unstable_cacheLife as cacheLife,
  unstable_cacheTag as cacheTag,
  revalidateTag,
} from 'next/cache';
import {headers} from 'next/headers';
import {NextRequest, NextResponse} from 'next/server';
import {
  getCollectionProductsQuery,
  getCollectionQuery,
  getCollectionsQuery,
} from './queries/collection';
import {getMenuQuery} from './queries/menu';
import {getPageQuery, getPagesQuery} from './queries/page';
import {
  getProductQuery,
  getProductRecommendationsQuery,
  getProductsQuery,
} from './queries/product';
import {getShopAnalyticsQuery} from './queries/shop';
import type {
  Collection,
  Connection,
  Image,
  Menu,
  Page,
  Product,
  ShopAnalytics,
  ShopifyCollection,
  ShopifyCollectionOperation,
  ShopifyCollectionProductsOperation,
  ShopifyCollectionsOperation,
  ShopifyMenuOperation,
  ShopifyPageOperation,
  ShopifyPagesOperation,
  ShopifyProduct,
  ShopifyProductOperation,
  ShopifyProductRecommendationsOperation,
  ShopifyProductsOperation,
  ShopifyShopAnalyticsOperation,
} from './types';

const domain = process.env.SHOPIFY_STORE_DOMAIN
  ? ensureStartsWith(process.env.SHOPIFY_STORE_DOMAIN, 'https://')
  : '';

/**
 * Creates a Hydrogen Storefront API client.
 *
 * Key difference from Hydrogen/Remix: In Remix, createStorefrontClient is
 * called per-request inside a loader with access to the incoming Request
 * for buyer IP, cookies, etc. In Next.js, we create it at module level since:
 * - We use a public token (no buyer-specific auth)
 * - Next.js caching is handled via `use cache` / cacheTag, not Hydrogen's Cache API
 * - Buyer IP and cookie forwarding isn't needed for public storefront queries
 *
 * If you need per-request headers (e.g. private token with buyer IP),
 * move this into a getStorefront() function that reads from next/headers.
 */
const {storefront} = createStorefrontClient({
  storeDomain: domain,
  publicStorefrontToken: process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN!,
  // Hydrogen manages the full API URL — no need for a hardcoded endpoint constant.
  storefrontApiVersion: '2026-01',
  // No cache or waitUntil — Next.js handles caching via 'use cache' directives
  // instead of Hydrogen's Cache API (which requires Web Cache API + waitUntil from edge runtimes).
});

export {storefront};

const removeEdgesAndNodes = <T>(array: Connection<T>): T[] => {
  return array.edges.map((edge) => edge?.node);
};

const reshapeCollection = (
  collection: ShopifyCollection,
): Collection | undefined => {
  if (!collection) {
    return undefined;
  }

  return {
    ...collection,
    path: `/search/${collection.handle}`,
  };
};

const reshapeCollections = (collections: ShopifyCollection[]) => {
  const reshapedCollections = [];

  for (const collection of collections) {
    if (collection) {
      const reshapedCollection = reshapeCollection(collection);

      if (reshapedCollection) {
        reshapedCollections.push(reshapedCollection);
      }
    }
  }

  return reshapedCollections;
};

const reshapeImages = (images: Connection<Image>, productTitle: string) => {
  const flattened = removeEdgesAndNodes(images);

  return flattened.map((image) => {
    const filename = image.url.match(/.*\/(.*)\..*/)?.[1];
    return {
      ...image,
      altText: image.altText || `${productTitle} - ${filename}`,
    };
  });
};

const reshapeProduct = (
  product: ShopifyProduct,
  filterHiddenProducts: boolean = true,
) => {
  if (
    !product ||
    (filterHiddenProducts && product.tags.includes(HIDDEN_PRODUCT_TAG))
  ) {
    return undefined;
  }

  const {images, variants, ...rest} = product;

  return {
    ...rest,
    images: reshapeImages(images, product.title),
    variants: removeEdgesAndNodes(variants),
  };
};

const reshapeProducts = (products: ShopifyProduct[]) => {
  const reshapedProducts = [];

  for (const product of products) {
    if (product) {
      const reshapedProduct = reshapeProduct(product);

      if (reshapedProduct) {
        reshapedProducts.push(reshapedProduct);
      }
    }
  }

  return reshapedProducts;
};

export {
  getCart,
  createCart,
  addToCart,
  removeFromCart,
  updateCart,
} from './cart';

export async function getCollection(
  handle: string,
): Promise<Collection | undefined> {
  'use cache';
  cacheTag(TAGS.collections);
  cacheLife('days');

  const {collection} = await storefront.query<
    ShopifyCollectionOperation['data']
  >(getCollectionQuery, {
    variables: {handle},
  });

  return reshapeCollection(collection);
}

export async function getCollectionProducts({
  collection,
  reverse,
  sortKey,
}: {
  collection: string;
  reverse?: boolean;
  sortKey?: string;
}): Promise<Product[]> {
  'use cache';
  cacheTag(TAGS.collections, TAGS.products);
  cacheLife('days');

  const {collection: collectionData} = await storefront.query<
    ShopifyCollectionProductsOperation['data']
  >(getCollectionProductsQuery, {
    variables: {
      handle: collection,
      reverse,
      sortKey: sortKey === 'CREATED_AT' ? 'CREATED' : sortKey,
    },
  });

  if (!collectionData) {
    console.log(`No collection found for \`${collection}\``);
    return [];
  }

  return reshapeProducts(removeEdgesAndNodes(collectionData.products));
}

export async function getCollections(): Promise<Collection[]> {
  'use cache';
  cacheTag(TAGS.collections);
  cacheLife('days');

  const {collections} =
    await storefront.query<ShopifyCollectionsOperation['data']>(
      getCollectionsQuery,
    );
  const shopifyCollections = removeEdgesAndNodes(collections);
  const allCollections = [
    {
      id: 'all-products',
      handle: '',
      title: 'All',
      description: 'All products',
      seo: {
        title: 'All',
        description: 'All products',
      },
      path: '/search',
      updatedAt: new Date().toISOString(),
    },
    // Filter out the `hidden` collections.
    // Collections that start with `hidden-*` need to be hidden on the search page.
    ...reshapeCollections(shopifyCollections).filter(
      (collection) => !collection.handle.startsWith('hidden'),
    ),
  ];

  return allCollections;
}

export async function getShopAnalytics(): Promise<ShopAnalytics> {
  'use cache';
  cacheTag(TAGS.collections);
  cacheLife('days');

  const {shop, localization} = await storefront.query<
    ShopifyShopAnalyticsOperation['data']
  >(getShopAnalyticsQuery);

  return {
    shopId: shop.id,
    acceptedLanguage: localization.language.isoCode,
    currency: localization.country.currency.isoCode,
  };
}

export async function getMenu(handle: string): Promise<Menu[]> {
  'use cache';
  cacheTag(TAGS.collections);
  cacheLife('days');

  const {menu} = await storefront.query<ShopifyMenuOperation['data']>(
    getMenuQuery,
    {
      variables: {handle},
    },
  );

  return (
    menu?.items.map((item: {title: string; url: string}) => ({
      title: item.title,
      path: item.url
        .replace(domain, '')
        .replace('/collections', '/search')
        .replace('/pages', ''),
    })) || []
  );
}

export async function getPage(handle: string): Promise<Page> {
  const {pageByHandle} = await storefront.query<ShopifyPageOperation['data']>(
    getPageQuery,
    {
      variables: {handle},
    },
  );

  return pageByHandle;
}

export async function getPages(): Promise<Page[]> {
  const {pages} =
    await storefront.query<ShopifyPagesOperation['data']>(getPagesQuery);

  return removeEdgesAndNodes(pages);
}

export async function getProduct(handle: string): Promise<Product | undefined> {
  'use cache';
  cacheTag(TAGS.products);
  cacheLife('days');

  const {product} = await storefront.query<ShopifyProductOperation['data']>(
    getProductQuery,
    {
      variables: {handle},
    },
  );

  return reshapeProduct(product, false);
}

export async function getProductRecommendations(
  productId: string,
): Promise<Product[]> {
  'use cache';
  cacheTag(TAGS.products);
  cacheLife('days');

  const {productRecommendations} = await storefront.query<
    ShopifyProductRecommendationsOperation['data']
  >(getProductRecommendationsQuery, {
    variables: {productId},
  });

  return reshapeProducts(productRecommendations);
}

export async function getProducts({
  query,
  reverse,
  sortKey,
}: {
  query?: string;
  reverse?: boolean;
  sortKey?: string;
}): Promise<Product[]> {
  'use cache';
  cacheTag(TAGS.products);
  cacheLife('days');

  const {products} = await storefront.query<ShopifyProductsOperation['data']>(
    getProductsQuery,
    {
      variables: {query, reverse, sortKey},
    },
  );

  return reshapeProducts(removeEdgesAndNodes(products));
}

// This is called from `app/api/revalidate.ts` so providers can control revalidation logic.
export async function revalidate(req: NextRequest): Promise<NextResponse> {
  // We always need to respond with a 200 status code to Shopify,
  // otherwise it will continue to retry the request.
  const collectionWebhooks = [
    'collections/create',
    'collections/delete',
    'collections/update',
  ];
  const productWebhooks = [
    'products/create',
    'products/delete',
    'products/update',
  ];
  const topic = (await headers()).get('x-shopify-topic') || 'unknown';
  const secret = req.nextUrl.searchParams.get('secret');
  const isCollectionUpdate = collectionWebhooks.includes(topic);
  const isProductUpdate = productWebhooks.includes(topic);

  if (!secret || secret !== process.env.SHOPIFY_REVALIDATION_SECRET) {
    console.error('Invalid revalidation secret.');
    return NextResponse.json({status: 401});
  }

  if (!isCollectionUpdate && !isProductUpdate) {
    // We don't need to revalidate anything for any other topics.
    return NextResponse.json({status: 200});
  }

  if (isCollectionUpdate) {
    revalidateTag(TAGS.collections, 'seconds');
  }

  if (isProductUpdate) {
    revalidateTag(TAGS.products, 'seconds');
  }

  return NextResponse.json({status: 200, revalidated: true, now: Date.now()});
}
