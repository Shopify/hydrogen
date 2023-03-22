/* eslint-disable eslint-comments/disable-enable-pair */
/* eslint-disable eslint-comments/no-unlimited-disable */
/* eslint-disable */
import * as HydrogenStorefront from '@shopify/hydrogen-react/storefront-api-types';

export type LayoutQueryVariables = HydrogenStorefront.Exact<{
  [key: string]: never;
}>;

export type LayoutQuery = {
  shop: Pick<HydrogenStorefront.Shop, 'name' | 'description'>;
};

export interface GeneratedQueryTypes {
  '#graphql\n  query layout {\n    shop {\n      name\n      description\n    }\n  }\n': {
    return: LayoutQuery;
    variables: LayoutQueryVariables;
  };
}
export interface GeneratedMutationTypes {}

declare module '@shopify/hydrogen' {
  interface QueryTypes extends GeneratedQueryTypes {}
  interface MutationTypes extends GeneratedMutationTypes {}
}
