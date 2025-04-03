/* eslint-disable eslint-comments/disable-enable-pair */
/* eslint-disable eslint-comments/no-unlimited-disable */
/* eslint-disable */
import type * as StorefrontTypes from './storefront.types';

export type ImageFragment = Pick<
  StorefrontTypes.Image,
  'altText' | 'url' | 'width' | 'height'
>;

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

export type ProductVariantFragment = Pick<
  StorefrontTypes.ProductVariant,
  'availableForSale' | 'id' | 'sku' | 'title'
> & {
  compareAtPrice?: StorefrontTypes.Maybe<
    Pick<StorefrontTypes.MoneyV2, 'amount' | 'currencyCode'>
  >;
  image?: StorefrontTypes.Maybe<
    {__typename: 'Image'} & Pick<
      StorefrontTypes.Image,
      'id' | 'url' | 'altText' | 'width' | 'height'
    >
  >;
  price: Pick<StorefrontTypes.MoneyV2, 'amount' | 'currencyCode'>;
  product: Pick<StorefrontTypes.Product, 'title' | 'handle'>;
  selectedOptions: Array<
    Pick<StorefrontTypes.SelectedOption, 'name' | 'value'>
  >;
  unitPrice?: StorefrontTypes.Maybe<
    Pick<StorefrontTypes.MoneyV2, 'amount' | 'currencyCode'>
  >;
};

export type ProductFragment = Pick<
  StorefrontTypes.Product,
  | 'id'
  | 'title'
  | 'vendor'
  | 'handle'
  | 'descriptionHtml'
  | 'description'
  | 'encodedVariantExistence'
  | 'encodedVariantAvailability'
> & {
  featuredImage?: StorefrontTypes.Maybe<
    Pick<StorefrontTypes.Image, 'id' | 'url' | 'altText'>
  >;
  options: Array<
    Pick<StorefrontTypes.ProductOption, 'name'> & {
      optionValues: Array<
        Pick<StorefrontTypes.ProductOptionValue, 'name'> & {
          firstSelectableVariant?: StorefrontTypes.Maybe<
            Pick<
              StorefrontTypes.ProductVariant,
              'availableForSale' | 'id' | 'sku' | 'title'
            > & {
              compareAtPrice?: StorefrontTypes.Maybe<
                Pick<StorefrontTypes.MoneyV2, 'amount' | 'currencyCode'>
              >;
              image?: StorefrontTypes.Maybe<
                {__typename: 'Image'} & Pick<
                  StorefrontTypes.Image,
                  'id' | 'url' | 'altText' | 'width' | 'height'
                >
              >;
              price: Pick<StorefrontTypes.MoneyV2, 'amount' | 'currencyCode'>;
              product: Pick<StorefrontTypes.Product, 'title' | 'handle'>;
              selectedOptions: Array<
                Pick<StorefrontTypes.SelectedOption, 'name' | 'value'>
              >;
              unitPrice?: StorefrontTypes.Maybe<
                Pick<StorefrontTypes.MoneyV2, 'amount' | 'currencyCode'>
              >;
            }
          >;
          swatch?: StorefrontTypes.Maybe<
            Pick<StorefrontTypes.ProductOptionValueSwatch, 'color'> & {
              image?: StorefrontTypes.Maybe<{
                previewImage?: StorefrontTypes.Maybe<
                  Pick<StorefrontTypes.Image, 'url'>
                >;
              }>;
            }
          >;
        }
      >;
    }
  >;
  selectedOrFirstAvailableVariant?: StorefrontTypes.Maybe<
    Pick<
      StorefrontTypes.ProductVariant,
      'availableForSale' | 'id' | 'sku' | 'title'
    > & {
      compareAtPrice?: StorefrontTypes.Maybe<
        Pick<StorefrontTypes.MoneyV2, 'amount' | 'currencyCode'>
      >;
      image?: StorefrontTypes.Maybe<
        {__typename: 'Image'} & Pick<
          StorefrontTypes.Image,
          'id' | 'url' | 'altText' | 'width' | 'height'
        >
      >;
      price: Pick<StorefrontTypes.MoneyV2, 'amount' | 'currencyCode'>;
      product: Pick<StorefrontTypes.Product, 'title' | 'handle'>;
      selectedOptions: Array<
        Pick<StorefrontTypes.SelectedOption, 'name' | 'value'>
      >;
      unitPrice?: StorefrontTypes.Maybe<
        Pick<StorefrontTypes.MoneyV2, 'amount' | 'currencyCode'>
      >;
    }
  >;
  adjacentVariants: Array<
    Pick<
      StorefrontTypes.ProductVariant,
      'availableForSale' | 'id' | 'sku' | 'title'
    > & {
      compareAtPrice?: StorefrontTypes.Maybe<
        Pick<StorefrontTypes.MoneyV2, 'amount' | 'currencyCode'>
      >;
      image?: StorefrontTypes.Maybe<
        {__typename: 'Image'} & Pick<
          StorefrontTypes.Image,
          'id' | 'url' | 'altText' | 'width' | 'height'
        >
      >;
      price: Pick<StorefrontTypes.MoneyV2, 'amount' | 'currencyCode'>;
      product: Pick<StorefrontTypes.Product, 'title' | 'handle'>;
      selectedOptions: Array<
        Pick<StorefrontTypes.SelectedOption, 'name' | 'value'>
      >;
      unitPrice?: StorefrontTypes.Maybe<
        Pick<StorefrontTypes.MoneyV2, 'amount' | 'currencyCode'>
      >;
    }
  >;
  seo: Pick<StorefrontTypes.Seo, 'description' | 'title'>;
};

export type ProductQueryVariables = StorefrontTypes.Exact<{
  country?: StorefrontTypes.InputMaybe<StorefrontTypes.CountryCode>;
  handle: StorefrontTypes.Scalars['String']['input'];
  language?: StorefrontTypes.InputMaybe<StorefrontTypes.LanguageCode>;
  selectedOptions:
    | Array<StorefrontTypes.SelectedOptionInput>
    | StorefrontTypes.SelectedOptionInput;
}>;

export type ProductQuery = {
  product?: StorefrontTypes.Maybe<
    Pick<
      StorefrontTypes.Product,
      | 'id'
      | 'title'
      | 'vendor'
      | 'handle'
      | 'descriptionHtml'
      | 'description'
      | 'encodedVariantExistence'
      | 'encodedVariantAvailability'
    > & {
      featuredImage?: StorefrontTypes.Maybe<
        Pick<StorefrontTypes.Image, 'id' | 'url' | 'altText'>
      >;
      options: Array<
        Pick<StorefrontTypes.ProductOption, 'name'> & {
          optionValues: Array<
            Pick<StorefrontTypes.ProductOptionValue, 'name'> & {
              firstSelectableVariant?: StorefrontTypes.Maybe<
                Pick<
                  StorefrontTypes.ProductVariant,
                  'availableForSale' | 'id' | 'sku' | 'title'
                > & {
                  compareAtPrice?: StorefrontTypes.Maybe<
                    Pick<StorefrontTypes.MoneyV2, 'amount' | 'currencyCode'>
                  >;
                  image?: StorefrontTypes.Maybe<
                    {__typename: 'Image'} & Pick<
                      StorefrontTypes.Image,
                      'id' | 'url' | 'altText' | 'width' | 'height'
                    >
                  >;
                  price: Pick<
                    StorefrontTypes.MoneyV2,
                    'amount' | 'currencyCode'
                  >;
                  product: Pick<StorefrontTypes.Product, 'title' | 'handle'>;
                  selectedOptions: Array<
                    Pick<StorefrontTypes.SelectedOption, 'name' | 'value'>
                  >;
                  unitPrice?: StorefrontTypes.Maybe<
                    Pick<StorefrontTypes.MoneyV2, 'amount' | 'currencyCode'>
                  >;
                }
              >;
              swatch?: StorefrontTypes.Maybe<
                Pick<StorefrontTypes.ProductOptionValueSwatch, 'color'> & {
                  image?: StorefrontTypes.Maybe<{
                    previewImage?: StorefrontTypes.Maybe<
                      Pick<StorefrontTypes.Image, 'url'>
                    >;
                  }>;
                }
              >;
            }
          >;
        }
      >;
      selectedOrFirstAvailableVariant?: StorefrontTypes.Maybe<
        Pick<
          StorefrontTypes.ProductVariant,
          'availableForSale' | 'id' | 'sku' | 'title'
        > & {
          compareAtPrice?: StorefrontTypes.Maybe<
            Pick<StorefrontTypes.MoneyV2, 'amount' | 'currencyCode'>
          >;
          image?: StorefrontTypes.Maybe<
            {__typename: 'Image'} & Pick<
              StorefrontTypes.Image,
              'id' | 'url' | 'altText' | 'width' | 'height'
            >
          >;
          price: Pick<StorefrontTypes.MoneyV2, 'amount' | 'currencyCode'>;
          product: Pick<StorefrontTypes.Product, 'title' | 'handle'>;
          selectedOptions: Array<
            Pick<StorefrontTypes.SelectedOption, 'name' | 'value'>
          >;
          unitPrice?: StorefrontTypes.Maybe<
            Pick<StorefrontTypes.MoneyV2, 'amount' | 'currencyCode'>
          >;
        }
      >;
      adjacentVariants: Array<
        Pick<
          StorefrontTypes.ProductVariant,
          'availableForSale' | 'id' | 'sku' | 'title'
        > & {
          compareAtPrice?: StorefrontTypes.Maybe<
            Pick<StorefrontTypes.MoneyV2, 'amount' | 'currencyCode'>
          >;
          image?: StorefrontTypes.Maybe<
            {__typename: 'Image'} & Pick<
              StorefrontTypes.Image,
              'id' | 'url' | 'altText' | 'width' | 'height'
            >
          >;
          price: Pick<StorefrontTypes.MoneyV2, 'amount' | 'currencyCode'>;
          product: Pick<StorefrontTypes.Product, 'title' | 'handle'>;
          selectedOptions: Array<
            Pick<StorefrontTypes.SelectedOption, 'name' | 'value'>
          >;
          unitPrice?: StorefrontTypes.Maybe<
            Pick<StorefrontTypes.MoneyV2, 'amount' | 'currencyCode'>
          >;
        }
      >;
      seo: Pick<StorefrontTypes.Seo, 'description' | 'title'>;
    }
  >;
};

interface GeneratedQueryTypes {
  '\n  query FeaturedCollection {\n    collection(handle: "featured") {\n      id\n      handle\n      title\n      description\n      image {\n        id\n        url\n      }\n      products(first: 12) {\n        nodes {\n          id\n          title\n          handle\n          images(first: 1) {\n            nodes {\n              id\n              url\n              altText\n            }\n          }\n          priceRange {\n            minVariantPrice {\n              amount\n              currencyCode\n            }\n          }\n        }\n      }\n    }\n  }\n': {
    return: FeaturedCollectionQuery;
    variables: FeaturedCollectionQueryVariables;
  };
  '#graphql\n  query Product(\n    $country: CountryCode\n    $handle: String!\n    $language: LanguageCode\n    $selectedOptions: [SelectedOptionInput!]!\n  ) @inContext(country: $country, language: $language) {\n    product(handle: $handle) {\n      ...Product\n    }\n  }\n  #graphql\n  fragment Product on Product {\n    id\n    title\n    vendor\n    handle\n    descriptionHtml\n    description\n    encodedVariantExistence\n    encodedVariantAvailability\n    featuredImage {\n      id\n      url\n      altText\n    }\n    options {\n      name\n      optionValues {\n        name\n        firstSelectableVariant {\n          ...ProductVariant\n        }\n        swatch {\n          color\n          image {\n            previewImage {\n              url\n            }\n          }\n        }\n      }\n    }\n    selectedOrFirstAvailableVariant(selectedOptions: $selectedOptions, ignoreUnknownOptions: true, caseInsensitiveMatch: true) {\n      ...ProductVariant\n    }\n    adjacentVariants (selectedOptions: $selectedOptions) {\n      ...ProductVariant\n    }\n    seo {\n      description\n      title\n    }\n  }\n  #graphql\n  fragment ProductVariant on ProductVariant {\n    availableForSale\n    compareAtPrice {\n      amount\n      currencyCode\n    }\n    id\n    image {\n      __typename\n      id\n      url\n      altText\n      width\n      height\n    }\n    price {\n      amount\n      currencyCode\n    }\n    product {\n      title\n      handle\n    }\n    selectedOptions {\n      name\n      value\n    }\n    sku\n    title\n    unitPrice {\n      amount\n      currencyCode\n    }\n  }\n\n\n': {
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
