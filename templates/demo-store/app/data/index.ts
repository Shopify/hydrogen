import type {
  Cart,
  CartInput,
  CartLineInput,
  CartLineUpdateInput,
  ProductConnection,
  Shop,
  Order,
  Localization,
  CustomerAccessTokenCreatePayload,
  Customer,
  CustomerUpdateInput,
  CustomerUpdatePayload,
  CustomerAddressUpdatePayload,
  MailingAddressInput,
  CustomerAddressDeletePayload,
  CustomerDefaultAddressUpdatePayload,
  CustomerAddressCreatePayload,
  CustomerCreatePayload,
  CustomerRecoverPayload,
  CustomerResetPayload,
  CustomerActivatePayload,
} from '@shopify/hydrogen-react/storefront-api-types';
import {
  type EnhancedMenu,
  parseMenu,
  getLocalizationFromLang,
  assertApiErrors,
} from '~/lib/utils';
import invariant from 'tiny-invariant';
import {logout} from '~/routes/account/__private/logout';
import type {HydrogenContext} from '@shopify/hydrogen-remix';
import {type Params} from '@remix-run/react';

export interface CountriesData {
  localization: Localization;
}

export interface LayoutData {
  headerMenu: EnhancedMenu;
  footerMenu: EnhancedMenu;
  shop: Shop;
  cart?: Promise<Cart>;
}

export async function getLayoutData({storefront}: HydrogenContext) {
  const HEADER_MENU_HANDLE = 'main-menu';
  const FOOTER_MENU_HANDLE = 'footer';

  const data = await storefront.query<LayoutData>(LAYOUT_QUERY, {
    variables: {
      headerMenuHandle: HEADER_MENU_HANDLE,
      footerMenuHandle: FOOTER_MENU_HANDLE,
    },
  });

  invariant(data, 'No data returned from Shopify API');

  /*
    Modify specific links/routes (optional)
    @see: https://shopify.dev/api/storefront/unstable/enums/MenuItemType
    e.g here we map:
      - /blogs/news -> /news
      - /blog/news/blog-post -> /news/blog-post
      - /collections/all -> /products
  */
  const customPrefixes = {BLOG: '', CATALOG: 'products'};

  const headerMenu = data?.headerMenu
    ? parseMenu(data.headerMenu, customPrefixes)
    : undefined;

  const footerMenu = data?.footerMenu
    ? parseMenu(data.footerMenu, customPrefixes)
    : undefined;

  return {shop: data.shop, headerMenu, footerMenu};
}

const LAYOUT_QUERY = `#graphql
  query layoutMenus(
    $language: LanguageCode
    $headerMenuHandle: String!
    $footerMenuHandle: String!
  ) @inContext(language: $language) {
    shop {
      name
      description
    }
    headerMenu: menu(handle: $headerMenuHandle) {
      id
      items {
        ...MenuItem
        items {
          ...MenuItem
        }
      }
    }
    footerMenu: menu(handle: $footerMenuHandle) {
      id
      items {
        ...MenuItem
        items {
          ...MenuItem
        }
      }
    }
  }
  fragment MenuItem on MenuItem {
    id
    resourceId
    tags
    title
    type
    url
  }
`;

export async function getCountries({storefront}: HydrogenContext) {
  const data = await storefront.query<CountriesData>(COUNTRIES_QUERY);

  invariant(data, 'No data returned from Shopify API');

  return data.localization.availableCountries.sort((a, b) =>
    a.name.localeCompare(b.name),
  );
}

const COUNTRIES_QUERY = `#graphql
  query Localization {
    localization {
      availableCountries {
        isoCode
        name
        currency {
          isoCode
          symbol
        }
      }
    }
  }
`;

export const MEDIA_FRAGMENT = `#graphql
  fragment Media on Media {
    __typename
    mediaContentType
    alt
    previewImage {
      url
    }
    ... on MediaImage {
      id
      image {
        url
        width
        height
      }
    }
    ... on Video {
      id
      sources {
        mimeType
        url
      }
    }
    ... on Model3d {
      id
      sources {
        mimeType
        url
      }
    }
    ... on ExternalVideo {
      id
      embedUrl
      host
    }
  }
`;

export const PRODUCT_CARD_FRAGMENT = `#graphql
  fragment ProductCard on Product {
    id
    title
    publishedAt
    handle
    variants(first: 1) {
      nodes {
        id
        image {
          url
          altText
          width
          height
        }
        priceV2 {
          amount
          currencyCode
        }
        compareAtPriceV2 {
          amount
          currencyCode
        }
      }
    }
  }
`;

export const PRODUCT_VARIANT_FRAGMENT = `#graphql
  fragment ProductVariantFragment on ProductVariant {
    id
    availableForSale
    selectedOptions {
      name
      value
    }
    image {
      id
      url
      altText
      width
      height
    }
    priceV2 {
      amount
      currencyCode
    }
    compareAtPriceV2 {
      amount
      currencyCode
    }
    sku
    title
    unitPrice {
      amount
      currencyCode
    }
  }
`;

const CART_FRAGMENT = `#graphql
fragment CartFragment on Cart {
  id
  checkoutUrl
  totalQuantity
  buyerIdentity {
    countryCode
    customer {
      id
      email
      firstName
      lastName
      displayName
    }
    email
    phone
  }
  lines(first: 100) {
    edges {
      node {
        id
        quantity
        attributes {
          key
          value
        }
        cost {
          totalAmount {
            amount
            currencyCode
          }
          compareAtAmountPerQuantity {
            amount
            currencyCode
          }
        }
        merchandise {
          ... on ProductVariant {
            id
            availableForSale
            compareAtPriceV2 {
              ...MoneyFragment
            }
            priceV2 {
              ...MoneyFragment
            }
            requiresShipping
            title
            image {
              ...ImageFragment
            }
            product {
              handle
              title
              id
            }
            selectedOptions {
              name
              value
            }
          }
        }
      }
    }
  }
  cost {
    subtotalAmount {
      ...MoneyFragment
    }
    totalAmount {
      ...MoneyFragment
    }
    totalDutyAmount {
      ...MoneyFragment
    }
    totalTaxAmount {
      ...MoneyFragment
    }
  }
  note
  attributes {
    key
    value
  }
  discountCodes {
    code
  }
}

fragment MoneyFragment on MoneyV2 {
  currencyCode
  amount
}
fragment ImageFragment on Image {
  id
  url
  altText
  width
  height
}
`;

const CREATE_CART_MUTATION = `#graphql
mutation CartCreate($input: CartInput!, $country: CountryCode = ZZ) @inContext(country: $country) {
  cartCreate(input: $input) {
    cart {
      id
    }
  }
}
`;

export async function createCart(
  {storefront}: HydrogenContext,
  {
    cart,
    params,
  }: {
    cart: CartInput;
    params: Params;
  },
) {
  const {country} = getLocalizationFromLang(params.lang);

  const data = await storefront.mutate<{
    cartCreate: {
      cart: Cart;
    };
  }>(CREATE_CART_MUTATION, {
    variables: {
      input: cart,
      country,
    },
  });

  invariant(data, 'No data returned from Shopify API');

  return data.cartCreate.cart;
}

const ADD_LINE_ITEM_MUTATION = `#graphql
  mutation CartLineAdd($cartId: ID!, $lines: [CartLineInput!]!, $country: CountryCode = ZZ) @inContext(country: $country) {
    cartLinesAdd(cartId: $cartId, lines: $lines) {
      cart {
        id
      }
    }
  }
`;

export async function addLineItem(
  {storefront}: HydrogenContext,
  {
    cartId,
    lines,
    params,
  }: {
    cartId: string;
    lines: CartLineInput[];
    params: Params;
  },
) {
  const {country} = getLocalizationFromLang(params.lang);

  const data = await storefront.mutate<{
    cartLinesAdd: {
      cart: Cart;
    };
  }>(ADD_LINE_ITEM_MUTATION, {
    variables: {cartId, lines, country},
  });

  invariant(data, 'No data returned from Shopify API');

  return data.cartLinesAdd.cart;
}

const CART_QUERY = `#graphql
  query CartQuery($cartId: ID!, $country: CountryCode = ZZ) @inContext(country: $country) {
    cart(id: $cartId) {
      ...CartFragment
    }
  }

  ${CART_FRAGMENT}
`;

export async function getCart(
  {storefront}: HydrogenContext,
  {
    cartId,
  }: {
    cartId: string;
  },
) {
  const data = await storefront.query<{cart: Cart}>(CART_QUERY, {
    variables: {
      cartId,
    },
  });

  invariant(data, 'No data returned from Shopify API');

  return data.cart;
}

const UPDATE_LINE_ITEM_MUTATION = `#graphql
  mutation CartLineUpdate($cartId: ID!, $lines: [CartLineUpdateInput!]!, $country: CountryCode = ZZ) @inContext(country: $country) {
    cartLinesUpdate(cartId: $cartId, lines: $lines) {
      cart {
        ...CartFragment
      }
    }
  }

  ${CART_FRAGMENT}
`;

export async function updateLineItem(
  {storefront}: HydrogenContext,
  {
    cartId,
    lineItem,
    params,
  }: {
    cartId: string;
    lineItem: CartLineUpdateInput;
    params: Params;
  },
) {
  const {country} = getLocalizationFromLang(params.lang);

  const data = await storefront.mutate<{cartLinesUpdate: {cart: Cart}}>(
    UPDATE_LINE_ITEM_MUTATION,
    {
      variables: {
        cartId,
        lines: [lineItem],
        country,
      },
    },
  );

  invariant(data, 'No data returned from Shopify API');

  return data.cartLinesUpdate.cart;
}

const TOP_PRODUCTS_QUERY = `#graphql
  ${PRODUCT_CARD_FRAGMENT}
  query topProducts(
    $count: Int
    $country: CountryCode
    $language: LanguageCode
  ) @inContext(country: $country, language: $language) {
    products(first: $count, sortKey: BEST_SELLING) {
      nodes {
        ...ProductCard
      }
    }
  }
`;

export async function getTopProducts(
  {storefront}: HydrogenContext,
  {
    params,
    count = 4,
  }: {
    params: Params;
    count?: number;
  },
) {
  const {language, country} = getLocalizationFromLang(params.lang);

  const data = await storefront.query<{
    products: ProductConnection;
  }>(TOP_PRODUCTS_QUERY, {
    variables: {
      count,
      country,
      language,
    },
  });

  invariant(data, 'No data returned from Shopify API');

  return data.products;
}

// shop primary domain url for /admin
export async function getPrimaryShopDomain({storefront}: HydrogenContext) {
  const data = await storefront.query<{shop: Shop}>(SHOP_PRIMARY_DOMAIN_QUERY);

  invariant(data?.shop?.primaryDomain, 'Primary domain not found');

  return data.shop;
}

const SHOP_PRIMARY_DOMAIN_QUERY = `#graphql
  query {
    shop {
      primaryDomain {
        url
      }
    }
  }
`;

export const COLLECTION_CONTENT_FRAGMENT = `#graphql
  ${MEDIA_FRAGMENT}
  fragment CollectionContent on Collection {
    id
    handle
    title
    descriptionHtml
    heading: metafield(namespace: "hero", key: "title") {
      value
    }
    byline: metafield(namespace: "hero", key: "byline") {
      value
    }
    cta: metafield(namespace: "hero", key: "cta") {
      value
    }
    spread: metafield(namespace: "hero", key: "spread") {
      reference {
        ...Media
      }
    }
    spreadSecondary: metafield(namespace: "hero", key: "spread_secondary") {
      reference {
        ...Media
      }
    }
  }
`;

/*
  Account ------------------------------------------------------------------------------------------------------------------------------------------------------------------------
*/

const LOGIN_MUTATION = `#graphql
  mutation customerAccessTokenCreate($input: CustomerAccessTokenCreateInput!) {
    customerAccessTokenCreate(input: $input) {
      customerUserErrors {
        code
        field
        message
      }
      customerAccessToken {
        accessToken
        expiresAt
      }
    }
  }
`;

export async function login(
  {storefront}: HydrogenContext,
  {
    email,
    password,
  }: {
    email: string;
    password: string;
  },
) {
  const data = await storefront.mutate<{
    customerAccessTokenCreate: CustomerAccessTokenCreatePayload;
  }>(LOGIN_MUTATION, {
    variables: {
      input: {
        email,
        password,
      },
    },
  });

  if (data?.customerAccessTokenCreate?.customerAccessToken?.accessToken) {
    return data.customerAccessTokenCreate.customerAccessToken.accessToken;
  }

  /**
   * Something is wrong with the user's input.
   */
  throw new Error(
    data?.customerAccessTokenCreate?.customerUserErrors.join(', '),
  );
}

const CUSTOMER_CREATE_MUTATION = `#graphql
  mutation customerCreate($input: CustomerCreateInput!) {
    customerCreate(input: $input) {
      customer {
        id
      }
      customerUserErrors {
        code
        field
        message
      }
    }
  }
`;

export async function registerCustomer(
  {storefront}: HydrogenContext,
  {
    email,
    password,
  }: {
    email: string;
    password: string;
  },
) {
  const data = await storefront.mutate<{
    customerCreate: CustomerCreatePayload;
  }>(CUSTOMER_CREATE_MUTATION, {
    variables: {
      input: {
        email,
        password,
      },
    },
  });

  if (data?.customerCreate?.customer?.id) {
    return data.customerCreate.customer.id;
  }

  /**
   * Something is wrong with the user's input.
   */
  throw new Error(data?.customerCreate?.customerUserErrors.join(', '));
}

const CUSTOMER_RECOVER_MUTATION = `#graphql
  mutation customerRecover($email: String!) {
    customerRecover(email: $email) {
      customerUserErrors {
        code
        field
        message
      }
    }
  }
`;

export async function sendPasswordResetEmail(
  {storefront}: HydrogenContext,
  {email}: {email: string},
) {
  await storefront.mutate<{
    customerRecover: CustomerRecoverPayload;
  }>(CUSTOMER_RECOVER_MUTATION, {
    variables: {email},
  });

  // User doesn't exist but we don't need to notify that.
  return null;
}

const CUSTOMER_RESET_MUTATION = `#graphql
  mutation customerReset($id: ID!, $input: CustomerResetInput!) {
    customerReset(id: $id, input: $input) {
      customerAccessToken {
        accessToken
        expiresAt
      }
      customerUserErrors {
        code
        field
        message
      }
    }
  }
`;

export async function resetPassword(
  {storefront}: HydrogenContext,
  {
    id,
    resetToken,
    password,
  }: {
    id: string;
    resetToken: string;
    password: string;
  },
) {
  const data = await storefront.mutate<{
    customerReset: CustomerResetPayload;
  }>(CUSTOMER_RESET_MUTATION, {
    variables: {
      id: `gid://shopify/Customer/${id}`,
      input: {
        password,
        resetToken,
      },
    },
  });

  if (data?.customerReset?.customerAccessToken) {
    return data.customerReset.customerAccessToken;
  }

  /**
   * Something is wrong with the user's input.
   */
  throw new Error(data?.customerReset?.customerUserErrors.join(', '));
}

const CUSTOMER_ACTIVATE_MUTATION = `#graphql
  mutation customerActivate($id: ID!, $input: CustomerActivateInput!) {
    customerActivate(id: $id, input: $input) {
      customerAccessToken {
        accessToken
        expiresAt
      }
      customerUserErrors {
        code
        field
        message
      }
    }
  }
`;

export async function activateAccount(
  {storefront}: HydrogenContext,
  {
    id,
    password,
    activationToken,
  }: {
    id: string;
    password: string;
    activationToken: string;
  },
) {
  const data = await storefront.mutate<{
    customerActivate: CustomerActivatePayload;
  }>(CUSTOMER_ACTIVATE_MUTATION, {
    variables: {
      id: `gid://shopify/Customer/${id}`,
      input: {
        password,
        activationToken,
      },
    },
  });

  if (data?.customerActivate?.customerAccessToken) {
    return data.customerActivate.customerAccessToken;
  }

  /**
   * Something is wrong with the user's input.
   */
  throw new Error(data?.customerActivate?.customerUserErrors.join(', '));
}

const CUSTOMER_QUERY = `#graphql
  query CustomerDetails(
    $customerAccessToken: String!
    $country: CountryCode
    $language: LanguageCode
  ) @inContext(country: $country, language: $language) {
    customer(customerAccessToken: $customerAccessToken) {
      firstName
      lastName
      phone
      email
      defaultAddress {
        id
        formatted
        firstName
        lastName
        company
        address1
        address2
        country
        province
        city
        zip
        phone
      }
      addresses(first: 6) {
        edges {
          node {
            id
            formatted
            firstName
            lastName
            company
            address1
            address2
            country
            province
            city
            zip
            phone
          }
        }
      }
      orders(first: 250, sortKey: PROCESSED_AT, reverse: true) {
        edges {
          node {
            id
            orderNumber
            processedAt
            financialStatus
            fulfillmentStatus
            currentTotalPrice {
              amount
              currencyCode
            }
            lineItems(first: 2) {
              edges {
                node {
                  variant {
                    image {
                      url
                      altText
                      height
                      width
                    }
                  }
                  title
                }
              }
            }
          }
        }
      }
    }
  }
`;

const CUSTOMER_ORDER_QUERY = `#graphql
  fragment Money on MoneyV2 {
    amount
    currencyCode
  }
  fragment AddressFull on MailingAddress {
    address1
    address2
    city
    company
    country
    countryCodeV2
    firstName
    formatted
    id
    lastName
    name
    phone
    province
    provinceCode
    zip
  }
  fragment DiscountApplication on DiscountApplication {
    value {
      ... on MoneyV2 {
        amount
        currencyCode
      }
      ... on PricingPercentageValue {
        percentage
      }
    }
  }
  fragment Image on Image {
    altText
    height
    src: url(transform: {crop: CENTER, maxHeight: 96, maxWidth: 96, scale: 2})
    id
    width
  }
  fragment ProductVariant on ProductVariant {
    id
    image {
      ...Image
    }
    priceV2 {
      ...Money
    }
    product {
      handle
    }
    sku
    title
  }
  fragment LineItemFull on OrderLineItem {
    title
    quantity
    discountAllocations {
      allocatedAmount {
        ...Money
      }
      discountApplication {
        ...DiscountApplication
      }
    }
    originalTotalPrice {
      ...Money
    }
    discountedTotalPrice {
      ...Money
    }
    variant {
      ...ProductVariant
    }
  }

  query CustomerOrder(
    $country: CountryCode
    $language: LanguageCode
    $orderId: ID!
  ) @inContext(country: $country, language: $language) {
    node(id: $orderId) {
      ... on Order {
        id
        name
        orderNumber
        processedAt
        fulfillmentStatus
        totalTaxV2 {
          ...Money
        }
        totalPriceV2 {
          ...Money
        }
        subtotalPriceV2 {
          ...Money
        }
        shippingAddress {
          ...AddressFull
        }
        discountApplications(first: 100) {
          nodes {
            ...DiscountApplication
          }
        }
        lineItems(first: 100) {
          nodes {
            ...LineItemFull
          }
        }
      }
    }
  }
`;

export async function getCustomerOrder(
  {storefront}: HydrogenContext,
  {
    orderId,
    params,
  }: {
    orderId: string;
    params: Params;
  },
): Promise<Order | undefined> {
  const {language, country} = getLocalizationFromLang(params.lang);

  const data = await storefront.query<{
    node: Order;
  }>(CUSTOMER_ORDER_QUERY, {
    variables: {
      country,
      language,
      orderId,
    },
  });

  return data?.node;
}

export async function getCustomer(
  context: HydrogenContext,
  {
    request,
    customerAccessToken,
    params,
  }: {
    request: Request;
    customerAccessToken: string;
    params: Params;
  },
) {
  const {storefront} = context;
  const {language, country} = getLocalizationFromLang(params.lang);

  const data = await storefront.query<{
    customer: Customer;
  }>(CUSTOMER_QUERY, {
    variables: {
      customerAccessToken,
      country,
      language,
    },
  });

  /**
   * If the customer failed to load, we assume their access token is invalid.
   */
  if (!data || !data.customer) {
    throw await logout(request, context, params);
  }

  return data.customer;
}

const CUSTOMER_UPDATE_MUTATION = `#graphql
  mutation customerUpdate($customerAccessToken: String!, $customer: CustomerUpdateInput!) {
    customerUpdate(customerAccessToken: $customerAccessToken, customer: $customer) {
      customerUserErrors {
        code
        field
        message
      }
    }
  }
  `;

export async function updateCustomer(
  {storefront}: HydrogenContext,
  {
    customerAccessToken,
    customer,
  }: {
    customerAccessToken: string;
    customer: CustomerUpdateInput;
  },
): Promise<void> {
  const data = await storefront.mutate<{
    customerUpdate: CustomerUpdatePayload;
  }>(CUSTOMER_UPDATE_MUTATION, {
    variables: {
      customerAccessToken,
      customer,
    },
  });

  assertApiErrors(data.customerUpdate);
}

const UPDATE_ADDRESS_MUTATION = `#graphql
  mutation customerAddressUpdate(
    $address: MailingAddressInput!
    $customerAccessToken: String!
    $id: ID!
  ) {
    customerAddressUpdate(
      address: $address
      customerAccessToken: $customerAccessToken
      id: $id
    ) {
      customerUserErrors {
        code
        field
        message
      }
    }
  }
`;

export async function updateCustomerAddress(
  {storefront}: HydrogenContext,
  {
    customerAccessToken,
    addressId,
    address,
  }: {
    customerAccessToken: string;
    addressId: string;
    address: MailingAddressInput;
  },
): Promise<void> {
  const data = await storefront.mutate<{
    customerAddressUpdate: CustomerAddressUpdatePayload;
  }>(UPDATE_ADDRESS_MUTATION, {
    variables: {
      customerAccessToken,
      id: addressId,
      address,
    },
  });

  assertApiErrors(data.customerAddressUpdate);
}

const DELETE_ADDRESS_MUTATION = `#graphql
  mutation customerAddressDelete($customerAccessToken: String!, $id: ID!) {
    customerAddressDelete(customerAccessToken: $customerAccessToken, id: $id) {
      customerUserErrors {
        code
        field
        message
      }
      deletedCustomerAddressId
    }
  }
`;

export async function deleteCustomerAddress(
  {storefront}: HydrogenContext,
  {
    customerAccessToken,
    addressId,
  }: {
    customerAccessToken: string;
    addressId: string;
  },
): Promise<void> {
  const data = await storefront.mutate<{
    customerAddressDelete: CustomerAddressDeletePayload;
  }>(DELETE_ADDRESS_MUTATION, {
    variables: {
      customerAccessToken,
      id: addressId,
    },
  });

  assertApiErrors(data.customerAddressDelete);
}

const UPDATE_DEFAULT_ADDRESS_MUTATION = `#graphql
  mutation customerDefaultAddressUpdate(
    $addressId: ID!
    $customerAccessToken: String!
  ) {
    customerDefaultAddressUpdate(
      addressId: $addressId
      customerAccessToken: $customerAccessToken
    ) {
      customerUserErrors {
        code
        field
        message
      }
    }
  }
`;

export async function updateCustomerDefaultAddress(
  {storefront}: HydrogenContext,
  {
    customerAccessToken,
    addressId,
  }: {
    customerAccessToken: string;
    addressId: string;
  },
): Promise<void> {
  const data = await storefront.mutate<{
    customerDefaultAddressUpdate: CustomerDefaultAddressUpdatePayload;
  }>(UPDATE_DEFAULT_ADDRESS_MUTATION, {
    variables: {
      customerAccessToken,
      addressId,
    },
  });

  assertApiErrors(data.customerDefaultAddressUpdate);
}

const CREATE_ADDRESS_MUTATION = `#graphql
  mutation customerAddressCreate(
    $address: MailingAddressInput!
    $customerAccessToken: String!
  ) {
    customerAddressCreate(
      address: $address
      customerAccessToken: $customerAccessToken
    ) {
      customerAddress {
        id
      }
      customerUserErrors {
        code
        field
        message
      }
    }
  }
`;

export async function createCustomerAddress(
  {storefront}: HydrogenContext,
  {
    customerAccessToken,
    address,
  }: {
    customerAccessToken: string;
    address: MailingAddressInput;
  },
): Promise<string> {
  const data = await storefront.mutate<{
    customerAddressCreate: CustomerAddressCreatePayload;
  }>(CREATE_ADDRESS_MUTATION, {
    variables: {
      customerAccessToken,
      address,
    },
  });

  assertApiErrors(data.customerAddressCreate);

  invariant(
    data?.customerAddressCreate?.customerAddress?.id,
    'Expected customer address to be created',
  );

  return data.customerAddressCreate.customerAddress.id;
}
