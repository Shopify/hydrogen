/* eslint-disable eslint-comments/disable-enable-pair */
/* eslint-disable eslint-comments/no-unlimited-disable */
/* eslint-disable */
import type * as StorefrontAPI from '@shopify/hydrogen-temp/storefront-api-types';

export type CartFragment = Pick<
  StorefrontAPI.Cart,
  'id' | 'checkoutUrl' | 'totalQuantity'
> & {
  cost: {
    subtotalAmount: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
    totalAmount: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
    totalTaxAmount?: StorefrontAPI.Maybe<
      Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>
    >;
  };
  lines: {
    edges: Array<{
      node:
        | (Pick<StorefrontAPI.CartLine, 'id' | 'quantity'> & {
            cost: {
              totalAmount: Pick<
                StorefrontAPI.MoneyV2,
                'amount' | 'currencyCode'
              >;
            };
            merchandise: Pick<StorefrontAPI.ProductVariant, 'id' | 'title'> & {
              selectedOptions: Array<
                Pick<StorefrontAPI.SelectedOption, 'name' | 'value'>
              >;
              product: Pick<
                StorefrontAPI.Product,
                | 'id'
                | 'handle'
                | 'availableForSale'
                | 'title'
                | 'description'
                | 'descriptionHtml'
                | 'tags'
                | 'updatedAt'
              > & {
                options: Array<
                  Pick<StorefrontAPI.ProductOption, 'id' | 'name' | 'values'>
                >;
                priceRange: {
                  maxVariantPrice: Pick<
                    StorefrontAPI.MoneyV2,
                    'amount' | 'currencyCode'
                  >;
                  minVariantPrice: Pick<
                    StorefrontAPI.MoneyV2,
                    'amount' | 'currencyCode'
                  >;
                };
                variants: {
                  edges: Array<{
                    node: Pick<
                      StorefrontAPI.ProductVariant,
                      'id' | 'title' | 'availableForSale'
                    > & {
                      selectedOptions: Array<
                        Pick<StorefrontAPI.SelectedOption, 'name' | 'value'>
                      >;
                      price: Pick<
                        StorefrontAPI.MoneyV2,
                        'amount' | 'currencyCode'
                      >;
                    };
                  }>;
                };
                featuredImage?: StorefrontAPI.Maybe<
                  Pick<
                    StorefrontAPI.Image,
                    'url' | 'altText' | 'width' | 'height'
                  >
                >;
                images: {
                  edges: Array<{
                    node: Pick<
                      StorefrontAPI.Image,
                      'url' | 'altText' | 'width' | 'height'
                    >;
                  }>;
                };
                seo: Pick<StorefrontAPI.Seo, 'description' | 'title'>;
              };
            };
          })
        | (Pick<StorefrontAPI.ComponentizableCartLine, 'id' | 'quantity'> & {
            cost: {
              totalAmount: Pick<
                StorefrontAPI.MoneyV2,
                'amount' | 'currencyCode'
              >;
            };
            merchandise: Pick<StorefrontAPI.ProductVariant, 'id' | 'title'> & {
              selectedOptions: Array<
                Pick<StorefrontAPI.SelectedOption, 'name' | 'value'>
              >;
              product: Pick<
                StorefrontAPI.Product,
                | 'id'
                | 'handle'
                | 'availableForSale'
                | 'title'
                | 'description'
                | 'descriptionHtml'
                | 'tags'
                | 'updatedAt'
              > & {
                options: Array<
                  Pick<StorefrontAPI.ProductOption, 'id' | 'name' | 'values'>
                >;
                priceRange: {
                  maxVariantPrice: Pick<
                    StorefrontAPI.MoneyV2,
                    'amount' | 'currencyCode'
                  >;
                  minVariantPrice: Pick<
                    StorefrontAPI.MoneyV2,
                    'amount' | 'currencyCode'
                  >;
                };
                variants: {
                  edges: Array<{
                    node: Pick<
                      StorefrontAPI.ProductVariant,
                      'id' | 'title' | 'availableForSale'
                    > & {
                      selectedOptions: Array<
                        Pick<StorefrontAPI.SelectedOption, 'name' | 'value'>
                      >;
                      price: Pick<
                        StorefrontAPI.MoneyV2,
                        'amount' | 'currencyCode'
                      >;
                    };
                  }>;
                };
                featuredImage?: StorefrontAPI.Maybe<
                  Pick<
                    StorefrontAPI.Image,
                    'url' | 'altText' | 'width' | 'height'
                  >
                >;
                images: {
                  edges: Array<{
                    node: Pick<
                      StorefrontAPI.Image,
                      'url' | 'altText' | 'width' | 'height'
                    >;
                  }>;
                };
                seo: Pick<StorefrontAPI.Seo, 'description' | 'title'>;
              };
            };
          });
    }>;
  };
};

export type ImageFragment = Pick<
  StorefrontAPI.Image,
  'url' | 'altText' | 'width' | 'height'
>;

export type ProductFragment = Pick<
  StorefrontAPI.Product,
  | 'id'
  | 'handle'
  | 'availableForSale'
  | 'title'
  | 'description'
  | 'descriptionHtml'
  | 'tags'
  | 'updatedAt'
> & {
  options: Array<Pick<StorefrontAPI.ProductOption, 'id' | 'name' | 'values'>>;
  priceRange: {
    maxVariantPrice: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
    minVariantPrice: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
  };
  variants: {
    edges: Array<{
      node: Pick<
        StorefrontAPI.ProductVariant,
        'id' | 'title' | 'availableForSale'
      > & {
        selectedOptions: Array<
          Pick<StorefrontAPI.SelectedOption, 'name' | 'value'>
        >;
        price: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
      };
    }>;
  };
  featuredImage?: StorefrontAPI.Maybe<
    Pick<StorefrontAPI.Image, 'url' | 'altText' | 'width' | 'height'>
  >;
  images: {
    edges: Array<{
      node: Pick<StorefrontAPI.Image, 'url' | 'altText' | 'width' | 'height'>;
    }>;
  };
  seo: Pick<StorefrontAPI.Seo, 'description' | 'title'>;
};

export type SeoFragment = Pick<StorefrontAPI.Seo, 'description' | 'title'>;

export type AddToCartMutationVariables = StorefrontAPI.Exact<{
  cartId: StorefrontAPI.Scalars['ID']['input'];
  lines: Array<StorefrontAPI.CartLineInput> | StorefrontAPI.CartLineInput;
}>;

export type AddToCartMutation = {
  cartLinesAdd?: StorefrontAPI.Maybe<{
    cart?: StorefrontAPI.Maybe<
      Pick<StorefrontAPI.Cart, 'id' | 'checkoutUrl' | 'totalQuantity'> & {
        cost: {
          subtotalAmount: Pick<
            StorefrontAPI.MoneyV2,
            'amount' | 'currencyCode'
          >;
          totalAmount: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
          totalTaxAmount?: StorefrontAPI.Maybe<
            Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>
          >;
        };
        lines: {
          edges: Array<{
            node:
              | (Pick<StorefrontAPI.CartLine, 'id' | 'quantity'> & {
                  cost: {
                    totalAmount: Pick<
                      StorefrontAPI.MoneyV2,
                      'amount' | 'currencyCode'
                    >;
                  };
                  merchandise: Pick<
                    StorefrontAPI.ProductVariant,
                    'id' | 'title'
                  > & {
                    selectedOptions: Array<
                      Pick<StorefrontAPI.SelectedOption, 'name' | 'value'>
                    >;
                    product: Pick<
                      StorefrontAPI.Product,
                      | 'id'
                      | 'handle'
                      | 'availableForSale'
                      | 'title'
                      | 'description'
                      | 'descriptionHtml'
                      | 'tags'
                      | 'updatedAt'
                    > & {
                      options: Array<
                        Pick<
                          StorefrontAPI.ProductOption,
                          'id' | 'name' | 'values'
                        >
                      >;
                      priceRange: {
                        maxVariantPrice: Pick<
                          StorefrontAPI.MoneyV2,
                          'amount' | 'currencyCode'
                        >;
                        minVariantPrice: Pick<
                          StorefrontAPI.MoneyV2,
                          'amount' | 'currencyCode'
                        >;
                      };
                      variants: {
                        edges: Array<{
                          node: Pick<
                            StorefrontAPI.ProductVariant,
                            'id' | 'title' | 'availableForSale'
                          > & {
                            selectedOptions: Array<
                              Pick<
                                StorefrontAPI.SelectedOption,
                                'name' | 'value'
                              >
                            >;
                            price: Pick<
                              StorefrontAPI.MoneyV2,
                              'amount' | 'currencyCode'
                            >;
                          };
                        }>;
                      };
                      featuredImage?: StorefrontAPI.Maybe<
                        Pick<
                          StorefrontAPI.Image,
                          'url' | 'altText' | 'width' | 'height'
                        >
                      >;
                      images: {
                        edges: Array<{
                          node: Pick<
                            StorefrontAPI.Image,
                            'url' | 'altText' | 'width' | 'height'
                          >;
                        }>;
                      };
                      seo: Pick<StorefrontAPI.Seo, 'description' | 'title'>;
                    };
                  };
                })
              | (Pick<
                  StorefrontAPI.ComponentizableCartLine,
                  'id' | 'quantity'
                > & {
                  cost: {
                    totalAmount: Pick<
                      StorefrontAPI.MoneyV2,
                      'amount' | 'currencyCode'
                    >;
                  };
                  merchandise: Pick<
                    StorefrontAPI.ProductVariant,
                    'id' | 'title'
                  > & {
                    selectedOptions: Array<
                      Pick<StorefrontAPI.SelectedOption, 'name' | 'value'>
                    >;
                    product: Pick<
                      StorefrontAPI.Product,
                      | 'id'
                      | 'handle'
                      | 'availableForSale'
                      | 'title'
                      | 'description'
                      | 'descriptionHtml'
                      | 'tags'
                      | 'updatedAt'
                    > & {
                      options: Array<
                        Pick<
                          StorefrontAPI.ProductOption,
                          'id' | 'name' | 'values'
                        >
                      >;
                      priceRange: {
                        maxVariantPrice: Pick<
                          StorefrontAPI.MoneyV2,
                          'amount' | 'currencyCode'
                        >;
                        minVariantPrice: Pick<
                          StorefrontAPI.MoneyV2,
                          'amount' | 'currencyCode'
                        >;
                      };
                      variants: {
                        edges: Array<{
                          node: Pick<
                            StorefrontAPI.ProductVariant,
                            'id' | 'title' | 'availableForSale'
                          > & {
                            selectedOptions: Array<
                              Pick<
                                StorefrontAPI.SelectedOption,
                                'name' | 'value'
                              >
                            >;
                            price: Pick<
                              StorefrontAPI.MoneyV2,
                              'amount' | 'currencyCode'
                            >;
                          };
                        }>;
                      };
                      featuredImage?: StorefrontAPI.Maybe<
                        Pick<
                          StorefrontAPI.Image,
                          'url' | 'altText' | 'width' | 'height'
                        >
                      >;
                      images: {
                        edges: Array<{
                          node: Pick<
                            StorefrontAPI.Image,
                            'url' | 'altText' | 'width' | 'height'
                          >;
                        }>;
                      };
                      seo: Pick<StorefrontAPI.Seo, 'description' | 'title'>;
                    };
                  };
                });
          }>;
        };
      }
    >;
  }>;
};

export type CreateCartMutationVariables = StorefrontAPI.Exact<{
  lineItems?: StorefrontAPI.InputMaybe<
    Array<StorefrontAPI.CartLineInput> | StorefrontAPI.CartLineInput
  >;
}>;

export type CreateCartMutation = {
  cartCreate?: StorefrontAPI.Maybe<{
    cart?: StorefrontAPI.Maybe<
      Pick<StorefrontAPI.Cart, 'id' | 'checkoutUrl' | 'totalQuantity'> & {
        cost: {
          subtotalAmount: Pick<
            StorefrontAPI.MoneyV2,
            'amount' | 'currencyCode'
          >;
          totalAmount: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
          totalTaxAmount?: StorefrontAPI.Maybe<
            Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>
          >;
        };
        lines: {
          edges: Array<{
            node:
              | (Pick<StorefrontAPI.CartLine, 'id' | 'quantity'> & {
                  cost: {
                    totalAmount: Pick<
                      StorefrontAPI.MoneyV2,
                      'amount' | 'currencyCode'
                    >;
                  };
                  merchandise: Pick<
                    StorefrontAPI.ProductVariant,
                    'id' | 'title'
                  > & {
                    selectedOptions: Array<
                      Pick<StorefrontAPI.SelectedOption, 'name' | 'value'>
                    >;
                    product: Pick<
                      StorefrontAPI.Product,
                      | 'id'
                      | 'handle'
                      | 'availableForSale'
                      | 'title'
                      | 'description'
                      | 'descriptionHtml'
                      | 'tags'
                      | 'updatedAt'
                    > & {
                      options: Array<
                        Pick<
                          StorefrontAPI.ProductOption,
                          'id' | 'name' | 'values'
                        >
                      >;
                      priceRange: {
                        maxVariantPrice: Pick<
                          StorefrontAPI.MoneyV2,
                          'amount' | 'currencyCode'
                        >;
                        minVariantPrice: Pick<
                          StorefrontAPI.MoneyV2,
                          'amount' | 'currencyCode'
                        >;
                      };
                      variants: {
                        edges: Array<{
                          node: Pick<
                            StorefrontAPI.ProductVariant,
                            'id' | 'title' | 'availableForSale'
                          > & {
                            selectedOptions: Array<
                              Pick<
                                StorefrontAPI.SelectedOption,
                                'name' | 'value'
                              >
                            >;
                            price: Pick<
                              StorefrontAPI.MoneyV2,
                              'amount' | 'currencyCode'
                            >;
                          };
                        }>;
                      };
                      featuredImage?: StorefrontAPI.Maybe<
                        Pick<
                          StorefrontAPI.Image,
                          'url' | 'altText' | 'width' | 'height'
                        >
                      >;
                      images: {
                        edges: Array<{
                          node: Pick<
                            StorefrontAPI.Image,
                            'url' | 'altText' | 'width' | 'height'
                          >;
                        }>;
                      };
                      seo: Pick<StorefrontAPI.Seo, 'description' | 'title'>;
                    };
                  };
                })
              | (Pick<
                  StorefrontAPI.ComponentizableCartLine,
                  'id' | 'quantity'
                > & {
                  cost: {
                    totalAmount: Pick<
                      StorefrontAPI.MoneyV2,
                      'amount' | 'currencyCode'
                    >;
                  };
                  merchandise: Pick<
                    StorefrontAPI.ProductVariant,
                    'id' | 'title'
                  > & {
                    selectedOptions: Array<
                      Pick<StorefrontAPI.SelectedOption, 'name' | 'value'>
                    >;
                    product: Pick<
                      StorefrontAPI.Product,
                      | 'id'
                      | 'handle'
                      | 'availableForSale'
                      | 'title'
                      | 'description'
                      | 'descriptionHtml'
                      | 'tags'
                      | 'updatedAt'
                    > & {
                      options: Array<
                        Pick<
                          StorefrontAPI.ProductOption,
                          'id' | 'name' | 'values'
                        >
                      >;
                      priceRange: {
                        maxVariantPrice: Pick<
                          StorefrontAPI.MoneyV2,
                          'amount' | 'currencyCode'
                        >;
                        minVariantPrice: Pick<
                          StorefrontAPI.MoneyV2,
                          'amount' | 'currencyCode'
                        >;
                      };
                      variants: {
                        edges: Array<{
                          node: Pick<
                            StorefrontAPI.ProductVariant,
                            'id' | 'title' | 'availableForSale'
                          > & {
                            selectedOptions: Array<
                              Pick<
                                StorefrontAPI.SelectedOption,
                                'name' | 'value'
                              >
                            >;
                            price: Pick<
                              StorefrontAPI.MoneyV2,
                              'amount' | 'currencyCode'
                            >;
                          };
                        }>;
                      };
                      featuredImage?: StorefrontAPI.Maybe<
                        Pick<
                          StorefrontAPI.Image,
                          'url' | 'altText' | 'width' | 'height'
                        >
                      >;
                      images: {
                        edges: Array<{
                          node: Pick<
                            StorefrontAPI.Image,
                            'url' | 'altText' | 'width' | 'height'
                          >;
                        }>;
                      };
                      seo: Pick<StorefrontAPI.Seo, 'description' | 'title'>;
                    };
                  };
                });
          }>;
        };
      }
    >;
  }>;
};

export type EditCartItemsMutationVariables = StorefrontAPI.Exact<{
  cartId: StorefrontAPI.Scalars['ID']['input'];
  lines:
    | Array<StorefrontAPI.CartLineUpdateInput>
    | StorefrontAPI.CartLineUpdateInput;
}>;

export type EditCartItemsMutation = {
  cartLinesUpdate?: StorefrontAPI.Maybe<{
    cart?: StorefrontAPI.Maybe<
      Pick<StorefrontAPI.Cart, 'id' | 'checkoutUrl' | 'totalQuantity'> & {
        cost: {
          subtotalAmount: Pick<
            StorefrontAPI.MoneyV2,
            'amount' | 'currencyCode'
          >;
          totalAmount: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
          totalTaxAmount?: StorefrontAPI.Maybe<
            Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>
          >;
        };
        lines: {
          edges: Array<{
            node:
              | (Pick<StorefrontAPI.CartLine, 'id' | 'quantity'> & {
                  cost: {
                    totalAmount: Pick<
                      StorefrontAPI.MoneyV2,
                      'amount' | 'currencyCode'
                    >;
                  };
                  merchandise: Pick<
                    StorefrontAPI.ProductVariant,
                    'id' | 'title'
                  > & {
                    selectedOptions: Array<
                      Pick<StorefrontAPI.SelectedOption, 'name' | 'value'>
                    >;
                    product: Pick<
                      StorefrontAPI.Product,
                      | 'id'
                      | 'handle'
                      | 'availableForSale'
                      | 'title'
                      | 'description'
                      | 'descriptionHtml'
                      | 'tags'
                      | 'updatedAt'
                    > & {
                      options: Array<
                        Pick<
                          StorefrontAPI.ProductOption,
                          'id' | 'name' | 'values'
                        >
                      >;
                      priceRange: {
                        maxVariantPrice: Pick<
                          StorefrontAPI.MoneyV2,
                          'amount' | 'currencyCode'
                        >;
                        minVariantPrice: Pick<
                          StorefrontAPI.MoneyV2,
                          'amount' | 'currencyCode'
                        >;
                      };
                      variants: {
                        edges: Array<{
                          node: Pick<
                            StorefrontAPI.ProductVariant,
                            'id' | 'title' | 'availableForSale'
                          > & {
                            selectedOptions: Array<
                              Pick<
                                StorefrontAPI.SelectedOption,
                                'name' | 'value'
                              >
                            >;
                            price: Pick<
                              StorefrontAPI.MoneyV2,
                              'amount' | 'currencyCode'
                            >;
                          };
                        }>;
                      };
                      featuredImage?: StorefrontAPI.Maybe<
                        Pick<
                          StorefrontAPI.Image,
                          'url' | 'altText' | 'width' | 'height'
                        >
                      >;
                      images: {
                        edges: Array<{
                          node: Pick<
                            StorefrontAPI.Image,
                            'url' | 'altText' | 'width' | 'height'
                          >;
                        }>;
                      };
                      seo: Pick<StorefrontAPI.Seo, 'description' | 'title'>;
                    };
                  };
                })
              | (Pick<
                  StorefrontAPI.ComponentizableCartLine,
                  'id' | 'quantity'
                > & {
                  cost: {
                    totalAmount: Pick<
                      StorefrontAPI.MoneyV2,
                      'amount' | 'currencyCode'
                    >;
                  };
                  merchandise: Pick<
                    StorefrontAPI.ProductVariant,
                    'id' | 'title'
                  > & {
                    selectedOptions: Array<
                      Pick<StorefrontAPI.SelectedOption, 'name' | 'value'>
                    >;
                    product: Pick<
                      StorefrontAPI.Product,
                      | 'id'
                      | 'handle'
                      | 'availableForSale'
                      | 'title'
                      | 'description'
                      | 'descriptionHtml'
                      | 'tags'
                      | 'updatedAt'
                    > & {
                      options: Array<
                        Pick<
                          StorefrontAPI.ProductOption,
                          'id' | 'name' | 'values'
                        >
                      >;
                      priceRange: {
                        maxVariantPrice: Pick<
                          StorefrontAPI.MoneyV2,
                          'amount' | 'currencyCode'
                        >;
                        minVariantPrice: Pick<
                          StorefrontAPI.MoneyV2,
                          'amount' | 'currencyCode'
                        >;
                      };
                      variants: {
                        edges: Array<{
                          node: Pick<
                            StorefrontAPI.ProductVariant,
                            'id' | 'title' | 'availableForSale'
                          > & {
                            selectedOptions: Array<
                              Pick<
                                StorefrontAPI.SelectedOption,
                                'name' | 'value'
                              >
                            >;
                            price: Pick<
                              StorefrontAPI.MoneyV2,
                              'amount' | 'currencyCode'
                            >;
                          };
                        }>;
                      };
                      featuredImage?: StorefrontAPI.Maybe<
                        Pick<
                          StorefrontAPI.Image,
                          'url' | 'altText' | 'width' | 'height'
                        >
                      >;
                      images: {
                        edges: Array<{
                          node: Pick<
                            StorefrontAPI.Image,
                            'url' | 'altText' | 'width' | 'height'
                          >;
                        }>;
                      };
                      seo: Pick<StorefrontAPI.Seo, 'description' | 'title'>;
                    };
                  };
                });
          }>;
        };
      }
    >;
  }>;
};

export type RemoveFromCartMutationVariables = StorefrontAPI.Exact<{
  cartId: StorefrontAPI.Scalars['ID']['input'];
  lineIds:
    | Array<StorefrontAPI.Scalars['ID']['input']>
    | StorefrontAPI.Scalars['ID']['input'];
}>;

export type RemoveFromCartMutation = {
  cartLinesRemove?: StorefrontAPI.Maybe<{
    cart?: StorefrontAPI.Maybe<
      Pick<StorefrontAPI.Cart, 'id' | 'checkoutUrl' | 'totalQuantity'> & {
        cost: {
          subtotalAmount: Pick<
            StorefrontAPI.MoneyV2,
            'amount' | 'currencyCode'
          >;
          totalAmount: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
          totalTaxAmount?: StorefrontAPI.Maybe<
            Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>
          >;
        };
        lines: {
          edges: Array<{
            node:
              | (Pick<StorefrontAPI.CartLine, 'id' | 'quantity'> & {
                  cost: {
                    totalAmount: Pick<
                      StorefrontAPI.MoneyV2,
                      'amount' | 'currencyCode'
                    >;
                  };
                  merchandise: Pick<
                    StorefrontAPI.ProductVariant,
                    'id' | 'title'
                  > & {
                    selectedOptions: Array<
                      Pick<StorefrontAPI.SelectedOption, 'name' | 'value'>
                    >;
                    product: Pick<
                      StorefrontAPI.Product,
                      | 'id'
                      | 'handle'
                      | 'availableForSale'
                      | 'title'
                      | 'description'
                      | 'descriptionHtml'
                      | 'tags'
                      | 'updatedAt'
                    > & {
                      options: Array<
                        Pick<
                          StorefrontAPI.ProductOption,
                          'id' | 'name' | 'values'
                        >
                      >;
                      priceRange: {
                        maxVariantPrice: Pick<
                          StorefrontAPI.MoneyV2,
                          'amount' | 'currencyCode'
                        >;
                        minVariantPrice: Pick<
                          StorefrontAPI.MoneyV2,
                          'amount' | 'currencyCode'
                        >;
                      };
                      variants: {
                        edges: Array<{
                          node: Pick<
                            StorefrontAPI.ProductVariant,
                            'id' | 'title' | 'availableForSale'
                          > & {
                            selectedOptions: Array<
                              Pick<
                                StorefrontAPI.SelectedOption,
                                'name' | 'value'
                              >
                            >;
                            price: Pick<
                              StorefrontAPI.MoneyV2,
                              'amount' | 'currencyCode'
                            >;
                          };
                        }>;
                      };
                      featuredImage?: StorefrontAPI.Maybe<
                        Pick<
                          StorefrontAPI.Image,
                          'url' | 'altText' | 'width' | 'height'
                        >
                      >;
                      images: {
                        edges: Array<{
                          node: Pick<
                            StorefrontAPI.Image,
                            'url' | 'altText' | 'width' | 'height'
                          >;
                        }>;
                      };
                      seo: Pick<StorefrontAPI.Seo, 'description' | 'title'>;
                    };
                  };
                })
              | (Pick<
                  StorefrontAPI.ComponentizableCartLine,
                  'id' | 'quantity'
                > & {
                  cost: {
                    totalAmount: Pick<
                      StorefrontAPI.MoneyV2,
                      'amount' | 'currencyCode'
                    >;
                  };
                  merchandise: Pick<
                    StorefrontAPI.ProductVariant,
                    'id' | 'title'
                  > & {
                    selectedOptions: Array<
                      Pick<StorefrontAPI.SelectedOption, 'name' | 'value'>
                    >;
                    product: Pick<
                      StorefrontAPI.Product,
                      | 'id'
                      | 'handle'
                      | 'availableForSale'
                      | 'title'
                      | 'description'
                      | 'descriptionHtml'
                      | 'tags'
                      | 'updatedAt'
                    > & {
                      options: Array<
                        Pick<
                          StorefrontAPI.ProductOption,
                          'id' | 'name' | 'values'
                        >
                      >;
                      priceRange: {
                        maxVariantPrice: Pick<
                          StorefrontAPI.MoneyV2,
                          'amount' | 'currencyCode'
                        >;
                        minVariantPrice: Pick<
                          StorefrontAPI.MoneyV2,
                          'amount' | 'currencyCode'
                        >;
                      };
                      variants: {
                        edges: Array<{
                          node: Pick<
                            StorefrontAPI.ProductVariant,
                            'id' | 'title' | 'availableForSale'
                          > & {
                            selectedOptions: Array<
                              Pick<
                                StorefrontAPI.SelectedOption,
                                'name' | 'value'
                              >
                            >;
                            price: Pick<
                              StorefrontAPI.MoneyV2,
                              'amount' | 'currencyCode'
                            >;
                          };
                        }>;
                      };
                      featuredImage?: StorefrontAPI.Maybe<
                        Pick<
                          StorefrontAPI.Image,
                          'url' | 'altText' | 'width' | 'height'
                        >
                      >;
                      images: {
                        edges: Array<{
                          node: Pick<
                            StorefrontAPI.Image,
                            'url' | 'altText' | 'width' | 'height'
                          >;
                        }>;
                      };
                      seo: Pick<StorefrontAPI.Seo, 'description' | 'title'>;
                    };
                  };
                });
          }>;
        };
      }
    >;
  }>;
};

export type GetCartQueryVariables = StorefrontAPI.Exact<{
  cartId: StorefrontAPI.Scalars['ID']['input'];
}>;

export type GetCartQuery = {
  cart?: StorefrontAPI.Maybe<
    Pick<StorefrontAPI.Cart, 'id' | 'checkoutUrl' | 'totalQuantity'> & {
      cost: {
        subtotalAmount: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
        totalAmount: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
        totalTaxAmount?: StorefrontAPI.Maybe<
          Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>
        >;
      };
      lines: {
        edges: Array<{
          node:
            | (Pick<StorefrontAPI.CartLine, 'id' | 'quantity'> & {
                cost: {
                  totalAmount: Pick<
                    StorefrontAPI.MoneyV2,
                    'amount' | 'currencyCode'
                  >;
                };
                merchandise: Pick<
                  StorefrontAPI.ProductVariant,
                  'id' | 'title'
                > & {
                  selectedOptions: Array<
                    Pick<StorefrontAPI.SelectedOption, 'name' | 'value'>
                  >;
                  product: Pick<
                    StorefrontAPI.Product,
                    | 'id'
                    | 'handle'
                    | 'availableForSale'
                    | 'title'
                    | 'description'
                    | 'descriptionHtml'
                    | 'tags'
                    | 'updatedAt'
                  > & {
                    options: Array<
                      Pick<
                        StorefrontAPI.ProductOption,
                        'id' | 'name' | 'values'
                      >
                    >;
                    priceRange: {
                      maxVariantPrice: Pick<
                        StorefrontAPI.MoneyV2,
                        'amount' | 'currencyCode'
                      >;
                      minVariantPrice: Pick<
                        StorefrontAPI.MoneyV2,
                        'amount' | 'currencyCode'
                      >;
                    };
                    variants: {
                      edges: Array<{
                        node: Pick<
                          StorefrontAPI.ProductVariant,
                          'id' | 'title' | 'availableForSale'
                        > & {
                          selectedOptions: Array<
                            Pick<StorefrontAPI.SelectedOption, 'name' | 'value'>
                          >;
                          price: Pick<
                            StorefrontAPI.MoneyV2,
                            'amount' | 'currencyCode'
                          >;
                        };
                      }>;
                    };
                    featuredImage?: StorefrontAPI.Maybe<
                      Pick<
                        StorefrontAPI.Image,
                        'url' | 'altText' | 'width' | 'height'
                      >
                    >;
                    images: {
                      edges: Array<{
                        node: Pick<
                          StorefrontAPI.Image,
                          'url' | 'altText' | 'width' | 'height'
                        >;
                      }>;
                    };
                    seo: Pick<StorefrontAPI.Seo, 'description' | 'title'>;
                  };
                };
              })
            | (Pick<
                StorefrontAPI.ComponentizableCartLine,
                'id' | 'quantity'
              > & {
                cost: {
                  totalAmount: Pick<
                    StorefrontAPI.MoneyV2,
                    'amount' | 'currencyCode'
                  >;
                };
                merchandise: Pick<
                  StorefrontAPI.ProductVariant,
                  'id' | 'title'
                > & {
                  selectedOptions: Array<
                    Pick<StorefrontAPI.SelectedOption, 'name' | 'value'>
                  >;
                  product: Pick<
                    StorefrontAPI.Product,
                    | 'id'
                    | 'handle'
                    | 'availableForSale'
                    | 'title'
                    | 'description'
                    | 'descriptionHtml'
                    | 'tags'
                    | 'updatedAt'
                  > & {
                    options: Array<
                      Pick<
                        StorefrontAPI.ProductOption,
                        'id' | 'name' | 'values'
                      >
                    >;
                    priceRange: {
                      maxVariantPrice: Pick<
                        StorefrontAPI.MoneyV2,
                        'amount' | 'currencyCode'
                      >;
                      minVariantPrice: Pick<
                        StorefrontAPI.MoneyV2,
                        'amount' | 'currencyCode'
                      >;
                    };
                    variants: {
                      edges: Array<{
                        node: Pick<
                          StorefrontAPI.ProductVariant,
                          'id' | 'title' | 'availableForSale'
                        > & {
                          selectedOptions: Array<
                            Pick<StorefrontAPI.SelectedOption, 'name' | 'value'>
                          >;
                          price: Pick<
                            StorefrontAPI.MoneyV2,
                            'amount' | 'currencyCode'
                          >;
                        };
                      }>;
                    };
                    featuredImage?: StorefrontAPI.Maybe<
                      Pick<
                        StorefrontAPI.Image,
                        'url' | 'altText' | 'width' | 'height'
                      >
                    >;
                    images: {
                      edges: Array<{
                        node: Pick<
                          StorefrontAPI.Image,
                          'url' | 'altText' | 'width' | 'height'
                        >;
                      }>;
                    };
                    seo: Pick<StorefrontAPI.Seo, 'description' | 'title'>;
                  };
                };
              });
        }>;
      };
    }
  >;
};

export type CollectionFragment = Pick<
  StorefrontAPI.Collection,
  'handle' | 'title' | 'description' | 'updatedAt'
> & {
  seo: {__typename: 'SEO'} & Pick<StorefrontAPI.Seo, 'description' | 'title'>;
};

export type GetCollectionQueryVariables = StorefrontAPI.Exact<{
  handle: StorefrontAPI.Scalars['String']['input'];
}>;

export type GetCollectionQuery = {
  collection?: StorefrontAPI.Maybe<
    Pick<
      StorefrontAPI.Collection,
      'handle' | 'title' | 'description' | 'updatedAt'
    > & {
      seo: {__typename: 'SEO'} & Pick<
        StorefrontAPI.Seo,
        'description' | 'title'
      >;
    }
  >;
};

export type GetCollectionsQueryVariables = StorefrontAPI.Exact<{
  [key: string]: never;
}>;

export type GetCollectionsQuery = {
  collections: {
    edges: Array<{
      node: Pick<
        StorefrontAPI.Collection,
        'handle' | 'title' | 'description' | 'updatedAt'
      > & {
        seo: {__typename: 'SEO'} & Pick<
          StorefrontAPI.Seo,
          'description' | 'title'
        >;
      };
    }>;
  };
};

export type GetCollectionProductsQueryVariables = StorefrontAPI.Exact<{
  handle: StorefrontAPI.Scalars['String']['input'];
  sortKey?: StorefrontAPI.InputMaybe<StorefrontAPI.ProductCollectionSortKeys>;
  reverse?: StorefrontAPI.InputMaybe<StorefrontAPI.Scalars['Boolean']['input']>;
}>;

export type GetCollectionProductsQuery = {
  collection?: StorefrontAPI.Maybe<{
    products: {
      edges: Array<{
        node: Pick<
          StorefrontAPI.Product,
          | 'id'
          | 'handle'
          | 'availableForSale'
          | 'title'
          | 'description'
          | 'descriptionHtml'
          | 'tags'
          | 'updatedAt'
        > & {
          options: Array<
            Pick<StorefrontAPI.ProductOption, 'id' | 'name' | 'values'>
          >;
          priceRange: {
            maxVariantPrice: Pick<
              StorefrontAPI.MoneyV2,
              'amount' | 'currencyCode'
            >;
            minVariantPrice: Pick<
              StorefrontAPI.MoneyV2,
              'amount' | 'currencyCode'
            >;
          };
          variants: {
            edges: Array<{
              node: Pick<
                StorefrontAPI.ProductVariant,
                'id' | 'title' | 'availableForSale'
              > & {
                selectedOptions: Array<
                  Pick<StorefrontAPI.SelectedOption, 'name' | 'value'>
                >;
                price: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
              };
            }>;
          };
          featuredImage?: StorefrontAPI.Maybe<
            Pick<StorefrontAPI.Image, 'url' | 'altText' | 'width' | 'height'>
          >;
          images: {
            edges: Array<{
              node: Pick<
                StorefrontAPI.Image,
                'url' | 'altText' | 'width' | 'height'
              >;
            }>;
          };
          seo: Pick<StorefrontAPI.Seo, 'description' | 'title'>;
        };
      }>;
    };
  }>;
};

export type GetMenuQueryVariables = StorefrontAPI.Exact<{
  handle: StorefrontAPI.Scalars['String']['input'];
}>;

export type GetMenuQuery = {
  menu?: StorefrontAPI.Maybe<{
    items: Array<Pick<StorefrontAPI.MenuItem, 'title' | 'url'>>;
  }>;
};

export type PageFragment = Pick<
  StorefrontAPI.Page,
  'id' | 'title' | 'handle' | 'body' | 'bodySummary' | 'createdAt' | 'updatedAt'
> & {
  seo?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Seo, 'description' | 'title'>>;
};

export type GetPageQueryVariables = StorefrontAPI.Exact<{
  handle: StorefrontAPI.Scalars['String']['input'];
}>;

export type GetPageQuery = {
  pageByHandle?: StorefrontAPI.Maybe<
    Pick<
      StorefrontAPI.Page,
      | 'id'
      | 'title'
      | 'handle'
      | 'body'
      | 'bodySummary'
      | 'createdAt'
      | 'updatedAt'
    > & {
      seo?: StorefrontAPI.Maybe<
        Pick<StorefrontAPI.Seo, 'description' | 'title'>
      >;
    }
  >;
};

export type GetPagesQueryVariables = StorefrontAPI.Exact<{
  [key: string]: never;
}>;

export type GetPagesQuery = {
  pages: {
    edges: Array<{
      node: Pick<
        StorefrontAPI.Page,
        | 'id'
        | 'title'
        | 'handle'
        | 'body'
        | 'bodySummary'
        | 'createdAt'
        | 'updatedAt'
      > & {
        seo?: StorefrontAPI.Maybe<
          Pick<StorefrontAPI.Seo, 'description' | 'title'>
        >;
      };
    }>;
  };
};

export type GetProductQueryVariables = StorefrontAPI.Exact<{
  handle: StorefrontAPI.Scalars['String']['input'];
}>;

export type GetProductQuery = {
  product?: StorefrontAPI.Maybe<
    Pick<
      StorefrontAPI.Product,
      | 'id'
      | 'handle'
      | 'availableForSale'
      | 'title'
      | 'description'
      | 'descriptionHtml'
      | 'tags'
      | 'updatedAt'
    > & {
      options: Array<
        Pick<StorefrontAPI.ProductOption, 'id' | 'name' | 'values'>
      >;
      priceRange: {
        maxVariantPrice: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
        minVariantPrice: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
      };
      variants: {
        edges: Array<{
          node: Pick<
            StorefrontAPI.ProductVariant,
            'id' | 'title' | 'availableForSale'
          > & {
            selectedOptions: Array<
              Pick<StorefrontAPI.SelectedOption, 'name' | 'value'>
            >;
            price: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
          };
        }>;
      };
      featuredImage?: StorefrontAPI.Maybe<
        Pick<StorefrontAPI.Image, 'url' | 'altText' | 'width' | 'height'>
      >;
      images: {
        edges: Array<{
          node: Pick<
            StorefrontAPI.Image,
            'url' | 'altText' | 'width' | 'height'
          >;
        }>;
      };
      seo: Pick<StorefrontAPI.Seo, 'description' | 'title'>;
    }
  >;
};

export type GetProductsQueryVariables = StorefrontAPI.Exact<{
  sortKey?: StorefrontAPI.InputMaybe<StorefrontAPI.ProductSortKeys>;
  reverse?: StorefrontAPI.InputMaybe<StorefrontAPI.Scalars['Boolean']['input']>;
  query?: StorefrontAPI.InputMaybe<StorefrontAPI.Scalars['String']['input']>;
}>;

export type GetProductsQuery = {
  products: {
    edges: Array<{
      node: Pick<
        StorefrontAPI.Product,
        | 'id'
        | 'handle'
        | 'availableForSale'
        | 'title'
        | 'description'
        | 'descriptionHtml'
        | 'tags'
        | 'updatedAt'
      > & {
        options: Array<
          Pick<StorefrontAPI.ProductOption, 'id' | 'name' | 'values'>
        >;
        priceRange: {
          maxVariantPrice: Pick<
            StorefrontAPI.MoneyV2,
            'amount' | 'currencyCode'
          >;
          minVariantPrice: Pick<
            StorefrontAPI.MoneyV2,
            'amount' | 'currencyCode'
          >;
        };
        variants: {
          edges: Array<{
            node: Pick<
              StorefrontAPI.ProductVariant,
              'id' | 'title' | 'availableForSale'
            > & {
              selectedOptions: Array<
                Pick<StorefrontAPI.SelectedOption, 'name' | 'value'>
              >;
              price: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
            };
          }>;
        };
        featuredImage?: StorefrontAPI.Maybe<
          Pick<StorefrontAPI.Image, 'url' | 'altText' | 'width' | 'height'>
        >;
        images: {
          edges: Array<{
            node: Pick<
              StorefrontAPI.Image,
              'url' | 'altText' | 'width' | 'height'
            >;
          }>;
        };
        seo: Pick<StorefrontAPI.Seo, 'description' | 'title'>;
      };
    }>;
  };
};

export type GetProductRecommendationsQueryVariables = StorefrontAPI.Exact<{
  productId: StorefrontAPI.Scalars['ID']['input'];
}>;

export type GetProductRecommendationsQuery = {
  productRecommendations?: StorefrontAPI.Maybe<
    Array<
      Pick<
        StorefrontAPI.Product,
        | 'id'
        | 'handle'
        | 'availableForSale'
        | 'title'
        | 'description'
        | 'descriptionHtml'
        | 'tags'
        | 'updatedAt'
      > & {
        options: Array<
          Pick<StorefrontAPI.ProductOption, 'id' | 'name' | 'values'>
        >;
        priceRange: {
          maxVariantPrice: Pick<
            StorefrontAPI.MoneyV2,
            'amount' | 'currencyCode'
          >;
          minVariantPrice: Pick<
            StorefrontAPI.MoneyV2,
            'amount' | 'currencyCode'
          >;
        };
        variants: {
          edges: Array<{
            node: Pick<
              StorefrontAPI.ProductVariant,
              'id' | 'title' | 'availableForSale'
            > & {
              selectedOptions: Array<
                Pick<StorefrontAPI.SelectedOption, 'name' | 'value'>
              >;
              price: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
            };
          }>;
        };
        featuredImage?: StorefrontAPI.Maybe<
          Pick<StorefrontAPI.Image, 'url' | 'altText' | 'width' | 'height'>
        >;
        images: {
          edges: Array<{
            node: Pick<
              StorefrontAPI.Image,
              'url' | 'altText' | 'width' | 'height'
            >;
          }>;
        };
        seo: Pick<StorefrontAPI.Seo, 'description' | 'title'>;
      }
    >
  >;
};

interface GeneratedQueryTypes {
  '#graphql\n  query getCart($cartId: ID!) {\n    cart(id: $cartId) {\n      ...cart\n    }\n  }\n  #graphql\n  fragment cart on Cart {\n    id\n    checkoutUrl\n    cost {\n      subtotalAmount {\n        amount\n        currencyCode\n      }\n      totalAmount {\n        amount\n        currencyCode\n      }\n      totalTaxAmount {\n        amount\n        currencyCode\n      }\n    }\n    lines(first: 100) {\n      edges {\n        node {\n          id\n          quantity\n          cost {\n            totalAmount {\n              amount\n              currencyCode\n            }\n          }\n          merchandise {\n            ... on ProductVariant {\n              id\n              title\n              selectedOptions {\n                name\n                value\n              }\n              product {\n                ...product\n              }\n            }\n          }\n        }\n      }\n    }\n    totalQuantity\n  }\n  #graphql\n  fragment product on Product {\n    id\n    handle\n    availableForSale\n    title\n    description\n    descriptionHtml\n    options {\n      id\n      name\n      values\n    }\n    priceRange {\n      maxVariantPrice {\n        amount\n        currencyCode\n      }\n      minVariantPrice {\n        amount\n        currencyCode\n      }\n    }\n    variants(first: 250) {\n      edges {\n        node {\n          id\n          title\n          availableForSale\n          selectedOptions {\n            name\n            value\n          }\n          price {\n            amount\n            currencyCode\n          }\n        }\n      }\n    }\n    featuredImage {\n      ...image\n    }\n    images(first: 20) {\n      edges {\n        node {\n          ...image\n        }\n      }\n    }\n    seo {\n      ...seo\n    }\n    tags\n    updatedAt\n  }\n  #graphql\n  fragment image on Image {\n    url\n    altText\n    width\n    height\n  }\n\n  #graphql\n  fragment seo on SEO {\n    description\n    title\n  }\n\n\n\n': {
    return: GetCartQuery;
    variables: GetCartQueryVariables;
  };
  '#graphql\n  query getCollection($handle: String!) {\n    collection(handle: $handle) {\n      ...collection\n    }\n  }\n  #graphql\n  fragment collection on Collection {\n    handle\n    title\n    description\n    seo {\n      __typename\n      description\n      title\n    }\n    updatedAt\n  }\n  #graphql\n  fragment seo on SEO {\n    description\n    title\n  }\n\n\n': {
    return: GetCollectionQuery;
    variables: GetCollectionQueryVariables;
  };
  '#graphql\n  query getCollections {\n    collections(first: 100, sortKey: TITLE) {\n      edges {\n        node {\n          ...collection\n        }\n      }\n    }\n  }\n  #graphql\n  fragment collection on Collection {\n    handle\n    title\n    description\n    seo {\n      __typename\n      description\n      title\n    }\n    updatedAt\n  }\n  #graphql\n  fragment seo on SEO {\n    description\n    title\n  }\n\n\n': {
    return: GetCollectionsQuery;
    variables: GetCollectionsQueryVariables;
  };
  '#graphql\n  query getCollectionProducts(\n    $handle: String!\n    $sortKey: ProductCollectionSortKeys\n    $reverse: Boolean\n  ) {\n    collection(handle: $handle) {\n      products(sortKey: $sortKey, reverse: $reverse, first: 100) {\n        edges {\n          node {\n            ...product\n          }\n        }\n      }\n    }\n  }\n  #graphql\n  fragment product on Product {\n    id\n    handle\n    availableForSale\n    title\n    description\n    descriptionHtml\n    options {\n      id\n      name\n      values\n    }\n    priceRange {\n      maxVariantPrice {\n        amount\n        currencyCode\n      }\n      minVariantPrice {\n        amount\n        currencyCode\n      }\n    }\n    variants(first: 250) {\n      edges {\n        node {\n          id\n          title\n          availableForSale\n          selectedOptions {\n            name\n            value\n          }\n          price {\n            amount\n            currencyCode\n          }\n        }\n      }\n    }\n    featuredImage {\n      ...image\n    }\n    images(first: 20) {\n      edges {\n        node {\n          ...image\n        }\n      }\n    }\n    seo {\n      ...seo\n    }\n    tags\n    updatedAt\n  }\n  #graphql\n  fragment image on Image {\n    url\n    altText\n    width\n    height\n  }\n\n  #graphql\n  fragment seo on SEO {\n    description\n    title\n  }\n\n\n': {
    return: GetCollectionProductsQuery;
    variables: GetCollectionProductsQueryVariables;
  };
  '#graphql\n  query getMenu($handle: String!) {\n    menu(handle: $handle) {\n      items {\n        title\n        url\n      }\n    }\n  }\n': {
    return: GetMenuQuery;
    variables: GetMenuQueryVariables;
  };
  '#graphql\n  query getPage($handle: String!) {\n    pageByHandle(handle: $handle) {\n      ...page\n    }\n  }\n  #graphql\n  fragment page on Page {\n    ... on Page {\n      id\n      title\n      handle\n      body\n      bodySummary\n      seo {\n        ...seo\n      }\n      createdAt\n      updatedAt\n    }\n  }\n  #graphql\n  fragment seo on SEO {\n    description\n    title\n  }\n\n\n': {
    return: GetPageQuery;
    variables: GetPageQueryVariables;
  };
  '#graphql\n  query getPages {\n    pages(first: 100) {\n      edges {\n        node {\n          ...page\n        }\n      }\n    }\n  }\n  #graphql\n  fragment page on Page {\n    ... on Page {\n      id\n      title\n      handle\n      body\n      bodySummary\n      seo {\n        ...seo\n      }\n      createdAt\n      updatedAt\n    }\n  }\n  #graphql\n  fragment seo on SEO {\n    description\n    title\n  }\n\n\n': {
    return: GetPagesQuery;
    variables: GetPagesQueryVariables;
  };
  '#graphql\n  query getProduct($handle: String!) {\n    product(handle: $handle) {\n      ...product\n    }\n  }\n  #graphql\n  fragment product on Product {\n    id\n    handle\n    availableForSale\n    title\n    description\n    descriptionHtml\n    options {\n      id\n      name\n      values\n    }\n    priceRange {\n      maxVariantPrice {\n        amount\n        currencyCode\n      }\n      minVariantPrice {\n        amount\n        currencyCode\n      }\n    }\n    variants(first: 250) {\n      edges {\n        node {\n          id\n          title\n          availableForSale\n          selectedOptions {\n            name\n            value\n          }\n          price {\n            amount\n            currencyCode\n          }\n        }\n      }\n    }\n    featuredImage {\n      ...image\n    }\n    images(first: 20) {\n      edges {\n        node {\n          ...image\n        }\n      }\n    }\n    seo {\n      ...seo\n    }\n    tags\n    updatedAt\n  }\n  #graphql\n  fragment image on Image {\n    url\n    altText\n    width\n    height\n  }\n\n  #graphql\n  fragment seo on SEO {\n    description\n    title\n  }\n\n\n': {
    return: GetProductQuery;
    variables: GetProductQueryVariables;
  };
  '#graphql\n  query getProducts(\n    $sortKey: ProductSortKeys\n    $reverse: Boolean\n    $query: String\n  ) {\n    products(sortKey: $sortKey, reverse: $reverse, query: $query, first: 100) {\n      edges {\n        node {\n          ...product\n        }\n      }\n    }\n  }\n  #graphql\n  fragment product on Product {\n    id\n    handle\n    availableForSale\n    title\n    description\n    descriptionHtml\n    options {\n      id\n      name\n      values\n    }\n    priceRange {\n      maxVariantPrice {\n        amount\n        currencyCode\n      }\n      minVariantPrice {\n        amount\n        currencyCode\n      }\n    }\n    variants(first: 250) {\n      edges {\n        node {\n          id\n          title\n          availableForSale\n          selectedOptions {\n            name\n            value\n          }\n          price {\n            amount\n            currencyCode\n          }\n        }\n      }\n    }\n    featuredImage {\n      ...image\n    }\n    images(first: 20) {\n      edges {\n        node {\n          ...image\n        }\n      }\n    }\n    seo {\n      ...seo\n    }\n    tags\n    updatedAt\n  }\n  #graphql\n  fragment image on Image {\n    url\n    altText\n    width\n    height\n  }\n\n  #graphql\n  fragment seo on SEO {\n    description\n    title\n  }\n\n\n': {
    return: GetProductsQuery;
    variables: GetProductsQueryVariables;
  };
  '#graphql\n  query getProductRecommendations($productId: ID!) {\n    productRecommendations(productId: $productId) {\n      ...product\n    }\n  }\n  #graphql\n  fragment product on Product {\n    id\n    handle\n    availableForSale\n    title\n    description\n    descriptionHtml\n    options {\n      id\n      name\n      values\n    }\n    priceRange {\n      maxVariantPrice {\n        amount\n        currencyCode\n      }\n      minVariantPrice {\n        amount\n        currencyCode\n      }\n    }\n    variants(first: 250) {\n      edges {\n        node {\n          id\n          title\n          availableForSale\n          selectedOptions {\n            name\n            value\n          }\n          price {\n            amount\n            currencyCode\n          }\n        }\n      }\n    }\n    featuredImage {\n      ...image\n    }\n    images(first: 20) {\n      edges {\n        node {\n          ...image\n        }\n      }\n    }\n    seo {\n      ...seo\n    }\n    tags\n    updatedAt\n  }\n  #graphql\n  fragment image on Image {\n    url\n    altText\n    width\n    height\n  }\n\n  #graphql\n  fragment seo on SEO {\n    description\n    title\n  }\n\n\n': {
    return: GetProductRecommendationsQuery;
    variables: GetProductRecommendationsQueryVariables;
  };
}

interface GeneratedMutationTypes {
  '#graphql\n  mutation addToCart($cartId: ID!, $lines: [CartLineInput!]!) {\n    cartLinesAdd(cartId: $cartId, lines: $lines) {\n      cart {\n        ...cart\n      }\n    }\n  }\n  #graphql\n  fragment cart on Cart {\n    id\n    checkoutUrl\n    cost {\n      subtotalAmount {\n        amount\n        currencyCode\n      }\n      totalAmount {\n        amount\n        currencyCode\n      }\n      totalTaxAmount {\n        amount\n        currencyCode\n      }\n    }\n    lines(first: 100) {\n      edges {\n        node {\n          id\n          quantity\n          cost {\n            totalAmount {\n              amount\n              currencyCode\n            }\n          }\n          merchandise {\n            ... on ProductVariant {\n              id\n              title\n              selectedOptions {\n                name\n                value\n              }\n              product {\n                ...product\n              }\n            }\n          }\n        }\n      }\n    }\n    totalQuantity\n  }\n  #graphql\n  fragment product on Product {\n    id\n    handle\n    availableForSale\n    title\n    description\n    descriptionHtml\n    options {\n      id\n      name\n      values\n    }\n    priceRange {\n      maxVariantPrice {\n        amount\n        currencyCode\n      }\n      minVariantPrice {\n        amount\n        currencyCode\n      }\n    }\n    variants(first: 250) {\n      edges {\n        node {\n          id\n          title\n          availableForSale\n          selectedOptions {\n            name\n            value\n          }\n          price {\n            amount\n            currencyCode\n          }\n        }\n      }\n    }\n    featuredImage {\n      ...image\n    }\n    images(first: 20) {\n      edges {\n        node {\n          ...image\n        }\n      }\n    }\n    seo {\n      ...seo\n    }\n    tags\n    updatedAt\n  }\n  #graphql\n  fragment image on Image {\n    url\n    altText\n    width\n    height\n  }\n\n  #graphql\n  fragment seo on SEO {\n    description\n    title\n  }\n\n\n\n': {
    return: AddToCartMutation;
    variables: AddToCartMutationVariables;
  };
  '#graphql\n  mutation createCart($lineItems: [CartLineInput!]) {\n    cartCreate(input: { lines: $lineItems }) {\n      cart {\n        ...cart\n      }\n    }\n  }\n  #graphql\n  fragment cart on Cart {\n    id\n    checkoutUrl\n    cost {\n      subtotalAmount {\n        amount\n        currencyCode\n      }\n      totalAmount {\n        amount\n        currencyCode\n      }\n      totalTaxAmount {\n        amount\n        currencyCode\n      }\n    }\n    lines(first: 100) {\n      edges {\n        node {\n          id\n          quantity\n          cost {\n            totalAmount {\n              amount\n              currencyCode\n            }\n          }\n          merchandise {\n            ... on ProductVariant {\n              id\n              title\n              selectedOptions {\n                name\n                value\n              }\n              product {\n                ...product\n              }\n            }\n          }\n        }\n      }\n    }\n    totalQuantity\n  }\n  #graphql\n  fragment product on Product {\n    id\n    handle\n    availableForSale\n    title\n    description\n    descriptionHtml\n    options {\n      id\n      name\n      values\n    }\n    priceRange {\n      maxVariantPrice {\n        amount\n        currencyCode\n      }\n      minVariantPrice {\n        amount\n        currencyCode\n      }\n    }\n    variants(first: 250) {\n      edges {\n        node {\n          id\n          title\n          availableForSale\n          selectedOptions {\n            name\n            value\n          }\n          price {\n            amount\n            currencyCode\n          }\n        }\n      }\n    }\n    featuredImage {\n      ...image\n    }\n    images(first: 20) {\n      edges {\n        node {\n          ...image\n        }\n      }\n    }\n    seo {\n      ...seo\n    }\n    tags\n    updatedAt\n  }\n  #graphql\n  fragment image on Image {\n    url\n    altText\n    width\n    height\n  }\n\n  #graphql\n  fragment seo on SEO {\n    description\n    title\n  }\n\n\n\n': {
    return: CreateCartMutation;
    variables: CreateCartMutationVariables;
  };
  '#graphql\n  mutation editCartItems($cartId: ID!, $lines: [CartLineUpdateInput!]!) {\n    cartLinesUpdate(cartId: $cartId, lines: $lines) {\n      cart {\n        ...cart\n      }\n    }\n  }\n  #graphql\n  fragment cart on Cart {\n    id\n    checkoutUrl\n    cost {\n      subtotalAmount {\n        amount\n        currencyCode\n      }\n      totalAmount {\n        amount\n        currencyCode\n      }\n      totalTaxAmount {\n        amount\n        currencyCode\n      }\n    }\n    lines(first: 100) {\n      edges {\n        node {\n          id\n          quantity\n          cost {\n            totalAmount {\n              amount\n              currencyCode\n            }\n          }\n          merchandise {\n            ... on ProductVariant {\n              id\n              title\n              selectedOptions {\n                name\n                value\n              }\n              product {\n                ...product\n              }\n            }\n          }\n        }\n      }\n    }\n    totalQuantity\n  }\n  #graphql\n  fragment product on Product {\n    id\n    handle\n    availableForSale\n    title\n    description\n    descriptionHtml\n    options {\n      id\n      name\n      values\n    }\n    priceRange {\n      maxVariantPrice {\n        amount\n        currencyCode\n      }\n      minVariantPrice {\n        amount\n        currencyCode\n      }\n    }\n    variants(first: 250) {\n      edges {\n        node {\n          id\n          title\n          availableForSale\n          selectedOptions {\n            name\n            value\n          }\n          price {\n            amount\n            currencyCode\n          }\n        }\n      }\n    }\n    featuredImage {\n      ...image\n    }\n    images(first: 20) {\n      edges {\n        node {\n          ...image\n        }\n      }\n    }\n    seo {\n      ...seo\n    }\n    tags\n    updatedAt\n  }\n  #graphql\n  fragment image on Image {\n    url\n    altText\n    width\n    height\n  }\n\n  #graphql\n  fragment seo on SEO {\n    description\n    title\n  }\n\n\n\n': {
    return: EditCartItemsMutation;
    variables: EditCartItemsMutationVariables;
  };
  '#graphql\n  mutation removeFromCart($cartId: ID!, $lineIds: [ID!]!) {\n    cartLinesRemove(cartId: $cartId, lineIds: $lineIds) {\n      cart {\n        ...cart\n      }\n    }\n  }\n  #graphql\n  fragment cart on Cart {\n    id\n    checkoutUrl\n    cost {\n      subtotalAmount {\n        amount\n        currencyCode\n      }\n      totalAmount {\n        amount\n        currencyCode\n      }\n      totalTaxAmount {\n        amount\n        currencyCode\n      }\n    }\n    lines(first: 100) {\n      edges {\n        node {\n          id\n          quantity\n          cost {\n            totalAmount {\n              amount\n              currencyCode\n            }\n          }\n          merchandise {\n            ... on ProductVariant {\n              id\n              title\n              selectedOptions {\n                name\n                value\n              }\n              product {\n                ...product\n              }\n            }\n          }\n        }\n      }\n    }\n    totalQuantity\n  }\n  #graphql\n  fragment product on Product {\n    id\n    handle\n    availableForSale\n    title\n    description\n    descriptionHtml\n    options {\n      id\n      name\n      values\n    }\n    priceRange {\n      maxVariantPrice {\n        amount\n        currencyCode\n      }\n      minVariantPrice {\n        amount\n        currencyCode\n      }\n    }\n    variants(first: 250) {\n      edges {\n        node {\n          id\n          title\n          availableForSale\n          selectedOptions {\n            name\n            value\n          }\n          price {\n            amount\n            currencyCode\n          }\n        }\n      }\n    }\n    featuredImage {\n      ...image\n    }\n    images(first: 20) {\n      edges {\n        node {\n          ...image\n        }\n      }\n    }\n    seo {\n      ...seo\n    }\n    tags\n    updatedAt\n  }\n  #graphql\n  fragment image on Image {\n    url\n    altText\n    width\n    height\n  }\n\n  #graphql\n  fragment seo on SEO {\n    description\n    title\n  }\n\n\n\n': {
    return: RemoveFromCartMutation;
    variables: RemoveFromCartMutationVariables;
  };
}

declare module '@shopify/hydrogen-temp' {
  interface StorefrontQueries extends GeneratedQueryTypes {}
  interface StorefrontMutations extends GeneratedMutationTypes {}
}
