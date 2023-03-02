import {AnalyticsPageType, ShopifyAnalyticsProduct} from '@shopify/hydrogen';
import {ShopifySalesChannel} from '@shopify/hydrogen';
import type {
  Article,
  Blog,
  Collection,
  CollectionConnection,
  Product,
  ProductVariant,
  ShopPolicy,
  Shop,
} from '@shopify/hydrogen-react/storefront-api-types';

function root({shop}: {shop: Shop}): {
  shopifySalesChannel: typeof ShopifySalesChannel.hydrogen;
  shopId: string;
} {
  return {
    shopifySalesChannel: ShopifySalesChannel.hydrogen,
    shopId: shop.id,
  };
}

function home(): {pageType: typeof AnalyticsPageType.home} {
  return {
    pageType: AnalyticsPageType.home,
  };
}

function product({
  selectedVariant,
  product,
}: {
  selectedVariant: ProductVariant;
  product: Product;
}): {
  pageType: typeof AnalyticsPageType.product;
  products: ShopifyAnalyticsProduct[];
  resourceId: string;
  totalValue: number;
} {
  const anlyticsProduct: ShopifyAnalyticsProduct = {
    brand: product.vendor,
    name: product.title,
    price: selectedVariant.price.amount,
    productGid: product.id,
    variantGid: selectedVariant.id,
    variantName: selectedVariant.title,
  };

  return {
    pageType: AnalyticsPageType.product,
    products: [anlyticsProduct],
    resourceId: product.id,
    totalValue: parseFloat(selectedVariant.price.amount),
  };
}

function collection({collection}: {collection: Collection}): {
  pageType: typeof AnalyticsPageType.collection;
  collectionHandle: string;
  resourceId: string;
} {
  return {
    pageType: AnalyticsPageType.collection,
    collectionHandle: collection.handle,
    resourceId: collection.id,
  };
}

function listCollections({
  handle,
  collections,
}: {
  handle: string;
  collections: CollectionConnection;
}): {
  pageType: typeof AnalyticsPageType.listCollections;
  resourceHandle: string;
  collections: {
    collectionHandle: string;
    resourceId: string;
  }[];
} {
  return {
    pageType: AnalyticsPageType.listCollections,
    resourceHandle: handle,
    collections: collections?.edges?.map(({node: collection}) => ({
      collectionHandle: collection.handle,
      resourceId: collection.id,
    })),
  };
}

function article({article}: {article: Article}): {
  pageType: typeof AnalyticsPageType.article;
  resourceHandle: string;
} {
  return {
    pageType: AnalyticsPageType.article,
    resourceHandle: article.handle,
  };
}

function blog({blog}: {blog: Blog}): {
  pageType: typeof AnalyticsPageType.blog;
  resourceHandle: string;
} {
  return {
    pageType: AnalyticsPageType.blog,
    resourceHandle: blog.handle,
  };
}

function policy({policy}: {policy: ShopPolicy}): {
  pageType: typeof AnalyticsPageType.policy;
  resourceHandle: string;
} {
  return {
    pageType: AnalyticsPageType.policy,
    resourceHandle: policy.handle,
  };
}

export const analyticsPayload = {
  article,
  blog,
  collection,
  home,
  listCollections,
  product,
  policy,
  root,
};
