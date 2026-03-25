import {createStorefrontClient} from '@shopify/hydrogen-temp';
import {HIDDEN_PRODUCT_TAG, TAGS} from 'lib/constants';
import {
  unstable_cacheLife as cacheLife,
  unstable_cacheTag as cacheTag,
  revalidateTag,
} from 'next/cache';
import {cookies, headers} from 'next/headers';
import {NextRequest, NextResponse} from 'next/server';
import {
  addToCartMutation,
  createCartMutation,
  editCartItemsMutation,
  removeFromCartMutation,
} from './mutations/cart';
import {getCartQuery} from './queries/cart';
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
import {
  Cart,
  Collection,
  Connection,
  Image,
  Menu,
  Page,
  Product,
  ShopifyAddToCartOperation,
  ShopifyCart,
  ShopifyCartOperation,
  ShopifyCollection,
  ShopifyCollectionOperation,
  ShopifyCollectionProductsOperation,
  ShopifyCollectionsOperation,
  ShopifyCreateCartOperation,
  ShopifyMenuOperation,
  ShopifyPageOperation,
  ShopifyPagesOperation,
  ShopifyProduct,
  ShopifyProductOperation,
  ShopifyProductRecommendationsOperation,
  ShopifyProductsOperation,
  ShopifyRemoveFromCartOperation,
  ShopifyUpdateCartOperation,
} from './types';

const isConfigured = !!process.env.SHOPIFY_STORE_DOMAIN;

export const {storefront} = createStorefrontClient({
  storeDomain: process.env.SHOPIFY_STORE_DOMAIN!,
  publicStorefrontToken: process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN!,
});

const domain = storefront.getShopifyDomain();

const removeEdgesAndNodes = <T>(array: Connection<T>): T[] => {
  return array.edges.map((edge) => edge?.node);
};

const reshapeCart = (cart: ShopifyCart): Cart => {
  if (!cart.cost?.totalTaxAmount) {
    cart.cost.totalTaxAmount = {
      amount: '0.0',
      currencyCode: cart.cost.totalAmount.currencyCode,
    };
  }

  return {
    ...cart,
    lines: removeEdgesAndNodes(cart.lines),
  };
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

export async function createCart(): Promise<Cart> {
  const data =
    await storefront.mutate<ShopifyCreateCartOperation['data']>(
      createCartMutation,
    );

  return reshapeCart(data.cartCreate.cart);
}

export async function addToCart(
  lines: {merchandiseId: string; quantity: number}[],
): Promise<Cart> {
  const cartId = (await cookies()).get('cartId')?.value!;
  const data = await storefront.mutate<ShopifyAddToCartOperation['data']>(
    addToCartMutation,
    {
      variables: {
        cartId,
        lines,
      },
    },
  );
  return reshapeCart(data.cartLinesAdd.cart);
}

export async function removeFromCart(lineIds: string[]): Promise<Cart> {
  const cartId = (await cookies()).get('cartId')?.value!;
  const data = await storefront.mutate<ShopifyRemoveFromCartOperation['data']>(
    removeFromCartMutation,
    {
      variables: {
        cartId,
        lineIds,
      },
    },
  );

  return reshapeCart(data.cartLinesRemove.cart);
}

export async function updateCart(
  lines: {id: string; merchandiseId: string; quantity: number}[],
): Promise<Cart> {
  const cartId = (await cookies()).get('cartId')?.value!;
  const data = await storefront.mutate<ShopifyUpdateCartOperation['data']>(
    editCartItemsMutation,
    {
      variables: {
        cartId,
        lines,
      },
    },
  );

  return reshapeCart(data.cartLinesUpdate.cart);
}

export async function getCart(): Promise<Cart | undefined> {
  'use cache: private';
  cacheTag(TAGS.cart);
  cacheLife('seconds');

  const cartId = (await cookies()).get('cartId')?.value;

  if (!cartId) {
    return undefined;
  }

  const data = await storefront.query<ShopifyCartOperation['data']>(
    getCartQuery,
    {variables: {cartId}},
  );

  // Old carts becomes `null` when you checkout.
  if (!data.cart) {
    return undefined;
  }

  return reshapeCart(data.cart);
}

export async function getCollection(
  handle: string,
): Promise<Collection | undefined> {
  'use cache';
  cacheTag(TAGS.collections);
  cacheLife('days');

  const data = await storefront.query<ShopifyCollectionOperation['data']>(
    getCollectionQuery,
    {
      variables: {
        handle,
      },
    },
  );

  return reshapeCollection(data.collection);
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

  if (!isConfigured) {
    console.log(
      `Skipping getCollectionProducts for '${collection}' - Shopify not configured`,
    );
    return [];
  }

  const data = await storefront.query<
    ShopifyCollectionProductsOperation['data']
  >(getCollectionProductsQuery, {
    variables: {
      handle: collection,
      reverse,
      sortKey: sortKey === 'CREATED_AT' ? 'CREATED' : sortKey,
    },
  });

  if (!data.collection) {
    console.log(`No collection found for \`${collection}\``);
    return [];
  }

  return reshapeProducts(removeEdgesAndNodes(data.collection.products));
}

export async function getCollections(): Promise<Collection[]> {
  'use cache';
  cacheTag(TAGS.collections);
  cacheLife('days');

  if (!isConfigured) {
    console.log('Skipping getCollections - Shopify not configured');
    return [
      {
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
    ];
  }

  const data =
    await storefront.query<ShopifyCollectionsOperation['data']>(
      getCollectionsQuery,
    );
  const shopifyCollections = removeEdgesAndNodes(data?.collections);
  const collections = [
    {
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

  return collections;
}

export async function getMenu(handle: string): Promise<Menu[]> {
  'use cache';
  cacheTag(TAGS.collections);
  cacheLife('days');

  if (!isConfigured) {
    console.log(`Skipping getMenu for '${handle}' - Shopify not configured`);
    return [];
  }

  const data = await storefront.query<ShopifyMenuOperation['data']>(
    getMenuQuery,
    {
      variables: {
        handle,
      },
    },
  );

  return (
    data?.menu?.items.map((item: {title: string; url: string}) => ({
      title: item.title,
      path: item.url
        .replace(domain, '')
        .replace('/collections', '/search')
        .replace('/pages', ''),
    })) || []
  );
}

export async function getPage(handle: string): Promise<Page> {
  const data = await storefront.query<ShopifyPageOperation['data']>(
    getPageQuery,
    {variables: {handle}},
  );

  return data.pageByHandle;
}

export async function getPages(): Promise<Page[]> {
  const data =
    await storefront.query<ShopifyPagesOperation['data']>(getPagesQuery);

  return removeEdgesAndNodes(data.pages);
}

export async function getProduct(handle: string): Promise<Product | undefined> {
  'use cache';
  cacheTag(TAGS.products);
  cacheLife('days');

  if (!isConfigured) {
    console.log(`Skipping getProduct for '${handle}' - Shopify not configured`);
    return undefined;
  }

  const data = await storefront.query<ShopifyProductOperation['data']>(
    getProductQuery,
    {
      variables: {
        handle,
      },
    },
  );

  return reshapeProduct(data.product, false);
}

export async function getProductRecommendations(
  productId: string,
): Promise<Product[]> {
  'use cache';
  cacheTag(TAGS.products);
  cacheLife('days');

  const data = await storefront.query<
    ShopifyProductRecommendationsOperation['data']
  >(getProductRecommendationsQuery, {
    variables: {
      productId,
    },
  });

  return reshapeProducts(data.productRecommendations);
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

  const data = await storefront.query<ShopifyProductsOperation['data']>(
    getProductsQuery,
    {
      variables: {
        query,
        reverse,
        sortKey,
      },
    },
  );

  return reshapeProducts(removeEdgesAndNodes(data.products));
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

  return NextResponse.json({
    status: 200,
    revalidated: true,
    now: Date.now(),
  });
}
