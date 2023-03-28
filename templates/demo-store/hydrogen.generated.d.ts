/* eslint-disable eslint-comments/disable-enable-pair */
/* eslint-disable eslint-comments/no-unlimited-disable */
/* eslint-disable */
import * as HydrogenStorefront from '@shopify/hydrogen-react/storefront-api-types';

type Media_ExternalVideo_Fragment = {
  __typename: 'ExternalVideo';
  id: string;
  embedUrl: any;
  host: HydrogenStorefront.MediaHost;
  mediaContentType: HydrogenStorefront.MediaContentType;
  alt?: string | null;
  previewImage?: {url: any} | null;
};

type Media_MediaImage_Fragment = {
  __typename: 'MediaImage';
  id: string;
  mediaContentType: HydrogenStorefront.MediaContentType;
  alt?: string | null;
  image?: {url: any; width?: number | null; height?: number | null} | null;
  previewImage?: {url: any} | null;
};

type Media_Model3d_Fragment = {
  __typename: 'Model3d';
  id: string;
  mediaContentType: HydrogenStorefront.MediaContentType;
  alt?: string | null;
  sources: Array<{mimeType: string; url: string}>;
  previewImage?: {url: any} | null;
};

type Media_Video_Fragment = {
  __typename: 'Video';
  id: string;
  mediaContentType: HydrogenStorefront.MediaContentType;
  alt?: string | null;
  sources: Array<{mimeType: string; url: string}>;
  previewImage?: {url: any} | null;
};

export type MediaFragment =
  | Media_ExternalVideo_Fragment
  | Media_MediaImage_Fragment
  | Media_Model3d_Fragment
  | Media_Video_Fragment;

export type ProductCardFragment = {
  id: string;
  title: string;
  publishedAt: any;
  handle: string;
  variants: {
    nodes: Array<{
      id: string;
      image?: {
        url: any;
        altText?: string | null;
        width?: number | null;
        height?: number | null;
      } | null;
      price: {amount: any; currencyCode: HydrogenStorefront.CurrencyCode};
      compareAtPrice?: {
        amount: any;
        currencyCode: HydrogenStorefront.CurrencyCode;
      } | null;
      selectedOptions: Array<{name: string; value: string}>;
      product: {handle: string; title: string};
    }>;
  };
};

export type LayoutMenusQueryVariables = HydrogenStorefront.Exact<{
  language?: HydrogenStorefront.InputMaybe<HydrogenStorefront.LanguageCode>;
  headerMenuHandle: HydrogenStorefront.Scalars['String'];
  footerMenuHandle: HydrogenStorefront.Scalars['String'];
}>;

export type LayoutMenusQuery = {
  shop: {
    id: string;
    name: string;
    description?: string | null;
    primaryDomain: {url: any};
    brand?: {logo?: {image?: {url: any} | null} | null} | null;
  };
  headerMenu?: {
    id: string;
    items: Array<{
      id: string;
      resourceId?: string | null;
      tags: Array<string>;
      title: string;
      type: HydrogenStorefront.MenuItemType;
      url?: any | null;
      items: Array<{
        id: string;
        resourceId?: string | null;
        tags: Array<string>;
        title: string;
        type: HydrogenStorefront.MenuItemType;
        url?: any | null;
      }>;
    }>;
  } | null;
  footerMenu?: {
    id: string;
    items: Array<{
      id: string;
      resourceId?: string | null;
      tags: Array<string>;
      title: string;
      type: HydrogenStorefront.MenuItemType;
      url?: any | null;
      items: Array<{
        id: string;
        resourceId?: string | null;
        tags: Array<string>;
        title: string;
        type: HydrogenStorefront.MenuItemType;
        url?: any | null;
      }>;
    }>;
  } | null;
};

export type MenuItemFragment = {
  id: string;
  resourceId?: string | null;
  tags: Array<string>;
  title: string;
  type: HydrogenStorefront.MenuItemType;
  url?: any | null;
};

export type CartQueryQueryVariables = HydrogenStorefront.Exact<{
  cartId: HydrogenStorefront.Scalars['ID'];
  country?: HydrogenStorefront.InputMaybe<HydrogenStorefront.CountryCode>;
  language?: HydrogenStorefront.InputMaybe<HydrogenStorefront.LanguageCode>;
}>;

export type CartQueryQuery = {
  cart?: {
    id: string;
    checkoutUrl: any;
    totalQuantity: number;
    note?: string | null;
    buyerIdentity: {
      countryCode?: HydrogenStorefront.CountryCode | null;
      email?: string | null;
      phone?: string | null;
      customer?: {
        id: string;
        email?: string | null;
        firstName?: string | null;
        lastName?: string | null;
        displayName: string;
      } | null;
    };
    lines: {
      edges: Array<{
        node: {
          id: string;
          quantity: number;
          attributes: Array<{key: string; value?: string | null}>;
          cost: {
            totalAmount: {
              amount: any;
              currencyCode: HydrogenStorefront.CurrencyCode;
            };
            amountPerQuantity: {
              amount: any;
              currencyCode: HydrogenStorefront.CurrencyCode;
            };
            compareAtAmountPerQuantity?: {
              amount: any;
              currencyCode: HydrogenStorefront.CurrencyCode;
            } | null;
          };
          merchandise: {
            id: string;
            availableForSale: boolean;
            requiresShipping: boolean;
            title: string;
            compareAtPrice?: {
              currencyCode: HydrogenStorefront.CurrencyCode;
              amount: any;
            } | null;
            price: {currencyCode: HydrogenStorefront.CurrencyCode; amount: any};
            image?: {
              id?: string | null;
              url: any;
              altText?: string | null;
              width?: number | null;
              height?: number | null;
            } | null;
            product: {handle: string; title: string; id: string};
            selectedOptions: Array<{name: string; value: string}>;
          };
        };
      }>;
    };
    cost: {
      subtotalAmount: {
        currencyCode: HydrogenStorefront.CurrencyCode;
        amount: any;
      };
      totalAmount: {currencyCode: HydrogenStorefront.CurrencyCode; amount: any};
      totalDutyAmount?: {
        currencyCode: HydrogenStorefront.CurrencyCode;
        amount: any;
      } | null;
      totalTaxAmount?: {
        currencyCode: HydrogenStorefront.CurrencyCode;
        amount: any;
      } | null;
    };
    attributes: Array<{key: string; value?: string | null}>;
    discountCodes: Array<{code: string}>;
  } | null;
};

export type CartFragmentFragment = {
  id: string;
  checkoutUrl: any;
  totalQuantity: number;
  note?: string | null;
  buyerIdentity: {
    countryCode?: HydrogenStorefront.CountryCode | null;
    email?: string | null;
    phone?: string | null;
    customer?: {
      id: string;
      email?: string | null;
      firstName?: string | null;
      lastName?: string | null;
      displayName: string;
    } | null;
  };
  lines: {
    edges: Array<{
      node: {
        id: string;
        quantity: number;
        attributes: Array<{key: string; value?: string | null}>;
        cost: {
          totalAmount: {
            amount: any;
            currencyCode: HydrogenStorefront.CurrencyCode;
          };
          amountPerQuantity: {
            amount: any;
            currencyCode: HydrogenStorefront.CurrencyCode;
          };
          compareAtAmountPerQuantity?: {
            amount: any;
            currencyCode: HydrogenStorefront.CurrencyCode;
          } | null;
        };
        merchandise: {
          id: string;
          availableForSale: boolean;
          requiresShipping: boolean;
          title: string;
          compareAtPrice?: {
            currencyCode: HydrogenStorefront.CurrencyCode;
            amount: any;
          } | null;
          price: {currencyCode: HydrogenStorefront.CurrencyCode; amount: any};
          image?: {
            id?: string | null;
            url: any;
            altText?: string | null;
            width?: number | null;
            height?: number | null;
          } | null;
          product: {handle: string; title: string; id: string};
          selectedOptions: Array<{name: string; value: string}>;
        };
      };
    }>;
  };
  cost: {
    subtotalAmount: {
      currencyCode: HydrogenStorefront.CurrencyCode;
      amount: any;
    };
    totalAmount: {currencyCode: HydrogenStorefront.CurrencyCode; amount: any};
    totalDutyAmount?: {
      currencyCode: HydrogenStorefront.CurrencyCode;
      amount: any;
    } | null;
    totalTaxAmount?: {
      currencyCode: HydrogenStorefront.CurrencyCode;
      amount: any;
    } | null;
  };
  attributes: Array<{key: string; value?: string | null}>;
  discountCodes: Array<{code: string}>;
};

export type MoneyFragmentFragment = {
  currencyCode: HydrogenStorefront.CurrencyCode;
  amount: any;
};

export type ImageFragmentFragment = {
  id?: string | null;
  url: any;
  altText?: string | null;
  width?: number | null;
  height?: number | null;
};

export type CustomerDetailsQueryVariables = HydrogenStorefront.Exact<{
  customerAccessToken: HydrogenStorefront.Scalars['String'];
  country?: HydrogenStorefront.InputMaybe<HydrogenStorefront.CountryCode>;
  language?: HydrogenStorefront.InputMaybe<HydrogenStorefront.LanguageCode>;
}>;

export type CustomerDetailsQuery = {
  customer?: {
    firstName?: string | null;
    lastName?: string | null;
    phone?: string | null;
    email?: string | null;
    defaultAddress?: {
      id: string;
      formatted: Array<string>;
      firstName?: string | null;
      lastName?: string | null;
      company?: string | null;
      address1?: string | null;
      address2?: string | null;
      country?: string | null;
      province?: string | null;
      city?: string | null;
      zip?: string | null;
      phone?: string | null;
    } | null;
    addresses: {
      edges: Array<{
        node: {
          id: string;
          formatted: Array<string>;
          firstName?: string | null;
          lastName?: string | null;
          company?: string | null;
          address1?: string | null;
          address2?: string | null;
          country?: string | null;
          province?: string | null;
          city?: string | null;
          zip?: string | null;
          phone?: string | null;
        };
      }>;
    };
    orders: {
      edges: Array<{
        node: {
          id: string;
          orderNumber: number;
          processedAt: any;
          financialStatus?: HydrogenStorefront.OrderFinancialStatus | null;
          fulfillmentStatus: HydrogenStorefront.OrderFulfillmentStatus;
          currentTotalPrice: {
            amount: any;
            currencyCode: HydrogenStorefront.CurrencyCode;
          };
          lineItems: {
            edges: Array<{
              node: {
                title: string;
                variant?: {
                  image?: {
                    url: any;
                    altText?: string | null;
                    height?: number | null;
                    width?: number | null;
                  } | null;
                } | null;
              };
            }>;
          };
        };
      }>;
    };
  } | null;
};

export type CustomerAddressUpdateMutationVariables = HydrogenStorefront.Exact<{
  address: HydrogenStorefront.MailingAddressInput;
  customerAccessToken: HydrogenStorefront.Scalars['String'];
  id: HydrogenStorefront.Scalars['ID'];
}>;

export type CustomerAddressUpdateMutation = {
  customerAddressUpdate?: {
    customerUserErrors: Array<{
      code?: HydrogenStorefront.CustomerErrorCode | null;
      field?: Array<string> | null;
      message: string;
    }>;
  } | null;
};

export type CustomerAddressDeleteMutationVariables = HydrogenStorefront.Exact<{
  customerAccessToken: HydrogenStorefront.Scalars['String'];
  id: HydrogenStorefront.Scalars['ID'];
}>;

export type CustomerAddressDeleteMutation = {
  customerAddressDelete?: {
    deletedCustomerAddressId?: string | null;
    customerUserErrors: Array<{
      code?: HydrogenStorefront.CustomerErrorCode | null;
      field?: Array<string> | null;
      message: string;
    }>;
  } | null;
};

export type CustomerDefaultAddressUpdateMutationVariables =
  HydrogenStorefront.Exact<{
    addressId: HydrogenStorefront.Scalars['ID'];
    customerAccessToken: HydrogenStorefront.Scalars['String'];
  }>;

export type CustomerDefaultAddressUpdateMutation = {
  customerDefaultAddressUpdate?: {
    customerUserErrors: Array<{
      code?: HydrogenStorefront.CustomerErrorCode | null;
      field?: Array<string> | null;
      message: string;
    }>;
  } | null;
};

export type CustomerAddressCreateMutationVariables = HydrogenStorefront.Exact<{
  address: HydrogenStorefront.MailingAddressInput;
  customerAccessToken: HydrogenStorefront.Scalars['String'];
}>;

export type CustomerAddressCreateMutation = {
  customerAddressCreate?: {
    customerAddress?: {id: string} | null;
    customerUserErrors: Array<{
      code?: HydrogenStorefront.CustomerErrorCode | null;
      field?: Array<string> | null;
      message: string;
    }>;
  } | null;
};

export type CustomerUpdateMutationVariables = HydrogenStorefront.Exact<{
  customerAccessToken: HydrogenStorefront.Scalars['String'];
  customer: HydrogenStorefront.CustomerUpdateInput;
}>;

export type CustomerUpdateMutation = {
  customerUpdate?: {
    customerUserErrors: Array<{
      code?: HydrogenStorefront.CustomerErrorCode | null;
      field?: Array<string> | null;
      message: string;
    }>;
  } | null;
};

export type MoneyFragment = {
  amount: any;
  currencyCode: HydrogenStorefront.CurrencyCode;
};

export type AddressFullFragment = {
  address1?: string | null;
  address2?: string | null;
  city?: string | null;
  company?: string | null;
  country?: string | null;
  countryCodeV2?: HydrogenStorefront.CountryCode | null;
  firstName?: string | null;
  formatted: Array<string>;
  id: string;
  lastName?: string | null;
  name?: string | null;
  phone?: string | null;
  province?: string | null;
  provinceCode?: string | null;
  zip?: string | null;
};

type DiscountApplication_AutomaticDiscountApplication_Fragment = {
  value:
    | {amount: any; currencyCode: HydrogenStorefront.CurrencyCode}
    | {percentage: number};
};

type DiscountApplication_DiscountCodeApplication_Fragment = {
  value:
    | {amount: any; currencyCode: HydrogenStorefront.CurrencyCode}
    | {percentage: number};
};

type DiscountApplication_ManualDiscountApplication_Fragment = {
  value:
    | {amount: any; currencyCode: HydrogenStorefront.CurrencyCode}
    | {percentage: number};
};

type DiscountApplication_ScriptDiscountApplication_Fragment = {
  value:
    | {amount: any; currencyCode: HydrogenStorefront.CurrencyCode}
    | {percentage: number};
};

export type DiscountApplicationFragment =
  | DiscountApplication_AutomaticDiscountApplication_Fragment
  | DiscountApplication_DiscountCodeApplication_Fragment
  | DiscountApplication_ManualDiscountApplication_Fragment
  | DiscountApplication_ScriptDiscountApplication_Fragment;

export type ImageFragment = {
  altText?: string | null;
  height?: number | null;
  id?: string | null;
  width?: number | null;
  src: any;
};

export type ProductVariantFragment = {
  id: string;
  sku?: string | null;
  title: string;
  image?: {
    altText?: string | null;
    height?: number | null;
    id?: string | null;
    width?: number | null;
    src: any;
  } | null;
  price: {amount: any; currencyCode: HydrogenStorefront.CurrencyCode};
  product: {handle: string};
};

export type LineItemFullFragment = {
  title: string;
  quantity: number;
  discountAllocations: Array<{
    allocatedAmount: {
      amount: any;
      currencyCode: HydrogenStorefront.CurrencyCode;
    };
    discountApplication:
      | {
          value:
            | {amount: any; currencyCode: HydrogenStorefront.CurrencyCode}
            | {percentage: number};
        }
      | {
          value:
            | {amount: any; currencyCode: HydrogenStorefront.CurrencyCode}
            | {percentage: number};
        }
      | {
          value:
            | {amount: any; currencyCode: HydrogenStorefront.CurrencyCode}
            | {percentage: number};
        }
      | {
          value:
            | {amount: any; currencyCode: HydrogenStorefront.CurrencyCode}
            | {percentage: number};
        };
  }>;
  originalTotalPrice: {
    amount: any;
    currencyCode: HydrogenStorefront.CurrencyCode;
  };
  discountedTotalPrice: {
    amount: any;
    currencyCode: HydrogenStorefront.CurrencyCode;
  };
  variant?: {
    id: string;
    sku?: string | null;
    title: string;
    image?: {
      altText?: string | null;
      height?: number | null;
      id?: string | null;
      width?: number | null;
      src: any;
    } | null;
    price: {amount: any; currencyCode: HydrogenStorefront.CurrencyCode};
    product: {handle: string};
  } | null;
};

export type CustomerOrderQueryVariables = HydrogenStorefront.Exact<{
  country?: HydrogenStorefront.InputMaybe<HydrogenStorefront.CountryCode>;
  language?: HydrogenStorefront.InputMaybe<HydrogenStorefront.LanguageCode>;
  orderId: HydrogenStorefront.Scalars['ID'];
}>;

export type CustomerOrderQuery = {
  node?:
    | {
        id: string;
        name: string;
        orderNumber: number;
        processedAt: any;
        fulfillmentStatus: HydrogenStorefront.OrderFulfillmentStatus;
        totalTaxV2?: {
          amount: any;
          currencyCode: HydrogenStorefront.CurrencyCode;
        } | null;
        totalPriceV2: {
          amount: any;
          currencyCode: HydrogenStorefront.CurrencyCode;
        };
        subtotalPriceV2?: {
          amount: any;
          currencyCode: HydrogenStorefront.CurrencyCode;
        } | null;
        shippingAddress?: {
          address1?: string | null;
          address2?: string | null;
          city?: string | null;
          company?: string | null;
          country?: string | null;
          countryCodeV2?: HydrogenStorefront.CountryCode | null;
          firstName?: string | null;
          formatted: Array<string>;
          id: string;
          lastName?: string | null;
          name?: string | null;
          phone?: string | null;
          province?: string | null;
          provinceCode?: string | null;
          zip?: string | null;
        } | null;
        discountApplications: {
          nodes: Array<
            | {
                value:
                  | {amount: any; currencyCode: HydrogenStorefront.CurrencyCode}
                  | {percentage: number};
              }
            | {
                value:
                  | {amount: any; currencyCode: HydrogenStorefront.CurrencyCode}
                  | {percentage: number};
              }
            | {
                value:
                  | {amount: any; currencyCode: HydrogenStorefront.CurrencyCode}
                  | {percentage: number};
              }
            | {
                value:
                  | {amount: any; currencyCode: HydrogenStorefront.CurrencyCode}
                  | {percentage: number};
              }
          >;
        };
        lineItems: {
          nodes: Array<{
            title: string;
            quantity: number;
            discountAllocations: Array<{
              allocatedAmount: {
                amount: any;
                currencyCode: HydrogenStorefront.CurrencyCode;
              };
              discountApplication:
                | {
                    value:
                      | {
                          amount: any;
                          currencyCode: HydrogenStorefront.CurrencyCode;
                        }
                      | {percentage: number};
                  }
                | {
                    value:
                      | {
                          amount: any;
                          currencyCode: HydrogenStorefront.CurrencyCode;
                        }
                      | {percentage: number};
                  }
                | {
                    value:
                      | {
                          amount: any;
                          currencyCode: HydrogenStorefront.CurrencyCode;
                        }
                      | {percentage: number};
                  }
                | {
                    value:
                      | {
                          amount: any;
                          currencyCode: HydrogenStorefront.CurrencyCode;
                        }
                      | {percentage: number};
                  };
            }>;
            originalTotalPrice: {
              amount: any;
              currencyCode: HydrogenStorefront.CurrencyCode;
            };
            discountedTotalPrice: {
              amount: any;
              currencyCode: HydrogenStorefront.CurrencyCode;
            };
            variant?: {
              id: string;
              sku?: string | null;
              title: string;
              image?: {
                altText?: string | null;
                height?: number | null;
                id?: string | null;
                width?: number | null;
                src: any;
              } | null;
              price: {
                amount: any;
                currencyCode: HydrogenStorefront.CurrencyCode;
              };
              product: {handle: string};
            } | null;
          }>;
        };
      }
    | {}
    | null;
};

export type CustomerActivateMutationVariables = HydrogenStorefront.Exact<{
  id: HydrogenStorefront.Scalars['ID'];
  input: HydrogenStorefront.CustomerActivateInput;
}>;

export type CustomerActivateMutation = {
  customerActivate?: {
    customerAccessToken?: {accessToken: string; expiresAt: any} | null;
    customerUserErrors: Array<{
      code?: HydrogenStorefront.CustomerErrorCode | null;
      field?: Array<string> | null;
      message: string;
    }>;
  } | null;
};

export type CustomerAccessTokenCreateMutationVariables =
  HydrogenStorefront.Exact<{
    input: HydrogenStorefront.CustomerAccessTokenCreateInput;
  }>;

export type CustomerAccessTokenCreateMutation = {
  customerAccessTokenCreate?: {
    customerUserErrors: Array<{
      code?: HydrogenStorefront.CustomerErrorCode | null;
      field?: Array<string> | null;
      message: string;
    }>;
    customerAccessToken?: {accessToken: string; expiresAt: any} | null;
  } | null;
};

export type CustomerRecoverMutationVariables = HydrogenStorefront.Exact<{
  email: HydrogenStorefront.Scalars['String'];
}>;

export type CustomerRecoverMutation = {
  customerRecover?: {
    customerUserErrors: Array<{
      code?: HydrogenStorefront.CustomerErrorCode | null;
      field?: Array<string> | null;
      message: string;
    }>;
  } | null;
};

export type CustomerCreateMutationVariables = HydrogenStorefront.Exact<{
  input: HydrogenStorefront.CustomerCreateInput;
}>;

export type CustomerCreateMutation = {
  customerCreate?: {
    customer?: {id: string} | null;
    customerUserErrors: Array<{
      code?: HydrogenStorefront.CustomerErrorCode | null;
      field?: Array<string> | null;
      message: string;
    }>;
  } | null;
};

export type CustomerResetMutationVariables = HydrogenStorefront.Exact<{
  id: HydrogenStorefront.Scalars['ID'];
  input: HydrogenStorefront.CustomerResetInput;
}>;

export type CustomerResetMutation = {
  customerReset?: {
    customerAccessToken?: {accessToken: string; expiresAt: any} | null;
    customerUserErrors: Array<{
      code?: HydrogenStorefront.CustomerErrorCode | null;
      field?: Array<string> | null;
      message: string;
    }>;
  } | null;
};

export type ErrorFragmentFragment = {
  message: string;
  field?: Array<string> | null;
  code?: HydrogenStorefront.CartErrorCode | null;
};

export type CartLinesFragmentFragment = {id: string; totalQuantity: number};

export type CartDiscountCodesUpdateMutationVariables =
  HydrogenStorefront.Exact<{
    cartId: HydrogenStorefront.Scalars['ID'];
    discountCodes?: HydrogenStorefront.InputMaybe<
      | Array<HydrogenStorefront.Scalars['String']>
      | HydrogenStorefront.Scalars['String']
    >;
    country?: HydrogenStorefront.InputMaybe<HydrogenStorefront.CountryCode>;
  }>;

export type CartDiscountCodesUpdateMutation = {
  cartDiscountCodesUpdate?: {
    cart?: {id: string; discountCodes: Array<{code: string}>} | null;
    errors: Array<{field?: Array<string> | null; message: string}>;
  } | null;
};

export type CollectionDetailsQueryVariables = HydrogenStorefront.Exact<{
  handle: HydrogenStorefront.Scalars['String'];
  country?: HydrogenStorefront.InputMaybe<HydrogenStorefront.CountryCode>;
  language?: HydrogenStorefront.InputMaybe<HydrogenStorefront.LanguageCode>;
  pageBy: HydrogenStorefront.Scalars['Int'];
  cursor?: HydrogenStorefront.InputMaybe<HydrogenStorefront.Scalars['String']>;
  filters?: HydrogenStorefront.InputMaybe<
    Array<HydrogenStorefront.ProductFilter> | HydrogenStorefront.ProductFilter
  >;
  sortKey: HydrogenStorefront.ProductCollectionSortKeys;
  reverse?: HydrogenStorefront.InputMaybe<
    HydrogenStorefront.Scalars['Boolean']
  >;
}>;

export type CollectionDetailsQuery = {
  collection?: {
    id: string;
    handle: string;
    title: string;
    description: string;
    seo: {description?: string | null; title?: string | null};
    image?: {
      id?: string | null;
      url: any;
      width?: number | null;
      height?: number | null;
      altText?: string | null;
    } | null;
    products: {
      filters: Array<{
        id: string;
        label: string;
        type: HydrogenStorefront.FilterType;
        values: Array<{id: string; label: string; count: number; input: any}>;
      }>;
      nodes: Array<{
        id: string;
        title: string;
        publishedAt: any;
        handle: string;
        variants: {
          nodes: Array<{
            id: string;
            image?: {
              url: any;
              altText?: string | null;
              width?: number | null;
              height?: number | null;
            } | null;
            price: {amount: any; currencyCode: HydrogenStorefront.CurrencyCode};
            compareAtPrice?: {
              amount: any;
              currencyCode: HydrogenStorefront.CurrencyCode;
            } | null;
            selectedOptions: Array<{name: string; value: string}>;
            product: {handle: string; title: string};
          }>;
        };
      }>;
      pageInfo: {hasNextPage: boolean; endCursor?: string | null};
    };
  } | null;
  collections: {edges: Array<{node: {title: string; handle: string}}>};
};

export type CollectionsQueryVariables = HydrogenStorefront.Exact<{
  country?: HydrogenStorefront.InputMaybe<HydrogenStorefront.CountryCode>;
  language?: HydrogenStorefront.InputMaybe<HydrogenStorefront.LanguageCode>;
  first?: HydrogenStorefront.InputMaybe<HydrogenStorefront.Scalars['Int']>;
  last?: HydrogenStorefront.InputMaybe<HydrogenStorefront.Scalars['Int']>;
  startCursor?: HydrogenStorefront.InputMaybe<
    HydrogenStorefront.Scalars['String']
  >;
  endCursor?: HydrogenStorefront.InputMaybe<
    HydrogenStorefront.Scalars['String']
  >;
}>;

export type CollectionsQuery = {
  collections: {
    nodes: Array<{
      id: string;
      title: string;
      description: string;
      handle: string;
      seo: {description?: string | null; title?: string | null};
      image?: {
        id?: string | null;
        url: any;
        width?: number | null;
        height?: number | null;
        altText?: string | null;
      } | null;
    }>;
    pageInfo: {
      hasPreviousPage: boolean;
      hasNextPage: boolean;
      startCursor?: string | null;
      endCursor?: string | null;
    };
  };
};

export type HomepageQueryVariables = HydrogenStorefront.Exact<{
  country?: HydrogenStorefront.InputMaybe<HydrogenStorefront.CountryCode>;
  language?: HydrogenStorefront.InputMaybe<HydrogenStorefront.LanguageCode>;
}>;

export type HomepageQuery = {
  featuredCollections: {
    nodes: Array<{
      id: string;
      title: string;
      handle: string;
      image?: {
        altText?: string | null;
        width?: number | null;
        height?: number | null;
        url: any;
      } | null;
    }>;
  };
  featuredProducts: {
    nodes: Array<{
      id: string;
      title: string;
      publishedAt: any;
      handle: string;
      variants: {
        nodes: Array<{
          id: string;
          image?: {
            url: any;
            altText?: string | null;
            width?: number | null;
            height?: number | null;
          } | null;
          price: {amount: any; currencyCode: HydrogenStorefront.CurrencyCode};
          compareAtPrice?: {
            amount: any;
            currencyCode: HydrogenStorefront.CurrencyCode;
          } | null;
          selectedOptions: Array<{name: string; value: string}>;
          product: {handle: string; title: string};
        }>;
      };
    }>;
  };
};

export type CollectionContentFragment = {
  id: string;
  handle: string;
  title: string;
  descriptionHtml: any;
  heading?: {value: string} | null;
  byline?: {value: string} | null;
  cta?: {value: string} | null;
  spread?: {
    reference?:
      | {
          __typename: 'MediaImage';
          id: string;
          mediaContentType: HydrogenStorefront.MediaContentType;
          alt?: string | null;
          image?: {
            url: any;
            width?: number | null;
            height?: number | null;
          } | null;
          previewImage?: {url: any} | null;
        }
      | {
          __typename: 'Video';
          id: string;
          mediaContentType: HydrogenStorefront.MediaContentType;
          alt?: string | null;
          sources: Array<{mimeType: string; url: string}>;
          previewImage?: {url: any} | null;
        }
      | {}
      | null;
  } | null;
  spreadSecondary?: {
    reference?:
      | {
          __typename: 'MediaImage';
          id: string;
          mediaContentType: HydrogenStorefront.MediaContentType;
          alt?: string | null;
          image?: {
            url: any;
            width?: number | null;
            height?: number | null;
          } | null;
          previewImage?: {url: any} | null;
        }
      | {
          __typename: 'Video';
          id: string;
          mediaContentType: HydrogenStorefront.MediaContentType;
          alt?: string | null;
          sources: Array<{mimeType: string; url: string}>;
          previewImage?: {url: any} | null;
        }
      | {}
      | null;
  } | null;
};

export type CollectionContentHeroQueryVariables = HydrogenStorefront.Exact<{
  handle?: HydrogenStorefront.InputMaybe<HydrogenStorefront.Scalars['String']>;
  country?: HydrogenStorefront.InputMaybe<HydrogenStorefront.CountryCode>;
  language?: HydrogenStorefront.InputMaybe<HydrogenStorefront.LanguageCode>;
}>;

export type CollectionContentHeroQuery = {
  hero?: {
    id: string;
    handle: string;
    title: string;
    descriptionHtml: any;
    heading?: {value: string} | null;
    byline?: {value: string} | null;
    cta?: {value: string} | null;
    spread?: {
      reference?:
        | {
            __typename: 'MediaImage';
            id: string;
            mediaContentType: HydrogenStorefront.MediaContentType;
            alt?: string | null;
            image?: {
              url: any;
              width?: number | null;
              height?: number | null;
            } | null;
            previewImage?: {url: any} | null;
          }
        | {
            __typename: 'Video';
            id: string;
            mediaContentType: HydrogenStorefront.MediaContentType;
            alt?: string | null;
            sources: Array<{mimeType: string; url: string}>;
            previewImage?: {url: any} | null;
          }
        | {}
        | null;
    } | null;
    spreadSecondary?: {
      reference?:
        | {
            __typename: 'MediaImage';
            id: string;
            mediaContentType: HydrogenStorefront.MediaContentType;
            alt?: string | null;
            image?: {
              url: any;
              width?: number | null;
              height?: number | null;
            } | null;
            previewImage?: {url: any} | null;
          }
        | {
            __typename: 'Video';
            id: string;
            mediaContentType: HydrogenStorefront.MediaContentType;
            alt?: string | null;
            sources: Array<{mimeType: string; url: string}>;
            previewImage?: {url: any} | null;
          }
        | {}
        | null;
    } | null;
  } | null;
  shop: {name: string; description?: string | null};
};

export type CollectionContentQueryVariables = HydrogenStorefront.Exact<{
  handle?: HydrogenStorefront.InputMaybe<HydrogenStorefront.Scalars['String']>;
  country?: HydrogenStorefront.InputMaybe<HydrogenStorefront.CountryCode>;
  language?: HydrogenStorefront.InputMaybe<HydrogenStorefront.LanguageCode>;
}>;

export type CollectionContentQuery = {
  hero?: {
    id: string;
    handle: string;
    title: string;
    descriptionHtml: any;
    heading?: {value: string} | null;
    byline?: {value: string} | null;
    cta?: {value: string} | null;
    spread?: {
      reference?:
        | {
            __typename: 'MediaImage';
            id: string;
            mediaContentType: HydrogenStorefront.MediaContentType;
            alt?: string | null;
            image?: {
              url: any;
              width?: number | null;
              height?: number | null;
            } | null;
            previewImage?: {url: any} | null;
          }
        | {
            __typename: 'Video';
            id: string;
            mediaContentType: HydrogenStorefront.MediaContentType;
            alt?: string | null;
            sources: Array<{mimeType: string; url: string}>;
            previewImage?: {url: any} | null;
          }
        | {}
        | null;
    } | null;
    spreadSecondary?: {
      reference?:
        | {
            __typename: 'MediaImage';
            id: string;
            mediaContentType: HydrogenStorefront.MediaContentType;
            alt?: string | null;
            image?: {
              url: any;
              width?: number | null;
              height?: number | null;
            } | null;
            previewImage?: {url: any} | null;
          }
        | {
            __typename: 'Video';
            id: string;
            mediaContentType: HydrogenStorefront.MediaContentType;
            alt?: string | null;
            sources: Array<{mimeType: string; url: string}>;
            previewImage?: {url: any} | null;
          }
        | {}
        | null;
    } | null;
  } | null;
};

export type HomepageFeaturedProductsQueryVariables = HydrogenStorefront.Exact<{
  country?: HydrogenStorefront.InputMaybe<HydrogenStorefront.CountryCode>;
  language?: HydrogenStorefront.InputMaybe<HydrogenStorefront.LanguageCode>;
}>;

export type HomepageFeaturedProductsQuery = {
  products: {
    nodes: Array<{
      id: string;
      title: string;
      publishedAt: any;
      handle: string;
      variants: {
        nodes: Array<{
          id: string;
          image?: {
            url: any;
            altText?: string | null;
            width?: number | null;
            height?: number | null;
          } | null;
          price: {amount: any; currencyCode: HydrogenStorefront.CurrencyCode};
          compareAtPrice?: {
            amount: any;
            currencyCode: HydrogenStorefront.CurrencyCode;
          } | null;
          selectedOptions: Array<{name: string; value: string}>;
          product: {handle: string; title: string};
        }>;
      };
    }>;
  };
};

export type HomepageFeaturedCollectionsQueryVariables =
  HydrogenStorefront.Exact<{
    country?: HydrogenStorefront.InputMaybe<HydrogenStorefront.CountryCode>;
    language?: HydrogenStorefront.InputMaybe<HydrogenStorefront.LanguageCode>;
  }>;

export type HomepageFeaturedCollectionsQuery = {
  collections: {
    nodes: Array<{
      id: string;
      title: string;
      handle: string;
      image?: {
        altText?: string | null;
        width?: number | null;
        height?: number | null;
        url: any;
      } | null;
    }>;
  };
};

export type ArticleDetailsQueryVariables = HydrogenStorefront.Exact<{
  language?: HydrogenStorefront.InputMaybe<HydrogenStorefront.LanguageCode>;
  blogHandle: HydrogenStorefront.Scalars['String'];
  articleHandle: HydrogenStorefront.Scalars['String'];
}>;

export type ArticleDetailsQuery = {
  blog?: {
    articleByHandle?: {
      title: string;
      contentHtml: any;
      publishedAt: any;
      author?: {name: string} | null;
      image?: {
        id?: string | null;
        altText?: string | null;
        url: any;
        width?: number | null;
        height?: number | null;
      } | null;
      seo?: {description?: string | null; title?: string | null} | null;
    } | null;
  } | null;
};

export type BlogQueryVariables = HydrogenStorefront.Exact<{
  language?: HydrogenStorefront.InputMaybe<HydrogenStorefront.LanguageCode>;
  blogHandle: HydrogenStorefront.Scalars['String'];
  pageBy: HydrogenStorefront.Scalars['Int'];
  cursor?: HydrogenStorefront.InputMaybe<HydrogenStorefront.Scalars['String']>;
}>;

export type BlogQuery = {
  blog?: {
    title: string;
    seo?: {title?: string | null; description?: string | null} | null;
    articles: {
      edges: Array<{
        node: {
          contentHtml: any;
          handle: string;
          id: string;
          publishedAt: any;
          title: string;
          author?: {name: string} | null;
          image?: {
            id?: string | null;
            altText?: string | null;
            url: any;
            width?: number | null;
            height?: number | null;
          } | null;
        };
      }>;
    };
  } | null;
};

export type PageDetailsQueryVariables = HydrogenStorefront.Exact<{
  language?: HydrogenStorefront.InputMaybe<HydrogenStorefront.LanguageCode>;
  handle: HydrogenStorefront.Scalars['String'];
}>;

export type PageDetailsQuery = {
  page?: {
    id: string;
    title: string;
    body: any;
    seo?: {description?: string | null; title?: string | null} | null;
  } | null;
};

export type PolicyFragment = {
  body: string;
  handle: string;
  id: string;
  title: string;
  url: any;
};

export type PoliciesQuery1QueryVariables = HydrogenStorefront.Exact<{
  language?: HydrogenStorefront.InputMaybe<HydrogenStorefront.LanguageCode>;
  privacyPolicy: HydrogenStorefront.Scalars['Boolean'];
  shippingPolicy: HydrogenStorefront.Scalars['Boolean'];
  termsOfService: HydrogenStorefront.Scalars['Boolean'];
  refundPolicy: HydrogenStorefront.Scalars['Boolean'];
}>;

export type PoliciesQuery1Query = {
  shop: {
    privacyPolicy?: {
      body: string;
      handle: string;
      id: string;
      title: string;
      url: any;
    } | null;
    shippingPolicy?: {
      body: string;
      handle: string;
      id: string;
      title: string;
      url: any;
    } | null;
    termsOfService?: {
      body: string;
      handle: string;
      id: string;
      title: string;
      url: any;
    } | null;
    refundPolicy?: {
      body: string;
      handle: string;
      id: string;
      title: string;
      url: any;
    } | null;
  };
};

export type PolicySlimFragment = {id: string; title: string; handle: string};

export type PoliciesQuery2QueryVariables = HydrogenStorefront.Exact<{
  [key: string]: never;
}>;

export type PoliciesQuery2Query = {
  shop: {
    privacyPolicy?: {id: string; title: string; handle: string} | null;
    shippingPolicy?: {id: string; title: string; handle: string} | null;
    termsOfService?: {id: string; title: string; handle: string} | null;
    refundPolicy?: {id: string; title: string; handle: string} | null;
    subscriptionPolicy?: {
      id?: string | null;
      title: string;
      handle: string;
    } | null;
  };
};

export type ProductVariantFragmentFragment = {
  id: string;
  availableForSale: boolean;
  sku?: string | null;
  title: string;
  selectedOptions: Array<{name: string; value: string}>;
  image?: {
    id?: string | null;
    url: any;
    altText?: string | null;
    width?: number | null;
    height?: number | null;
  } | null;
  price: {amount: any; currencyCode: HydrogenStorefront.CurrencyCode};
  compareAtPrice?: {
    amount: any;
    currencyCode: HydrogenStorefront.CurrencyCode;
  } | null;
  unitPrice?: {
    amount: any;
    currencyCode: HydrogenStorefront.CurrencyCode;
  } | null;
  product: {title: string; handle: string};
};

export type ProductQueryVariables = HydrogenStorefront.Exact<{
  country?: HydrogenStorefront.InputMaybe<HydrogenStorefront.CountryCode>;
  language?: HydrogenStorefront.InputMaybe<HydrogenStorefront.LanguageCode>;
  handle: HydrogenStorefront.Scalars['String'];
  selectedOptions:
    | Array<HydrogenStorefront.SelectedOptionInput>
    | HydrogenStorefront.SelectedOptionInput;
}>;

export type ProductQuery = {
  product?: {
    id: string;
    title: string;
    vendor: string;
    handle: string;
    descriptionHtml: any;
    description: string;
    options: Array<{name: string; values: Array<string>}>;
    selectedVariant?: {
      id: string;
      availableForSale: boolean;
      sku?: string | null;
      title: string;
      selectedOptions: Array<{name: string; value: string}>;
      image?: {
        id?: string | null;
        url: any;
        altText?: string | null;
        width?: number | null;
        height?: number | null;
      } | null;
      price: {amount: any; currencyCode: HydrogenStorefront.CurrencyCode};
      compareAtPrice?: {
        amount: any;
        currencyCode: HydrogenStorefront.CurrencyCode;
      } | null;
      unitPrice?: {
        amount: any;
        currencyCode: HydrogenStorefront.CurrencyCode;
      } | null;
      product: {title: string; handle: string};
    } | null;
    media: {
      nodes: Array<
        | {
            __typename: 'ExternalVideo';
            id: string;
            embedUrl: any;
            host: HydrogenStorefront.MediaHost;
            mediaContentType: HydrogenStorefront.MediaContentType;
            alt?: string | null;
            previewImage?: {url: any} | null;
          }
        | {
            __typename: 'MediaImage';
            id: string;
            mediaContentType: HydrogenStorefront.MediaContentType;
            alt?: string | null;
            image?: {
              url: any;
              width?: number | null;
              height?: number | null;
            } | null;
            previewImage?: {url: any} | null;
          }
        | {
            __typename: 'Model3d';
            id: string;
            mediaContentType: HydrogenStorefront.MediaContentType;
            alt?: string | null;
            sources: Array<{mimeType: string; url: string}>;
            previewImage?: {url: any} | null;
          }
        | {
            __typename: 'Video';
            id: string;
            mediaContentType: HydrogenStorefront.MediaContentType;
            alt?: string | null;
            sources: Array<{mimeType: string; url: string}>;
            previewImage?: {url: any} | null;
          }
      >;
    };
    variants: {
      nodes: Array<{
        id: string;
        availableForSale: boolean;
        sku?: string | null;
        title: string;
        selectedOptions: Array<{name: string; value: string}>;
        image?: {
          id?: string | null;
          url: any;
          altText?: string | null;
          width?: number | null;
          height?: number | null;
        } | null;
        price: {amount: any; currencyCode: HydrogenStorefront.CurrencyCode};
        compareAtPrice?: {
          amount: any;
          currencyCode: HydrogenStorefront.CurrencyCode;
        } | null;
        unitPrice?: {
          amount: any;
          currencyCode: HydrogenStorefront.CurrencyCode;
        } | null;
        product: {title: string; handle: string};
      }>;
    };
    seo: {description?: string | null; title?: string | null};
  } | null;
  shop: {
    name: string;
    primaryDomain: {url: any};
    shippingPolicy?: {body: string; handle: string} | null;
    refundPolicy?: {body: string; handle: string} | null;
  };
};

export type ProductRecommendationsQueryVariables = HydrogenStorefront.Exact<{
  productId: HydrogenStorefront.Scalars['ID'];
  count?: HydrogenStorefront.InputMaybe<HydrogenStorefront.Scalars['Int']>;
  country?: HydrogenStorefront.InputMaybe<HydrogenStorefront.CountryCode>;
  language?: HydrogenStorefront.InputMaybe<HydrogenStorefront.LanguageCode>;
}>;

export type ProductRecommendationsQuery = {
  recommended?: Array<{
    id: string;
    title: string;
    publishedAt: any;
    handle: string;
    variants: {
      nodes: Array<{
        id: string;
        image?: {
          url: any;
          altText?: string | null;
          width?: number | null;
          height?: number | null;
        } | null;
        price: {amount: any; currencyCode: HydrogenStorefront.CurrencyCode};
        compareAtPrice?: {
          amount: any;
          currencyCode: HydrogenStorefront.CurrencyCode;
        } | null;
        selectedOptions: Array<{name: string; value: string}>;
        product: {handle: string; title: string};
      }>;
    };
  }> | null;
  additional: {
    nodes: Array<{
      id: string;
      title: string;
      publishedAt: any;
      handle: string;
      variants: {
        nodes: Array<{
          id: string;
          image?: {
            url: any;
            altText?: string | null;
            width?: number | null;
            height?: number | null;
          } | null;
          price: {amount: any; currencyCode: HydrogenStorefront.CurrencyCode};
          compareAtPrice?: {
            amount: any;
            currencyCode: HydrogenStorefront.CurrencyCode;
          } | null;
          selectedOptions: Array<{name: string; value: string}>;
          product: {handle: string; title: string};
        }>;
      };
    }>;
  };
};

export type AllProductsQueryVariables = HydrogenStorefront.Exact<{
  country?: HydrogenStorefront.InputMaybe<HydrogenStorefront.CountryCode>;
  language?: HydrogenStorefront.InputMaybe<HydrogenStorefront.LanguageCode>;
  first?: HydrogenStorefront.InputMaybe<HydrogenStorefront.Scalars['Int']>;
  last?: HydrogenStorefront.InputMaybe<HydrogenStorefront.Scalars['Int']>;
  startCursor?: HydrogenStorefront.InputMaybe<
    HydrogenStorefront.Scalars['String']
  >;
  endCursor?: HydrogenStorefront.InputMaybe<
    HydrogenStorefront.Scalars['String']
  >;
}>;

export type AllProductsQuery = {
  products: {
    nodes: Array<{
      id: string;
      title: string;
      publishedAt: any;
      handle: string;
      variants: {
        nodes: Array<{
          id: string;
          image?: {
            url: any;
            altText?: string | null;
            width?: number | null;
            height?: number | null;
          } | null;
          price: {amount: any; currencyCode: HydrogenStorefront.CurrencyCode};
          compareAtPrice?: {
            amount: any;
            currencyCode: HydrogenStorefront.CurrencyCode;
          } | null;
          selectedOptions: Array<{name: string; value: string}>;
          product: {handle: string; title: string};
        }>;
      };
    }>;
    pageInfo: {
      hasPreviousPage: boolean;
      hasNextPage: boolean;
      startCursor?: string | null;
      endCursor?: string | null;
    };
  };
};

export type SearchQueryVariables = HydrogenStorefront.Exact<{
  searchTerm?: HydrogenStorefront.InputMaybe<
    HydrogenStorefront.Scalars['String']
  >;
  country?: HydrogenStorefront.InputMaybe<HydrogenStorefront.CountryCode>;
  language?: HydrogenStorefront.InputMaybe<HydrogenStorefront.LanguageCode>;
  pageBy: HydrogenStorefront.Scalars['Int'];
  after?: HydrogenStorefront.InputMaybe<HydrogenStorefront.Scalars['String']>;
}>;

export type SearchQuery = {
  products: {
    nodes: Array<{
      id: string;
      title: string;
      publishedAt: any;
      handle: string;
      variants: {
        nodes: Array<{
          id: string;
          image?: {
            url: any;
            altText?: string | null;
            width?: number | null;
            height?: number | null;
          } | null;
          price: {amount: any; currencyCode: HydrogenStorefront.CurrencyCode};
          compareAtPrice?: {
            amount: any;
            currencyCode: HydrogenStorefront.CurrencyCode;
          } | null;
          selectedOptions: Array<{name: string; value: string}>;
          product: {handle: string; title: string};
        }>;
      };
    }>;
    pageInfo: {
      startCursor?: string | null;
      endCursor?: string | null;
      hasNextPage: boolean;
      hasPreviousPage: boolean;
    };
  };
};

export type SearchNoResultQueryVariables = HydrogenStorefront.Exact<{
  country?: HydrogenStorefront.InputMaybe<HydrogenStorefront.CountryCode>;
  language?: HydrogenStorefront.InputMaybe<HydrogenStorefront.LanguageCode>;
  pageBy: HydrogenStorefront.Scalars['Int'];
}>;

export type SearchNoResultQuery = {
  featuredCollections: {
    nodes: Array<{
      id: string;
      title: string;
      handle: string;
      image?: {
        altText?: string | null;
        width?: number | null;
        height?: number | null;
        url: any;
      } | null;
    }>;
  };
  featuredProducts: {
    nodes: Array<{
      id: string;
      title: string;
      publishedAt: any;
      handle: string;
      variants: {
        nodes: Array<{
          id: string;
          image?: {
            url: any;
            altText?: string | null;
            width?: number | null;
            height?: number | null;
          } | null;
          price: {amount: any; currencyCode: HydrogenStorefront.CurrencyCode};
          compareAtPrice?: {
            amount: any;
            currencyCode: HydrogenStorefront.CurrencyCode;
          } | null;
          selectedOptions: Array<{name: string; value: string}>;
          product: {handle: string; title: string};
        }>;
      };
    }>;
  };
};

export type SitemapsQueryVariables = HydrogenStorefront.Exact<{
  urlLimits?: HydrogenStorefront.InputMaybe<HydrogenStorefront.Scalars['Int']>;
  language?: HydrogenStorefront.InputMaybe<HydrogenStorefront.LanguageCode>;
}>;

export type SitemapsQuery = {
  products: {
    nodes: Array<{
      updatedAt: any;
      handle: string;
      onlineStoreUrl?: any | null;
      title: string;
      featuredImage?: {url: any; altText?: string | null} | null;
    }>;
  };
  collections: {
    nodes: Array<{updatedAt: any; handle: string; onlineStoreUrl?: any | null}>;
  };
  pages: {
    nodes: Array<{updatedAt: any; handle: string; onlineStoreUrl?: any | null}>;
  };
};

export interface GeneratedQueryTypes {
  '#graphql\n  query layoutMenus(\n    $language: LanguageCode\n    $headerMenuHandle: String!\n    $footerMenuHandle: String!\n  ) @inContext(language: $language) {\n    shop {\n      id\n      name\n      description\n      primaryDomain {\n        url\n      }\n      brand {\n       logo {\n         image {\n          url\n         }\n       }\n     }\n    }\n    headerMenu: menu(handle: $headerMenuHandle) {\n      id\n      items {\n        ...MenuItem\n        items {\n          ...MenuItem\n        }\n      }\n    }\n    footerMenu: menu(handle: $footerMenuHandle) {\n      id\n      items {\n        ...MenuItem\n        items {\n          ...MenuItem\n        }\n      }\n    }\n  }\n  fragment MenuItem on MenuItem {\n    id\n    resourceId\n    tags\n    title\n    type\n    url\n  }\n': {
    return: LayoutMenusQuery;
    variables: LayoutMenusQueryVariables;
  };
  '#graphql\n  query CartQuery($cartId: ID!, $country: CountryCode, $language: LanguageCode)\n    @inContext(country: $country, language: $language) {\n    cart(id: $cartId) {\n      ...CartFragment\n    }\n  }\n\n  fragment CartFragment on Cart {\n    id\n    checkoutUrl\n    totalQuantity\n    buyerIdentity {\n      countryCode\n      customer {\n        id\n        email\n        firstName\n        lastName\n        displayName\n      }\n      email\n      phone\n    }\n    lines(first: 100) {\n      edges {\n        node {\n          id\n          quantity\n          attributes {\n            key\n            value\n          }\n          cost {\n            totalAmount {\n              amount\n              currencyCode\n            }\n            amountPerQuantity {\n              amount\n              currencyCode\n            }\n            compareAtAmountPerQuantity {\n              amount\n              currencyCode\n            }\n          }\n          merchandise {\n            ... on ProductVariant {\n              id\n              availableForSale\n              compareAtPrice {\n                ...MoneyFragment\n              }\n              price {\n                ...MoneyFragment\n              }\n              requiresShipping\n              title\n              image {\n                ...ImageFragment\n              }\n              product {\n                handle\n                title\n                id\n              }\n              selectedOptions {\n                name\n                value\n              }\n            }\n          }\n        }\n      }\n    }\n    cost {\n      subtotalAmount {\n        ...MoneyFragment\n      }\n      totalAmount {\n        ...MoneyFragment\n      }\n      totalDutyAmount {\n        ...MoneyFragment\n      }\n      totalTaxAmount {\n        ...MoneyFragment\n      }\n    }\n    note\n    attributes {\n      key\n      value\n    }\n    discountCodes {\n      code\n    }\n  }\n\n  fragment MoneyFragment on MoneyV2 {\n    currencyCode\n    amount\n  }\n\n  fragment ImageFragment on Image {\n    id\n    url\n    altText\n    width\n    height\n  }\n': {
    return: CartQueryQuery;
    variables: CartQueryQueryVariables;
  };
  '#graphql\n  query CustomerDetails(\n    $customerAccessToken: String!\n    $country: CountryCode\n    $language: LanguageCode\n  ) @inContext(country: $country, language: $language) {\n    customer(customerAccessToken: $customerAccessToken) {\n      firstName\n      lastName\n      phone\n      email\n      defaultAddress {\n        id\n        formatted\n        firstName\n        lastName\n        company\n        address1\n        address2\n        country\n        province\n        city\n        zip\n        phone\n      }\n      addresses(first: 6) {\n        edges {\n          node {\n            id\n            formatted\n            firstName\n            lastName\n            company\n            address1\n            address2\n            country\n            province\n            city\n            zip\n            phone\n          }\n        }\n      }\n      orders(first: 250, sortKey: PROCESSED_AT, reverse: true) {\n        edges {\n          node {\n            id\n            orderNumber\n            processedAt\n            financialStatus\n            fulfillmentStatus\n            currentTotalPrice {\n              amount\n              currencyCode\n            }\n            lineItems(first: 2) {\n              edges {\n                node {\n                  variant {\n                    image {\n                      url\n                      altText\n                      height\n                      width\n                    }\n                  }\n                  title\n                }\n              }\n            }\n          }\n        }\n      }\n    }\n  }\n': {
    return: CustomerDetailsQuery;
    variables: CustomerDetailsQueryVariables;
  };
  '#graphql\n  fragment Money on MoneyV2 {\n    amount\n    currencyCode\n  }\n  fragment AddressFull on MailingAddress {\n    address1\n    address2\n    city\n    company\n    country\n    countryCodeV2\n    firstName\n    formatted\n    id\n    lastName\n    name\n    phone\n    province\n    provinceCode\n    zip\n  }\n  fragment DiscountApplication on DiscountApplication {\n    value {\n      ... on MoneyV2 {\n        amount\n        currencyCode\n      }\n      ... on PricingPercentageValue {\n        percentage\n      }\n    }\n  }\n  fragment Image on Image {\n    altText\n    height\n    src: url(transform: {crop: CENTER, maxHeight: 96, maxWidth: 96, scale: 2})\n    id\n    width\n  }\n  fragment ProductVariant on ProductVariant {\n    id\n    image {\n      ...Image\n    }\n    price {\n      ...Money\n    }\n    product {\n      handle\n    }\n    sku\n    title\n  }\n  fragment LineItemFull on OrderLineItem {\n    title\n    quantity\n    discountAllocations {\n      allocatedAmount {\n        ...Money\n      }\n      discountApplication {\n        ...DiscountApplication\n      }\n    }\n    originalTotalPrice {\n      ...Money\n    }\n    discountedTotalPrice {\n      ...Money\n    }\n    variant {\n      ...ProductVariant\n    }\n  }\n\n  query CustomerOrder(\n    $country: CountryCode\n    $language: LanguageCode\n    $orderId: ID!\n  ) @inContext(country: $country, language: $language) {\n    node(id: $orderId) {\n      ... on Order {\n        id\n        name\n        orderNumber\n        processedAt\n        fulfillmentStatus\n        totalTaxV2 {\n          ...Money\n        }\n        totalPriceV2 {\n          ...Money\n        }\n        subtotalPriceV2 {\n          ...Money\n        }\n        shippingAddress {\n          ...AddressFull\n        }\n        discountApplications(first: 100) {\n          nodes {\n            ...DiscountApplication\n          }\n        }\n        lineItems(first: 100) {\n          nodes {\n            ...LineItemFull\n          }\n        }\n      }\n    }\n  }\n': {
    return: CustomerOrderQuery;
    variables: CustomerOrderQueryVariables;
  };
  '#graphql\n  #graphql\n  fragment ProductCard on Product {\n    id\n    title\n    publishedAt\n    handle\n    variants(first: 1) {\n      nodes {\n        id\n        image {\n          url\n          altText\n          width\n          height\n        }\n        price {\n          amount\n          currencyCode\n        }\n        compareAtPrice {\n          amount\n          currencyCode\n        }\n        selectedOptions {\n          name\n          value\n        }\n        product {\n          handle\n          title\n        }\n      }\n    }\n  }\n\n  query CollectionDetails(\n    $handle: String!\n    $country: CountryCode\n    $language: LanguageCode\n    $pageBy: Int!\n    $cursor: String\n    $filters: [ProductFilter!]\n    $sortKey: ProductCollectionSortKeys!\n    $reverse: Boolean\n  ) @inContext(country: $country, language: $language) {\n    collection(handle: $handle) {\n      id\n      handle\n      title\n      description\n      seo {\n        description\n        title\n      }\n      image {\n        id\n        url\n        width\n        height\n        altText\n      }\n      products(\n        first: $pageBy,\n        after: $cursor,\n        filters: $filters,\n        sortKey: $sortKey,\n        reverse: $reverse\n      ) {\n        filters {\n          id\n          label\n          type\n          values {\n            id\n            label\n            count\n            input\n          }\n        }\n        nodes {\n          ...ProductCard\n        }\n        pageInfo {\n          hasNextPage\n          endCursor\n        }\n      }\n    }\n    collections(first: 100) {\n      edges {\n        node {\n          title\n          handle\n        }\n      }\n    }\n  }\n': {
    return: CollectionDetailsQuery;
    variables: CollectionDetailsQueryVariables;
  };
  '#graphql\n  query Collections(\n    $country: CountryCode\n    $language: LanguageCode\n    $first: Int\n    $last: Int\n    $startCursor: String\n    $endCursor: String\n  ) @inContext(country: $country, language: $language) {\n    collections(first: $first, last: $last, before: $startCursor, after: $endCursor) {\n      nodes {\n        id\n        title\n        description\n        handle\n        seo {\n          description\n          title\n        }\n        image {\n          id\n          url\n          width\n          height\n          altText\n        }\n      }\n      pageInfo {\n        hasPreviousPage\n        hasNextPage\n        startCursor\n        endCursor\n      }\n    }\n  }\n': {
    return: CollectionsQuery;
    variables: CollectionsQueryVariables;
  };
  '#graphql\n  #graphql\n  fragment ProductCard on Product {\n    id\n    title\n    publishedAt\n    handle\n    variants(first: 1) {\n      nodes {\n        id\n        image {\n          url\n          altText\n          width\n          height\n        }\n        price {\n          amount\n          currencyCode\n        }\n        compareAtPrice {\n          amount\n          currencyCode\n        }\n        selectedOptions {\n          name\n          value\n        }\n        product {\n          handle\n          title\n        }\n      }\n    }\n  }\n\n  query homepage($country: CountryCode, $language: LanguageCode)\n  @inContext(country: $country, language: $language) {\n    featuredCollections: collections(first: 3, sortKey: UPDATED_AT) {\n      nodes {\n        id\n        title\n        handle\n        image {\n          altText\n          width\n          height\n          url\n        }\n      }\n    }\n    featuredProducts: products(first: 12) {\n      nodes {\n        ...ProductCard\n      }\n    }\n  }\n': {
    return: HomepageQuery;
    variables: HomepageQueryVariables;
  };
  '#graphql\n  #graphql\n  #graphql\n  fragment Media on Media {\n    __typename\n    mediaContentType\n    alt\n    previewImage {\n      url\n    }\n    ... on MediaImage {\n      id\n      image {\n        url\n        width\n        height\n      }\n    }\n    ... on Video {\n      id\n      sources {\n        mimeType\n        url\n      }\n    }\n    ... on Model3d {\n      id\n      sources {\n        mimeType\n        url\n      }\n    }\n    ... on ExternalVideo {\n      id\n      embedUrl\n      host\n    }\n  }\n\n  fragment CollectionContent on Collection {\n    id\n    handle\n    title\n    descriptionHtml\n    heading: metafield(namespace: "hero", key: "title") {\n      value\n    }\n    byline: metafield(namespace: "hero", key: "byline") {\n      value\n    }\n    cta: metafield(namespace: "hero", key: "cta") {\n      value\n    }\n    spread: metafield(namespace: "hero", key: "spread") {\n      reference {\n        ...Media\n      }\n    }\n    spreadSecondary: metafield(namespace: "hero", key: "spread_secondary") {\n      reference {\n        ...Media\n      }\n    }\n  }\n\n  query collectionContentHero($handle: String, $country: CountryCode, $language: LanguageCode)\n  @inContext(country: $country, language: $language) {\n    hero: collection(handle: $handle) {\n      ...CollectionContent\n    }\n    shop {\n      name\n      description\n    }\n  }\n': {
    return: CollectionContentHeroQuery;
    variables: CollectionContentHeroQueryVariables;
  };
  '#graphql\n  #graphql\n  #graphql\n  fragment Media on Media {\n    __typename\n    mediaContentType\n    alt\n    previewImage {\n      url\n    }\n    ... on MediaImage {\n      id\n      image {\n        url\n        width\n        height\n      }\n    }\n    ... on Video {\n      id\n      sources {\n        mimeType\n        url\n      }\n    }\n    ... on Model3d {\n      id\n      sources {\n        mimeType\n        url\n      }\n    }\n    ... on ExternalVideo {\n      id\n      embedUrl\n      host\n    }\n  }\n\n  fragment CollectionContent on Collection {\n    id\n    handle\n    title\n    descriptionHtml\n    heading: metafield(namespace: "hero", key: "title") {\n      value\n    }\n    byline: metafield(namespace: "hero", key: "byline") {\n      value\n    }\n    cta: metafield(namespace: "hero", key: "cta") {\n      value\n    }\n    spread: metafield(namespace: "hero", key: "spread") {\n      reference {\n        ...Media\n      }\n    }\n    spreadSecondary: metafield(namespace: "hero", key: "spread_secondary") {\n      reference {\n        ...Media\n      }\n    }\n  }\n\n  query collectionContent($handle: String, $country: CountryCode, $language: LanguageCode)\n  @inContext(country: $country, language: $language) {\n    hero: collection(handle: $handle) {\n      ...CollectionContent\n    }\n  }\n': {
    return: CollectionContentQuery;
    variables: CollectionContentQueryVariables;
  };
  '#graphql\n  #graphql\n  fragment ProductCard on Product {\n    id\n    title\n    publishedAt\n    handle\n    variants(first: 1) {\n      nodes {\n        id\n        image {\n          url\n          altText\n          width\n          height\n        }\n        price {\n          amount\n          currencyCode\n        }\n        compareAtPrice {\n          amount\n          currencyCode\n        }\n        selectedOptions {\n          name\n          value\n        }\n        product {\n          handle\n          title\n        }\n      }\n    }\n  }\n\n  query homepageFeaturedProducts($country: CountryCode, $language: LanguageCode)\n  @inContext(country: $country, language: $language) {\n    products(first: 8) {\n      nodes {\n        ...ProductCard\n      }\n    }\n  }\n': {
    return: HomepageFeaturedProductsQuery;
    variables: HomepageFeaturedProductsQueryVariables;
  };
  '#graphql\n  query homepageFeaturedCollections($country: CountryCode, $language: LanguageCode)\n  @inContext(country: $country, language: $language) {\n    collections(\n      first: 4,\n      sortKey: UPDATED_AT\n    ) {\n      nodes {\n        id\n        title\n        handle\n        image {\n          altText\n          width\n          height\n          url\n        }\n      }\n    }\n  }\n': {
    return: HomepageFeaturedCollectionsQuery;
    variables: HomepageFeaturedCollectionsQueryVariables;
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
  '#graphql\n  fragment Policy on ShopPolicy {\n    body\n    handle\n    id\n    title\n    url\n  }\n\n  query PoliciesQuery1(\n    $language: LanguageCode\n    $privacyPolicy: Boolean!\n    $shippingPolicy: Boolean!\n    $termsOfService: Boolean!\n    $refundPolicy: Boolean!\n  ) @inContext(language: $language) {\n    shop {\n      privacyPolicy @include(if: $privacyPolicy) {\n        ...Policy\n      }\n      shippingPolicy @include(if: $shippingPolicy) {\n        ...Policy\n      }\n      termsOfService @include(if: $termsOfService) {\n        ...Policy\n      }\n      refundPolicy @include(if: $refundPolicy) {\n        ...Policy\n      }\n    }\n  }\n': {
    return: PoliciesQuery1Query;
    variables: PoliciesQuery1QueryVariables;
  };
  '#graphql\n  fragment PolicySlim on ShopPolicy {\n    id\n    title\n    handle\n  }\n\n  query PoliciesQuery2 {\n    shop {\n      privacyPolicy {\n        ...PolicySlim\n      }\n      shippingPolicy {\n        ...PolicySlim\n      }\n      termsOfService {\n        ...PolicySlim\n      }\n      refundPolicy {\n        ...PolicySlim\n      }\n      subscriptionPolicy {\n        id\n        title\n        handle\n      }\n    }\n  }\n': {
    return: PoliciesQuery2Query;
    variables: PoliciesQuery2QueryVariables;
  };
  '#graphql\n  #graphql\n  fragment Media on Media {\n    __typename\n    mediaContentType\n    alt\n    previewImage {\n      url\n    }\n    ... on MediaImage {\n      id\n      image {\n        url\n        width\n        height\n      }\n    }\n    ... on Video {\n      id\n      sources {\n        mimeType\n        url\n      }\n    }\n    ... on Model3d {\n      id\n      sources {\n        mimeType\n        url\n      }\n    }\n    ... on ExternalVideo {\n      id\n      embedUrl\n      host\n    }\n  }\n\n  #graphql\n  fragment ProductVariantFragment on ProductVariant {\n    id\n    availableForSale\n    selectedOptions {\n      name\n      value\n    }\n    image {\n      id\n      url\n      altText\n      width\n      height\n    }\n    price {\n      amount\n      currencyCode\n    }\n    compareAtPrice {\n      amount\n      currencyCode\n    }\n    sku\n    title\n    unitPrice {\n      amount\n      currencyCode\n    }\n    product {\n      title\n      handle\n    }\n  }\n\n  query Product(\n    $country: CountryCode\n    $language: LanguageCode\n    $handle: String!\n    $selectedOptions: [SelectedOptionInput!]!\n  ) @inContext(country: $country, language: $language) {\n    product(handle: $handle) {\n      id\n      title\n      vendor\n      handle\n      descriptionHtml\n      description\n      options {\n        name\n        values\n      }\n      selectedVariant: variantBySelectedOptions(selectedOptions: $selectedOptions) {\n        ...ProductVariantFragment\n      }\n      media(first: 7) {\n        nodes {\n          ...Media\n        }\n      }\n      variants(first: 1) {\n        nodes {\n          ...ProductVariantFragment\n        }\n      }\n      seo {\n        description\n        title\n      }\n    }\n    shop {\n      name\n      primaryDomain {\n        url\n      }\n      shippingPolicy {\n        body\n        handle\n      }\n      refundPolicy {\n        body\n        handle\n      }\n    }\n  }\n': {
    return: ProductQuery;
    variables: ProductQueryVariables;
  };
  '#graphql\n  #graphql\n  fragment ProductCard on Product {\n    id\n    title\n    publishedAt\n    handle\n    variants(first: 1) {\n      nodes {\n        id\n        image {\n          url\n          altText\n          width\n          height\n        }\n        price {\n          amount\n          currencyCode\n        }\n        compareAtPrice {\n          amount\n          currencyCode\n        }\n        selectedOptions {\n          name\n          value\n        }\n        product {\n          handle\n          title\n        }\n      }\n    }\n  }\n\n  query productRecommendations(\n    $productId: ID!\n    $count: Int\n    $country: CountryCode\n    $language: LanguageCode\n  ) @inContext(country: $country, language: $language) {\n    recommended: productRecommendations(productId: $productId) {\n      ...ProductCard\n    }\n    additional: products(first: $count, sortKey: BEST_SELLING) {\n      nodes {\n        ...ProductCard\n      }\n    }\n  }\n': {
    return: ProductRecommendationsQuery;
    variables: ProductRecommendationsQueryVariables;
  };
  '#graphql\n  #graphql\n  fragment ProductCard on Product {\n    id\n    title\n    publishedAt\n    handle\n    variants(first: 1) {\n      nodes {\n        id\n        image {\n          url\n          altText\n          width\n          height\n        }\n        price {\n          amount\n          currencyCode\n        }\n        compareAtPrice {\n          amount\n          currencyCode\n        }\n        selectedOptions {\n          name\n          value\n        }\n        product {\n          handle\n          title\n        }\n      }\n    }\n  }\n\n  query AllProducts(\n    $country: CountryCode\n    $language: LanguageCode\n    $first: Int\n    $last: Int\n    $startCursor: String\n    $endCursor: String\n  ) @inContext(country: $country, language: $language) {\n    products(first: $first, last: $last, before: $startCursor, after: $endCursor) {\n      nodes {\n        ...ProductCard\n      }\n      pageInfo {\n        hasPreviousPage\n        hasNextPage\n        startCursor\n        endCursor\n      }\n    }\n  }\n': {
    return: AllProductsQuery;
    variables: AllProductsQueryVariables;
  };
  '#graphql\n  #graphql\n  fragment ProductCard on Product {\n    id\n    title\n    publishedAt\n    handle\n    variants(first: 1) {\n      nodes {\n        id\n        image {\n          url\n          altText\n          width\n          height\n        }\n        price {\n          amount\n          currencyCode\n        }\n        compareAtPrice {\n          amount\n          currencyCode\n        }\n        selectedOptions {\n          name\n          value\n        }\n        product {\n          handle\n          title\n        }\n      }\n    }\n  }\n\n  query search(\n    $searchTerm: String\n    $country: CountryCode\n    $language: LanguageCode\n    $pageBy: Int!\n    $after: String\n  ) @inContext(country: $country, language: $language) {\n    products(\n      first: $pageBy\n      sortKey: RELEVANCE\n      query: $searchTerm\n      after: $after\n    ) {\n      nodes {\n        ...ProductCard\n      }\n      pageInfo {\n        startCursor\n        endCursor\n        hasNextPage\n        hasPreviousPage\n      }\n    }\n  }\n': {
    return: SearchQuery;
    variables: SearchQueryVariables;
  };
  '#graphql\n  #graphql\n  fragment ProductCard on Product {\n    id\n    title\n    publishedAt\n    handle\n    variants(first: 1) {\n      nodes {\n        id\n        image {\n          url\n          altText\n          width\n          height\n        }\n        price {\n          amount\n          currencyCode\n        }\n        compareAtPrice {\n          amount\n          currencyCode\n        }\n        selectedOptions {\n          name\n          value\n        }\n        product {\n          handle\n          title\n        }\n      }\n    }\n  }\n\n  query searchNoResult(\n    $country: CountryCode\n    $language: LanguageCode\n    $pageBy: Int!\n  ) @inContext(country: $country, language: $language) {\n    featuredCollections: collections(first: 3, sortKey: UPDATED_AT) {\n      nodes {\n        id\n        title\n        handle\n        image {\n          altText\n          width\n          height\n          url\n        }\n      }\n    }\n    featuredProducts: products(first: $pageBy) {\n      nodes {\n        ...ProductCard\n      }\n    }\n  }\n': {
    return: SearchNoResultQuery;
    variables: SearchNoResultQueryVariables;
  };
  '#graphql\n  query sitemaps($urlLimits: Int, $language: LanguageCode)\n  @inContext(language: $language) {\n    products(\n      first: $urlLimits\n      query: "published_status:\'online_store:visible\'"\n    ) {\n      nodes {\n        updatedAt\n        handle\n        onlineStoreUrl\n        title\n        featuredImage {\n          url\n          altText\n        }\n      }\n    }\n    collections(\n      first: $urlLimits\n      query: "published_status:\'online_store:visible\'"\n    ) {\n      nodes {\n        updatedAt\n        handle\n        onlineStoreUrl\n      }\n    }\n    pages(first: $urlLimits, query: "published_status:\'published\'") {\n      nodes {\n        updatedAt\n        handle\n        onlineStoreUrl\n      }\n    }\n  }\n': {
    return: SitemapsQuery;
    variables: SitemapsQueryVariables;
  };
}
export interface GeneratedMutationTypes {
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
  '#graphql\n  mutation customerActivate($id: ID!, $input: CustomerActivateInput!) {\n    customerActivate(id: $id, input: $input) {\n      customerAccessToken {\n        accessToken\n        expiresAt\n      }\n      customerUserErrors {\n        code\n        field\n        message\n      }\n    }\n  }\n': {
    return: CustomerActivateMutation;
    variables: CustomerActivateMutationVariables;
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
