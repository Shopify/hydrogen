/* eslint-disable eslint-comments/disable-enable-pair */
/* eslint-disable eslint-comments/no-unlimited-disable */
/* eslint-disable */
import * as SFAPI from '@shopify/hydrogen/storefront-api-types';

type Media_ExternalVideo_Fragment = {__typename: 'ExternalVideo'} & Pick<
  SFAPI.ExternalVideo,
  'id' | 'embedUrl' | 'host' | 'mediaContentType' | 'alt'
> & {previewImage?: SFAPI.Maybe<Pick<SFAPI.Image, 'url'>>};

type Media_MediaImage_Fragment = {__typename: 'MediaImage'} & Pick<
  SFAPI.MediaImage,
  'id' | 'mediaContentType' | 'alt'
> & {
    image?: SFAPI.Maybe<Pick<SFAPI.Image, 'url' | 'width' | 'height'>>;
    previewImage?: SFAPI.Maybe<Pick<SFAPI.Image, 'url'>>;
  };

type Media_Model3d_Fragment = {__typename: 'Model3d'} & Pick<
  SFAPI.Model3d,
  'id' | 'mediaContentType' | 'alt'
> & {
    sources: Array<Pick<SFAPI.Model3dSource, 'mimeType' | 'url'>>;
    previewImage?: SFAPI.Maybe<Pick<SFAPI.Image, 'url'>>;
  };

type Media_Video_Fragment = {__typename: 'Video'} & Pick<
  SFAPI.Video,
  'id' | 'mediaContentType' | 'alt'
> & {
    sources: Array<Pick<SFAPI.VideoSource, 'mimeType' | 'url'>>;
    previewImage?: SFAPI.Maybe<Pick<SFAPI.Image, 'url'>>;
  };

export type MediaFragment =
  | Media_ExternalVideo_Fragment
  | Media_MediaImage_Fragment
  | Media_Model3d_Fragment
  | Media_Video_Fragment;

export type ProductCardFragment = Pick<
  SFAPI.Product,
  'id' | 'title' | 'publishedAt' | 'handle'
> & {
  variants: {
    nodes: Array<
      Pick<SFAPI.ProductVariant, 'id'> & {
        image?: SFAPI.Maybe<
          Pick<SFAPI.Image, 'url' | 'altText' | 'width' | 'height'>
        >;
        price: Pick<SFAPI.MoneyV2, 'amount' | 'currencyCode'>;
        compareAtPrice?: SFAPI.Maybe<
          Pick<SFAPI.MoneyV2, 'amount' | 'currencyCode'>
        >;
        selectedOptions: Array<Pick<SFAPI.SelectedOption, 'name' | 'value'>>;
        product: Pick<SFAPI.Product, 'handle' | 'title'>;
      }
    >;
  };
};

export type LayoutMenusQueryVariables = SFAPI.Exact<{
  language?: SFAPI.InputMaybe<SFAPI.LanguageCode>;
  headerMenuHandle: SFAPI.Scalars['String'];
  footerMenuHandle: SFAPI.Scalars['String'];
}>;

export type LayoutMenusQuery = {
  shop: Pick<SFAPI.Shop, 'id' | 'name' | 'description'> & {
    primaryDomain: Pick<SFAPI.Domain, 'url'>;
    brand?: SFAPI.Maybe<{
      logo?: SFAPI.Maybe<{image?: SFAPI.Maybe<Pick<SFAPI.Image, 'url'>>}>;
    }>;
  };
  headerMenu?: SFAPI.Maybe<
    Pick<SFAPI.Menu, 'id'> & {
      items: Array<
        Pick<
          SFAPI.MenuItem,
          'id' | 'resourceId' | 'tags' | 'title' | 'type' | 'url'
        > & {
          items: Array<
            Pick<
              SFAPI.MenuItem,
              'id' | 'resourceId' | 'tags' | 'title' | 'type' | 'url'
            >
          >;
        }
      >;
    }
  >;
  footerMenu?: SFAPI.Maybe<
    Pick<SFAPI.Menu, 'id'> & {
      items: Array<
        Pick<
          SFAPI.MenuItem,
          'id' | 'resourceId' | 'tags' | 'title' | 'type' | 'url'
        > & {
          items: Array<
            Pick<
              SFAPI.MenuItem,
              'id' | 'resourceId' | 'tags' | 'title' | 'type' | 'url'
            >
          >;
        }
      >;
    }
  >;
};

export type MenuItemFragment = Pick<
  SFAPI.MenuItem,
  'id' | 'resourceId' | 'tags' | 'title' | 'type' | 'url'
>;

export type CartQueryQueryVariables = SFAPI.Exact<{
  cartId: SFAPI.Scalars['ID'];
  country?: SFAPI.InputMaybe<SFAPI.CountryCode>;
  language?: SFAPI.InputMaybe<SFAPI.LanguageCode>;
}>;

export type CartQueryQuery = {
  cart?: SFAPI.Maybe<
    Pick<SFAPI.Cart, 'id' | 'checkoutUrl' | 'totalQuantity' | 'note'> & {
      buyerIdentity: Pick<
        SFAPI.CartBuyerIdentity,
        'countryCode' | 'email' | 'phone'
      > & {
        customer?: SFAPI.Maybe<
          Pick<
            SFAPI.Customer,
            'id' | 'email' | 'firstName' | 'lastName' | 'displayName'
          >
        >;
      };
      lines: {
        edges: Array<{
          node: Pick<SFAPI.CartLine, 'id' | 'quantity'> & {
            attributes: Array<Pick<SFAPI.Attribute, 'key' | 'value'>>;
            cost: {
              totalAmount: Pick<SFAPI.MoneyV2, 'amount' | 'currencyCode'>;
              amountPerQuantity: Pick<SFAPI.MoneyV2, 'amount' | 'currencyCode'>;
              compareAtAmountPerQuantity?: SFAPI.Maybe<
                Pick<SFAPI.MoneyV2, 'amount' | 'currencyCode'>
              >;
            };
            merchandise: Pick<
              SFAPI.ProductVariant,
              'id' | 'availableForSale' | 'requiresShipping' | 'title'
            > & {
              compareAtPrice?: SFAPI.Maybe<
                Pick<SFAPI.MoneyV2, 'currencyCode' | 'amount'>
              >;
              price: Pick<SFAPI.MoneyV2, 'currencyCode' | 'amount'>;
              image?: SFAPI.Maybe<
                Pick<SFAPI.Image, 'id' | 'url' | 'altText' | 'width' | 'height'>
              >;
              product: Pick<SFAPI.Product, 'handle' | 'title' | 'id'>;
              selectedOptions: Array<
                Pick<SFAPI.SelectedOption, 'name' | 'value'>
              >;
            };
          };
        }>;
      };
      cost: {
        subtotalAmount: Pick<SFAPI.MoneyV2, 'currencyCode' | 'amount'>;
        totalAmount: Pick<SFAPI.MoneyV2, 'currencyCode' | 'amount'>;
        totalDutyAmount?: SFAPI.Maybe<
          Pick<SFAPI.MoneyV2, 'currencyCode' | 'amount'>
        >;
        totalTaxAmount?: SFAPI.Maybe<
          Pick<SFAPI.MoneyV2, 'currencyCode' | 'amount'>
        >;
      };
      attributes: Array<Pick<SFAPI.Attribute, 'key' | 'value'>>;
      discountCodes: Array<Pick<SFAPI.CartDiscountCode, 'code'>>;
    }
  >;
};

export type CartFragmentFragment = Pick<
  SFAPI.Cart,
  'id' | 'checkoutUrl' | 'totalQuantity' | 'note'
> & {
  buyerIdentity: Pick<
    SFAPI.CartBuyerIdentity,
    'countryCode' | 'email' | 'phone'
  > & {
    customer?: SFAPI.Maybe<
      Pick<
        SFAPI.Customer,
        'id' | 'email' | 'firstName' | 'lastName' | 'displayName'
      >
    >;
  };
  lines: {
    edges: Array<{
      node: Pick<SFAPI.CartLine, 'id' | 'quantity'> & {
        attributes: Array<Pick<SFAPI.Attribute, 'key' | 'value'>>;
        cost: {
          totalAmount: Pick<SFAPI.MoneyV2, 'amount' | 'currencyCode'>;
          amountPerQuantity: Pick<SFAPI.MoneyV2, 'amount' | 'currencyCode'>;
          compareAtAmountPerQuantity?: SFAPI.Maybe<
            Pick<SFAPI.MoneyV2, 'amount' | 'currencyCode'>
          >;
        };
        merchandise: Pick<
          SFAPI.ProductVariant,
          'id' | 'availableForSale' | 'requiresShipping' | 'title'
        > & {
          compareAtPrice?: SFAPI.Maybe<
            Pick<SFAPI.MoneyV2, 'currencyCode' | 'amount'>
          >;
          price: Pick<SFAPI.MoneyV2, 'currencyCode' | 'amount'>;
          image?: SFAPI.Maybe<
            Pick<SFAPI.Image, 'id' | 'url' | 'altText' | 'width' | 'height'>
          >;
          product: Pick<SFAPI.Product, 'handle' | 'title' | 'id'>;
          selectedOptions: Array<Pick<SFAPI.SelectedOption, 'name' | 'value'>>;
        };
      };
    }>;
  };
  cost: {
    subtotalAmount: Pick<SFAPI.MoneyV2, 'currencyCode' | 'amount'>;
    totalAmount: Pick<SFAPI.MoneyV2, 'currencyCode' | 'amount'>;
    totalDutyAmount?: SFAPI.Maybe<
      Pick<SFAPI.MoneyV2, 'currencyCode' | 'amount'>
    >;
    totalTaxAmount?: SFAPI.Maybe<
      Pick<SFAPI.MoneyV2, 'currencyCode' | 'amount'>
    >;
  };
  attributes: Array<Pick<SFAPI.Attribute, 'key' | 'value'>>;
  discountCodes: Array<Pick<SFAPI.CartDiscountCode, 'code'>>;
};

export type MoneyFragmentFragment = Pick<
  SFAPI.MoneyV2,
  'currencyCode' | 'amount'
>;

export type ImageFragmentFragment = Pick<
  SFAPI.Image,
  'id' | 'url' | 'altText' | 'width' | 'height'
>;

export type CollectionContentFragment = Pick<
  SFAPI.Collection,
  'id' | 'handle' | 'title' | 'descriptionHtml'
> & {
  heading?: SFAPI.Maybe<Pick<SFAPI.Metafield, 'value'>>;
  byline?: SFAPI.Maybe<Pick<SFAPI.Metafield, 'value'>>;
  cta?: SFAPI.Maybe<Pick<SFAPI.Metafield, 'value'>>;
  spread?: SFAPI.Maybe<{
    reference?: SFAPI.Maybe<
      | ({__typename: 'MediaImage'} & Pick<
          SFAPI.MediaImage,
          'id' | 'mediaContentType' | 'alt'
        > & {
            image?: SFAPI.Maybe<Pick<SFAPI.Image, 'url' | 'width' | 'height'>>;
            previewImage?: SFAPI.Maybe<Pick<SFAPI.Image, 'url'>>;
          })
      | ({__typename: 'Video'} & Pick<
          SFAPI.Video,
          'id' | 'mediaContentType' | 'alt'
        > & {
            sources: Array<Pick<SFAPI.VideoSource, 'mimeType' | 'url'>>;
            previewImage?: SFAPI.Maybe<Pick<SFAPI.Image, 'url'>>;
          })
      | {}
    >;
  }>;
  spreadSecondary?: SFAPI.Maybe<{
    reference?: SFAPI.Maybe<
      | ({__typename: 'MediaImage'} & Pick<
          SFAPI.MediaImage,
          'id' | 'mediaContentType' | 'alt'
        > & {
            image?: SFAPI.Maybe<Pick<SFAPI.Image, 'url' | 'width' | 'height'>>;
            previewImage?: SFAPI.Maybe<Pick<SFAPI.Image, 'url'>>;
          })
      | ({__typename: 'Video'} & Pick<
          SFAPI.Video,
          'id' | 'mediaContentType' | 'alt'
        > & {
            sources: Array<Pick<SFAPI.VideoSource, 'mimeType' | 'url'>>;
            previewImage?: SFAPI.Maybe<Pick<SFAPI.Image, 'url'>>;
          })
      | {}
    >;
  }>;
};

export type CollectionContentQueryQueryVariables = SFAPI.Exact<{
  handle?: SFAPI.InputMaybe<SFAPI.Scalars['String']>;
  country?: SFAPI.InputMaybe<SFAPI.CountryCode>;
  language?: SFAPI.InputMaybe<SFAPI.LanguageCode>;
}>;

export type CollectionContentQueryQuery = {
  hero?: SFAPI.Maybe<
    Pick<SFAPI.Collection, 'id' | 'handle' | 'title' | 'descriptionHtml'> & {
      heading?: SFAPI.Maybe<Pick<SFAPI.Metafield, 'value'>>;
      byline?: SFAPI.Maybe<Pick<SFAPI.Metafield, 'value'>>;
      cta?: SFAPI.Maybe<Pick<SFAPI.Metafield, 'value'>>;
      spread?: SFAPI.Maybe<{
        reference?: SFAPI.Maybe<
          | ({__typename: 'MediaImage'} & Pick<
              SFAPI.MediaImage,
              'id' | 'mediaContentType' | 'alt'
            > & {
                image?: SFAPI.Maybe<
                  Pick<SFAPI.Image, 'url' | 'width' | 'height'>
                >;
                previewImage?: SFAPI.Maybe<Pick<SFAPI.Image, 'url'>>;
              })
          | ({__typename: 'Video'} & Pick<
              SFAPI.Video,
              'id' | 'mediaContentType' | 'alt'
            > & {
                sources: Array<Pick<SFAPI.VideoSource, 'mimeType' | 'url'>>;
                previewImage?: SFAPI.Maybe<Pick<SFAPI.Image, 'url'>>;
              })
          | {}
        >;
      }>;
      spreadSecondary?: SFAPI.Maybe<{
        reference?: SFAPI.Maybe<
          | ({__typename: 'MediaImage'} & Pick<
              SFAPI.MediaImage,
              'id' | 'mediaContentType' | 'alt'
            > & {
                image?: SFAPI.Maybe<
                  Pick<SFAPI.Image, 'url' | 'width' | 'height'>
                >;
                previewImage?: SFAPI.Maybe<Pick<SFAPI.Image, 'url'>>;
              })
          | ({__typename: 'Video'} & Pick<
              SFAPI.Video,
              'id' | 'mediaContentType' | 'alt'
            > & {
                sources: Array<Pick<SFAPI.VideoSource, 'mimeType' | 'url'>>;
                previewImage?: SFAPI.Maybe<Pick<SFAPI.Image, 'url'>>;
              })
          | {}
        >;
      }>;
    }
  >;
  shop: Pick<SFAPI.Shop, 'name' | 'description'>;
};

export type CollectionContentQueryVariables = SFAPI.Exact<{
  handle?: SFAPI.InputMaybe<SFAPI.Scalars['String']>;
  country?: SFAPI.InputMaybe<SFAPI.CountryCode>;
  language?: SFAPI.InputMaybe<SFAPI.LanguageCode>;
}>;

export type CollectionContentQuery = {
  hero?: SFAPI.Maybe<
    Pick<SFAPI.Collection, 'id' | 'handle' | 'title' | 'descriptionHtml'> & {
      heading?: SFAPI.Maybe<Pick<SFAPI.Metafield, 'value'>>;
      byline?: SFAPI.Maybe<Pick<SFAPI.Metafield, 'value'>>;
      cta?: SFAPI.Maybe<Pick<SFAPI.Metafield, 'value'>>;
      spread?: SFAPI.Maybe<{
        reference?: SFAPI.Maybe<
          | ({__typename: 'MediaImage'} & Pick<
              SFAPI.MediaImage,
              'id' | 'mediaContentType' | 'alt'
            > & {
                image?: SFAPI.Maybe<
                  Pick<SFAPI.Image, 'url' | 'width' | 'height'>
                >;
                previewImage?: SFAPI.Maybe<Pick<SFAPI.Image, 'url'>>;
              })
          | ({__typename: 'Video'} & Pick<
              SFAPI.Video,
              'id' | 'mediaContentType' | 'alt'
            > & {
                sources: Array<Pick<SFAPI.VideoSource, 'mimeType' | 'url'>>;
                previewImage?: SFAPI.Maybe<Pick<SFAPI.Image, 'url'>>;
              })
          | {}
        >;
      }>;
      spreadSecondary?: SFAPI.Maybe<{
        reference?: SFAPI.Maybe<
          | ({__typename: 'MediaImage'} & Pick<
              SFAPI.MediaImage,
              'id' | 'mediaContentType' | 'alt'
            > & {
                image?: SFAPI.Maybe<
                  Pick<SFAPI.Image, 'url' | 'width' | 'height'>
                >;
                previewImage?: SFAPI.Maybe<Pick<SFAPI.Image, 'url'>>;
              })
          | ({__typename: 'Video'} & Pick<
              SFAPI.Video,
              'id' | 'mediaContentType' | 'alt'
            > & {
                sources: Array<Pick<SFAPI.VideoSource, 'mimeType' | 'url'>>;
                previewImage?: SFAPI.Maybe<Pick<SFAPI.Image, 'url'>>;
              })
          | {}
        >;
      }>;
    }
  >;
};

export type HomepageFeaturedProductsQueryVariables = SFAPI.Exact<{
  country?: SFAPI.InputMaybe<SFAPI.CountryCode>;
  language?: SFAPI.InputMaybe<SFAPI.LanguageCode>;
}>;

export type HomepageFeaturedProductsQuery = {
  products: {
    nodes: Array<
      Pick<SFAPI.Product, 'id' | 'title' | 'publishedAt' | 'handle'> & {
        variants: {
          nodes: Array<
            Pick<SFAPI.ProductVariant, 'id'> & {
              image?: SFAPI.Maybe<
                Pick<SFAPI.Image, 'url' | 'altText' | 'width' | 'height'>
              >;
              price: Pick<SFAPI.MoneyV2, 'amount' | 'currencyCode'>;
              compareAtPrice?: SFAPI.Maybe<
                Pick<SFAPI.MoneyV2, 'amount' | 'currencyCode'>
              >;
              selectedOptions: Array<
                Pick<SFAPI.SelectedOption, 'name' | 'value'>
              >;
              product: Pick<SFAPI.Product, 'handle' | 'title'>;
            }
          >;
        };
      }
    >;
  };
};

export type HomepageFeaturedCollectionsQueryVariables = SFAPI.Exact<{
  country?: SFAPI.InputMaybe<SFAPI.CountryCode>;
  language?: SFAPI.InputMaybe<SFAPI.LanguageCode>;
}>;

export type HomepageFeaturedCollectionsQuery = {
  collections: {
    nodes: Array<
      Pick<SFAPI.Collection, 'id' | 'title' | 'handle'> & {
        image?: SFAPI.Maybe<
          Pick<SFAPI.Image, 'altText' | 'width' | 'height' | 'url'>
        >;
      }
    >;
  };
};

export type CustomerActivateMutationVariables = SFAPI.Exact<{
  id: SFAPI.Scalars['ID'];
  input: SFAPI.CustomerActivateInput;
}>;

export type CustomerActivateMutation = {
  customerActivate?: SFAPI.Maybe<{
    customerAccessToken?: SFAPI.Maybe<
      Pick<SFAPI.CustomerAccessToken, 'accessToken' | 'expiresAt'>
    >;
    customerUserErrors: Array<
      Pick<SFAPI.CustomerUserError, 'code' | 'field' | 'message'>
    >;
  }>;
};

export type CustomerAddressUpdateMutationVariables = SFAPI.Exact<{
  address: SFAPI.MailingAddressInput;
  customerAccessToken: SFAPI.Scalars['String'];
  id: SFAPI.Scalars['ID'];
}>;

export type CustomerAddressUpdateMutation = {
  customerAddressUpdate?: SFAPI.Maybe<{
    customerUserErrors: Array<
      Pick<SFAPI.CustomerUserError, 'code' | 'field' | 'message'>
    >;
  }>;
};

export type CustomerAddressDeleteMutationVariables = SFAPI.Exact<{
  customerAccessToken: SFAPI.Scalars['String'];
  id: SFAPI.Scalars['ID'];
}>;

export type CustomerAddressDeleteMutation = {
  customerAddressDelete?: SFAPI.Maybe<
    Pick<SFAPI.CustomerAddressDeletePayload, 'deletedCustomerAddressId'> & {
      customerUserErrors: Array<
        Pick<SFAPI.CustomerUserError, 'code' | 'field' | 'message'>
      >;
    }
  >;
};

export type CustomerDefaultAddressUpdateMutationVariables = SFAPI.Exact<{
  addressId: SFAPI.Scalars['ID'];
  customerAccessToken: SFAPI.Scalars['String'];
}>;

export type CustomerDefaultAddressUpdateMutation = {
  customerDefaultAddressUpdate?: SFAPI.Maybe<{
    customerUserErrors: Array<
      Pick<SFAPI.CustomerUserError, 'code' | 'field' | 'message'>
    >;
  }>;
};

export type CustomerAddressCreateMutationVariables = SFAPI.Exact<{
  address: SFAPI.MailingAddressInput;
  customerAccessToken: SFAPI.Scalars['String'];
}>;

export type CustomerAddressCreateMutation = {
  customerAddressCreate?: SFAPI.Maybe<{
    customerAddress?: SFAPI.Maybe<Pick<SFAPI.MailingAddress, 'id'>>;
    customerUserErrors: Array<
      Pick<SFAPI.CustomerUserError, 'code' | 'field' | 'message'>
    >;
  }>;
};

export type CustomerUpdateMutationVariables = SFAPI.Exact<{
  customerAccessToken: SFAPI.Scalars['String'];
  customer: SFAPI.CustomerUpdateInput;
}>;

export type CustomerUpdateMutation = {
  customerUpdate?: SFAPI.Maybe<{
    customerUserErrors: Array<
      Pick<SFAPI.CustomerUserError, 'code' | 'field' | 'message'>
    >;
  }>;
};

export type CustomerAccessTokenCreateMutationVariables = SFAPI.Exact<{
  input: SFAPI.CustomerAccessTokenCreateInput;
}>;

export type CustomerAccessTokenCreateMutation = {
  customerAccessTokenCreate?: SFAPI.Maybe<{
    customerUserErrors: Array<
      Pick<SFAPI.CustomerUserError, 'code' | 'field' | 'message'>
    >;
    customerAccessToken?: SFAPI.Maybe<
      Pick<SFAPI.CustomerAccessToken, 'accessToken' | 'expiresAt'>
    >;
  }>;
};

export type MoneyFragment = Pick<SFAPI.MoneyV2, 'amount' | 'currencyCode'>;

export type AddressFullFragment = Pick<
  SFAPI.MailingAddress,
  | 'address1'
  | 'address2'
  | 'city'
  | 'company'
  | 'country'
  | 'countryCodeV2'
  | 'firstName'
  | 'formatted'
  | 'id'
  | 'lastName'
  | 'name'
  | 'phone'
  | 'province'
  | 'provinceCode'
  | 'zip'
>;

type DiscountApplication_AutomaticDiscountApplication_Fragment = {
  value:
    | Pick<SFAPI.MoneyV2, 'amount' | 'currencyCode'>
    | Pick<SFAPI.PricingPercentageValue, 'percentage'>;
};

type DiscountApplication_DiscountCodeApplication_Fragment = {
  value:
    | Pick<SFAPI.MoneyV2, 'amount' | 'currencyCode'>
    | Pick<SFAPI.PricingPercentageValue, 'percentage'>;
};

type DiscountApplication_ManualDiscountApplication_Fragment = {
  value:
    | Pick<SFAPI.MoneyV2, 'amount' | 'currencyCode'>
    | Pick<SFAPI.PricingPercentageValue, 'percentage'>;
};

type DiscountApplication_ScriptDiscountApplication_Fragment = {
  value:
    | Pick<SFAPI.MoneyV2, 'amount' | 'currencyCode'>
    | Pick<SFAPI.PricingPercentageValue, 'percentage'>;
};

export type DiscountApplicationFragment =
  | DiscountApplication_AutomaticDiscountApplication_Fragment
  | DiscountApplication_DiscountCodeApplication_Fragment
  | DiscountApplication_ManualDiscountApplication_Fragment
  | DiscountApplication_ScriptDiscountApplication_Fragment;

export type ImageFragment = Pick<
  SFAPI.Image,
  'altText' | 'height' | 'id' | 'width'
> & {src: SFAPI.Image['url']};

export type ProductVariantFragment = Pick<
  SFAPI.ProductVariant,
  'id' | 'sku' | 'title'
> & {
  image?: SFAPI.Maybe<
    Pick<SFAPI.Image, 'altText' | 'height' | 'id' | 'width'> & {
      src: SFAPI.Image['url'];
    }
  >;
  price: Pick<SFAPI.MoneyV2, 'amount' | 'currencyCode'>;
  product: Pick<SFAPI.Product, 'handle'>;
};

export type LineItemFullFragment = Pick<
  SFAPI.OrderLineItem,
  'title' | 'quantity'
> & {
  discountAllocations: Array<{
    allocatedAmount: Pick<SFAPI.MoneyV2, 'amount' | 'currencyCode'>;
    discountApplication:
      | {
          value:
            | Pick<SFAPI.MoneyV2, 'amount' | 'currencyCode'>
            | Pick<SFAPI.PricingPercentageValue, 'percentage'>;
        }
      | {
          value:
            | Pick<SFAPI.MoneyV2, 'amount' | 'currencyCode'>
            | Pick<SFAPI.PricingPercentageValue, 'percentage'>;
        }
      | {
          value:
            | Pick<SFAPI.MoneyV2, 'amount' | 'currencyCode'>
            | Pick<SFAPI.PricingPercentageValue, 'percentage'>;
        }
      | {
          value:
            | Pick<SFAPI.MoneyV2, 'amount' | 'currencyCode'>
            | Pick<SFAPI.PricingPercentageValue, 'percentage'>;
        };
  }>;
  originalTotalPrice: Pick<SFAPI.MoneyV2, 'amount' | 'currencyCode'>;
  discountedTotalPrice: Pick<SFAPI.MoneyV2, 'amount' | 'currencyCode'>;
  variant?: SFAPI.Maybe<
    Pick<SFAPI.ProductVariant, 'id' | 'sku' | 'title'> & {
      image?: SFAPI.Maybe<
        Pick<SFAPI.Image, 'altText' | 'height' | 'id' | 'width'> & {
          src: SFAPI.Image['url'];
        }
      >;
      price: Pick<SFAPI.MoneyV2, 'amount' | 'currencyCode'>;
      product: Pick<SFAPI.Product, 'handle'>;
    }
  >;
};

export type CustomerOrderQueryVariables = SFAPI.Exact<{
  country?: SFAPI.InputMaybe<SFAPI.CountryCode>;
  language?: SFAPI.InputMaybe<SFAPI.LanguageCode>;
  orderId: SFAPI.Scalars['ID'];
}>;

export type CustomerOrderQuery = {
  node?: SFAPI.Maybe<
    | (Pick<
        SFAPI.Order,
        'id' | 'name' | 'orderNumber' | 'processedAt' | 'fulfillmentStatus'
      > & {
        totalTax?: SFAPI.Maybe<Pick<SFAPI.MoneyV2, 'amount' | 'currencyCode'>>;
        totalPrice: Pick<SFAPI.MoneyV2, 'amount' | 'currencyCode'>;
        subtotalPrice?: SFAPI.Maybe<
          Pick<SFAPI.MoneyV2, 'amount' | 'currencyCode'>
        >;
        shippingAddress?: SFAPI.Maybe<
          Pick<
            SFAPI.MailingAddress,
            | 'address1'
            | 'address2'
            | 'city'
            | 'company'
            | 'country'
            | 'countryCodeV2'
            | 'firstName'
            | 'formatted'
            | 'id'
            | 'lastName'
            | 'name'
            | 'phone'
            | 'province'
            | 'provinceCode'
            | 'zip'
          >
        >;
        discountApplications: {
          nodes: Array<
            | {
                value:
                  | Pick<SFAPI.MoneyV2, 'amount' | 'currencyCode'>
                  | Pick<SFAPI.PricingPercentageValue, 'percentage'>;
              }
            | {
                value:
                  | Pick<SFAPI.MoneyV2, 'amount' | 'currencyCode'>
                  | Pick<SFAPI.PricingPercentageValue, 'percentage'>;
              }
            | {
                value:
                  | Pick<SFAPI.MoneyV2, 'amount' | 'currencyCode'>
                  | Pick<SFAPI.PricingPercentageValue, 'percentage'>;
              }
            | {
                value:
                  | Pick<SFAPI.MoneyV2, 'amount' | 'currencyCode'>
                  | Pick<SFAPI.PricingPercentageValue, 'percentage'>;
              }
          >;
        };
        lineItems: {
          nodes: Array<
            Pick<SFAPI.OrderLineItem, 'title' | 'quantity'> & {
              discountAllocations: Array<{
                allocatedAmount: Pick<SFAPI.MoneyV2, 'amount' | 'currencyCode'>;
                discountApplication:
                  | {
                      value:
                        | Pick<SFAPI.MoneyV2, 'amount' | 'currencyCode'>
                        | Pick<SFAPI.PricingPercentageValue, 'percentage'>;
                    }
                  | {
                      value:
                        | Pick<SFAPI.MoneyV2, 'amount' | 'currencyCode'>
                        | Pick<SFAPI.PricingPercentageValue, 'percentage'>;
                    }
                  | {
                      value:
                        | Pick<SFAPI.MoneyV2, 'amount' | 'currencyCode'>
                        | Pick<SFAPI.PricingPercentageValue, 'percentage'>;
                    }
                  | {
                      value:
                        | Pick<SFAPI.MoneyV2, 'amount' | 'currencyCode'>
                        | Pick<SFAPI.PricingPercentageValue, 'percentage'>;
                    };
              }>;
              originalTotalPrice: Pick<
                SFAPI.MoneyV2,
                'amount' | 'currencyCode'
              >;
              discountedTotalPrice: Pick<
                SFAPI.MoneyV2,
                'amount' | 'currencyCode'
              >;
              variant?: SFAPI.Maybe<
                Pick<SFAPI.ProductVariant, 'id' | 'sku' | 'title'> & {
                  image?: SFAPI.Maybe<
                    Pick<SFAPI.Image, 'altText' | 'height' | 'id' | 'width'> & {
                      src: SFAPI.Image['url'];
                    }
                  >;
                  price: Pick<SFAPI.MoneyV2, 'amount' | 'currencyCode'>;
                  product: Pick<SFAPI.Product, 'handle'>;
                }
              >;
            }
          >;
        };
      })
    | {}
  >;
};

export type CustomerRecoverMutationVariables = SFAPI.Exact<{
  email: SFAPI.Scalars['String'];
}>;

export type CustomerRecoverMutation = {
  customerRecover?: SFAPI.Maybe<{
    customerUserErrors: Array<
      Pick<SFAPI.CustomerUserError, 'code' | 'field' | 'message'>
    >;
  }>;
};

export type CustomerCreateMutationVariables = SFAPI.Exact<{
  input: SFAPI.CustomerCreateInput;
}>;

export type CustomerCreateMutation = {
  customerCreate?: SFAPI.Maybe<{
    customer?: SFAPI.Maybe<Pick<SFAPI.Customer, 'id'>>;
    customerUserErrors: Array<
      Pick<SFAPI.CustomerUserError, 'code' | 'field' | 'message'>
    >;
  }>;
};

export type CustomerResetMutationVariables = SFAPI.Exact<{
  id: SFAPI.Scalars['ID'];
  input: SFAPI.CustomerResetInput;
}>;

export type CustomerResetMutation = {
  customerReset?: SFAPI.Maybe<{
    customerAccessToken?: SFAPI.Maybe<
      Pick<SFAPI.CustomerAccessToken, 'accessToken' | 'expiresAt'>
    >;
    customerUserErrors: Array<
      Pick<SFAPI.CustomerUserError, 'code' | 'field' | 'message'>
    >;
  }>;
};

export type CustomerDetailsQueryVariables = SFAPI.Exact<{
  customerAccessToken: SFAPI.Scalars['String'];
  country?: SFAPI.InputMaybe<SFAPI.CountryCode>;
  language?: SFAPI.InputMaybe<SFAPI.LanguageCode>;
}>;

export type CustomerDetailsQuery = {
  customer?: SFAPI.Maybe<
    Pick<SFAPI.Customer, 'firstName' | 'lastName' | 'phone' | 'email'> & {
      defaultAddress?: SFAPI.Maybe<
        Pick<
          SFAPI.MailingAddress,
          | 'id'
          | 'formatted'
          | 'firstName'
          | 'lastName'
          | 'company'
          | 'address1'
          | 'address2'
          | 'country'
          | 'province'
          | 'city'
          | 'zip'
          | 'phone'
        >
      >;
      addresses: {
        edges: Array<{
          node: Pick<
            SFAPI.MailingAddress,
            | 'id'
            | 'formatted'
            | 'firstName'
            | 'lastName'
            | 'company'
            | 'address1'
            | 'address2'
            | 'country'
            | 'province'
            | 'city'
            | 'zip'
            | 'phone'
          >;
        }>;
      };
      orders: {
        edges: Array<{
          node: Pick<
            SFAPI.Order,
            | 'id'
            | 'orderNumber'
            | 'processedAt'
            | 'financialStatus'
            | 'fulfillmentStatus'
          > & {
            currentTotalPrice: Pick<SFAPI.MoneyV2, 'amount' | 'currencyCode'>;
            lineItems: {
              edges: Array<{
                node: Pick<SFAPI.OrderLineItem, 'title'> & {
                  variant?: SFAPI.Maybe<{
                    image?: SFAPI.Maybe<
                      Pick<SFAPI.Image, 'url' | 'altText' | 'height' | 'width'>
                    >;
                  }>;
                };
              }>;
            };
          };
        }>;
      };
    }
  >;
};

export type ErrorFragmentFragment = Pick<
  SFAPI.CartUserError,
  'message' | 'field' | 'code'
>;

export type CartLinesFragmentFragment = Pick<
  SFAPI.Cart,
  'id' | 'totalQuantity'
>;

export type CartDiscountCodesUpdateMutationVariables = SFAPI.Exact<{
  cartId: SFAPI.Scalars['ID'];
  discountCodes?: SFAPI.InputMaybe<
    Array<SFAPI.Scalars['String']> | SFAPI.Scalars['String']
  >;
  country?: SFAPI.InputMaybe<SFAPI.CountryCode>;
}>;

export type CartDiscountCodesUpdateMutation = {
  cartDiscountCodesUpdate?: SFAPI.Maybe<{
    cart?: SFAPI.Maybe<
      Pick<SFAPI.Cart, 'id'> & {
        discountCodes: Array<Pick<SFAPI.CartDiscountCode, 'code'>>;
      }
    >;
    errors: Array<Pick<SFAPI.CartUserError, 'field' | 'message'>>;
  }>;
};

export type CollectionDetailsQueryVariables = SFAPI.Exact<{
  handle: SFAPI.Scalars['String'];
  country?: SFAPI.InputMaybe<SFAPI.CountryCode>;
  language?: SFAPI.InputMaybe<SFAPI.LanguageCode>;
  pageBy: SFAPI.Scalars['Int'];
  cursor?: SFAPI.InputMaybe<SFAPI.Scalars['String']>;
  filters?: SFAPI.InputMaybe<Array<SFAPI.ProductFilter> | SFAPI.ProductFilter>;
  sortKey: SFAPI.ProductCollectionSortKeys;
  reverse?: SFAPI.InputMaybe<SFAPI.Scalars['Boolean']>;
}>;

export type CollectionDetailsQuery = {
  collection?: SFAPI.Maybe<
    Pick<SFAPI.Collection, 'id' | 'handle' | 'title' | 'description'> & {
      seo: Pick<SFAPI.Seo, 'description' | 'title'>;
      image?: SFAPI.Maybe<
        Pick<SFAPI.Image, 'id' | 'url' | 'width' | 'height' | 'altText'>
      >;
      products: {
        filters: Array<
          Pick<SFAPI.Filter, 'id' | 'label' | 'type'> & {
            values: Array<
              Pick<SFAPI.FilterValue, 'id' | 'label' | 'count' | 'input'>
            >;
          }
        >;
        nodes: Array<
          Pick<SFAPI.Product, 'id' | 'title' | 'publishedAt' | 'handle'> & {
            variants: {
              nodes: Array<
                Pick<SFAPI.ProductVariant, 'id'> & {
                  image?: SFAPI.Maybe<
                    Pick<SFAPI.Image, 'url' | 'altText' | 'width' | 'height'>
                  >;
                  price: Pick<SFAPI.MoneyV2, 'amount' | 'currencyCode'>;
                  compareAtPrice?: SFAPI.Maybe<
                    Pick<SFAPI.MoneyV2, 'amount' | 'currencyCode'>
                  >;
                  selectedOptions: Array<
                    Pick<SFAPI.SelectedOption, 'name' | 'value'>
                  >;
                  product: Pick<SFAPI.Product, 'handle' | 'title'>;
                }
              >;
            };
          }
        >;
        pageInfo: Pick<SFAPI.PageInfo, 'hasNextPage' | 'endCursor'>;
      };
    }
  >;
  collections: {
    edges: Array<{node: Pick<SFAPI.Collection, 'title' | 'handle'>}>;
  };
};

export type CollectionsQueryVariables = SFAPI.Exact<{
  country?: SFAPI.InputMaybe<SFAPI.CountryCode>;
  language?: SFAPI.InputMaybe<SFAPI.LanguageCode>;
  first?: SFAPI.InputMaybe<SFAPI.Scalars['Int']>;
  last?: SFAPI.InputMaybe<SFAPI.Scalars['Int']>;
  startCursor?: SFAPI.InputMaybe<SFAPI.Scalars['String']>;
  endCursor?: SFAPI.InputMaybe<SFAPI.Scalars['String']>;
}>;

export type CollectionsQuery = {
  collections: {
    nodes: Array<
      Pick<SFAPI.Collection, 'id' | 'title' | 'description' | 'handle'> & {
        seo: Pick<SFAPI.Seo, 'description' | 'title'>;
        image?: SFAPI.Maybe<
          Pick<SFAPI.Image, 'id' | 'url' | 'width' | 'height' | 'altText'>
        >;
      }
    >;
    pageInfo: Pick<
      SFAPI.PageInfo,
      'hasPreviousPage' | 'hasNextPage' | 'startCursor' | 'endCursor'
    >;
  };
};

export type HomepageQueryVariables = SFAPI.Exact<{
  country?: SFAPI.InputMaybe<SFAPI.CountryCode>;
  language?: SFAPI.InputMaybe<SFAPI.LanguageCode>;
}>;

export type HomepageQuery = {
  featuredCollections: {
    nodes: Array<
      Pick<SFAPI.Collection, 'id' | 'title' | 'handle'> & {
        image?: SFAPI.Maybe<
          Pick<SFAPI.Image, 'altText' | 'width' | 'height' | 'url'>
        >;
      }
    >;
  };
  featuredProducts: {
    nodes: Array<
      Pick<SFAPI.Product, 'id' | 'title' | 'publishedAt' | 'handle'> & {
        variants: {
          nodes: Array<
            Pick<SFAPI.ProductVariant, 'id'> & {
              image?: SFAPI.Maybe<
                Pick<SFAPI.Image, 'url' | 'altText' | 'width' | 'height'>
              >;
              price: Pick<SFAPI.MoneyV2, 'amount' | 'currencyCode'>;
              compareAtPrice?: SFAPI.Maybe<
                Pick<SFAPI.MoneyV2, 'amount' | 'currencyCode'>
              >;
              selectedOptions: Array<
                Pick<SFAPI.SelectedOption, 'name' | 'value'>
              >;
              product: Pick<SFAPI.Product, 'handle' | 'title'>;
            }
          >;
        };
      }
    >;
  };
};

export type ArticleDetailsQueryVariables = SFAPI.Exact<{
  language?: SFAPI.InputMaybe<SFAPI.LanguageCode>;
  blogHandle: SFAPI.Scalars['String'];
  articleHandle: SFAPI.Scalars['String'];
}>;

export type ArticleDetailsQuery = {
  blog?: SFAPI.Maybe<{
    articleByHandle?: SFAPI.Maybe<
      Pick<SFAPI.Article, 'title' | 'contentHtml' | 'publishedAt'> & {
        author?: SFAPI.Maybe<Pick<SFAPI.ArticleAuthor, 'name'>>;
        image?: SFAPI.Maybe<
          Pick<SFAPI.Image, 'id' | 'altText' | 'url' | 'width' | 'height'>
        >;
        seo?: SFAPI.Maybe<Pick<SFAPI.Seo, 'description' | 'title'>>;
      }
    >;
  }>;
};

export type BlogQueryVariables = SFAPI.Exact<{
  language?: SFAPI.InputMaybe<SFAPI.LanguageCode>;
  blogHandle: SFAPI.Scalars['String'];
  pageBy: SFAPI.Scalars['Int'];
  cursor?: SFAPI.InputMaybe<SFAPI.Scalars['String']>;
}>;

export type BlogQuery = {
  blog?: SFAPI.Maybe<
    Pick<SFAPI.Blog, 'title'> & {
      seo?: SFAPI.Maybe<Pick<SFAPI.Seo, 'title' | 'description'>>;
      articles: {
        edges: Array<{
          node: Pick<
            SFAPI.Article,
            'contentHtml' | 'handle' | 'id' | 'publishedAt' | 'title'
          > & {
            author?: SFAPI.Maybe<Pick<SFAPI.ArticleAuthor, 'name'>>;
            image?: SFAPI.Maybe<
              Pick<SFAPI.Image, 'id' | 'altText' | 'url' | 'width' | 'height'>
            >;
          };
        }>;
      };
    }
  >;
};

export type PageDetailsQueryVariables = SFAPI.Exact<{
  language?: SFAPI.InputMaybe<SFAPI.LanguageCode>;
  handle: SFAPI.Scalars['String'];
}>;

export type PageDetailsQuery = {
  page?: SFAPI.Maybe<
    Pick<SFAPI.Page, 'id' | 'title' | 'body'> & {
      seo?: SFAPI.Maybe<Pick<SFAPI.Seo, 'description' | 'title'>>;
    }
  >;
};

export type PolicyHandleFragment = Pick<
  SFAPI.ShopPolicy,
  'body' | 'handle' | 'id' | 'title' | 'url'
>;

export type PoliciesHandleQueryQueryVariables = SFAPI.Exact<{
  language?: SFAPI.InputMaybe<SFAPI.LanguageCode>;
  privacyPolicy: SFAPI.Scalars['Boolean'];
  shippingPolicy: SFAPI.Scalars['Boolean'];
  termsOfService: SFAPI.Scalars['Boolean'];
  refundPolicy: SFAPI.Scalars['Boolean'];
}>;

export type PoliciesHandleQueryQuery = {
  shop: {
    privacyPolicy?: SFAPI.Maybe<
      Pick<SFAPI.ShopPolicy, 'body' | 'handle' | 'id' | 'title' | 'url'>
    >;
    shippingPolicy?: SFAPI.Maybe<
      Pick<SFAPI.ShopPolicy, 'body' | 'handle' | 'id' | 'title' | 'url'>
    >;
    termsOfService?: SFAPI.Maybe<
      Pick<SFAPI.ShopPolicy, 'body' | 'handle' | 'id' | 'title' | 'url'>
    >;
    refundPolicy?: SFAPI.Maybe<
      Pick<SFAPI.ShopPolicy, 'body' | 'handle' | 'id' | 'title' | 'url'>
    >;
  };
};

export type PolicyIndexFragment = Pick<
  SFAPI.ShopPolicy,
  'id' | 'title' | 'handle'
>;

export type PoliciesIndexQueryQueryVariables = SFAPI.Exact<{
  [key: string]: never;
}>;

export type PoliciesIndexQueryQuery = {
  shop: {
    privacyPolicy?: SFAPI.Maybe<
      Pick<SFAPI.ShopPolicy, 'id' | 'title' | 'handle'>
    >;
    shippingPolicy?: SFAPI.Maybe<
      Pick<SFAPI.ShopPolicy, 'id' | 'title' | 'handle'>
    >;
    termsOfService?: SFAPI.Maybe<
      Pick<SFAPI.ShopPolicy, 'id' | 'title' | 'handle'>
    >;
    refundPolicy?: SFAPI.Maybe<
      Pick<SFAPI.ShopPolicy, 'id' | 'title' | 'handle'>
    >;
    subscriptionPolicy?: SFAPI.Maybe<
      Pick<SFAPI.ShopPolicyWithDefault, 'id' | 'title' | 'handle'>
    >;
  };
};

export type ProductVariantFragmentFragment = Pick<
  SFAPI.ProductVariant,
  'id' | 'availableForSale' | 'sku' | 'title'
> & {
  selectedOptions: Array<Pick<SFAPI.SelectedOption, 'name' | 'value'>>;
  image?: SFAPI.Maybe<
    Pick<SFAPI.Image, 'id' | 'url' | 'altText' | 'width' | 'height'>
  >;
  price: Pick<SFAPI.MoneyV2, 'amount' | 'currencyCode'>;
  compareAtPrice?: SFAPI.Maybe<Pick<SFAPI.MoneyV2, 'amount' | 'currencyCode'>>;
  unitPrice?: SFAPI.Maybe<Pick<SFAPI.MoneyV2, 'amount' | 'currencyCode'>>;
  product: Pick<SFAPI.Product, 'title' | 'handle'>;
};

export type ProductQueryVariables = SFAPI.Exact<{
  country?: SFAPI.InputMaybe<SFAPI.CountryCode>;
  language?: SFAPI.InputMaybe<SFAPI.LanguageCode>;
  handle: SFAPI.Scalars['String'];
  selectedOptions: Array<SFAPI.SelectedOptionInput> | SFAPI.SelectedOptionInput;
}>;

export type ProductQuery = {
  product?: SFAPI.Maybe<
    Pick<
      SFAPI.Product,
      'id' | 'title' | 'vendor' | 'handle' | 'descriptionHtml' | 'description'
    > & {
      options: Array<Pick<SFAPI.ProductOption, 'name' | 'values'>>;
      selectedVariant?: SFAPI.Maybe<
        Pick<
          SFAPI.ProductVariant,
          'id' | 'availableForSale' | 'sku' | 'title'
        > & {
          selectedOptions: Array<Pick<SFAPI.SelectedOption, 'name' | 'value'>>;
          image?: SFAPI.Maybe<
            Pick<SFAPI.Image, 'id' | 'url' | 'altText' | 'width' | 'height'>
          >;
          price: Pick<SFAPI.MoneyV2, 'amount' | 'currencyCode'>;
          compareAtPrice?: SFAPI.Maybe<
            Pick<SFAPI.MoneyV2, 'amount' | 'currencyCode'>
          >;
          unitPrice?: SFAPI.Maybe<
            Pick<SFAPI.MoneyV2, 'amount' | 'currencyCode'>
          >;
          product: Pick<SFAPI.Product, 'title' | 'handle'>;
        }
      >;
      media: {
        nodes: Array<
          | ({__typename: 'ExternalVideo'} & Pick<
              SFAPI.ExternalVideo,
              'id' | 'embedUrl' | 'host' | 'mediaContentType' | 'alt'
            > & {previewImage?: SFAPI.Maybe<Pick<SFAPI.Image, 'url'>>})
          | ({__typename: 'MediaImage'} & Pick<
              SFAPI.MediaImage,
              'id' | 'mediaContentType' | 'alt'
            > & {
                image?: SFAPI.Maybe<
                  Pick<SFAPI.Image, 'url' | 'width' | 'height'>
                >;
                previewImage?: SFAPI.Maybe<Pick<SFAPI.Image, 'url'>>;
              })
          | ({__typename: 'Model3d'} & Pick<
              SFAPI.Model3d,
              'id' | 'mediaContentType' | 'alt'
            > & {
                sources: Array<Pick<SFAPI.Model3dSource, 'mimeType' | 'url'>>;
                previewImage?: SFAPI.Maybe<Pick<SFAPI.Image, 'url'>>;
              })
          | ({__typename: 'Video'} & Pick<
              SFAPI.Video,
              'id' | 'mediaContentType' | 'alt'
            > & {
                sources: Array<Pick<SFAPI.VideoSource, 'mimeType' | 'url'>>;
                previewImage?: SFAPI.Maybe<Pick<SFAPI.Image, 'url'>>;
              })
        >;
      };
      variants: {
        nodes: Array<
          Pick<
            SFAPI.ProductVariant,
            'id' | 'availableForSale' | 'sku' | 'title'
          > & {
            selectedOptions: Array<
              Pick<SFAPI.SelectedOption, 'name' | 'value'>
            >;
            image?: SFAPI.Maybe<
              Pick<SFAPI.Image, 'id' | 'url' | 'altText' | 'width' | 'height'>
            >;
            price: Pick<SFAPI.MoneyV2, 'amount' | 'currencyCode'>;
            compareAtPrice?: SFAPI.Maybe<
              Pick<SFAPI.MoneyV2, 'amount' | 'currencyCode'>
            >;
            unitPrice?: SFAPI.Maybe<
              Pick<SFAPI.MoneyV2, 'amount' | 'currencyCode'>
            >;
            product: Pick<SFAPI.Product, 'title' | 'handle'>;
          }
        >;
      };
      seo: Pick<SFAPI.Seo, 'description' | 'title'>;
    }
  >;
  shop: Pick<SFAPI.Shop, 'name'> & {
    primaryDomain: Pick<SFAPI.Domain, 'url'>;
    shippingPolicy?: SFAPI.Maybe<Pick<SFAPI.ShopPolicy, 'body' | 'handle'>>;
    refundPolicy?: SFAPI.Maybe<Pick<SFAPI.ShopPolicy, 'body' | 'handle'>>;
  };
};

export type ProductRecommendationsQueryVariables = SFAPI.Exact<{
  productId: SFAPI.Scalars['ID'];
  count?: SFAPI.InputMaybe<SFAPI.Scalars['Int']>;
  country?: SFAPI.InputMaybe<SFAPI.CountryCode>;
  language?: SFAPI.InputMaybe<SFAPI.LanguageCode>;
}>;

export type ProductRecommendationsQuery = {
  recommended?: SFAPI.Maybe<
    Array<
      Pick<SFAPI.Product, 'id' | 'title' | 'publishedAt' | 'handle'> & {
        variants: {
          nodes: Array<
            Pick<SFAPI.ProductVariant, 'id'> & {
              image?: SFAPI.Maybe<
                Pick<SFAPI.Image, 'url' | 'altText' | 'width' | 'height'>
              >;
              price: Pick<SFAPI.MoneyV2, 'amount' | 'currencyCode'>;
              compareAtPrice?: SFAPI.Maybe<
                Pick<SFAPI.MoneyV2, 'amount' | 'currencyCode'>
              >;
              selectedOptions: Array<
                Pick<SFAPI.SelectedOption, 'name' | 'value'>
              >;
              product: Pick<SFAPI.Product, 'handle' | 'title'>;
            }
          >;
        };
      }
    >
  >;
  additional: {
    nodes: Array<
      Pick<SFAPI.Product, 'id' | 'title' | 'publishedAt' | 'handle'> & {
        variants: {
          nodes: Array<
            Pick<SFAPI.ProductVariant, 'id'> & {
              image?: SFAPI.Maybe<
                Pick<SFAPI.Image, 'url' | 'altText' | 'width' | 'height'>
              >;
              price: Pick<SFAPI.MoneyV2, 'amount' | 'currencyCode'>;
              compareAtPrice?: SFAPI.Maybe<
                Pick<SFAPI.MoneyV2, 'amount' | 'currencyCode'>
              >;
              selectedOptions: Array<
                Pick<SFAPI.SelectedOption, 'name' | 'value'>
              >;
              product: Pick<SFAPI.Product, 'handle' | 'title'>;
            }
          >;
        };
      }
    >;
  };
};

export type AllProductsQueryVariables = SFAPI.Exact<{
  country?: SFAPI.InputMaybe<SFAPI.CountryCode>;
  language?: SFAPI.InputMaybe<SFAPI.LanguageCode>;
  first?: SFAPI.InputMaybe<SFAPI.Scalars['Int']>;
  last?: SFAPI.InputMaybe<SFAPI.Scalars['Int']>;
  startCursor?: SFAPI.InputMaybe<SFAPI.Scalars['String']>;
  endCursor?: SFAPI.InputMaybe<SFAPI.Scalars['String']>;
}>;

export type AllProductsQuery = {
  products: {
    nodes: Array<
      Pick<SFAPI.Product, 'id' | 'title' | 'publishedAt' | 'handle'> & {
        variants: {
          nodes: Array<
            Pick<SFAPI.ProductVariant, 'id'> & {
              image?: SFAPI.Maybe<
                Pick<SFAPI.Image, 'url' | 'altText' | 'width' | 'height'>
              >;
              price: Pick<SFAPI.MoneyV2, 'amount' | 'currencyCode'>;
              compareAtPrice?: SFAPI.Maybe<
                Pick<SFAPI.MoneyV2, 'amount' | 'currencyCode'>
              >;
              selectedOptions: Array<
                Pick<SFAPI.SelectedOption, 'name' | 'value'>
              >;
              product: Pick<SFAPI.Product, 'handle' | 'title'>;
            }
          >;
        };
      }
    >;
    pageInfo: Pick<
      SFAPI.PageInfo,
      'hasPreviousPage' | 'hasNextPage' | 'startCursor' | 'endCursor'
    >;
  };
};

export type SearchQueryVariables = SFAPI.Exact<{
  searchTerm?: SFAPI.InputMaybe<SFAPI.Scalars['String']>;
  country?: SFAPI.InputMaybe<SFAPI.CountryCode>;
  language?: SFAPI.InputMaybe<SFAPI.LanguageCode>;
  pageBy: SFAPI.Scalars['Int'];
  after?: SFAPI.InputMaybe<SFAPI.Scalars['String']>;
}>;

export type SearchQuery = {
  products: {
    nodes: Array<
      Pick<SFAPI.Product, 'id' | 'title' | 'publishedAt' | 'handle'> & {
        variants: {
          nodes: Array<
            Pick<SFAPI.ProductVariant, 'id'> & {
              image?: SFAPI.Maybe<
                Pick<SFAPI.Image, 'url' | 'altText' | 'width' | 'height'>
              >;
              price: Pick<SFAPI.MoneyV2, 'amount' | 'currencyCode'>;
              compareAtPrice?: SFAPI.Maybe<
                Pick<SFAPI.MoneyV2, 'amount' | 'currencyCode'>
              >;
              selectedOptions: Array<
                Pick<SFAPI.SelectedOption, 'name' | 'value'>
              >;
              product: Pick<SFAPI.Product, 'handle' | 'title'>;
            }
          >;
        };
      }
    >;
    pageInfo: Pick<
      SFAPI.PageInfo,
      'startCursor' | 'endCursor' | 'hasNextPage' | 'hasPreviousPage'
    >;
  };
};

export type SearchNoResultQueryVariables = SFAPI.Exact<{
  country?: SFAPI.InputMaybe<SFAPI.CountryCode>;
  language?: SFAPI.InputMaybe<SFAPI.LanguageCode>;
  pageBy: SFAPI.Scalars['Int'];
}>;

export type SearchNoResultQuery = {
  featuredCollections: {
    nodes: Array<
      Pick<SFAPI.Collection, 'id' | 'title' | 'handle'> & {
        image?: SFAPI.Maybe<
          Pick<SFAPI.Image, 'altText' | 'width' | 'height' | 'url'>
        >;
      }
    >;
  };
  featuredProducts: {
    nodes: Array<
      Pick<SFAPI.Product, 'id' | 'title' | 'publishedAt' | 'handle'> & {
        variants: {
          nodes: Array<
            Pick<SFAPI.ProductVariant, 'id'> & {
              image?: SFAPI.Maybe<
                Pick<SFAPI.Image, 'url' | 'altText' | 'width' | 'height'>
              >;
              price: Pick<SFAPI.MoneyV2, 'amount' | 'currencyCode'>;
              compareAtPrice?: SFAPI.Maybe<
                Pick<SFAPI.MoneyV2, 'amount' | 'currencyCode'>
              >;
              selectedOptions: Array<
                Pick<SFAPI.SelectedOption, 'name' | 'value'>
              >;
              product: Pick<SFAPI.Product, 'handle' | 'title'>;
            }
          >;
        };
      }
    >;
  };
};

export type SitemapsQueryVariables = SFAPI.Exact<{
  urlLimits?: SFAPI.InputMaybe<SFAPI.Scalars['Int']>;
  language?: SFAPI.InputMaybe<SFAPI.LanguageCode>;
}>;

export type SitemapsQuery = {
  products: {
    nodes: Array<
      Pick<
        SFAPI.Product,
        'updatedAt' | 'handle' | 'onlineStoreUrl' | 'title'
      > & {featuredImage?: SFAPI.Maybe<Pick<SFAPI.Image, 'url' | 'altText'>>}
    >;
  };
  collections: {
    nodes: Array<
      Pick<SFAPI.Collection, 'updatedAt' | 'handle' | 'onlineStoreUrl'>
    >;
  };
  pages: {
    nodes: Array<Pick<SFAPI.Page, 'updatedAt' | 'handle' | 'onlineStoreUrl'>>;
  };
};

interface GeneratedQueryTypes {
  '#graphql\n  query layoutMenus(\n    $language: LanguageCode\n    $headerMenuHandle: String!\n    $footerMenuHandle: String!\n  ) @inContext(language: $language) {\n    shop {\n      id\n      name\n      description\n      primaryDomain {\n        url\n      }\n      brand {\n       logo {\n         image {\n          url\n         }\n       }\n     }\n    }\n    headerMenu: menu(handle: $headerMenuHandle) {\n      id\n      items {\n        ...MenuItem\n        items {\n          ...MenuItem\n        }\n      }\n    }\n    footerMenu: menu(handle: $footerMenuHandle) {\n      id\n      items {\n        ...MenuItem\n        items {\n          ...MenuItem\n        }\n      }\n    }\n  }\n  fragment MenuItem on MenuItem {\n    id\n    resourceId\n    tags\n    title\n    type\n    url\n  }\n': {
    return: LayoutMenusQuery;
    variables: LayoutMenusQueryVariables;
  };
  '#graphql\n  query CartQuery($cartId: ID!, $country: CountryCode, $language: LanguageCode)\n    @inContext(country: $country, language: $language) {\n    cart(id: $cartId) {\n      ...CartFragment\n    }\n  }\n\n  fragment CartFragment on Cart {\n    id\n    checkoutUrl\n    totalQuantity\n    buyerIdentity {\n      countryCode\n      customer {\n        id\n        email\n        firstName\n        lastName\n        displayName\n      }\n      email\n      phone\n    }\n    lines(first: 100) {\n      edges {\n        node {\n          id\n          quantity\n          attributes {\n            key\n            value\n          }\n          cost {\n            totalAmount {\n              amount\n              currencyCode\n            }\n            amountPerQuantity {\n              amount\n              currencyCode\n            }\n            compareAtAmountPerQuantity {\n              amount\n              currencyCode\n            }\n          }\n          merchandise {\n            ... on ProductVariant {\n              id\n              availableForSale\n              compareAtPrice {\n                ...MoneyFragment\n              }\n              price {\n                ...MoneyFragment\n              }\n              requiresShipping\n              title\n              image {\n                ...ImageFragment\n              }\n              product {\n                handle\n                title\n                id\n              }\n              selectedOptions {\n                name\n                value\n              }\n            }\n          }\n        }\n      }\n    }\n    cost {\n      subtotalAmount {\n        ...MoneyFragment\n      }\n      totalAmount {\n        ...MoneyFragment\n      }\n      totalDutyAmount {\n        ...MoneyFragment\n      }\n      totalTaxAmount {\n        ...MoneyFragment\n      }\n    }\n    note\n    attributes {\n      key\n      value\n    }\n    discountCodes {\n      code\n    }\n  }\n\n  fragment MoneyFragment on MoneyV2 {\n    currencyCode\n    amount\n  }\n\n  fragment ImageFragment on Image {\n    id\n    url\n    altText\n    width\n    height\n  }\n': {
    return: CartQueryQuery;
    variables: CartQueryQueryVariables;
  };
  '#graphql\n  query collectionContentQuery($handle: String, $country: CountryCode, $language: LanguageCode)\n  @inContext(country: $country, language: $language) {\n    hero: collection(handle: $handle) {\n      ...CollectionContent\n    }\n    shop {\n      name\n      description\n    }\n  }\n  #graphql\n  fragment CollectionContent on Collection {\n    id\n    handle\n    title\n    descriptionHtml\n    heading: metafield(namespace: "hero", key: "title") {\n      value\n    }\n    byline: metafield(namespace: "hero", key: "byline") {\n      value\n    }\n    cta: metafield(namespace: "hero", key: "cta") {\n      value\n    }\n    spread: metafield(namespace: "hero", key: "spread") {\n      reference {\n        ...Media\n      }\n    }\n    spreadSecondary: metafield(namespace: "hero", key: "spread_secondary") {\n      reference {\n        ...Media\n      }\n    }\n  }\n  #graphql\n  fragment Media on Media {\n    __typename\n    mediaContentType\n    alt\n    previewImage {\n      url\n    }\n    ... on MediaImage {\n      id\n      image {\n        url\n        width\n        height\n      }\n    }\n    ... on Video {\n      id\n      sources {\n        mimeType\n        url\n      }\n    }\n    ... on Model3d {\n      id\n      sources {\n        mimeType\n        url\n      }\n    }\n    ... on ExternalVideo {\n      id\n      embedUrl\n      host\n    }\n  }\n\n\n': {
    return: CollectionContentQueryQuery;
    variables: CollectionContentQueryQueryVariables;
  };
  '#graphql\n  query collectionContent($handle: String, $country: CountryCode, $language: LanguageCode)\n  @inContext(country: $country, language: $language) {\n    hero: collection(handle: $handle) {\n      ...CollectionContent\n    }\n  }\n  #graphql\n  fragment CollectionContent on Collection {\n    id\n    handle\n    title\n    descriptionHtml\n    heading: metafield(namespace: "hero", key: "title") {\n      value\n    }\n    byline: metafield(namespace: "hero", key: "byline") {\n      value\n    }\n    cta: metafield(namespace: "hero", key: "cta") {\n      value\n    }\n    spread: metafield(namespace: "hero", key: "spread") {\n      reference {\n        ...Media\n      }\n    }\n    spreadSecondary: metafield(namespace: "hero", key: "spread_secondary") {\n      reference {\n        ...Media\n      }\n    }\n  }\n  #graphql\n  fragment Media on Media {\n    __typename\n    mediaContentType\n    alt\n    previewImage {\n      url\n    }\n    ... on MediaImage {\n      id\n      image {\n        url\n        width\n        height\n      }\n    }\n    ... on Video {\n      id\n      sources {\n        mimeType\n        url\n      }\n    }\n    ... on Model3d {\n      id\n      sources {\n        mimeType\n        url\n      }\n    }\n    ... on ExternalVideo {\n      id\n      embedUrl\n      host\n    }\n  }\n\n\n': {
    return: CollectionContentQuery;
    variables: CollectionContentQueryVariables;
  };
  '#graphql\n  query homepageFeaturedProducts($country: CountryCode, $language: LanguageCode)\n  @inContext(country: $country, language: $language) {\n    products(first: 8) {\n      nodes {\n        ...ProductCard\n      }\n    }\n  }\n  #graphql\n  fragment ProductCard on Product {\n    id\n    title\n    publishedAt\n    handle\n    variants(first: 1) {\n      nodes {\n        id\n        image {\n          url\n          altText\n          width\n          height\n        }\n        price {\n          amount\n          currencyCode\n        }\n        compareAtPrice {\n          amount\n          currencyCode\n        }\n        selectedOptions {\n          name\n          value\n        }\n        product {\n          handle\n          title\n        }\n      }\n    }\n  }\n\n': {
    return: HomepageFeaturedProductsQuery;
    variables: HomepageFeaturedProductsQueryVariables;
  };
  '#graphql\n  query homepageFeaturedCollections($country: CountryCode, $language: LanguageCode)\n  @inContext(country: $country, language: $language) {\n    collections(\n      first: 4,\n      sortKey: UPDATED_AT\n    ) {\n      nodes {\n        id\n        title\n        handle\n        image {\n          altText\n          width\n          height\n          url\n        }\n      }\n    }\n  }\n': {
    return: HomepageFeaturedCollectionsQuery;
    variables: HomepageFeaturedCollectionsQueryVariables;
  };
  '#graphql\n  fragment Money on MoneyV2 {\n    amount\n    currencyCode\n  }\n  fragment AddressFull on MailingAddress {\n    address1\n    address2\n    city\n    company\n    country\n    countryCodeV2\n    firstName\n    formatted\n    id\n    lastName\n    name\n    phone\n    province\n    provinceCode\n    zip\n  }\n  fragment DiscountApplication on DiscountApplication {\n    value {\n      ... on MoneyV2 {\n        amount\n        currencyCode\n      }\n      ... on PricingPercentageValue {\n        percentage\n      }\n    }\n  }\n  fragment Image on Image {\n    altText\n    height\n    src: url(transform: {crop: CENTER, maxHeight: 96, maxWidth: 96, scale: 2})\n    id\n    width\n  }\n  fragment ProductVariant on ProductVariant {\n    id\n    image {\n      ...Image\n    }\n    price {\n      ...Money\n    }\n    product {\n      handle\n    }\n    sku\n    title\n  }\n  fragment LineItemFull on OrderLineItem {\n    title\n    quantity\n    discountAllocations {\n      allocatedAmount {\n        ...Money\n      }\n      discountApplication {\n        ...DiscountApplication\n      }\n    }\n    originalTotalPrice {\n      ...Money\n    }\n    discountedTotalPrice {\n      ...Money\n    }\n    variant {\n      ...ProductVariant\n    }\n  }\n\n  query CustomerOrder(\n    $country: CountryCode\n    $language: LanguageCode\n    $orderId: ID!\n  ) @inContext(country: $country, language: $language) {\n    node(id: $orderId) {\n      ... on Order {\n        id\n        name\n        orderNumber\n        processedAt\n        fulfillmentStatus\n        totalTax {\n          ...Money\n        }\n        totalPrice {\n          ...Money\n        }\n        subtotalPrice {\n          ...Money\n        }\n        shippingAddress {\n          ...AddressFull\n        }\n        discountApplications(first: 100) {\n          nodes {\n            ...DiscountApplication\n          }\n        }\n        lineItems(first: 100) {\n          nodes {\n            ...LineItemFull\n          }\n        }\n      }\n    }\n  }\n': {
    return: CustomerOrderQuery;
    variables: CustomerOrderQueryVariables;
  };
  '#graphql\n  query CustomerDetails(\n    $customerAccessToken: String!\n    $country: CountryCode\n    $language: LanguageCode\n  ) @inContext(country: $country, language: $language) {\n    customer(customerAccessToken: $customerAccessToken) {\n      firstName\n      lastName\n      phone\n      email\n      defaultAddress {\n        id\n        formatted\n        firstName\n        lastName\n        company\n        address1\n        address2\n        country\n        province\n        city\n        zip\n        phone\n      }\n      addresses(first: 6) {\n        edges {\n          node {\n            id\n            formatted\n            firstName\n            lastName\n            company\n            address1\n            address2\n            country\n            province\n            city\n            zip\n            phone\n          }\n        }\n      }\n      orders(first: 250, sortKey: PROCESSED_AT, reverse: true) {\n        edges {\n          node {\n            id\n            orderNumber\n            processedAt\n            financialStatus\n            fulfillmentStatus\n            currentTotalPrice {\n              amount\n              currencyCode\n            }\n            lineItems(first: 2) {\n              edges {\n                node {\n                  variant {\n                    image {\n                      url\n                      altText\n                      height\n                      width\n                    }\n                  }\n                  title\n                }\n              }\n            }\n          }\n        }\n      }\n    }\n  }\n': {
    return: CustomerDetailsQuery;
    variables: CustomerDetailsQueryVariables;
  };
  '#graphql\n  query CollectionDetails(\n    $handle: String!\n    $country: CountryCode\n    $language: LanguageCode\n    $pageBy: Int!\n    $cursor: String\n    $filters: [ProductFilter!]\n    $sortKey: ProductCollectionSortKeys!\n    $reverse: Boolean\n  ) @inContext(country: $country, language: $language) {\n    collection(handle: $handle) {\n      id\n      handle\n      title\n      description\n      seo {\n        description\n        title\n      }\n      image {\n        id\n        url\n        width\n        height\n        altText\n      }\n      products(\n        first: $pageBy,\n        after: $cursor,\n        filters: $filters,\n        sortKey: $sortKey,\n        reverse: $reverse\n      ) {\n        filters {\n          id\n          label\n          type\n          values {\n            id\n            label\n            count\n            input\n          }\n        }\n        nodes {\n          ...ProductCard\n        }\n        pageInfo {\n          hasNextPage\n          endCursor\n        }\n      }\n    }\n    collections(first: 100) {\n      edges {\n        node {\n          title\n          handle\n        }\n      }\n    }\n  }\n  #graphql\n  fragment ProductCard on Product {\n    id\n    title\n    publishedAt\n    handle\n    variants(first: 1) {\n      nodes {\n        id\n        image {\n          url\n          altText\n          width\n          height\n        }\n        price {\n          amount\n          currencyCode\n        }\n        compareAtPrice {\n          amount\n          currencyCode\n        }\n        selectedOptions {\n          name\n          value\n        }\n        product {\n          handle\n          title\n        }\n      }\n    }\n  }\n\n': {
    return: CollectionDetailsQuery;
    variables: CollectionDetailsQueryVariables;
  };
  '#graphql\n  query Collections(\n    $country: CountryCode\n    $language: LanguageCode\n    $first: Int\n    $last: Int\n    $startCursor: String\n    $endCursor: String\n  ) @inContext(country: $country, language: $language) {\n    collections(first: $first, last: $last, before: $startCursor, after: $endCursor) {\n      nodes {\n        id\n        title\n        description\n        handle\n        seo {\n          description\n          title\n        }\n        image {\n          id\n          url\n          width\n          height\n          altText\n        }\n      }\n      pageInfo {\n        hasPreviousPage\n        hasNextPage\n        startCursor\n        endCursor\n      }\n    }\n  }\n': {
    return: CollectionsQuery;
    variables: CollectionsQueryVariables;
  };
  '#graphql\n  query homepage($country: CountryCode, $language: LanguageCode)\n  @inContext(country: $country, language: $language) {\n    featuredCollections: collections(first: 3, sortKey: UPDATED_AT) {\n      nodes {\n        id\n        title\n        handle\n        image {\n          altText\n          width\n          height\n          url\n        }\n      }\n    }\n    featuredProducts: products(first: 12) {\n      nodes {\n        ...ProductCard\n      }\n    }\n  }\n  #graphql\n  fragment ProductCard on Product {\n    id\n    title\n    publishedAt\n    handle\n    variants(first: 1) {\n      nodes {\n        id\n        image {\n          url\n          altText\n          width\n          height\n        }\n        price {\n          amount\n          currencyCode\n        }\n        compareAtPrice {\n          amount\n          currencyCode\n        }\n        selectedOptions {\n          name\n          value\n        }\n        product {\n          handle\n          title\n        }\n      }\n    }\n  }\n\n': {
    return: HomepageQuery;
    variables: HomepageQueryVariables;
  };
  '#graphql\n  query ArticleDetails(\n    $language: LanguageCode\n    $blogHandle: String!\n    $articleHandle: String!\n  ) @inContext(language: $language) {\n    blog(handle: $blogHandle) {\n      articleByHandle(handle: $articleHandle) {\n        title\n        contentHtml\n        publishedAt\n        author: authorV2 {\n          name\n        }\n        image {\n          id\n          altText\n          url\n          width\n          height\n        }\n        seo {\n          description\n          title\n        }\n      }\n    }\n  }\n': {
    return: ArticleDetailsQuery;
    variables: ArticleDetailsQueryVariables;
  };
  '#graphql\nquery Blog(\n  $language: LanguageCode\n  $blogHandle: String!\n  $pageBy: Int!\n  $cursor: String\n) @inContext(language: $language) {\n  blog(handle: $blogHandle) {\n    title\n    seo {\n      title\n      description\n    }\n    articles(first: $pageBy, after: $cursor) {\n      edges {\n        node {\n          author: authorV2 {\n            name\n          }\n          contentHtml\n          handle\n          id\n          image {\n            id\n            altText\n            url\n            width\n            height\n          }\n          publishedAt\n          title\n        }\n      }\n    }\n  }\n}\n': {
    return: BlogQuery;
    variables: BlogQueryVariables;
  };
  '#graphql\n  query PageDetails($language: LanguageCode, $handle: String!)\n  @inContext(language: $language) {\n    page(handle: $handle) {\n      id\n      title\n      body\n      seo {\n        description\n        title\n      }\n    }\n  }\n': {
    return: PageDetailsQuery;
    variables: PageDetailsQueryVariables;
  };
  '#graphql\n  fragment PolicyHandle on ShopPolicy {\n    body\n    handle\n    id\n    title\n    url\n  }\n\n  query PoliciesHandleQuery(\n    $language: LanguageCode\n    $privacyPolicy: Boolean!\n    $shippingPolicy: Boolean!\n    $termsOfService: Boolean!\n    $refundPolicy: Boolean!\n  ) @inContext(language: $language) {\n    shop {\n      privacyPolicy @include(if: $privacyPolicy) {\n        ...PolicyHandle\n      }\n      shippingPolicy @include(if: $shippingPolicy) {\n        ...PolicyHandle\n      }\n      termsOfService @include(if: $termsOfService) {\n        ...PolicyHandle\n      }\n      refundPolicy @include(if: $refundPolicy) {\n        ...PolicyHandle\n      }\n    }\n  }\n': {
    return: PoliciesHandleQueryQuery;
    variables: PoliciesHandleQueryQueryVariables;
  };
  '#graphql\n  fragment PolicyIndex on ShopPolicy {\n    id\n    title\n    handle\n  }\n\n  query PoliciesIndexQuery {\n    shop {\n      privacyPolicy {\n        ...PolicyIndex\n      }\n      shippingPolicy {\n        ...PolicyIndex\n      }\n      termsOfService {\n        ...PolicyIndex\n      }\n      refundPolicy {\n        ...PolicyIndex\n      }\n      subscriptionPolicy {\n        id\n        title\n        handle\n      }\n    }\n  }\n': {
    return: PoliciesIndexQueryQuery;
    variables: PoliciesIndexQueryQueryVariables;
  };
  '#graphql\n  query Product(\n    $country: CountryCode\n    $language: LanguageCode\n    $handle: String!\n    $selectedOptions: [SelectedOptionInput!]!\n  ) @inContext(country: $country, language: $language) {\n    product(handle: $handle) {\n      id\n      title\n      vendor\n      handle\n      descriptionHtml\n      description\n      options {\n        name\n        values\n      }\n      selectedVariant: variantBySelectedOptions(selectedOptions: $selectedOptions) {\n        ...ProductVariantFragment\n      }\n      media(first: 7) {\n        nodes {\n          ...Media\n        }\n      }\n      variants(first: 1) {\n        nodes {\n          ...ProductVariantFragment\n        }\n      }\n      seo {\n        description\n        title\n      }\n    }\n    shop {\n      name\n      primaryDomain {\n        url\n      }\n      shippingPolicy {\n        body\n        handle\n      }\n      refundPolicy {\n        body\n        handle\n      }\n    }\n  }\n  #graphql\n  fragment Media on Media {\n    __typename\n    mediaContentType\n    alt\n    previewImage {\n      url\n    }\n    ... on MediaImage {\n      id\n      image {\n        url\n        width\n        height\n      }\n    }\n    ... on Video {\n      id\n      sources {\n        mimeType\n        url\n      }\n    }\n    ... on Model3d {\n      id\n      sources {\n        mimeType\n        url\n      }\n    }\n    ... on ExternalVideo {\n      id\n      embedUrl\n      host\n    }\n  }\n\n  #graphql\n  fragment ProductVariantFragment on ProductVariant {\n    id\n    availableForSale\n    selectedOptions {\n      name\n      value\n    }\n    image {\n      id\n      url\n      altText\n      width\n      height\n    }\n    price {\n      amount\n      currencyCode\n    }\n    compareAtPrice {\n      amount\n      currencyCode\n    }\n    sku\n    title\n    unitPrice {\n      amount\n      currencyCode\n    }\n    product {\n      title\n      handle\n    }\n  }\n\n': {
    return: ProductQuery;
    variables: ProductQueryVariables;
  };
  '#graphql\n  query productRecommendations(\n    $productId: ID!\n    $count: Int\n    $country: CountryCode\n    $language: LanguageCode\n  ) @inContext(country: $country, language: $language) {\n    recommended: productRecommendations(productId: $productId) {\n      ...ProductCard\n    }\n    additional: products(first: $count, sortKey: BEST_SELLING) {\n      nodes {\n        ...ProductCard\n      }\n    }\n  }\n  #graphql\n  fragment ProductCard on Product {\n    id\n    title\n    publishedAt\n    handle\n    variants(first: 1) {\n      nodes {\n        id\n        image {\n          url\n          altText\n          width\n          height\n        }\n        price {\n          amount\n          currencyCode\n        }\n        compareAtPrice {\n          amount\n          currencyCode\n        }\n        selectedOptions {\n          name\n          value\n        }\n        product {\n          handle\n          title\n        }\n      }\n    }\n  }\n\n': {
    return: ProductRecommendationsQuery;
    variables: ProductRecommendationsQueryVariables;
  };
  '#graphql\n  query AllProducts(\n    $country: CountryCode\n    $language: LanguageCode\n    $first: Int\n    $last: Int\n    $startCursor: String\n    $endCursor: String\n  ) @inContext(country: $country, language: $language) {\n    products(first: $first, last: $last, before: $startCursor, after: $endCursor) {\n      nodes {\n        ...ProductCard\n      }\n      pageInfo {\n        hasPreviousPage\n        hasNextPage\n        startCursor\n        endCursor\n      }\n    }\n  }\n  #graphql\n  fragment ProductCard on Product {\n    id\n    title\n    publishedAt\n    handle\n    variants(first: 1) {\n      nodes {\n        id\n        image {\n          url\n          altText\n          width\n          height\n        }\n        price {\n          amount\n          currencyCode\n        }\n        compareAtPrice {\n          amount\n          currencyCode\n        }\n        selectedOptions {\n          name\n          value\n        }\n        product {\n          handle\n          title\n        }\n      }\n    }\n  }\n\n': {
    return: AllProductsQuery;
    variables: AllProductsQueryVariables;
  };
  '#graphql\n  #graphql\n  fragment ProductCard on Product {\n    id\n    title\n    publishedAt\n    handle\n    variants(first: 1) {\n      nodes {\n        id\n        image {\n          url\n          altText\n          width\n          height\n        }\n        price {\n          amount\n          currencyCode\n        }\n        compareAtPrice {\n          amount\n          currencyCode\n        }\n        selectedOptions {\n          name\n          value\n        }\n        product {\n          handle\n          title\n        }\n      }\n    }\n  }\n\n  query search(\n    $searchTerm: String\n    $country: CountryCode\n    $language: LanguageCode\n    $pageBy: Int!\n    $after: String\n  ) @inContext(country: $country, language: $language) {\n    products(\n      first: $pageBy\n      sortKey: RELEVANCE\n      query: $searchTerm\n      after: $after\n    ) {\n      nodes {\n        ...ProductCard\n      }\n      pageInfo {\n        startCursor\n        endCursor\n        hasNextPage\n        hasPreviousPage\n      }\n    }\n  }\n': {
    return: SearchQuery;
    variables: SearchQueryVariables;
  };
  '#graphql\n  query searchNoResult(\n    $country: CountryCode\n    $language: LanguageCode\n    $pageBy: Int!\n  ) @inContext(country: $country, language: $language) {\n    featuredCollections: collections(first: 3, sortKey: UPDATED_AT) {\n      nodes {\n        id\n        title\n        handle\n        image {\n          altText\n          width\n          height\n          url\n        }\n      }\n    }\n    featuredProducts: products(first: $pageBy) {\n      nodes {\n        ...ProductCard\n      }\n    }\n  }\n  #graphql\n  fragment ProductCard on Product {\n    id\n    title\n    publishedAt\n    handle\n    variants(first: 1) {\n      nodes {\n        id\n        image {\n          url\n          altText\n          width\n          height\n        }\n        price {\n          amount\n          currencyCode\n        }\n        compareAtPrice {\n          amount\n          currencyCode\n        }\n        selectedOptions {\n          name\n          value\n        }\n        product {\n          handle\n          title\n        }\n      }\n    }\n  }\n\n': {
    return: SearchNoResultQuery;
    variables: SearchNoResultQueryVariables;
  };
  '#graphql\n  query sitemaps($urlLimits: Int, $language: LanguageCode)\n  @inContext(language: $language) {\n    products(\n      first: $urlLimits\n      query: "published_status:\'online_store:visible\'"\n    ) {\n      nodes {\n        updatedAt\n        handle\n        onlineStoreUrl\n        title\n        featuredImage {\n          url\n          altText\n        }\n      }\n    }\n    collections(\n      first: $urlLimits\n      query: "published_status:\'online_store:visible\'"\n    ) {\n      nodes {\n        updatedAt\n        handle\n        onlineStoreUrl\n      }\n    }\n    pages(first: $urlLimits, query: "published_status:\'published\'") {\n      nodes {\n        updatedAt\n        handle\n        onlineStoreUrl\n      }\n    }\n  }\n': {
    return: SitemapsQuery;
    variables: SitemapsQueryVariables;
  };
}

interface GeneratedMutationTypes {
  '#graphql\n  mutation customerActivate($id: ID!, $input: CustomerActivateInput!) {\n    customerActivate(id: $id, input: $input) {\n      customerAccessToken {\n        accessToken\n        expiresAt\n      }\n      customerUserErrors {\n        code\n        field\n        message\n      }\n    }\n  }\n': {
    return: CustomerActivateMutation;
    variables: CustomerActivateMutationVariables;
  };
  '#graphql\n  mutation customerAddressUpdate(\n    $address: MailingAddressInput!\n    $customerAccessToken: String!\n    $id: ID!\n  ) {\n    customerAddressUpdate(\n      address: $address\n      customerAccessToken: $customerAccessToken\n      id: $id\n    ) {\n      customerUserErrors {\n        code\n        field\n        message\n      }\n    }\n  }\n': {
    return: CustomerAddressUpdateMutation;
    variables: CustomerAddressUpdateMutationVariables;
  };
  '#graphql\n  mutation customerAddressDelete($customerAccessToken: String!, $id: ID!) {\n    customerAddressDelete(customerAccessToken: $customerAccessToken, id: $id) {\n      customerUserErrors {\n        code\n        field\n        message\n      }\n      deletedCustomerAddressId\n    }\n  }\n': {
    return: CustomerAddressDeleteMutation;
    variables: CustomerAddressDeleteMutationVariables;
  };
  '#graphql\n  mutation customerDefaultAddressUpdate(\n    $addressId: ID!\n    $customerAccessToken: String!\n  ) {\n    customerDefaultAddressUpdate(\n      addressId: $addressId\n      customerAccessToken: $customerAccessToken\n    ) {\n      customerUserErrors {\n        code\n        field\n        message\n      }\n    }\n  }\n': {
    return: CustomerDefaultAddressUpdateMutation;
    variables: CustomerDefaultAddressUpdateMutationVariables;
  };
  '#graphql\n  mutation customerAddressCreate(\n    $address: MailingAddressInput!\n    $customerAccessToken: String!\n  ) {\n    customerAddressCreate(\n      address: $address\n      customerAccessToken: $customerAccessToken\n    ) {\n      customerAddress {\n        id\n      }\n      customerUserErrors {\n        code\n        field\n        message\n      }\n    }\n  }\n': {
    return: CustomerAddressCreateMutation;
    variables: CustomerAddressCreateMutationVariables;
  };
  '#graphql\n  mutation customerUpdate($customerAccessToken: String!, $customer: CustomerUpdateInput!) {\n    customerUpdate(customerAccessToken: $customerAccessToken, customer: $customer) {\n      customerUserErrors {\n        code\n        field\n        message\n      }\n    }\n  }\n  ': {
    return: CustomerUpdateMutation;
    variables: CustomerUpdateMutationVariables;
  };
  '#graphql\n  mutation customerAccessTokenCreate($input: CustomerAccessTokenCreateInput!) {\n    customerAccessTokenCreate(input: $input) {\n      customerUserErrors {\n        code\n        field\n        message\n      }\n      customerAccessToken {\n        accessToken\n        expiresAt\n      }\n    }\n  }\n': {
    return: CustomerAccessTokenCreateMutation;
    variables: CustomerAccessTokenCreateMutationVariables;
  };
  '#graphql\n  mutation customerRecover($email: String!) {\n    customerRecover(email: $email) {\n      customerUserErrors {\n        code\n        field\n        message\n      }\n    }\n  }\n': {
    return: CustomerRecoverMutation;
    variables: CustomerRecoverMutationVariables;
  };
  '#graphql\n  mutation customerCreate($input: CustomerCreateInput!) {\n    customerCreate(input: $input) {\n      customer {\n        id\n      }\n      customerUserErrors {\n        code\n        field\n        message\n      }\n    }\n  }\n': {
    return: CustomerCreateMutation;
    variables: CustomerCreateMutationVariables;
  };
  '#graphql\n  mutation customerReset($id: ID!, $input: CustomerResetInput!) {\n    customerReset(id: $id, input: $input) {\n      customerAccessToken {\n        accessToken\n        expiresAt\n      }\n      customerUserErrors {\n        code\n        field\n        message\n      }\n    }\n  }\n': {
    return: CustomerResetMutation;
    variables: CustomerResetMutationVariables;
  };
  '#graphql\n  mutation cartDiscountCodesUpdate($cartId: ID!, $discountCodes: [String!], $country: CountryCode = ZZ)\n    @inContext(country: $country) {\n    cartDiscountCodesUpdate(cartId: $cartId, discountCodes: $discountCodes) {\n      cart {\n        id\n        discountCodes {\n          code\n        }\n      }\n      errors: userErrors {\n        field\n        message\n      }\n    }\n  }\n': {
    return: CartDiscountCodesUpdateMutation;
    variables: CartDiscountCodesUpdateMutationVariables;
  };
}

declare module '@shopify/hydrogen' {
  interface QueryTypes extends GeneratedQueryTypes {}
  interface MutationTypes extends GeneratedMutationTypes {}
}
