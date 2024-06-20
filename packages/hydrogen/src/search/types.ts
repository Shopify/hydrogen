import {
  Article,
  Collection,
  Product,
  Page,
  Image,
  ProductVariant,
  SearchQuerySuggestion,
} from '@shopify/hydrogen-react/storefront-api-types';

/** Common Types ------------------------------------------------------------- */

type SearchImage = Pick<Image, 'url' | 'altText' | 'width' | 'height'>;
type SearchPrice = Pick<ProductVariant['price'], 'amount' | 'currencyCode'>;

/** Search Query Types ------------------------------------------------------------- */

/** A fragment representing a product variant in product search results. */
type SearchProductVariant = Pick<Product['variants']['nodes'][0], 'id'> & {
  image: SearchImage;
  price: SearchPrice;
  compareAtPrice: SearchPrice;
  product: Pick<Product, 'handle' | 'title'>;
};

/** A fragment for search results of type `Product`. */
export type SearchProductFragment = Pick<Product, '__typename' | 'handle' | 'id' | 'publishedAt' | 'title' | 'trackingParameters' | 'vendor'> & {
  variants: {nodes: Array<SearchProductVariant>};
}

/** A fragment for search results of type `Page`. */
export type SearchPageFragment = Pick<Page, '__typename' | 'handle' | 'id' | 'title' | 'trackingParameters'>;

/** A fragment for search results of type `Article`. */
export type SearchArticleFragment = Pick<Article, '__typename' | 'handle' | 'id' | 'title' | 'trackingParameters'>;

export type SearchQueryFragment = {
  products: {nodes: Array<SearchProductFragment>};
  articles: {nodes: Array<SearchArticleFragment>};
  pages: {nodes: Array<SearchPageFragment>};
}

/** Predictive Search Query Types ------------------------------------------------------------- */

/** A fragment for predictive search results of type `Image`. */

/** A fragment for predictive search results of type `Article`. */
export type PredictiveArticleFragment = Pick<Article, '__typename' | 'id' | 'title' | 'handle' | 'trackingParameters'> & {
  blog: {handle: Article['blog']['handle']};
  image: SearchImage;
};

/** A fragment for predictive search results of type `Collection`. */
export type PredictiveCollectionFragment = Pick<Collection, '__typename' | 'id' | 'title' | 'handle' | 'trackingParameters'> & {
  image: SearchImage;
};

/** A fragment for predictive search results of type `Page`. */
export type PredictivePageFragment = Pick<Page, '__typename' | 'id' | 'title' | 'handle' | 'trackingParameters'>;

/** A ProductVariant fragment for predictive search results of type `Product`. */
type PredictiveProductVariant = Pick<Product['variants']['nodes'][0], 'id'> & {
  image: SearchImage;
  price: SearchPrice;
};

/** A fragment for predictive search results of type `Product`. */
export type PredictiveProductFragment = Pick<Product, '__typename' | 'id' | 'title' | 'handle' | 'trackingParameters'> & {
  variants: {nodes: Array<PredictiveProductVariant>};
};

/** A fragment for predictive search results of type `SearchQuerySuggestion`. */
export type PredictiveQueryFragment = Pick<SearchQuerySuggestion, '__typename' | 'text' | 'styledText' | 'trackingParameters'>;

/** A type representing the query response for predictive search. */
export type PredictiveSearchQuery = {
  predictiveSearch: {
    articles: Array<PredictiveArticleFragment>;
    collections: Array<PredictiveCollectionFragment>;
    pages: Array<PredictivePageFragment>;
    products: Array<PredictiveProductFragment>;
    queries: Array<PredictiveQueryFragment>;
  }
}
