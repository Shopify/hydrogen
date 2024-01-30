/* eslint-disable eslint-comments/disable-enable-pair */
/* eslint-disable eslint-comments/no-unlimited-disable */
/* eslint-disable */
import * as StorefrontAPI from '@shopify/hydrogen/storefront-api-types';

export type MenuItemFragment = Pick<
  StorefrontAPI.MenuItem,
  'id' | 'resourceId' | 'tags' | 'title' | 'type' | 'url'
>;

export type ChildMenuItemFragment = Pick<
  StorefrontAPI.MenuItem,
  'id' | 'resourceId' | 'tags' | 'title' | 'type' | 'url'
>;

export type ParentMenuItemFragment = Pick<
  StorefrontAPI.MenuItem,
  'id' | 'resourceId' | 'tags' | 'title' | 'type' | 'url'
> & {
  items: Array<
    Pick<
      StorefrontAPI.MenuItem,
      'id' | 'resourceId' | 'tags' | 'title' | 'type' | 'url'
    >
  >;
};

export type MenuFragment = Pick<StorefrontAPI.Menu, 'id'> & {
  items: Array<
    Pick<
      StorefrontAPI.MenuItem,
      'id' | 'resourceId' | 'tags' | 'title' | 'type' | 'url'
    > & {
      items: Array<
        Pick<
          StorefrontAPI.MenuItem,
          'id' | 'resourceId' | 'tags' | 'title' | 'type' | 'url'
        >
      >;
    }
  >;
};

export type ShopFragment = Pick<StorefrontAPI.Shop, 'id' | 'name'> & {
  primaryDomain: Pick<StorefrontAPI.Domain, 'url'>;
  brand?: StorefrontAPI.Maybe<{
    logo?: StorefrontAPI.Maybe<{
      image?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Image, 'url'>>;
    }>;
  }>;
};

export type HeaderQueryVariables = StorefrontAPI.Exact<{
  country?: StorefrontAPI.InputMaybe<StorefrontAPI.CountryCode>;
  headerMenuHandle: StorefrontAPI.Scalars['String']['input'];
  language?: StorefrontAPI.InputMaybe<StorefrontAPI.LanguageCode>;
}>;

export type HeaderQuery = {
  shop: Pick<StorefrontAPI.Shop, 'id' | 'name'> & {
    primaryDomain: Pick<StorefrontAPI.Domain, 'url'>;
    brand?: StorefrontAPI.Maybe<{
      logo?: StorefrontAPI.Maybe<{
        image?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Image, 'url'>>;
      }>;
    }>;
  };
  menu?: StorefrontAPI.Maybe<
    Pick<StorefrontAPI.Menu, 'id'> & {
      items: Array<
        Pick<
          StorefrontAPI.MenuItem,
          'id' | 'resourceId' | 'tags' | 'title' | 'type' | 'url'
        > & {
          items: Array<
            Pick<
              StorefrontAPI.MenuItem,
              'id' | 'resourceId' | 'tags' | 'title' | 'type' | 'url'
            >
          >;
        }
      >;
    }
  >;
};

export type MoneyProductItemFragment = Pick<
  StorefrontAPI.MoneyV2,
  'amount' | 'currencyCode'
>;

export type ProductItemFragment = Pick<
  StorefrontAPI.Product,
  'id' | 'handle' | 'title'
> & {
  featuredImage?: StorefrontAPI.Maybe<
    Pick<StorefrontAPI.Image, 'id' | 'altText' | 'url' | 'width' | 'height'>
  >;
  priceRange: {
    minVariantPrice: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
    maxVariantPrice: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
  };
  variants: {
    nodes: Array<{
      selectedOptions: Array<
        Pick<StorefrontAPI.SelectedOption, 'name' | 'value'>
      >;
    }>;
  };
};

export type CollectionQueryVariables = StorefrontAPI.Exact<{
  handle: StorefrontAPI.Scalars['String']['input'];
  country?: StorefrontAPI.InputMaybe<StorefrontAPI.CountryCode>;
  language?: StorefrontAPI.InputMaybe<StorefrontAPI.LanguageCode>;
  first?: StorefrontAPI.InputMaybe<StorefrontAPI.Scalars['Int']['input']>;
  last?: StorefrontAPI.InputMaybe<StorefrontAPI.Scalars['Int']['input']>;
  startCursor?: StorefrontAPI.InputMaybe<
    StorefrontAPI.Scalars['String']['input']
  >;
  endCursor?: StorefrontAPI.InputMaybe<
    StorefrontAPI.Scalars['String']['input']
  >;
}>;

export type CollectionQuery = {
  collection?: StorefrontAPI.Maybe<
    Pick<
      StorefrontAPI.Collection,
      'id' | 'handle' | 'title' | 'description'
    > & {
      products: {
        nodes: Array<
          Pick<StorefrontAPI.Product, 'id' | 'handle' | 'title'> & {
            featuredImage?: StorefrontAPI.Maybe<
              Pick<
                StorefrontAPI.Image,
                'id' | 'altText' | 'url' | 'width' | 'height'
              >
            >;
            priceRange: {
              minVariantPrice: Pick<
                StorefrontAPI.MoneyV2,
                'amount' | 'currencyCode'
              >;
              maxVariantPrice: Pick<
                StorefrontAPI.MoneyV2,
                'amount' | 'currencyCode'
              >;
            };
            variants: {
              nodes: Array<{
                selectedOptions: Array<
                  Pick<StorefrontAPI.SelectedOption, 'name' | 'value'>
                >;
              }>;
            };
          }
        >;
        pageInfo: Pick<
          StorefrontAPI.PageInfo,
          'hasPreviousPage' | 'hasNextPage' | 'endCursor' | 'startCursor'
        >;
      };
    }
  >;
};

export type CollectionFragment = Pick<
  StorefrontAPI.Collection,
  'id' | 'title' | 'handle'
> & {
  image?: StorefrontAPI.Maybe<
    Pick<StorefrontAPI.Image, 'id' | 'url' | 'altText' | 'width' | 'height'>
  >;
};

export type StoreCollectionsQueryVariables = StorefrontAPI.Exact<{
  country?: StorefrontAPI.InputMaybe<StorefrontAPI.CountryCode>;
  endCursor?: StorefrontAPI.InputMaybe<
    StorefrontAPI.Scalars['String']['input']
  >;
  first?: StorefrontAPI.InputMaybe<StorefrontAPI.Scalars['Int']['input']>;
  language?: StorefrontAPI.InputMaybe<StorefrontAPI.LanguageCode>;
  last?: StorefrontAPI.InputMaybe<StorefrontAPI.Scalars['Int']['input']>;
  startCursor?: StorefrontAPI.InputMaybe<
    StorefrontAPI.Scalars['String']['input']
  >;
}>;

export type StoreCollectionsQuery = {
  collections: {
    nodes: Array<
      Pick<StorefrontAPI.Collection, 'id' | 'title' | 'handle'> & {
        image?: StorefrontAPI.Maybe<
          Pick<
            StorefrontAPI.Image,
            'id' | 'url' | 'altText' | 'width' | 'height'
          >
        >;
      }
    >;
    pageInfo: Pick<
      StorefrontAPI.PageInfo,
      'hasNextPage' | 'hasPreviousPage' | 'startCursor' | 'endCursor'
    >;
  };
};

export type ProductVariantFragment = Pick<
  StorefrontAPI.ProductVariant,
  'availableForSale' | 'id' | 'sku' | 'title'
> & {
  compareAtPrice?: StorefrontAPI.Maybe<
    Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>
  >;
  image?: StorefrontAPI.Maybe<
    {__typename: 'Image'} & Pick<
      StorefrontAPI.Image,
      'id' | 'url' | 'altText' | 'width' | 'height'
    >
  >;
  price: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
  product: Pick<StorefrontAPI.Product, 'title' | 'handle'>;
  selectedOptions: Array<Pick<StorefrontAPI.SelectedOption, 'name' | 'value'>>;
  unitPrice?: StorefrontAPI.Maybe<
    Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>
  >;
};

export type ProductFragment = Pick<
  StorefrontAPI.Product,
  'id' | 'title' | 'vendor' | 'handle' | 'descriptionHtml' | 'description'
> & {
  options: Array<Pick<StorefrontAPI.ProductOption, 'name' | 'values'>>;
  selectedVariant?: StorefrontAPI.Maybe<
    Pick<
      StorefrontAPI.ProductVariant,
      'availableForSale' | 'id' | 'sku' | 'title'
    > & {
      compareAtPrice?: StorefrontAPI.Maybe<
        Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>
      >;
      image?: StorefrontAPI.Maybe<
        {__typename: 'Image'} & Pick<
          StorefrontAPI.Image,
          'id' | 'url' | 'altText' | 'width' | 'height'
        >
      >;
      price: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
      product: Pick<StorefrontAPI.Product, 'title' | 'handle'>;
      selectedOptions: Array<
        Pick<StorefrontAPI.SelectedOption, 'name' | 'value'>
      >;
      unitPrice?: StorefrontAPI.Maybe<
        Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>
      >;
    }
  >;
  variants: {
    nodes: Array<
      Pick<
        StorefrontAPI.ProductVariant,
        'availableForSale' | 'id' | 'sku' | 'title'
      > & {
        compareAtPrice?: StorefrontAPI.Maybe<
          Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>
        >;
        image?: StorefrontAPI.Maybe<
          {__typename: 'Image'} & Pick<
            StorefrontAPI.Image,
            'id' | 'url' | 'altText' | 'width' | 'height'
          >
        >;
        price: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
        product: Pick<StorefrontAPI.Product, 'title' | 'handle'>;
        selectedOptions: Array<
          Pick<StorefrontAPI.SelectedOption, 'name' | 'value'>
        >;
        unitPrice?: StorefrontAPI.Maybe<
          Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>
        >;
      }
    >;
  };
  seo: Pick<StorefrontAPI.Seo, 'description' | 'title'>;
};

export type ProductQueryVariables = StorefrontAPI.Exact<{
  country?: StorefrontAPI.InputMaybe<StorefrontAPI.CountryCode>;
  handle: StorefrontAPI.Scalars['String']['input'];
  language?: StorefrontAPI.InputMaybe<StorefrontAPI.LanguageCode>;
  selectedOptions:
    | Array<StorefrontAPI.SelectedOptionInput>
    | StorefrontAPI.SelectedOptionInput;
}>;

export type ProductQuery = {
  product?: StorefrontAPI.Maybe<
    Pick<
      StorefrontAPI.Product,
      'id' | 'title' | 'vendor' | 'handle' | 'descriptionHtml' | 'description'
    > & {
      options: Array<Pick<StorefrontAPI.ProductOption, 'name' | 'values'>>;
      selectedVariant?: StorefrontAPI.Maybe<
        Pick<
          StorefrontAPI.ProductVariant,
          'availableForSale' | 'id' | 'sku' | 'title'
        > & {
          compareAtPrice?: StorefrontAPI.Maybe<
            Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>
          >;
          image?: StorefrontAPI.Maybe<
            {__typename: 'Image'} & Pick<
              StorefrontAPI.Image,
              'id' | 'url' | 'altText' | 'width' | 'height'
            >
          >;
          price: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
          product: Pick<StorefrontAPI.Product, 'title' | 'handle'>;
          selectedOptions: Array<
            Pick<StorefrontAPI.SelectedOption, 'name' | 'value'>
          >;
          unitPrice?: StorefrontAPI.Maybe<
            Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>
          >;
        }
      >;
      variants: {
        nodes: Array<
          Pick<
            StorefrontAPI.ProductVariant,
            'availableForSale' | 'id' | 'sku' | 'title'
          > & {
            compareAtPrice?: StorefrontAPI.Maybe<
              Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>
            >;
            image?: StorefrontAPI.Maybe<
              {__typename: 'Image'} & Pick<
                StorefrontAPI.Image,
                'id' | 'url' | 'altText' | 'width' | 'height'
              >
            >;
            price: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
            product: Pick<StorefrontAPI.Product, 'title' | 'handle'>;
            selectedOptions: Array<
              Pick<StorefrontAPI.SelectedOption, 'name' | 'value'>
            >;
            unitPrice?: StorefrontAPI.Maybe<
              Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>
            >;
          }
        >;
      };
      seo: Pick<StorefrontAPI.Seo, 'description' | 'title'>;
    }
  >;
};

export type ProductVariantsFragment = {
  variants: {
    nodes: Array<
      Pick<
        StorefrontAPI.ProductVariant,
        'availableForSale' | 'id' | 'sku' | 'title'
      > & {
        compareAtPrice?: StorefrontAPI.Maybe<
          Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>
        >;
        image?: StorefrontAPI.Maybe<
          {__typename: 'Image'} & Pick<
            StorefrontAPI.Image,
            'id' | 'url' | 'altText' | 'width' | 'height'
          >
        >;
        price: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
        product: Pick<StorefrontAPI.Product, 'title' | 'handle'>;
        selectedOptions: Array<
          Pick<StorefrontAPI.SelectedOption, 'name' | 'value'>
        >;
        unitPrice?: StorefrontAPI.Maybe<
          Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>
        >;
      }
    >;
  };
};

export type ProductVariantsQueryVariables = StorefrontAPI.Exact<{
  country?: StorefrontAPI.InputMaybe<StorefrontAPI.CountryCode>;
  language?: StorefrontAPI.InputMaybe<StorefrontAPI.LanguageCode>;
  handle: StorefrontAPI.Scalars['String']['input'];
}>;

export type ProductVariantsQuery = {
  product?: StorefrontAPI.Maybe<{
    variants: {
      nodes: Array<
        Pick<
          StorefrontAPI.ProductVariant,
          'availableForSale' | 'id' | 'sku' | 'title'
        > & {
          compareAtPrice?: StorefrontAPI.Maybe<
            Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>
          >;
          image?: StorefrontAPI.Maybe<
            {__typename: 'Image'} & Pick<
              StorefrontAPI.Image,
              'id' | 'url' | 'altText' | 'width' | 'height'
            >
          >;
          price: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
          product: Pick<StorefrontAPI.Product, 'title' | 'handle'>;
          selectedOptions: Array<
            Pick<StorefrontAPI.SelectedOption, 'name' | 'value'>
          >;
          unitPrice?: StorefrontAPI.Maybe<
            Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>
          >;
        }
      >;
    };
  }>;
};

export type RouteContentQueryVariables = StorefrontAPI.Exact<{
  handle: StorefrontAPI.Scalars['String']['input'];
}>;

export type RouteContentQuery = {
  route?: StorefrontAPI.Maybe<
    Pick<StorefrontAPI.Metaobject, 'type' | 'id'> & {
      title?: StorefrontAPI.Maybe<
        Pick<StorefrontAPI.MetaobjectField, 'key' | 'value'>
      >;
      sections?: StorefrontAPI.Maybe<{
        references?: StorefrontAPI.Maybe<{
          nodes: Array<
            Pick<StorefrontAPI.Metaobject, 'id' | 'type' | 'handle'> & {
              heading?: StorefrontAPI.Maybe<
                Pick<StorefrontAPI.MetaobjectField, 'key' | 'value' | 'type'>
              >;
              subheading?: StorefrontAPI.Maybe<
                Pick<StorefrontAPI.MetaobjectField, 'key' | 'value'>
              >;
              link?: StorefrontAPI.Maybe<{
                reference?: StorefrontAPI.Maybe<{
                  href?: StorefrontAPI.Maybe<
                    Pick<StorefrontAPI.MetaobjectField, 'value'>
                  >;
                  target?: StorefrontAPI.Maybe<
                    Pick<StorefrontAPI.MetaobjectField, 'value'>
                  >;
                  text?: StorefrontAPI.Maybe<
                    Pick<StorefrontAPI.MetaobjectField, 'value'>
                  >;
                }>;
              }>;
              image?: StorefrontAPI.Maybe<
                Pick<StorefrontAPI.MetaobjectField, 'key'> & {
                  reference?: StorefrontAPI.Maybe<{
                    image?: StorefrontAPI.Maybe<
                      Pick<
                        StorefrontAPI.Image,
                        'altText' | 'url' | 'width' | 'height'
                      >
                    >;
                  }>;
                }
              >;
              body?: StorefrontAPI.Maybe<
                Pick<StorefrontAPI.MetaobjectField, 'key' | 'value'>
              >;
              products?: StorefrontAPI.Maybe<
                Pick<StorefrontAPI.MetaobjectField, 'key'> & {
                  references?: StorefrontAPI.Maybe<{
                    nodes: Array<
                      Pick<
                        StorefrontAPI.Product,
                        'id' | 'title' | 'handle' | 'productType'
                      > & {
                        variants: {
                          nodes: Array<
                            Pick<StorefrontAPI.ProductVariant, 'title'> & {
                              image?: StorefrontAPI.Maybe<
                                Pick<
                                  StorefrontAPI.Image,
                                  'altText' | 'width' | 'height' | 'url'
                                >
                              >;
                            }
                          >;
                        };
                        priceRange: {
                          minVariantPrice: Pick<
                            StorefrontAPI.MoneyV2,
                            'amount' | 'currencyCode'
                          >;
                        };
                      }
                    >;
                  }>;
                }
              >;
              withProductPrices?: StorefrontAPI.Maybe<
                Pick<StorefrontAPI.MetaobjectField, 'key' | 'value'>
              >;
              collections?: StorefrontAPI.Maybe<{
                references?: StorefrontAPI.Maybe<{
                  nodes: Array<
                    Pick<
                      StorefrontAPI.Collection,
                      'id' | 'title' | 'handle'
                    > & {
                      image?: StorefrontAPI.Maybe<
                        Pick<
                          StorefrontAPI.Image,
                          'altText' | 'width' | 'height' | 'url'
                        >
                      >;
                    }
                  >;
                }>;
              }>;
              withCollectionTitles?: StorefrontAPI.Maybe<
                Pick<StorefrontAPI.MetaobjectField, 'type' | 'key' | 'value'>
              >;
              stores?: StorefrontAPI.Maybe<{
                references?: StorefrontAPI.Maybe<{
                  nodes: Array<
                    Pick<StorefrontAPI.Metaobject, 'type' | 'id' | 'handle'> & {
                      heading?: StorefrontAPI.Maybe<
                        Pick<
                          StorefrontAPI.MetaobjectField,
                          'type' | 'key' | 'value'
                        >
                      >;
                      address?: StorefrontAPI.Maybe<
                        Pick<
                          StorefrontAPI.MetaobjectField,
                          'type' | 'key' | 'value'
                        >
                      >;
                      image?: StorefrontAPI.Maybe<
                        Pick<StorefrontAPI.MetaobjectField, 'key'> & {
                          reference?: StorefrontAPI.Maybe<{
                            image?: StorefrontAPI.Maybe<
                              Pick<
                                StorefrontAPI.Image,
                                'altText' | 'url' | 'width' | 'height'
                              >
                            >;
                          }>;
                        }
                      >;
                    }
                  >;
                }>;
              }>;
              store?: StorefrontAPI.Maybe<{
                reference?: StorefrontAPI.Maybe<
                  Pick<StorefrontAPI.Metaobject, 'type' | 'id' | 'handle'> & {
                    title?: StorefrontAPI.Maybe<
                      Pick<
                        StorefrontAPI.MetaobjectField,
                        'type' | 'key' | 'value'
                      >
                    >;
                    heading?: StorefrontAPI.Maybe<
                      Pick<
                        StorefrontAPI.MetaobjectField,
                        'type' | 'key' | 'value'
                      >
                    >;
                    description?: StorefrontAPI.Maybe<
                      Pick<
                        StorefrontAPI.MetaobjectField,
                        'type' | 'key' | 'value'
                      >
                    >;
                    address?: StorefrontAPI.Maybe<
                      Pick<
                        StorefrontAPI.MetaobjectField,
                        'type' | 'key' | 'value'
                      >
                    >;
                    hours?: StorefrontAPI.Maybe<
                      Pick<
                        StorefrontAPI.MetaobjectField,
                        'type' | 'key' | 'value'
                      >
                    >;
                    image?: StorefrontAPI.Maybe<
                      Pick<StorefrontAPI.MetaobjectField, 'type' | 'key'> & {
                        reference?: StorefrontAPI.Maybe<{
                          image?: StorefrontAPI.Maybe<
                            Pick<
                              StorefrontAPI.Image,
                              'altText' | 'url' | 'width' | 'height'
                            >
                          >;
                        }>;
                      }
                    >;
                  }
                >;
              }>;
            }
          >;
        }>;
      }>;
    }
  >;
};

export type FeaturedCollectionImageFragment = Pick<
  StorefrontAPI.Image,
  'altText' | 'width' | 'height' | 'url'
>;

export type FeaturedCollectionFragment = Pick<
  StorefrontAPI.Collection,
  'id' | 'title' | 'handle'
> & {
  image?: StorefrontAPI.Maybe<
    Pick<StorefrontAPI.Image, 'altText' | 'width' | 'height' | 'url'>
  >;
};

export type SectionFeaturedCollectionsFieldFragment = Pick<
  StorefrontAPI.MetaobjectField,
  'type' | 'key' | 'value'
>;

export type SectionFeaturedCollectionsFragment = Pick<
  StorefrontAPI.Metaobject,
  'type' | 'id'
> & {
  heading?: StorefrontAPI.Maybe<
    Pick<StorefrontAPI.MetaobjectField, 'type' | 'key' | 'value'>
  >;
  collections?: StorefrontAPI.Maybe<{
    references?: StorefrontAPI.Maybe<{
      nodes: Array<
        Pick<StorefrontAPI.Collection, 'id' | 'title' | 'handle'> & {
          image?: StorefrontAPI.Maybe<
            Pick<StorefrontAPI.Image, 'altText' | 'width' | 'height' | 'url'>
          >;
        }
      >;
    }>;
  }>;
  withCollectionTitles?: StorefrontAPI.Maybe<
    Pick<StorefrontAPI.MetaobjectField, 'type' | 'key' | 'value'>
  >;
};

export type FeaturedProductFragment = Pick<
  StorefrontAPI.Product,
  'id' | 'title' | 'handle' | 'productType'
> & {
  variants: {
    nodes: Array<
      Pick<StorefrontAPI.ProductVariant, 'title'> & {
        image?: StorefrontAPI.Maybe<
          Pick<StorefrontAPI.Image, 'altText' | 'width' | 'height' | 'url'>
        >;
      }
    >;
  };
  priceRange: {
    minVariantPrice: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
  };
};

export type SectionFeaturedProductsFragment = Pick<
  StorefrontAPI.Metaobject,
  'type'
> & {
  heading?: StorefrontAPI.Maybe<
    Pick<StorefrontAPI.MetaobjectField, 'key' | 'value'>
  >;
  body?: StorefrontAPI.Maybe<
    Pick<StorefrontAPI.MetaobjectField, 'key' | 'value'>
  >;
  products?: StorefrontAPI.Maybe<
    Pick<StorefrontAPI.MetaobjectField, 'key'> & {
      references?: StorefrontAPI.Maybe<{
        nodes: Array<
          Pick<
            StorefrontAPI.Product,
            'id' | 'title' | 'handle' | 'productType'
          > & {
            variants: {
              nodes: Array<
                Pick<StorefrontAPI.ProductVariant, 'title'> & {
                  image?: StorefrontAPI.Maybe<
                    Pick<
                      StorefrontAPI.Image,
                      'altText' | 'width' | 'height' | 'url'
                    >
                  >;
                }
              >;
            };
            priceRange: {
              minVariantPrice: Pick<
                StorefrontAPI.MoneyV2,
                'amount' | 'currencyCode'
              >;
            };
          }
        >;
      }>;
    }
  >;
  withProductPrices?: StorefrontAPI.Maybe<
    Pick<StorefrontAPI.MetaobjectField, 'key' | 'value'>
  >;
};

export type MediaImageFragment = {
  image?: StorefrontAPI.Maybe<
    Pick<StorefrontAPI.Image, 'altText' | 'url' | 'width' | 'height'>
  >;
};

export type LinkFragment = {
  reference?: StorefrontAPI.Maybe<{
    href?: StorefrontAPI.Maybe<Pick<StorefrontAPI.MetaobjectField, 'value'>>;
    target?: StorefrontAPI.Maybe<Pick<StorefrontAPI.MetaobjectField, 'value'>>;
    text?: StorefrontAPI.Maybe<Pick<StorefrontAPI.MetaobjectField, 'value'>>;
  }>;
};

export type SectionHeroFragment = Pick<StorefrontAPI.Metaobject, 'type'> & {
  heading?: StorefrontAPI.Maybe<
    Pick<StorefrontAPI.MetaobjectField, 'key' | 'value'>
  >;
  subheading?: StorefrontAPI.Maybe<
    Pick<StorefrontAPI.MetaobjectField, 'key' | 'value'>
  >;
  link?: StorefrontAPI.Maybe<{
    reference?: StorefrontAPI.Maybe<{
      href?: StorefrontAPI.Maybe<Pick<StorefrontAPI.MetaobjectField, 'value'>>;
      target?: StorefrontAPI.Maybe<
        Pick<StorefrontAPI.MetaobjectField, 'value'>
      >;
      text?: StorefrontAPI.Maybe<Pick<StorefrontAPI.MetaobjectField, 'value'>>;
    }>;
  }>;
  image?: StorefrontAPI.Maybe<
    Pick<StorefrontAPI.MetaobjectField, 'key'> & {
      reference?: StorefrontAPI.Maybe<{
        image?: StorefrontAPI.Maybe<
          Pick<StorefrontAPI.Image, 'altText' | 'url' | 'width' | 'height'>
        >;
      }>;
    }
  >;
};

export type StoreProfileFieldFragment = Pick<
  StorefrontAPI.MetaobjectField,
  'type' | 'key' | 'value'
>;

export type StoreProfileFragment = Pick<
  StorefrontAPI.Metaobject,
  'type' | 'id' | 'handle'
> & {
  title?: StorefrontAPI.Maybe<
    Pick<StorefrontAPI.MetaobjectField, 'type' | 'key' | 'value'>
  >;
  heading?: StorefrontAPI.Maybe<
    Pick<StorefrontAPI.MetaobjectField, 'type' | 'key' | 'value'>
  >;
  description?: StorefrontAPI.Maybe<
    Pick<StorefrontAPI.MetaobjectField, 'type' | 'key' | 'value'>
  >;
  address?: StorefrontAPI.Maybe<
    Pick<StorefrontAPI.MetaobjectField, 'type' | 'key' | 'value'>
  >;
  hours?: StorefrontAPI.Maybe<
    Pick<StorefrontAPI.MetaobjectField, 'type' | 'key' | 'value'>
  >;
  image?: StorefrontAPI.Maybe<
    Pick<StorefrontAPI.MetaobjectField, 'type' | 'key'> & {
      reference?: StorefrontAPI.Maybe<{
        image?: StorefrontAPI.Maybe<
          Pick<StorefrontAPI.Image, 'altText' | 'url' | 'width' | 'height'>
        >;
      }>;
    }
  >;
};

export type SectionStoreProfileFragment = Pick<
  StorefrontAPI.Metaobject,
  'type' | 'id' | 'handle'
> & {
  store?: StorefrontAPI.Maybe<{
    reference?: StorefrontAPI.Maybe<
      Pick<StorefrontAPI.Metaobject, 'type' | 'id' | 'handle'> & {
        title?: StorefrontAPI.Maybe<
          Pick<StorefrontAPI.MetaobjectField, 'type' | 'key' | 'value'>
        >;
        heading?: StorefrontAPI.Maybe<
          Pick<StorefrontAPI.MetaobjectField, 'type' | 'key' | 'value'>
        >;
        description?: StorefrontAPI.Maybe<
          Pick<StorefrontAPI.MetaobjectField, 'type' | 'key' | 'value'>
        >;
        address?: StorefrontAPI.Maybe<
          Pick<StorefrontAPI.MetaobjectField, 'type' | 'key' | 'value'>
        >;
        hours?: StorefrontAPI.Maybe<
          Pick<StorefrontAPI.MetaobjectField, 'type' | 'key' | 'value'>
        >;
        image?: StorefrontAPI.Maybe<
          Pick<StorefrontAPI.MetaobjectField, 'type' | 'key'> & {
            reference?: StorefrontAPI.Maybe<{
              image?: StorefrontAPI.Maybe<
                Pick<
                  StorefrontAPI.Image,
                  'altText' | 'url' | 'width' | 'height'
                >
              >;
            }>;
          }
        >;
      }
    >;
  }>;
};

export type StoreItemFieldFragment = Pick<
  StorefrontAPI.MetaobjectField,
  'type' | 'key' | 'value'
>;

export type StoreItemImageFragment = {
  image?: StorefrontAPI.Maybe<
    Pick<StorefrontAPI.Image, 'altText' | 'url' | 'width' | 'height'>
  >;
};

export type StoreItemFragment = Pick<
  StorefrontAPI.Metaobject,
  'type' | 'id' | 'handle'
> & {
  heading?: StorefrontAPI.Maybe<
    Pick<StorefrontAPI.MetaobjectField, 'type' | 'key' | 'value'>
  >;
  address?: StorefrontAPI.Maybe<
    Pick<StorefrontAPI.MetaobjectField, 'type' | 'key' | 'value'>
  >;
  image?: StorefrontAPI.Maybe<
    Pick<StorefrontAPI.MetaobjectField, 'key'> & {
      reference?: StorefrontAPI.Maybe<{
        image?: StorefrontAPI.Maybe<
          Pick<StorefrontAPI.Image, 'altText' | 'url' | 'width' | 'height'>
        >;
      }>;
    }
  >;
};

export type SectionStoresFragment = Pick<StorefrontAPI.Metaobject, 'type'> & {
  heading?: StorefrontAPI.Maybe<
    Pick<StorefrontAPI.MetaobjectField, 'type' | 'key' | 'value'>
  >;
  stores?: StorefrontAPI.Maybe<{
    references?: StorefrontAPI.Maybe<{
      nodes: Array<
        Pick<StorefrontAPI.Metaobject, 'type' | 'id' | 'handle'> & {
          heading?: StorefrontAPI.Maybe<
            Pick<StorefrontAPI.MetaobjectField, 'type' | 'key' | 'value'>
          >;
          address?: StorefrontAPI.Maybe<
            Pick<StorefrontAPI.MetaobjectField, 'type' | 'key' | 'value'>
          >;
          image?: StorefrontAPI.Maybe<
            Pick<StorefrontAPI.MetaobjectField, 'key'> & {
              reference?: StorefrontAPI.Maybe<{
                image?: StorefrontAPI.Maybe<
                  Pick<
                    StorefrontAPI.Image,
                    'altText' | 'url' | 'width' | 'height'
                  >
                >;
              }>;
            }
          >;
        }
      >;
    }>;
  }>;
};

export type SectionsFragment = {
  references?: StorefrontAPI.Maybe<{
    nodes: Array<
      Pick<StorefrontAPI.Metaobject, 'id' | 'type' | 'handle'> & {
        heading?: StorefrontAPI.Maybe<
          Pick<StorefrontAPI.MetaobjectField, 'key' | 'value' | 'type'>
        >;
        subheading?: StorefrontAPI.Maybe<
          Pick<StorefrontAPI.MetaobjectField, 'key' | 'value'>
        >;
        link?: StorefrontAPI.Maybe<{
          reference?: StorefrontAPI.Maybe<{
            href?: StorefrontAPI.Maybe<
              Pick<StorefrontAPI.MetaobjectField, 'value'>
            >;
            target?: StorefrontAPI.Maybe<
              Pick<StorefrontAPI.MetaobjectField, 'value'>
            >;
            text?: StorefrontAPI.Maybe<
              Pick<StorefrontAPI.MetaobjectField, 'value'>
            >;
          }>;
        }>;
        image?: StorefrontAPI.Maybe<
          Pick<StorefrontAPI.MetaobjectField, 'key'> & {
            reference?: StorefrontAPI.Maybe<{
              image?: StorefrontAPI.Maybe<
                Pick<
                  StorefrontAPI.Image,
                  'altText' | 'url' | 'width' | 'height'
                >
              >;
            }>;
          }
        >;
        body?: StorefrontAPI.Maybe<
          Pick<StorefrontAPI.MetaobjectField, 'key' | 'value'>
        >;
        products?: StorefrontAPI.Maybe<
          Pick<StorefrontAPI.MetaobjectField, 'key'> & {
            references?: StorefrontAPI.Maybe<{
              nodes: Array<
                Pick<
                  StorefrontAPI.Product,
                  'id' | 'title' | 'handle' | 'productType'
                > & {
                  variants: {
                    nodes: Array<
                      Pick<StorefrontAPI.ProductVariant, 'title'> & {
                        image?: StorefrontAPI.Maybe<
                          Pick<
                            StorefrontAPI.Image,
                            'altText' | 'width' | 'height' | 'url'
                          >
                        >;
                      }
                    >;
                  };
                  priceRange: {
                    minVariantPrice: Pick<
                      StorefrontAPI.MoneyV2,
                      'amount' | 'currencyCode'
                    >;
                  };
                }
              >;
            }>;
          }
        >;
        withProductPrices?: StorefrontAPI.Maybe<
          Pick<StorefrontAPI.MetaobjectField, 'key' | 'value'>
        >;
        collections?: StorefrontAPI.Maybe<{
          references?: StorefrontAPI.Maybe<{
            nodes: Array<
              Pick<StorefrontAPI.Collection, 'id' | 'title' | 'handle'> & {
                image?: StorefrontAPI.Maybe<
                  Pick<
                    StorefrontAPI.Image,
                    'altText' | 'width' | 'height' | 'url'
                  >
                >;
              }
            >;
          }>;
        }>;
        withCollectionTitles?: StorefrontAPI.Maybe<
          Pick<StorefrontAPI.MetaobjectField, 'type' | 'key' | 'value'>
        >;
        stores?: StorefrontAPI.Maybe<{
          references?: StorefrontAPI.Maybe<{
            nodes: Array<
              Pick<StorefrontAPI.Metaobject, 'type' | 'id' | 'handle'> & {
                heading?: StorefrontAPI.Maybe<
                  Pick<StorefrontAPI.MetaobjectField, 'type' | 'key' | 'value'>
                >;
                address?: StorefrontAPI.Maybe<
                  Pick<StorefrontAPI.MetaobjectField, 'type' | 'key' | 'value'>
                >;
                image?: StorefrontAPI.Maybe<
                  Pick<StorefrontAPI.MetaobjectField, 'key'> & {
                    reference?: StorefrontAPI.Maybe<{
                      image?: StorefrontAPI.Maybe<
                        Pick<
                          StorefrontAPI.Image,
                          'altText' | 'url' | 'width' | 'height'
                        >
                      >;
                    }>;
                  }
                >;
              }
            >;
          }>;
        }>;
        store?: StorefrontAPI.Maybe<{
          reference?: StorefrontAPI.Maybe<
            Pick<StorefrontAPI.Metaobject, 'type' | 'id' | 'handle'> & {
              title?: StorefrontAPI.Maybe<
                Pick<StorefrontAPI.MetaobjectField, 'type' | 'key' | 'value'>
              >;
              heading?: StorefrontAPI.Maybe<
                Pick<StorefrontAPI.MetaobjectField, 'type' | 'key' | 'value'>
              >;
              description?: StorefrontAPI.Maybe<
                Pick<StorefrontAPI.MetaobjectField, 'type' | 'key' | 'value'>
              >;
              address?: StorefrontAPI.Maybe<
                Pick<StorefrontAPI.MetaobjectField, 'type' | 'key' | 'value'>
              >;
              hours?: StorefrontAPI.Maybe<
                Pick<StorefrontAPI.MetaobjectField, 'type' | 'key' | 'value'>
              >;
              image?: StorefrontAPI.Maybe<
                Pick<StorefrontAPI.MetaobjectField, 'type' | 'key'> & {
                  reference?: StorefrontAPI.Maybe<{
                    image?: StorefrontAPI.Maybe<
                      Pick<
                        StorefrontAPI.Image,
                        'altText' | 'url' | 'width' | 'height'
                      >
                    >;
                  }>;
                }
              >;
            }
          >;
        }>;
      }
    >;
  }>;
};

export type MoneyFragment = Pick<
  StorefrontAPI.MoneyV2,
  'currencyCode' | 'amount'
>;

export type CartLineFragment = Pick<
  StorefrontAPI.CartLine,
  'id' | 'quantity'
> & {
  attributes: Array<Pick<StorefrontAPI.Attribute, 'key' | 'value'>>;
  cost: {
    totalAmount: Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>;
    amountPerQuantity: Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>;
    compareAtAmountPerQuantity?: StorefrontAPI.Maybe<
      Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>
    >;
  };
  merchandise: Pick<
    StorefrontAPI.ProductVariant,
    'id' | 'availableForSale' | 'requiresShipping' | 'title'
  > & {
    compareAtPrice?: StorefrontAPI.Maybe<
      Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>
    >;
    price: Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>;
    image?: StorefrontAPI.Maybe<
      Pick<StorefrontAPI.Image, 'id' | 'url' | 'altText' | 'width' | 'height'>
    >;
    product: Pick<StorefrontAPI.Product, 'handle' | 'title' | 'id'>;
    selectedOptions: Array<
      Pick<StorefrontAPI.SelectedOption, 'name' | 'value'>
    >;
  };
};

export type CartApiQueryFragment = Pick<
  StorefrontAPI.Cart,
  'id' | 'checkoutUrl' | 'totalQuantity' | 'note'
> & {
  buyerIdentity: Pick<
    StorefrontAPI.CartBuyerIdentity,
    'countryCode' | 'email' | 'phone'
  > & {
    customer?: StorefrontAPI.Maybe<
      Pick<
        StorefrontAPI.Customer,
        'id' | 'email' | 'firstName' | 'lastName' | 'displayName'
      >
    >;
  };
  lines: {
    nodes: Array<
      Pick<StorefrontAPI.CartLine, 'id' | 'quantity'> & {
        attributes: Array<Pick<StorefrontAPI.Attribute, 'key' | 'value'>>;
        cost: {
          totalAmount: Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>;
          amountPerQuantity: Pick<
            StorefrontAPI.MoneyV2,
            'currencyCode' | 'amount'
          >;
          compareAtAmountPerQuantity?: StorefrontAPI.Maybe<
            Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>
          >;
        };
        merchandise: Pick<
          StorefrontAPI.ProductVariant,
          'id' | 'availableForSale' | 'requiresShipping' | 'title'
        > & {
          compareAtPrice?: StorefrontAPI.Maybe<
            Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>
          >;
          price: Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>;
          image?: StorefrontAPI.Maybe<
            Pick<
              StorefrontAPI.Image,
              'id' | 'url' | 'altText' | 'width' | 'height'
            >
          >;
          product: Pick<StorefrontAPI.Product, 'handle' | 'title' | 'id'>;
          selectedOptions: Array<
            Pick<StorefrontAPI.SelectedOption, 'name' | 'value'>
          >;
        };
      }
    >;
  };
  cost: {
    subtotalAmount: Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>;
    totalAmount: Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>;
    totalDutyAmount?: StorefrontAPI.Maybe<
      Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>
    >;
    totalTaxAmount?: StorefrontAPI.Maybe<
      Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>
    >;
  };
  attributes: Array<Pick<StorefrontAPI.Attribute, 'key' | 'value'>>;
  discountCodes: Array<
    Pick<StorefrontAPI.CartDiscountCode, 'code' | 'applicable'>
  >;
};

interface GeneratedQueryTypes {
  '#graphql\n  fragment Shop on Shop {\n    id\n    name\n    primaryDomain {\n      url\n    }\n    brand {\n      logo {\n        image {\n          url\n        }\n      }\n    }\n  }\n  query Header(\n    $country: CountryCode\n    $headerMenuHandle: String!\n    $language: LanguageCode\n  ) @inContext(language: $language, country: $country) {\n    shop {\n      ...Shop\n    }\n    menu(handle: $headerMenuHandle) {\n      ...Menu\n    }\n  }\n  #graphql\n  fragment MenuItem on MenuItem {\n    id\n    resourceId\n    tags\n    title\n    type\n    url\n  }\n  fragment ChildMenuItem on MenuItem {\n    ...MenuItem\n  }\n  fragment ParentMenuItem on MenuItem {\n    ...MenuItem\n    items {\n      ...ChildMenuItem\n    }\n  }\n  fragment Menu on Menu {\n    id\n    items {\n      ...ParentMenuItem\n    }\n  }\n\n': {
    return: HeaderQuery;
    variables: HeaderQueryVariables;
  };
  '#graphql\n  #graphql\n  fragment MoneyProductItem on MoneyV2 {\n    amount\n    currencyCode\n  }\n  fragment ProductItem on Product {\n    id\n    handle\n    title\n    featuredImage {\n      id\n      altText\n      url\n      width\n      height\n    }\n    priceRange {\n      minVariantPrice {\n        ...MoneyProductItem\n      }\n      maxVariantPrice {\n        ...MoneyProductItem\n      }\n    }\n    variants(first: 1) {\n      nodes {\n        selectedOptions {\n          name\n          value\n        }\n      }\n    }\n  }\n\n  query Collection(\n    $handle: String!\n    $country: CountryCode\n    $language: LanguageCode\n    $first: Int\n    $last: Int\n    $startCursor: String\n    $endCursor: String\n  ) @inContext(country: $country, language: $language) {\n    collection(handle: $handle) {\n      id\n      handle\n      title\n      description\n      products(\n        first: $first,\n        last: $last,\n        before: $startCursor,\n        after: $endCursor\n      ) {\n        nodes {\n          ...ProductItem\n        }\n        pageInfo {\n          hasPreviousPage\n          hasNextPage\n          endCursor\n          startCursor\n        }\n      }\n    }\n  }\n': {
    return: CollectionQuery;
    variables: CollectionQueryVariables;
  };
  '#graphql\n  fragment Collection on Collection {\n    id\n    title\n    handle\n    image {\n      id\n      url\n      altText\n      width\n      height\n    }\n  }\n  query StoreCollections(\n    $country: CountryCode\n    $endCursor: String\n    $first: Int\n    $language: LanguageCode\n    $last: Int\n    $startCursor: String\n  ) @inContext(country: $country, language: $language) {\n    collections(\n      first: $first,\n      last: $last,\n      before: $startCursor,\n      after: $endCursor\n    ) {\n      nodes {\n        ...Collection\n      }\n      pageInfo {\n        hasNextPage\n        hasPreviousPage\n        startCursor\n        endCursor\n      }\n    }\n  }\n': {
    return: StoreCollectionsQuery;
    variables: StoreCollectionsQueryVariables;
  };
  '#graphql\n  query Product(\n    $country: CountryCode\n    $handle: String!\n    $language: LanguageCode\n    $selectedOptions: [SelectedOptionInput!]!\n  ) @inContext(country: $country, language: $language) {\n    product(handle: $handle) {\n      ...Product\n    }\n  }\n  #graphql\n  fragment Product on Product {\n    id\n    title\n    vendor\n    handle\n    descriptionHtml\n    description\n    options {\n      name\n      values\n    }\n    selectedVariant: variantBySelectedOptions(selectedOptions: $selectedOptions) {\n      ...ProductVariant\n    }\n    variants(first: 1) {\n      nodes {\n        ...ProductVariant\n      }\n    }\n    seo {\n      description\n      title\n    }\n  }\n  #graphql\n  fragment ProductVariant on ProductVariant {\n    availableForSale\n    compareAtPrice {\n      amount\n      currencyCode\n    }\n    id\n    image {\n      __typename\n      id\n      url\n      altText\n      width\n      height\n    }\n    price {\n      amount\n      currencyCode\n    }\n    product {\n      title\n      handle\n    }\n    selectedOptions {\n      name\n      value\n    }\n    sku\n    title\n    unitPrice {\n      amount\n      currencyCode\n    }\n  }\n\n\n': {
    return: ProductQuery;
    variables: ProductQueryVariables;
  };
  '#graphql\n  #graphql\n  fragment ProductVariants on Product {\n    variants(first: 250) {\n      nodes {\n        ...ProductVariant\n      }\n    }\n  }\n  #graphql\n  fragment ProductVariant on ProductVariant {\n    availableForSale\n    compareAtPrice {\n      amount\n      currencyCode\n    }\n    id\n    image {\n      __typename\n      id\n      url\n      altText\n      width\n      height\n    }\n    price {\n      amount\n      currencyCode\n    }\n    product {\n      title\n      handle\n    }\n    selectedOptions {\n      name\n      value\n    }\n    sku\n    title\n    unitPrice {\n      amount\n      currencyCode\n    }\n  }\n\n\n  query ProductVariants(\n    $country: CountryCode\n    $language: LanguageCode\n    $handle: String!\n  ) @inContext(country: $country, language: $language) {\n    product(handle: $handle) {\n      ...ProductVariants\n    }\n  }\n': {
    return: ProductVariantsQuery;
    variables: ProductVariantsQueryVariables;
  };
  '#graphql\n  query RouteContent($handle: String!) {\n    route: metaobject(handle: {type: "route", handle: $handle}) {\n      type\n      id\n      title: field(key: "title") {\n        key\n        value\n      }\n      sections: field(key: "sections") {\n        ...Sections\n      }\n    }\n  }\n  #graphql\n  fragment Sections on MetaobjectField {\n    ... on MetaobjectField {\n      references(first: 10) {\n        nodes {\n          ... on Metaobject {\n            id\n            type\n            ...SectionHero\n            ...SectionFeaturedProducts\n            ...SectionFeaturedCollections\n            ...SectionStores\n            ...SectionStoreProfile\n          }\n        }\n      }\n    }\n  }\n  # All section fragments\n  #graphql\n  fragment SectionHero on Metaobject {\n    type\n    heading: field(key: "heading") {\n      key\n      value\n    }\n    subheading: field(key: "subheading") {\n      key\n      value\n    }\n    link: field(key: "link") {\n      ...Link\n    }\n    image: field(key: "image") {\n      key\n      reference {\n        ... on MediaImage {\n          ...MediaImage\n        }\n      }\n    }\n  }\n  #graphql\n  fragment Link on MetaobjectField {\n    ... on MetaobjectField {\n      reference {\n        ...on Metaobject {\n          href: field(key: "href") {\n            value\n          }\n          target: field(key: "target") {\n            value\n          }\n          text: field(key: "text") {\n            value\n          }\n        }\n      }\n    }\n  }\n\n  #graphql\n  fragment MediaImage on MediaImage {\n    image {\n      altText\n      url\n      width\n      height\n    }\n  }\n\n\n  #graphql\n  fragment SectionFeaturedProducts on Metaobject {\n    type\n    heading: field(key: "heading") {\n      key\n      value\n    }\n    body: field(key: "body") {\n      key\n      value\n    }\n    products: field(key: "products") {\n      key\n      references(first: 10) {\n        nodes {\n          ... on Product {\n            ...FeaturedProduct\n          }\n        }\n      }\n    }\n    withProductPrices: field(key: "with_product_prices") {\n      key\n      value\n    }\n  }\n  #graphql\n  fragment FeaturedProduct on Product {\n    id\n    title\n    handle\n    productType\n    variants(first: 1) {\n      nodes {\n        title\n        image {\n          altText\n          width\n          height\n          url\n        }\n      }\n    }\n    priceRange {\n      minVariantPrice {\n        amount\n        currencyCode\n      }\n    }\n  }\n\n\n  #graphql\n  fragment SectionFeaturedCollectionsField on MetaobjectField {\n    type\n    key\n    value\n  }\n  fragment SectionFeaturedCollections on Metaobject {\n    type\n    id\n    heading: field(key: "heading") {\n      ...SectionFeaturedCollectionsField\n    }\n    collections: field(key: "collections") {\n      references(first: 10) {\n        nodes {\n          ... on Collection {\n            ...FeaturedCollection\n          }\n        }\n      }\n    }\n    withCollectionTitles: field(key: "with_collection_titles") {\n     ...SectionFeaturedCollectionsField\n    }\n  }\n  #graphql\n  fragment FeaturedCollectionImage on Image {\n    altText\n    width\n    height\n    url\n  }\n\n  fragment FeaturedCollection on Collection {\n    id\n    title\n    handle\n    image {\n      ...FeaturedCollectionImage\n    }\n  }\n\n\n  #graphql\n  fragment SectionStores on Metaobject {\n    type\n    heading: field(key: "heading") {\n      ...StoreItemField\n    }\n    stores: field(key: "stores") {\n      references(first: 10) {\n        nodes {\n          ...StoreItem\n        }\n      }\n    }\n  }\n  #graphql\n  fragment StoreItemField on MetaobjectField {\n    type\n    key\n    value\n  }\n  fragment StoreItemImage on MediaImage {\n    image {\n      altText\n      url(transform: {maxWidth: 600, maxHeight: 600})\n      width\n      height\n    }\n  }\n\n  fragment StoreItem on Metaobject {\n    type\n    id\n    handle\n    heading: field(key: "heading") {\n      ...StoreItemField\n    }\n    address: field(key: "address") {\n      ...StoreItemField\n    }\n    image: field(key: "image") {\n      key\n      reference {\n        ... on MediaImage {\n          ...StoreItemImage\n        }\n      }\n    }\n}\n \n  #graphql\n  fragment SectionStoreProfile on Metaobject {\n    type\n    id\n    handle\n    store: field(key: "store") {\n       reference {\n          ...on Metaobject {\n            ...StoreProfile\n          }\n       }\n    }\n  }\n  #graphql\n  fragment StoreProfileField on MetaobjectField {\n    type\n    key\n    value\n  }\n\n  fragment StoreProfile on Metaobject {\n    type\n    id\n    handle\n    title: field(key: "title") {\n      ...StoreProfileField\n    }\n    heading: field(key: "heading") {\n      ...StoreProfileField\n    }\n    description: field(key: "description") {\n      ...StoreProfileField\n    }\n    address: field(key: "address") {\n      ...StoreProfileField\n    }\n    hours: field(key: "hours") {\n      ...StoreProfileField\n    }\n    image: field(key: "image") {\n      type\n      key\n      reference {\n        ... on MediaImage {\n          image {\n            altText\n            url\n            width\n            height\n          }\n        }\n      }\n    }\n  }\n\n\n\n': {
    return: RouteContentQuery;
    variables: RouteContentQueryVariables;
  };
}

interface GeneratedMutationTypes {}

declare module '@shopify/hydrogen' {
  interface StorefrontQueries extends GeneratedQueryTypes {}
  interface StorefrontMutations extends GeneratedMutationTypes {}
}
