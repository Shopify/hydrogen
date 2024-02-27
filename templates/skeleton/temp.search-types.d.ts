/* eslint-disable eslint-comments/disable-enable-pair */
/* eslint-disable eslint-comments/no-unlimited-disable */
/* eslint-disable */
// TODO: Remove the temporary types when they are available via storefront-api-types
import type {
  Scalars,
  Article as ArticleOld,
  Collection as CollectionOld,
  Page as PageOld,
  Product as ProductOld,
  PageInfo,
  Filter,
  Image as ImageType,
} from '@shopify/hydrogen-react/storefront-api-types';

export type Maybe<T> = T | null;

export type Article = ArticleOld & Trackable;
export type Product = ProductOld & Trackable;
export type Page = PageOld & Trackable;
export type Collection = CollectionOld & Trackable;

/** Decides the distribution of results. */
export type PredictiveSearchLimitScope =
  /** Return results up to limit across all types. */
  | 'ALL'
  /** Return results up to limit per type. */
  | 'EACH';

/**
 * A predictive search result represents a list of products, collections, pages, articles, and query suggestions
 * that matches the predictive search query.
 *
 */
export type PredictiveSearchResult = {
  __typename?: 'PredictiveSearchResult';
  /** The articles that match the search query. */
  articles: Array<Article>;
  /** The articles that match the search query. */
  collections: Array<Collection>;
  /** The pages that match the search query. */
  pages: Array<Page>;
  /** The products that match the search query. */
  products: Array<Product>;
  /** The query suggestions that are relevant to the search query. */
  queries: Array<SearchQuerySuggestion>;
};

/** The types of search items to perform predictive search on. */
export type PredictiveSearchType =
  /** Returns matching articles. */
  | 'ARTICLE'
  /** Returns matching collections. */
  | 'COLLECTION'
  /** Returns matching pages. */
  | 'PAGE'
  /** Returns matching products. */
  | 'PRODUCT'
  /** Returns matching query strings. */
  | 'QUERY';

/** Specifies whether to perform a partial word match on the last search term. */
export type SearchPrefixQueryType =
  /** Perform a partial word match on the last search term. */
  | 'LAST'
  /** Don't perform a partial word match on the last search term. */
  | 'NONE';

/** Represents a resource that you can track the origin of the search traffic. */
export type Trackable = {
  /** A URL parameters to be added to a page URL when it is linked from a GraphQL result. This allows for tracking the origin of the traffic. */
  trackingParameters?: Maybe<Scalars['String']>;
};

/** A search query suggestion. */
export type SearchQuerySuggestion = Trackable & {
  __typename?: 'SearchQuerySuggestion';
  /** The text of the search query suggestion with highlighted HTML tags. */
  styledText: Scalars['String'];
  /** The text of the search query suggestion. */
  text: Scalars['String'];
  /** A URL parameters to be added to a page URL when it is linked from a GraphQL result. This allows for tracking the origin of the traffic. */
  trackingParameters?: Maybe<Scalars['String']>;
};

/**
 * A search result that matches the search query.
 *
 */
export type SearchResultItem = Article | Page | Product | Collection;

/**
 * An auto-generated type for paginating through multiple SearchResultItems.
 *
 */
export type SearchResultItemConnection = {
  __typename?: 'SearchResultItemConnection';
  /** A list of edges. */
  edges: Array<SearchResultItemEdge>;
  /** A list of the nodes contained in SearchResultItemEdge. */
  nodes: Array<SearchResultItem>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
  /** A list of available filters. */
  productFilters: Array<Filter>;
  /** The total number of results. */
  totalCount: Scalars['Int'];
};

/**
 * An auto-generated type which holds one SearchResultItem and a cursor during pagination.
 *
 */
export type SearchResultItemEdge = {
  __typename?: 'SearchResultItemEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String'];
  /** The item at the end of SearchResultItemEdge. */
  node: SearchResultItem;
};

/** The set of valid sort keys for the search query. */
export type SearchSortKeys =
  /** Sort by the `price` value. */
  | 'PRICE'
  /** Sort by relevance to the search terms. */
  | 'RELEVANCE';

/** The types of search items to perform search within. */
export type SearchType =
  /** Returns matching articles. */
  | 'ARTICLE'
  /** Returns matching pages. */
  | 'PAGE'
  /** Returns matching products. */
  | 'PRODUCT';

/** Specifies whether to display results for unavailable products. */
export type SearchUnavailableProductsType =
  /** Exclude unavailable products. */
  | 'HIDE'
  /** Show unavailable products after all other matching results. This is the default. */
  | 'LAST'
  /** Show unavailable products in the order that they're found. */
  | 'SHOW';

/** Specifies the list of resource fields to search. */
export type SearchableField =
  /** Author of the page or article. */
  | 'AUTHOR'
  /** Body of the page or article or product description or collection description. */
  | 'BODY'
  /** Product type. */
  | 'PRODUCT_TYPE'
  /** Tag associated with the product or article. */
  | 'TAG'
  /** Title of the page or article or product title or collection title. */
  | 'TITLE'
  /** Variant barcode. */
  | 'VARIANTS_BARCODE'
  /** Variant SKU. */
  | 'VARIANTS_SKU'
  /** Variant title. */
  | 'VARIANTS_TITLE'
  /** Product vendor. */
  | 'VENDOR';
