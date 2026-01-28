import {formatAPIResult} from '../../storefront';
import type {CustomerAccount} from '../../customer/types';
import type {CartQueryOptions, CartReturn} from './cart-types';
import type {
  Cart,
  CountryCode,
  LanguageCode,
  VisitorConsent,
} from '@shopify/hydrogen-react/storefront-api-types';

type CartGetProps = {
  /**
   * The cart ID.
   * @default cart.getCartId();
   */
  cartId?: string;
  /**
   * The country code.
   * @default storefront.i18n.country
   */
  country?: CountryCode;
  /**
   * The language code.
   * @default storefront.i18n.language
   */
  language?: LanguageCode;
  /**
   * The number of cart lines to be returned.
   * @default 100
   */
  numCartLines?: number;
  /**
   * Visitor consent preferences for the Storefront API's @inContext directive.
   *
   * **Most Hydrogen storefronts do NOT need this.** If you're using Hydrogen's
   * analytics provider or Shopify's Customer Privacy API (including third-party
   * consent services integrated with it), consent is handled automatically.
   *
   * This option exists for Storefront API parity and is primarily intended for
   * non-Hydrogen integrations like Checkout Kit that manage consent outside
   * Shopify's standard consent flow.
   *
   * When provided, consent is encoded into the cart's checkoutUrl via the _cs parameter.
   */
  visitorConsent?: VisitorConsent;
};

export type CartGetFunction = (
  cartInput?: CartGetProps,
) => Promise<CartReturn | null>;

type CartGetOptions = CartQueryOptions & {
  /**
   * The customer account client instance created by [`createCustomerAccountClient`](docs/api/hydrogen/latest/utilities/createcustomeraccountclient).
   */
  customerAccount?: CustomerAccount;
};

export function cartGetDefault({
  storefront,
  customerAccount,
  getCartId,
  cartFragment,
}: CartGetOptions): CartGetFunction {
  return async (cartInput?: CartGetProps) => {
    const cartId = getCartId();

    if (!cartId) return null;

    const [isCustomerLoggedIn, {cart, errors}] = await Promise.all([
      customerAccount ? customerAccount.isLoggedIn() : false,
      storefront.query<{cart: Cart | null}>(CART_QUERY(cartFragment), {
        variables: {cartId, ...cartInput},
        cache: storefront.CacheNone(),
      }),
    ]);

    if (isCustomerLoggedIn && cart?.checkoutUrl) {
      const finalCheckoutUrl = new URL(cart.checkoutUrl);
      finalCheckoutUrl.searchParams.set('logged_in', 'true');
      cart.checkoutUrl = finalCheckoutUrl.toString();
    }

    return cart || errors ? formatAPIResult(cart, errors) : null;
  };
}

//! @see https://shopify.dev/docs/api/storefront/latest/queries/cart
const CART_QUERY = (cartFragment = DEFAULT_CART_FRAGMENT) => `#graphql
  query CartQuery(
    $cartId: ID!
    $numCartLines: Int = 100
    $country: CountryCode = ZZ
    $language: LanguageCode
    $visitorConsent: VisitorConsent
  ) @inContext(country: $country, language: $language, visitorConsent: $visitorConsent) {
    cart(id: $cartId) {
      ...CartApiQuery
    }
  }

  ${cartFragment}
`;

export const DEFAULT_CART_FRAGMENT = `#graphql
  fragment CartApiQuery on Cart {
    updatedAt
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
    lines(first: $numCartLines) {
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
            amountPerQuantity {
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
              compareAtPrice {
                ...CartApiMoney
              }
              price {
                ...CartApiMoney
              }
              requiresShipping
              title
              image {
                ...CartApiImage
              }
              product {
                handle
                title
                id
                vendor
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
        ...CartApiMoney
      }
      totalAmount {
        ...CartApiMoney
      }
      totalDutyAmount {
        ...CartApiMoney
      }
      totalTaxAmount {
        ...CartApiMoney
      }
    }
    note
    attributes {
      key
      value
    }
    discountCodes {
      applicable
      code
    }
    appliedGiftCards {
      id
      lastCharacters
      amountUsed {
        ...CartApiMoney
      }
    }
  }

  fragment CartApiMoney on MoneyV2 {
    currencyCode
    amount
  }

  fragment CartApiImage on Image {
    id
    url
    altText
    width
    height
  }
`;
