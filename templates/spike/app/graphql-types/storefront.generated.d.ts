/* eslint-disable eslint-comments/disable-enable-pair */
/* eslint-disable eslint-comments/no-unlimited-disable */
/* eslint-disable */
import type * as StorefrontTypes from './storefront.types';

export type FeaturedCollectionQueryVariables = StorefrontTypes.Exact<{
  [key: string]: never;
}>;

export type FeaturedCollectionQuery = {
  collection?: StorefrontTypes.Maybe<
    Pick<
      StorefrontTypes.Collection,
      'id' | 'handle' | 'title' | 'description'
    > & {
      image?: StorefrontTypes.Maybe<Pick<StorefrontTypes.Image, 'id' | 'url'>>;
      products: {
        nodes: Array<
          Pick<StorefrontTypes.Product, 'id' | 'title' | 'handle'> & {
            images: {
              nodes: Array<
                Pick<StorefrontTypes.Image, 'id' | 'url' | 'altText'>
              >;
            };
            priceRange: {
              minVariantPrice: Pick<
                StorefrontTypes.MoneyV2,
                'amount' | 'currencyCode'
              >;
            };
          }
        >;
      };
    }
  >;
};

export type ProductQueryVariables = StorefrontTypes.Exact<{
  handle: StorefrontTypes.Scalars['String']['input'];
}>;

export type ProductQuery = {
  product?: StorefrontTypes.Maybe<
    Pick<StorefrontTypes.Product, 'id' | 'title' | 'description'> & {
      featuredImage?: StorefrontTypes.Maybe<
        Pick<StorefrontTypes.Image, 'id' | 'url'>
      >;
    }
  >;
};

interface GeneratedQueryTypes {
  '\n  query FeaturedCollection {\n    collection(handle: "featured") {\n      id\n      handle\n      title\n      description\n      image {\n        id\n        url\n      }\n      products(first: 12) {\n        nodes {\n          id\n          title\n          handle\n          images(first: 1) {\n            nodes {\n              id\n              url\n              altText\n            }\n          }\n          priceRange {\n            minVariantPrice {\n              amount\n              currencyCode\n            }\n          }\n        }\n      }\n    }\n  }\n': {
    return: FeaturedCollectionQuery;
    variables: FeaturedCollectionQueryVariables;
  };
  '#graphql\n  query Product($handle: String!) {\n    product(handle: $handle) {\n      id\n      title\n      description\n      featuredImage {\n        id\n        url\n      }\n    }\n  }\n': {
    return: ProductQuery;
    variables: ProductQueryVariables;
  };
}

interface GeneratedMutationTypes {}
declare module '@shopify/storefront-api-client' {
  type InputMaybe<T> = StorefrontTypes.InputMaybe<T>;
  interface StorefrontQueries extends GeneratedQueryTypes {}
  interface StorefrontMutations extends GeneratedMutationTypes {}
}
