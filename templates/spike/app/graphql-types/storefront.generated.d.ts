/* eslint-disable eslint-comments/disable-enable-pair */
/* eslint-disable eslint-comments/no-unlimited-disable */
/* eslint-disable */
import type * as StorefrontTypes from './storefront.types';

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
