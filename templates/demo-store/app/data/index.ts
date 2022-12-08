import type {
  Cart,
  CartInput,
  CartLine,
  CartLineInput,
  CartLineUpdateInput,
  CartUserError,
  UserError,
  CartBuyerIdentityInput,
  Shop,
  Order,
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
import {type EnhancedMenu, parseMenu, assertApiErrors} from '~/lib/utils';
import invariant from 'tiny-invariant';
import {logout} from '~/routes/account/__private/logout';
import type {AppLoadContext} from '@remix-run/oxygen';

export interface LayoutData {
  headerMenu: EnhancedMenu;
  footerMenu: EnhancedMenu;
  shop: Shop;
  cart?: Promise<Cart>;
}

export async function getLayoutData({storefront}: AppLoadContext) {
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
        price: priceV2 {
          amount
          currencyCode
        }
        compareAtPrice: compareAtPriceV2 {
          amount
          currencyCode
        }
        selectedOptions {
          name
          value
        }
        product {
          handle
          title
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
    price {
      amount
      currencyCode
    }
    compareAtPrice {
      amount
      currencyCode
    }
    sku
    title
    unitPrice {
      amount
      currencyCode
    }
    product {
      title
      handle
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
  lines(first: 100, reverse: true) {
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
    applicable
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

// shop primary domain url for /admin
export async function getPrimaryShopDomain({storefront}: AppLoadContext) {
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
  Cart ------------------------------------------------------------------------------------------------------------------------------------------------------------------------
*/

const USER_ERROR_FRAGMENT = `#graphql
  fragment ErrorFragment on CartUserError {
    message
    field
    code
  }
`;

const LINES_CART_FRAGMENT = `#graphql
  fragment CartLinesFragment on Cart {
    id
    totalQuantity
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
  }
`;

//! @see: https://shopify.dev/api/storefront/2022-01/mutations/cartcreate
const CREATE_CART_MUTATION = `#graphql
  mutation ($input: CartInput!, $country: CountryCode = ZZ, $language: LanguageCode)
  @inContext(country: $country, language: $language) {
    cartCreate(input: $input) {
      cart {
        ...CartLinesFragment
      }
      errors: userErrors {
        ...ErrorFragment
      }
    }
  }
  ${LINES_CART_FRAGMENT}
  ${USER_ERROR_FRAGMENT}
`;

/**
 * Create a cart with line(s) mutation
 * @param input CartInput https://shopify.dev/api/storefront/2022-01/input-objects/CartInput
 * @see https://shopify.dev/api/storefront/2022-01/mutations/cartcreate
 * @returns result {cart, errors}
 * @preserve
 */
export async function cartCreate({
  input,
  storefront,
}: {
  input: CartInput;
  storefront: AppLoadContext['storefront'];
}) {
  const {cartCreate} = await storefront.mutate<{
    cartCreate: {
      cart: Cart;
      errors: CartUserError[];
    };
    errors: UserError[];
  }>(CREATE_CART_MUTATION, {
    variables: {input},
  });

  invariant(cartCreate, 'No data returned from cartCreate mutation');

  return cartCreate;
}

const ADD_LINES_MUTATION = `#graphql
  mutation ($cartId: ID!, $lines: [CartLineInput!]!, $country: CountryCode = ZZ, $language: LanguageCode)
  @inContext(country: $country, language: $language) {
    cartLinesAdd(cartId: $cartId, lines: $lines) {
      cart {
        ...CartLinesFragment
      }
      errors: userErrors {
        ...ErrorFragment
      }
    }
  }
  ${LINES_CART_FRAGMENT}
  ${USER_ERROR_FRAGMENT}
`;

/**
 * Storefront API cartLinesAdd mutation
 * @param cartId
 * @param lines [CartLineInput!]! https://shopify.dev/api/storefront/2022-01/input-objects/CartLineInput
 * @see https://shopify.dev/api/storefront/2022-01/mutations/cartLinesAdd
 * @returns result {cart, errors}
 * @preserve
 */
export async function cartAdd({
  cartId,
  lines,
  storefront,
}: {
  cartId: string;
  lines: CartLineInput[];
  storefront: AppLoadContext['storefront'];
}) {
  const {cartLinesAdd} = await storefront.mutate<{
    cartLinesAdd: {
      cart: Cart;
      errors: CartUserError[];
    };
  }>(ADD_LINES_MUTATION, {
    variables: {cartId, lines},
  });

  invariant(cartLinesAdd, 'No data returned from cartLinesAdd mutation');

  return cartLinesAdd;
}

const REMOVE_LINE_ITEMS_MUTATION = `#graphql
  mutation ($cartId: ID!, $lineIds: [ID!]!, $language: LanguageCode, $country: CountryCode)
  @inContext(country: $country, language: $language) {
    cartLinesRemove(cartId: $cartId, lineIds: $lineIds) {
      cart {
        id
        totalQuantity
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
      }
      errors: userErrors {
        message
        field
        code
      }
    }
  }
`;

/**
 * Create a cart with line(s) mutation
 * @param cartId the current cart id
 * @param lineIds [ID!]! an array of cart line ids to remove
 * @see https://shopify.dev/api/storefront/2022-07/mutations/cartlinesremove
 * @returns mutated cart
 * @preserve
 */
export async function cartRemove({
  cartId,
  lineIds,
  storefront,
}: {
  cartId: string;
  lineIds: Cart['id'][];
  storefront: AppLoadContext['storefront'];
}) {
  const {cartLinesRemove} = await storefront.mutate<{
    cartLinesRemove: {cart: Cart; errors: UserError[]};
  }>(REMOVE_LINE_ITEMS_MUTATION, {
    variables: {
      cartId,
      lineIds,
    },
  });

  invariant(cartLinesRemove, 'No data returned from remove lines mutation');
  return cartLinesRemove;
}

const LINES_UPDATE_MUTATION = `#graphql
  ${LINES_CART_FRAGMENT}
  ${USER_ERROR_FRAGMENT}
  mutation ($cartId: ID!, $lines: [CartLineUpdateInput!]!, $language: LanguageCode, $country: CountryCode)
  @inContext(country: $country, language: $language) {
    cartLinesUpdate(cartId: $cartId, lines: $lines) {
      cart {
        ...CartLinesFragment
      }
      errors: userErrors {
        ...ErrorFragment
      }
    }
  }
`;

/**
 * Update cart line(s) mutation
 * @param cartId the current cart id
 * @param lineIds [ID!]! an array of cart line ids to remove
 * @see https://shopify.dev/api/storefront/2022-07/mutations/cartlinesremove
 * @returns mutated cart
 * @preserve
 */
export async function cartUpdate({
  cartId,
  lines,
  storefront,
}: {
  cartId: string;
  lines: CartLineUpdateInput[];
  storefront: AppLoadContext['storefront'];
}) {
  const {cartLinesUpdate} = await storefront.mutate<{
    cartLinesUpdate: {cart: Cart; errors: UserError[]};
  }>(LINES_UPDATE_MUTATION, {
    variables: {cartId, lines},
  });

  invariant(
    cartLinesUpdate,
    'No data returned from update lines items mutation',
  );
  return cartLinesUpdate;
}

/**
 * @see https://shopify.dev/api/storefront/2022-10/mutations/cartBuyerIdentityUpdate
 * @preserve
 */
const UPDATE_CART_BUYER_COUNTRY = `#graphql
 mutation(
   $cartId: ID!
   $buyerIdentity: CartBuyerIdentityInput!
   $country: CountryCode = ZZ
   $language: LanguageCode
 ) @inContext(country: $country, language: $language) {
   cartBuyerIdentityUpdate(cartId: $cartId, buyerIdentity: $buyerIdentity) {
     cart {
       id
       buyerIdentity {
         email
         phone
         countryCode
       }
     }
     errors: userErrors {
       message
       field
       code
     }
   }
 }
`;

/**
 * Mutation to update a cart buyerIdentity
 * @param cartId  Cart['id']
 * @param buyerIdentity CartBuyerIdentityInput
 * @returns {cart: Cart; errors: UserError[]}
 * @see API https://shopify.dev/api/storefront/2022-10/mutations/cartBuyerIdentityUpdate
 * @preserve
 */
export async function cartUpdateBuyerIdentity({
  cartId,
  buyerIdentity,
  storefront,
}: {
  cartId: string;
  buyerIdentity: CartBuyerIdentityInput;
  storefront: AppLoadContext['storefront'];
}) {
  const {cartBuyerIdentityUpdate} = await storefront.mutate<{
    cartBuyerIdentityUpdate: {cart: Cart; errors: UserError[]};
  }>(UPDATE_CART_BUYER_COUNTRY, {
    variables: {
      cartId,
      buyerIdentity,
    },
  });

  invariant(
    cartBuyerIdentityUpdate,
    'No data returned from cart buyer identity update mutation',
  );

  return cartBuyerIdentityUpdate;
}

const DISCOUNT_CODES_UPDATE = `#graphql
  mutation cartDiscountCodesUpdate($cartId: ID!, $discountCodes: [String!], $country: CountryCode = ZZ)
    @inContext(country: $country) {
    cartDiscountCodesUpdate(cartId: $cartId, discountCodes: $discountCodes) {
      cart {
        id
        discountCodes {
          code
        }
      }
      errors: userErrors {
        field
        message
      }
    }
  }
`;

/**
 * Mutation that updates the cart discounts
 * @param discountCodes Array of discount codes
 * @returns mutated cart
 * @preserve
 */
export async function cartDiscountCodesUpdate({
  cartId,
  discountCodes,
  storefront,
}: {
  cartId: string;
  discountCodes: string[];
  storefront: AppLoadContext['storefront'];
}) {
  const {cartDiscountCodesUpdate} = await storefront.mutate<{
    cartDiscountCodesUpdate: {cart: Cart; errors: UserError[]};
  }>(DISCOUNT_CODES_UPDATE, {
    variables: {
      cartId,
      discountCodes,
    },
  });

  invariant(
    cartDiscountCodesUpdate,
    'No data returned from the cartDiscountCodesUpdate mutation',
  );

  return cartDiscountCodesUpdate;
}

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
  {storefront}: AppLoadContext,
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
  {storefront}: AppLoadContext,
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
  {storefront}: AppLoadContext,
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
  {storefront}: AppLoadContext,
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
  {storefront}: AppLoadContext,
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
  {storefront}: AppLoadContext,
  {
    orderId,
  }: {
    orderId: string;
  },
): Promise<Order | undefined> {
  const data = await storefront.query<{
    node: Order;
  }>(CUSTOMER_ORDER_QUERY, {
    variables: {
      orderId,
    },
  });

  return data?.node;
}

export async function getCustomer(
  context: AppLoadContext,
  {
    request,
    customerAccessToken,
  }: {
    request: Request;
    customerAccessToken: string;
  },
) {
  const {storefront} = context;

  const data = await storefront.query<{
    customer: Customer;
  }>(CUSTOMER_QUERY, {
    variables: {
      customerAccessToken,
    },
  });

  /**
   * If the customer failed to load, we assume their access token is invalid.
   */
  if (!data || !data.customer) {
    throw await logout(request, context);
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
  {storefront}: AppLoadContext,
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
  {storefront}: AppLoadContext,
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
  {storefront}: AppLoadContext,
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
  {storefront}: AppLoadContext,
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
  {storefront}: AppLoadContext,
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
