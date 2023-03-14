/* eslint-disable no-case-declarations */
import type {
  Cart as CartType,
  CartInput,
  CartLineInput,
  CartLineUpdateInput,
  CartUserError,
  UserError,
  CartBuyerIdentityInput,
} from '@shopify/hydrogen/storefront-api-types';
import {
  createCookieSessionStorage,
  type AppLoadContext,
  type SessionStorage,
  type Session,
} from '@shopify/remix-oxygen';

import {CartAction} from './types';

type Storefront = AppLoadContext['storefront'];

interface CartOptions {
  countryCode?: string;
  cartFrament?: string;
  numCartLines?: number;
  cookie?: Partial<{
    name: string;
    secrets: string[];
    httpOnly: boolean;
    path: string;
    sameSite: 'lax' | 'strict';
  }>;
}

interface Result {
  cart: CartType;
  errors?: CartUserError[] | UserError[];
}

interface OperationOptions {
  redirect?: string;
}

export class AlphaCart {
  private cartFragment: string;
  private countryCode: string;
  private numCartLines: number;
  public headers = new Headers();

  constructor(
    private sessionStorage: SessionStorage,
    private session: Session,
    private storefront: Storefront,
    options: CartOptions,
  ) {
    this.cartFragment = options.cartFrament || defaultCartFragment;
    this.countryCode = options.countryCode || 'CA';
    this.numCartLines = options.numCartLines || 250;
  }

  private parse(value: FormDataEntryValue) {
    return JSON.parse(String(value));
  }

  async perform(request: Request) {
    const formData = await request.formData();
    const action = formData.get('action');

    switch (action) {
      case 'ADD_TO_CART':
        const lines = formData.get('lines');

        if (!lines) {
          throw new Error('Missing lines');
        }

        return this.linesAdd({lines: this.parse(lines)});
      default:
        // TODO make typescript aware
        throw new Error(`Unknown cart action: ${action}`);
    }
  }

  get id() {
    return this.session.get('cartId');
  }

  set id(value: string) {
    console.log('set cart id', value);
    this.session.set('cartId', value);
  }

  async get() {
    console.log('get cart');
    console.log('cart id', this.id);
    if (!this.id) {
      return null;
    }

    const {cart} = await this.storefront.query<{cart: CartType}>(
      CartQuery(this.cartFragment),
      {
        variables: {id: this.id, countryCode: this.countryCode},
        cache: this.storefront.CacheNone(),
      },
    );

    return cart;
  }

  /**
   * Create a cart with line(s) mutation
   * @param input CartInput https://shopify.dev/api/storefront/2022-01/input-objects/CartInput
   * @see https://shopify.dev/api/storefront/2022-01/mutations/cartcreate
   * @returns result {cart, errors}
   * @preserve
   */
  async create({input}: {input: CartInput}, options: OperationOptions) {
    const {cartCreate} = await this.storefront.mutate<{
      cartCreate: {
        cart: CartType;
        errors: CartUserError[];
      };
      errors: UserError[];
    }>(CartCreate(this.cartFragment), {
      variables: {input, countryCode: this.countryCode},
    });

    const response = await this.respond(cartCreate, options);
    return response;
  }

  /**
   * Storefront API cartLinesAdd mutation
   * @param cartId
   * @param lines [CartLineInput!]! https://shopify.dev/api/storefront/2022-01/input-objects/CartLineInput
   * @see https://shopify.dev/api/storefront/2022-01/mutations/cartLinesAdd
   * @returns result {cart, errors}
   * @preserve
   */
  async linesAdd(
    {lines}: {lines: CartLineInput[]},
    options: OperationOptions = {},
  ) {
    if (!this.id) {
      return this.create({input: {lines}}, options);
    } else {
      const {cartLinesAdd} = await this.storefront.mutate<{
        cartLinesAdd: {
          cart: CartType;
          errors: CartUserError[];
        };
      }>(CartLinesAdd(this.cartFragment), {
        variables: {cartId: this.id, lines: JSON.parse(String(lines))},
      });

      const response = await this.respond(cartLinesAdd, options);
      return response;
    }
  }

  linesRemove() {}
  linesUpdate() {}
  noteUpdate() {}
  buyerIdentityUpdate() {}
  attributesUpdate() {}
  discountCodesUpdate() {}

  private async respond(result: Result, options: OperationOptions) {
    let status = 200;

    if (result.errors) {
      status = 400;
    }

    if (options.redirect) {
      this.headers.set('Location', options.redirect);
      status = 302;
    }

    console.log('result', result);

    this.id = result.cart.id;
    this.headers.set(
      'Set-Cookie',
      await this.sessionStorage.commitSession(this.session),
    );

    return [{result}, {headers: this.headers, status}];
  }

  static async init(
    request: Request,
    storefront: Storefront,
    options: CartOptions = {},
  ) {
    const storage = createCookieSessionStorage({
      cookie: {
        name: 'session',
        httpOnly: true,
        path: '/',
        sameSite: 'lax',
        ...options.cookie,
      },
    });

    const session = await storage.getSession(request.headers.get('Cookie'));
    return new this(storage, session, storefront, options);
  }
}

/**
 * MUTATIONS
 */

export const CartLinesAdd = (cartFragment: string): string => /* GraphQL */ `
  mutation CartLinesAdd(
    $cartId: ID!
    $lines: [CartLineInput!]!
    $numCartLines: Int = 250
    $country: CountryCode = ZZ
    $language: LanguageCode
  ) @inContext(country: $country, language: $language) {
    cartLinesAdd(cartId: $cartId, lines: $lines) {
      cart {
        ...CartFragment
      }
      errors: userErrors {
        ...ErrorFragment
      }
    }
  }
  ${cartFragment}
  ${errorFragment}
`;

export const CartCreate = (cartFragment: string): string => /* GraphQL */ `
  mutation CartCreate(
    $input: CartInput!
    $numCartLines: Int = 250
    $country: CountryCode = ZZ
    $language: LanguageCode
  ) @inContext(country: $country, language: $language) {
    cartCreate(input: $input) {
      cart {
        ...CartFragment
      }
      errors: userErrors {
        ...ErrorFragment
      }
    }
  }
  ${cartFragment}
  ${errorFragment}
`;

export const CartLineRemove = (cartFragment: string): string => /* GraphQL */ `
  mutation CartLineRemove(
    $cartId: ID!
    $lines: [ID!]!
    $numCartLines: Int = 250
    $country: CountryCode = ZZ
  ) @inContext(country: $country) {
    cartLinesRemove(cartId: $cartId, lineIds: $lines) {
      cart {
        ...CartFragment
      }
    }
  }
  ${cartFragment}
`;

export const CartLineUpdate = (cartFragment: string): string => /* GraphQL */ `
  mutation CartLineUpdate(
    $cartId: ID!
    $lines: [CartLineUpdateInput!]!
    $numCartLines: Int = 250
    $country: CountryCode = ZZ
  ) @inContext(country: $country) {
    cartLinesUpdate(cartId: $cartId, lines: $lines) {
      cart {
        ...CartFragment
      }
    }
  }
  ${cartFragment}
`;

export const CartNoteUpdate = (cartFragment: string): string => /* GraphQL */ `
  mutation CartNoteUpdate(
    $cartId: ID!
    $note: String
    $numCartLines: Int = 250
    $country: CountryCode = ZZ
  ) @inContext(country: $country) {
    cartNoteUpdate(cartId: $cartId, note: $note) {
      cart {
        ...CartFragment
      }
    }
  }
  ${cartFragment}
`;

export const CartBuyerIdentityUpdate = (
  cartFragment: string,
): string => /* GraphQL */ `
  mutation CartBuyerIdentityUpdate(
    $cartId: ID!
    $buyerIdentity: CartBuyerIdentityInput!
    $numCartLines: Int = 250
    $country: CountryCode = ZZ
  ) @inContext(country: $country) {
    cartBuyerIdentityUpdate(cartId: $cartId, buyerIdentity: $buyerIdentity) {
      cart {
        ...CartFragment
      }
    }
  }
  ${cartFragment}
`;

export const CartAttributesUpdate = (
  cartFragment: string,
): string => /* GraphQL */ `
  mutation CartAttributesUpdate(
    $attributes: [AttributeInput!]!
    $cartId: ID!
    $numCartLines: Int = 250
    $country: CountryCode = ZZ
  ) @inContext(country: $country) {
    cartAttributesUpdate(attributes: $attributes, cartId: $cartId) {
      cart {
        ...CartFragment
      }
    }
  }
  ${cartFragment}
`;

export const CartDiscountCodesUpdate = (
  cartFragment: string,
): string => /* GraphQL */ `
  mutation CartDiscountCodesUpdate(
    $cartId: ID!
    $discountCodes: [String!]
    $numCartLines: Int = 250
    $country: CountryCode = ZZ
  ) @inContext(country: $country) {
    cartDiscountCodesUpdate(cartId: $cartId, discountCodes: $discountCodes) {
      cart {
        ...CartFragment
      }
    }
  }
  ${cartFragment}
`;

/**
 * QUERIES
 */
export const CartQuery = (cartFragment: string): string => /* GraphQL */ `
  query CartQuery(
    $id: ID!
    $numCartLines: Int = 250
    $country: CountryCode = ZZ
  ) @inContext(country: $country) {
    cart(id: $id) {
      ...CartFragment
    }
  }
  ${cartFragment}
`;

/**
 * FRAGMENTS
 */

export const errorFragment = /* GraphQL */ `
  fragment ErrorFragment on CartUserError {
    message
    field
    code
  }
`;

export const defaultCartFragment = /* GraphQL */ `
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
                ...MoneyFragment
              }
              price {
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
/* eslint-enable no-case-declarations */
