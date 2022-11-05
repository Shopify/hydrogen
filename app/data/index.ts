import {type StorefrontApiResponseOk} from '@shopify/hydrogen-react';
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
  UserError,
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
import {getPublicTokenHeaders, getStorefrontApiUrl} from '~/lib/shopify-client';
import {
  type EnhancedMenu,
  parseMenu,
  getApiErrorMessage,
  getLocalizationFromLang,
} from '~/lib/utils';
import invariant from 'tiny-invariant';
import {logout} from '~/routes/account/__private/logout';
import type {AppLoadContext} from '@hydrogen/remix';
import {type Params} from '@remix-run/react';

type StorefrontApiResponse<T> = StorefrontApiResponseOk<T>;
export interface CountriesData {
  localization: Localization;
}

export interface LayoutData {
  headerMenu: EnhancedMenu;
  footerMenu: EnhancedMenu;
  shop: Shop;
  cart?: Promise<Cart>;
}
interface Metafield {
  value: string;
  reference?: object;
}

interface CollectionHero {
  byline: Metafield;
  cta: Metafield;
  handle: string;
  heading: Metafield;
  height?: 'full';
  loading?: 'eager' | 'lazy';
  spread: Metafield;
  spreadSecondary: Metafield;
  top?: boolean;
}
interface HomeSeoData {
  shop: {
    name: string;
    description: string;
  };
}

export async function getStorefrontData<T>({
  query,
  variables,
}: {
  query: string;
  variables: Record<string, any>;
}): Promise<StorefrontApiResponse<T>> {
  const response = await fetch(getStorefrontApiUrl(), {
    body: JSON.stringify({
      query,
      variables,
    }),
    headers: getPublicTokenHeaders({contentType: 'json'}),
    method: 'POST',
  });

  if (!response.ok) {
    const error = await response.text();

    /**
     * The Storefront API might return a string error, or a JSON-formatted {error: string}.
     * We try both and conform them to a single {errors} format.
     */
    try {
      return JSON.parse(error);
    } catch (_e) {
      return {errors: [{message: error}]};
    }
  }

  return response.json() as StorefrontApiResponseOk<T>;
}

export async function getLayoutData(params: Params) {
  const {language} = getLocalizationFromLang(params.lang);

  const HEADER_MENU_HANDLE = 'main-menu';
  const FOOTER_MENU_HANDLE = 'footer';

  const {data} = await getStorefrontData<LayoutData>({
    query: LAYOUT_QUERY,
    variables: {
      language,
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

export async function getCountries() {
  const {data} = await getStorefrontData<CountriesData>({
    query: COUNTRIES_QUERY,
    variables: {},
  });

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

export async function createCart({
  cart,
  params,
}: {
  cart: CartInput;
  params: Params;
}) {
  const {country} = getLocalizationFromLang(params.lang);

  const {data} = await getStorefrontData<{
    cartCreate: {
      cart: Cart;
    };
  }>({
    query: CREATE_CART_MUTATION,
    variables: {
      input: cart,
      country,
    },
  });

  invariant(data, 'No data returned from Shopify API');

  return data.cartCreate.cart;
}

const ADD_LINE_ITEM_QUERY = `#graphql
  mutation CartLineAdd($cartId: ID!, $lines: [CartLineInput!]!, $country: CountryCode = ZZ) @inContext(country: $country) {
    cartLinesAdd(cartId: $cartId, lines: $lines) {
      cart {
        id
      }
    }
  }
`;

export async function addLineItem({
  cartId,
  lines,
  params,
}: {
  cartId: string;
  lines: CartLineInput[];
  params: Params;
}) {
  const {country} = getLocalizationFromLang(params.lang);

  const {data} = await getStorefrontData<{
    cartLinesAdd: {
      cart: Cart;
    };
  }>({
    query: ADD_LINE_ITEM_QUERY,
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

export async function getCart({
  cartId,
  params,
}: {
  cartId: string;
  params: Params;
}) {
  const {country} = getLocalizationFromLang(params.lang);

  const {data} = await getStorefrontData<{cart: Cart}>({
    query: CART_QUERY,
    variables: {
      cartId,
      country,
    },
  });

  invariant(data, 'No data returned from Shopify API');

  return data.cart;
}

const UPDATE_LINE_ITEM_QUERY = `#graphql
  mutation CartLineUpdate($cartId: ID!, $lines: [CartLineUpdateInput!]!, $country: CountryCode = ZZ) @inContext(country: $country) {
    cartLinesUpdate(cartId: $cartId, lines: $lines) {
      cart {
        ...CartFragment
      }
    }
  }

  ${CART_FRAGMENT}
`;

export async function updateLineItem({
  cartId,
  lines,
  params,
}: {
  cartId: string;
  lines: CartLineUpdateInput;
  params: Params;
}) {
  const {country} = getLocalizationFromLang(params.lang);

  const {data} = await getStorefrontData<{cartLinesUpdate: {cart: Cart}}>({
    query: UPDATE_LINE_ITEM_QUERY,
    variables: {
      cartId,
      lines,
      country,
    },
  });

  invariant(data, 'No data returned from Shopify API');

  return data.cartLinesUpdate.cart;
}

const REMOVE_LINE_ITEMS = `#graphql
  mutation CartLinesRemove($cartId: ID!, $lineIds: [ID!]!, $country: CountryCode = ZZ)
  @inContext(country: $country) {
    cartLinesRemove(cartId: $cartId, lineIds: $lineIds) {
      cart {
        id
        lines(first: 100) {
          edges {
            node {
              id
              quantity
              merchandise {
                ...on ProductVariant {
                  id
                }
              }
            }
          }
        }
        totalQuantity
      }
      errors: userErrors {
        message
        field
        code
      }
    }
  }
`;

export async function removeLineItems({
  cartId,
  lineIds,
  params,
}: {
  cartId: string;
  lineIds: Cart['id'][];
  params: Params;
}) {
  const {country} = getLocalizationFromLang(params.lang);

  const response = await getStorefrontData<{
    cartLinesRemove: {cart: Cart; errors: UserError[]};
  }>({
    query: REMOVE_LINE_ITEMS,
    variables: {
      cartId,
      lineIds,
      country,
    },
  });

  invariant(
    response?.data?.cartLinesRemove,
    'No data returned from remove lines mutation',
  );
  return response.data.cartLinesRemove;
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

export async function getTopProducts({
  params,
  count = 4,
}: {
  params: Params;
  count?: number;
}) {
  const {language, country} = getLocalizationFromLang(params.lang);

  const {data} = await getStorefrontData<{
    products: ProductConnection;
  }>({
    query: TOP_PRODUCTS_QUERY,
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
export async function getPrimaryShopDomain() {
  const {data, errors} = await getStorefrontData<{shop: Shop}>({
    query: SHOP_PRIMARY_DOMAIN_QUERY,
    variables: {},
  });

  if (errors) {
    throw new Error(errors.map((error) => error).join());
  }

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

export class StorefrontApiError extends Error {}

export async function login({
  email,
  password,
}: {
  email: string;
  password: string;
}) {
  const {data, errors} = await getStorefrontData<{
    customerAccessTokenCreate: CustomerAccessTokenCreatePayload;
  }>({
    query: LOGIN_MUTATION,
    variables: {
      input: {
        email,
        password,
      },
    },
  });

  /**
   * Something is wrong with the API.
   */
  if (errors) {
    throw new StorefrontApiError(errors.map((e) => e.message).join(', '));
  }

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

export async function registerCustomer({
  email,
  password,
}: {
  email: string;
  password: string;
}) {
  const {data, errors} = await getStorefrontData<{
    customerCreate: CustomerCreatePayload;
  }>({
    query: CUSTOMER_CREATE_MUTATION,
    variables: {
      input: {
        email,
        password,
      },
    },
  });

  if (errors && /Creating Customer Limit exceeded/i.test(errors[0]?.message)) {
    // The SFAPI throws this error when the email is already in use.
    throw new Error('User already exists or API limit exceeded');
  }

  /**
   * Something is wrong with the API.
   */
  if (errors) {
    throw new StorefrontApiError(errors.map((e) => e.message).join(', '));
  }

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

export async function sendPasswordResetEmail({email}: {email: string}) {
  const {errors} = await getStorefrontData<{
    customerRecover: CustomerRecoverPayload;
  }>({
    query: CUSTOMER_RECOVER_MUTATION,
    variables: {
      email,
    },
  });

  /**
   * Something is wrong with the API.
   */
  if (errors) {
    throw new StorefrontApiError(errors.map((e) => e.message).join(', '));
  }

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

export async function resetPassword({
  id,
  resetToken,
  password,
}: {
  id: string;
  resetToken: string;
  password: string;
}) {
  const {data, errors} = await getStorefrontData<{
    customerReset: CustomerResetPayload;
  }>({
    query: CUSTOMER_RESET_MUTATION,
    variables: {
      id: `gid://shopify/Customer/${id}`,
      input: {
        password,
        resetToken,
      },
    },
  });

  /**
   * Something is wrong with the API.
   */
  if (errors) {
    throw new StorefrontApiError(errors.map((e) => e.message).join(', '));
  }

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

export async function activateAccount({
  id,
  password,
  activationToken,
}: {
  id: string;
  password: string;
  activationToken: string;
}) {
  const {data, errors} = await getStorefrontData<{
    customerActivate: CustomerActivatePayload;
  }>({
    query: CUSTOMER_ACTIVATE_MUTATION,
    variables: {
      id: `gid://shopify/Customer/${id}`,
      input: {
        password,
        activationToken,
      },
    },
  });

  /**
   * Something is wrong with the API.
   */
  if (errors) {
    throw new StorefrontApiError(errors.map((e) => e.message).join(', '));
  }

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

export async function getCustomerOrder({
  orderId,
  params,
}: {
  orderId: string;
  params: Params;
}): Promise<Order | undefined> {
  const {language, country} = getLocalizationFromLang(params.lang);

  const {data, errors} = await getStorefrontData<{
    node: Order;
  }>({
    query: CUSTOMER_ORDER_QUERY,
    variables: {
      country,
      language,
      orderId,
    },
  });

  if (errors) {
    const errorMessages = errors.map((error) => error.message).join('\n');
    throw new Error(errorMessages);
  }

  return data?.node;
}

export async function getCustomer({
  request,
  context,
  customerAccessToken,
  params,
}: {
  request: Request;
  context: AppLoadContext;
  customerAccessToken: string;
  params: Params;
}) {
  const {language, country} = getLocalizationFromLang(params.lang);

  const {data, errors} = await getStorefrontData<{
    customer: Customer;
  }>({
    query: CUSTOMER_QUERY,
    variables: {
      customerAccessToken,
      country,
      language,
    },
  });

  if (errors) {
    const errorMessages = errors.map((error) => error.message).join('\n');
    throw new Error(errorMessages);
  }

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

export async function updateCustomer({
  customerAccessToken,
  customer,
}: {
  customerAccessToken: string;
  customer: CustomerUpdateInput;
}): Promise<void> {
  const {data, errors} = await getStorefrontData<{
    customerUpdate: CustomerUpdatePayload;
  }>({
    query: CUSTOMER_UPDATE_MUTATION,
    variables: {
      customerAccessToken,
      customer,
    },
  });

  const error = getApiErrorMessage(
    'customerUpdate',
    data,
    errors as UserError[],
  );

  if (error) {
    throw new Error(error);
  }
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

export async function updateCustomerAddress({
  customerAccessToken,
  addressId,
  address,
}: {
  customerAccessToken: string;
  addressId: string;
  address: MailingAddressInput;
}): Promise<void> {
  const {data, errors} = await getStorefrontData<{
    customerAddressUpdate: CustomerAddressUpdatePayload;
  }>({
    query: UPDATE_ADDRESS_MUTATION,
    variables: {
      customerAccessToken,
      id: addressId,
      address,
    },
  });

  const error = getApiErrorMessage(
    'customerAddressUpdate',
    data,
    errors as UserError[],
  );

  if (error) {
    throw new Error(error);
  }
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

export async function deleteCustomerAddress({
  customerAccessToken,
  addressId,
}: {
  customerAccessToken: string;
  addressId: string;
}): Promise<void> {
  const {data, errors} = await getStorefrontData<{
    customerAddressDelete: CustomerAddressDeletePayload;
  }>({
    query: DELETE_ADDRESS_MUTATION,
    variables: {
      customerAccessToken,
      id: addressId,
    },
  });

  const error = getApiErrorMessage(
    'customerAddressDelete',
    data,
    errors as UserError[],
  );

  if (error) {
    throw new Error(error);
  }
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

export async function updateCustomerDefaultAddress({
  customerAccessToken,
  addressId,
}: {
  customerAccessToken: string;
  addressId: string;
}): Promise<void> {
  const {data, errors} = await getStorefrontData<{
    customerDefaultAddressUpdate: CustomerDefaultAddressUpdatePayload;
  }>({
    query: UPDATE_DEFAULT_ADDRESS_MUTATION,
    variables: {
      customerAccessToken,
      addressId,
    },
  });

  const error = getApiErrorMessage(
    'customerDefaultAddressUpdate',
    data,
    errors as UserError[],
  );

  if (error) {
    throw new Error(error);
  }
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

export async function createCustomerAddress({
  customerAccessToken,
  address,
}: {
  customerAccessToken: string;
  address: MailingAddressInput;
}): Promise<string> {
  const {data, errors} = await getStorefrontData<{
    customerAddressCreate: CustomerAddressCreatePayload;
  }>({
    query: CREATE_ADDRESS_MUTATION,
    variables: {
      customerAccessToken,
      address,
    },
  });

  const error = getApiErrorMessage(
    'customerAddressCreate',
    data,
    errors as UserError[],
  );

  if (error) {
    throw new Error(error);
  }

  invariant(
    data?.customerAddressCreate?.customerAddress?.id,
    'Expected customer address to be created',
  );

  return data.customerAddressCreate.customerAddress.id;
}
