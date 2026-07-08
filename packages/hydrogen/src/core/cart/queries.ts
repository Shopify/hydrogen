import {
  gql,
  type AnyStorefrontQueryString,
  type ComposedSource,
  type StorefrontQueryString,
} from "../../graphql";
import type { InferResult, InferVariables } from "../../graphql";
import type { CartData, CartLineConnection } from "./state";

const CART_FRAGMENT_NAME = "CartFragment";
const CART_FRAGMENT_TYPE = "Cart";
const HYDROGEN_CART_FRAGMENT_NAME = "HydrogenCartFragment";

type FragmentContract = {
  readonly name: string;
  readonly typeName: string;
};

const CART_FRAGMENT_CONTRACT = {
  name: CART_FRAGMENT_NAME,
  typeName: CART_FRAGMENT_TYPE,
} as const satisfies FragmentContract;

const HYDROGEN_CART_FRAGMENT_SPREAD = `...${HYDROGEN_CART_FRAGMENT_NAME}`;
const CART_FRAGMENT_SPREAD = `...${CART_FRAGMENT_NAME}`;
const CART_FRAGMENT_PATTERN = createFragmentPattern(CART_FRAGMENT_CONTRACT);

const HYDROGEN_CART_FRAGMENT_SOURCE = /* GraphQL */ `
  fragment HydrogenCartFragment on Cart {
    id
    checkoutUrl
    totalQuantity
    note
    cost {
      subtotalAmount {
        amount
        currencyCode
      }
      totalAmount {
        amount
        currencyCode
      }
      checkoutChargeAmount {
        amount
        currencyCode
      }
    }
    lines(first: 250) {
      nodes {
        id
        quantity
        cost {
          totalAmount {
            amount
            currencyCode
          }
          subtotalAmount {
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
            title
            sku
            quantityAvailable
            image {
              id
              url
              altText
              width
              height
            }
            product {
              id
              title
              handle
              vendor
              productType
            }
            selectedOptions {
              name
              value
            }
          }
        }
        ... on CartLine {
          parentRelationship {
            parent {
              id
            }
          }
        }
      }
    }
    discountCodes {
      applicable
      code
    }
  }
`;

const CART_QUERY_SOURCE = /* GraphQL */ `
  query Cart($id: ID!, $country: CountryCode, $language: LanguageCode)
  @inContext(country: $country, language: $language) {
    cart(id: $id) {
      ${HYDROGEN_CART_FRAGMENT_SPREAD}
    }
  }
`;

const CUSTOM_CART_QUERY_SOURCE = /* GraphQL */ `
  query Cart($id: ID!, $country: CountryCode, $language: LanguageCode)
  @inContext(country: $country, language: $language) {
    cart(id: $id) {
      ${HYDROGEN_CART_FRAGMENT_SPREAD}
      ${CART_FRAGMENT_SPREAD}
    }
  }
`;

const CART_CREATE_MUTATION_SOURCE = /* GraphQL */ `
  mutation CartCreate($input: CartInput!, $country: CountryCode, $language: LanguageCode)
  @inContext(country: $country, language: $language) {
    cartCreate(input: $input) {
      cart {
        ${HYDROGEN_CART_FRAGMENT_SPREAD}
      }
      userErrors {
        code
        field
        message
      }
      warnings {
        code
        message
        target
      }
    }
  }
`;

const CUSTOM_CART_CREATE_MUTATION_SOURCE = /* GraphQL */ `
  mutation CartCreate($input: CartInput!, $country: CountryCode, $language: LanguageCode)
  @inContext(country: $country, language: $language) {
    cartCreate(input: $input) {
      cart {
        ${HYDROGEN_CART_FRAGMENT_SPREAD}
        ${CART_FRAGMENT_SPREAD}
      }
      userErrors {
        code
        field
        message
      }
      warnings {
        code
        message
        target
      }
    }
  }
`;

const CART_LINES_ADD_MUTATION_SOURCE = /* GraphQL */ `
  mutation CartLinesAdd($cartId: ID!, $lines: [CartLineInput!]!, $country: CountryCode, $language: LanguageCode)
  @inContext(country: $country, language: $language) {
    cartLinesAdd(cartId: $cartId, lines: $lines) {
      cart {
        ${HYDROGEN_CART_FRAGMENT_SPREAD}
      }
      userErrors {
        code
        field
        message
      }
      warnings {
        code
        message
        target
      }
    }
  }
`;

const CUSTOM_CART_LINES_ADD_MUTATION_SOURCE = /* GraphQL */ `
  mutation CartLinesAdd($cartId: ID!, $lines: [CartLineInput!]!, $country: CountryCode, $language: LanguageCode)
  @inContext(country: $country, language: $language) {
    cartLinesAdd(cartId: $cartId, lines: $lines) {
      cart {
        ${HYDROGEN_CART_FRAGMENT_SPREAD}
        ${CART_FRAGMENT_SPREAD}
      }
      userErrors {
        code
        field
        message
      }
      warnings {
        code
        message
        target
      }
    }
  }
`;

const CART_LINES_UPDATE_MUTATION_SOURCE = /* GraphQL */ `
  mutation CartLinesUpdate($cartId: ID!, $lines: [CartLineUpdateInput!]!, $country: CountryCode, $language: LanguageCode)
  @inContext(country: $country, language: $language) {
    cartLinesUpdate(cartId: $cartId, lines: $lines) {
      cart {
        ${HYDROGEN_CART_FRAGMENT_SPREAD}
      }
      userErrors {
        code
        field
        message
      }
      warnings {
        code
        message
        target
      }
    }
  }
`;

const CUSTOM_CART_LINES_UPDATE_MUTATION_SOURCE = /* GraphQL */ `
  mutation CartLinesUpdate($cartId: ID!, $lines: [CartLineUpdateInput!]!, $country: CountryCode, $language: LanguageCode)
  @inContext(country: $country, language: $language) {
    cartLinesUpdate(cartId: $cartId, lines: $lines) {
      cart {
        ${HYDROGEN_CART_FRAGMENT_SPREAD}
        ${CART_FRAGMENT_SPREAD}
      }
      userErrors {
        code
        field
        message
      }
      warnings {
        code
        message
        target
      }
    }
  }
`;

const CART_LINES_REMOVE_MUTATION_SOURCE = /* GraphQL */ `
  mutation CartLinesRemove($cartId: ID!, $lineIds: [ID!]!, $country: CountryCode, $language: LanguageCode)
  @inContext(country: $country, language: $language) {
    cartLinesRemove(cartId: $cartId, lineIds: $lineIds) {
      cart {
        ${HYDROGEN_CART_FRAGMENT_SPREAD}
      }
      userErrors {
        code
        field
        message
      }
      warnings {
        code
        message
        target
      }
    }
  }
`;

const CUSTOM_CART_LINES_REMOVE_MUTATION_SOURCE = /* GraphQL */ `
  mutation CartLinesRemove($cartId: ID!, $lineIds: [ID!]!, $country: CountryCode, $language: LanguageCode)
  @inContext(country: $country, language: $language) {
    cartLinesRemove(cartId: $cartId, lineIds: $lineIds) {
      cart {
        ${HYDROGEN_CART_FRAGMENT_SPREAD}
        ${CART_FRAGMENT_SPREAD}
      }
      userErrors {
        code
        field
        message
      }
      warnings {
        code
        message
        target
      }
    }
  }
`;

const CART_DISCOUNT_CODES_UPDATE_MUTATION_SOURCE = /* GraphQL */ `
  mutation CartDiscountCodesUpdate($cartId: ID!, $discountCodes: [String!]!, $country: CountryCode, $language: LanguageCode)
  @inContext(country: $country, language: $language) {
    cartDiscountCodesUpdate(cartId: $cartId, discountCodes: $discountCodes) {
      cart {
        ${HYDROGEN_CART_FRAGMENT_SPREAD}
      }
      userErrors {
        code
        field
        message
      }
      warnings {
        code
        message
        target
      }
    }
  }
`;

const CUSTOM_CART_DISCOUNT_CODES_UPDATE_MUTATION_SOURCE = /* GraphQL */ `
  mutation CartDiscountCodesUpdate($cartId: ID!, $discountCodes: [String!]!, $country: CountryCode, $language: LanguageCode)
  @inContext(country: $country, language: $language) {
    cartDiscountCodesUpdate(cartId: $cartId, discountCodes: $discountCodes) {
      cart {
        ${HYDROGEN_CART_FRAGMENT_SPREAD}
        ${CART_FRAGMENT_SPREAD}
      }
      userErrors {
        code
        field
        message
      }
      warnings {
        code
        message
        target
      }
    }
  }
`;

const CART_NOTE_UPDATE_MUTATION_SOURCE = /* GraphQL */ `
  mutation CartNoteUpdate($cartId: ID!, $note: String!, $country: CountryCode, $language: LanguageCode)
  @inContext(country: $country, language: $language) {
    cartNoteUpdate(cartId: $cartId, note: $note) {
      cart {
        ${HYDROGEN_CART_FRAGMENT_SPREAD}
      }
      userErrors {
        code
        field
        message
      }
      warnings {
        code
        message
        target
      }
    }
  }
`;

const CUSTOM_CART_NOTE_UPDATE_MUTATION_SOURCE = /* GraphQL */ `
  mutation CartNoteUpdate($cartId: ID!, $note: String!, $country: CountryCode, $language: LanguageCode)
  @inContext(country: $country, language: $language) {
    cartNoteUpdate(cartId: $cartId, note: $note) {
      cart {
        ${HYDROGEN_CART_FRAGMENT_SPREAD}
        ${CART_FRAGMENT_SPREAD}
      }
      userErrors {
        code
        field
        message
      }
      warnings {
        code
        message
        target
      }
    }
  }
`;

const HYDROGEN_CART_FRAGMENT = gql(HYDROGEN_CART_FRAGMENT_SOURCE);

type QueryFor<
  Source extends string,
  Fragments extends readonly AnyStorefrontQueryString[],
  DocumentSource extends string = ComposedSource<Source, Fragments>,
> = StorefrontQueryString<
  InferResult<DocumentSource>,
  InferVariables<DocumentSource>,
  DocumentSource
>;

type CartFragmentDocument = AnyStorefrontQueryString;
type CartQueriesForSources<
  Fragments extends readonly AnyStorefrontQueryString[],
  CartQuerySource extends string,
  CartCreateMutationSource extends string,
  CartLinesAddMutationSource extends string,
  CartLinesUpdateMutationSource extends string,
  CartLinesRemoveMutationSource extends string,
  CartDiscountCodesUpdateMutationSource extends string,
  CartNoteUpdateMutationSource extends string,
> = {
  readonly cart: QueryFor<CartQuerySource, Fragments>;
  readonly cartCreate: QueryFor<CartCreateMutationSource, Fragments>;
  readonly cartLinesAdd: QueryFor<CartLinesAddMutationSource, Fragments>;
  readonly cartLinesUpdate: QueryFor<CartLinesUpdateMutationSource, Fragments>;
  readonly cartLinesRemove: QueryFor<CartLinesRemoveMutationSource, Fragments>;
  readonly cartDiscountCodesUpdate: QueryFor<CartDiscountCodesUpdateMutationSource, Fragments>;
  readonly cartNoteUpdate: QueryFor<CartNoteUpdateMutationSource, Fragments>;
};

export type CartQueriesForFragment<TCartFragment extends CartFragmentDocument> =
  CartQueriesForSources<
    readonly [typeof HYDROGEN_CART_FRAGMENT, TCartFragment],
    typeof CUSTOM_CART_QUERY_SOURCE,
    typeof CUSTOM_CART_CREATE_MUTATION_SOURCE,
    typeof CUSTOM_CART_LINES_ADD_MUTATION_SOURCE,
    typeof CUSTOM_CART_LINES_UPDATE_MUTATION_SOURCE,
    typeof CUSTOM_CART_LINES_REMOVE_MUTATION_SOURCE,
    typeof CUSTOM_CART_DISCOUNT_CODES_UPDATE_MUTATION_SOURCE,
    typeof CUSTOM_CART_NOTE_UPDATE_MUTATION_SOURCE
  >;

type DefaultCartQueries = CartQueriesForSources<
  readonly [typeof HYDROGEN_CART_FRAGMENT],
  typeof CART_QUERY_SOURCE,
  typeof CART_CREATE_MUTATION_SOURCE,
  typeof CART_LINES_ADD_MUTATION_SOURCE,
  typeof CART_LINES_UPDATE_MUTATION_SOURCE,
  typeof CART_LINES_REMOVE_MUTATION_SOURCE,
  typeof CART_DISCOUNT_CODES_UPDATE_MUTATION_SOURCE,
  typeof CART_NOTE_UPDATE_MUTATION_SOURCE
>;

export type CartFragmentForOptions<TOptions> = TOptions extends {
  readonly fragment: infer TCartFragment extends AnyStorefrontQueryString;
}
  ? TCartFragment
  : typeof HYDROGEN_CART_FRAGMENT;

export type CartFragmentResult<TFragment extends AnyStorefrontQueryString> =
  TFragment extends StorefrontQueryString<infer TResult, infer _Variables, infer _Source>
    ? TResult
    : unknown;

type CartDataFromCartQuery<TQuery extends AnyStorefrontQueryString> =
  TQuery extends StorefrontQueryString<infer Result, infer _Variables, string>
    ? Result extends { cart?: (infer Cart) | null }
      ? MergeCartData<NormalizeCartData<NonNullable<Cart>>>
      : CartData
    : CartData;

type MergeCartData<TCart> = Omit<CartData, keyof TCart> & TCart;

type NormalizeCartData<TCart> = TCart extends { lines: infer TLines }
  ? Omit<TCart, "lines"> & { lines: NormalizeCartLines<TLines> }
  : TCart;

type NormalizeCartLines<TLines> = TLines extends { nodes: infer TNodes }
  ? Omit<TLines, "nodes"> & { nodes: Array<CartLineFromNodes<TNodes>> }
  : TLines;

type CartLineFromNodes<TNodes> = TNodes extends CartLineConnection["nodes"]
  ? TNodes[number]
  : TNodes extends ReadonlyArray<infer TLine>
    ? TLine
    : never;

export type CartDataForOptions<TOptions> = CartDataFromCartQuery<
  CartQueriesForOptions<TOptions>["cart"]
>;

export type CreateCartQueriesOptions<
  TCartFragment extends AnyStorefrontQueryString = AnyStorefrontQueryString,
> = {
  /**
   * Cart fragment spread into every cart query and mutation response.
   *
   * The fragment must be named `CartFragment` and target `Cart`.
   */
  readonly fragment: TCartFragment;
};

export type CartQueriesForOptions<TOptions> = TOptions extends {
  readonly fragment: infer TCartFragment extends AnyStorefrontQueryString;
}
  ? CartQueriesForFragment<TCartFragment>
  : DefaultCartQueries;

function assertCartFragmentName(fragment: string): void {
  if (CART_FRAGMENT_PATTERN.test(fragment)) return;

  throw new Error(
    `Cart fragment must be named ${CART_FRAGMENT_NAME} and target ${CART_FRAGMENT_CONTRACT.typeName}`,
  );
}

function createFragmentPattern({ name, typeName }: FragmentContract): RegExp {
  return new RegExp(`fragment\\s+${name}\\s+on\\s+${typeName}`);
}

function createDefaultCartQueries(): DefaultCartQueries {
  const fragments = [HYDROGEN_CART_FRAGMENT] as const;

  const cart = gql(CART_QUERY_SOURCE, fragments);

  const cartCreate = gql(CART_CREATE_MUTATION_SOURCE, fragments);

  const cartLinesAdd = gql(CART_LINES_ADD_MUTATION_SOURCE, fragments);

  const cartLinesUpdate = gql(CART_LINES_UPDATE_MUTATION_SOURCE, fragments);

  const cartLinesRemove = gql(CART_LINES_REMOVE_MUTATION_SOURCE, fragments);

  const cartDiscountCodesUpdate = gql(CART_DISCOUNT_CODES_UPDATE_MUTATION_SOURCE, fragments);

  const cartNoteUpdate = gql(CART_NOTE_UPDATE_MUTATION_SOURCE, fragments);

  return {
    cart,
    cartCreate,
    cartLinesAdd,
    cartLinesUpdate,
    cartLinesRemove,
    cartDiscountCodesUpdate,
    cartNoteUpdate,
  } as const;
}

function createCartQueries<const TCartFragment extends CartFragmentDocument>(
  cartFragment: TCartFragment,
): CartQueriesForFragment<TCartFragment> {
  const fragments = [HYDROGEN_CART_FRAGMENT, cartFragment] as const;

  const cart = gql(CUSTOM_CART_QUERY_SOURCE, fragments);

  const cartCreate = gql(CUSTOM_CART_CREATE_MUTATION_SOURCE, fragments);

  const cartLinesAdd = gql(CUSTOM_CART_LINES_ADD_MUTATION_SOURCE, fragments);

  const cartLinesUpdate = gql(CUSTOM_CART_LINES_UPDATE_MUTATION_SOURCE, fragments);

  const cartLinesRemove = gql(CUSTOM_CART_LINES_REMOVE_MUTATION_SOURCE, fragments);

  const cartDiscountCodesUpdate = gql(CUSTOM_CART_DISCOUNT_CODES_UPDATE_MUTATION_SOURCE, fragments);

  const cartNoteUpdate = gql(CUSTOM_CART_NOTE_UPDATE_MUTATION_SOURCE, fragments);

  return {
    cart,
    cartCreate,
    cartLinesAdd,
    cartLinesUpdate,
    cartLinesRemove,
    cartDiscountCodesUpdate,
    cartNoteUpdate,
  } as const;
}

export function makeCartQueries<const TOptions extends CreateCartQueriesOptions>(
  options: TOptions,
): CartQueriesForOptions<TOptions>;
export function makeCartQueries(): DefaultCartQueries;
export function makeCartQueries(options?: CreateCartQueriesOptions) {
  if (options) {
    assertCartFragmentName(options.fragment);
    return createCartQueries(options.fragment);
  }

  return createDefaultCartQueries();
}

export const cartQueries = makeCartQueries();
export type CartQueries = ReturnType<typeof makeCartQueries>;
