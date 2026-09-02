import {
  gql,
  type AnyStorefrontQueryString,
  type ComposedSource,
  type SourceOf,
  type StorefrontQueryString,
} from "../../graphql";
import type { InferResult, InferVariables } from "../../graphql";
import type { CartData, CartLineConnection } from "./state";

const CART_FRAGMENT_NAME = "CartFragment";
const CART_FRAGMENT_TYPE = "Cart";

type FragmentContract = {
  readonly name: string;
  readonly typeName: string;
};

const CART_FRAGMENT_CONTRACT = {
  name: CART_FRAGMENT_NAME,
  typeName: CART_FRAGMENT_TYPE,
} as const satisfies FragmentContract;

const CART_FRAGMENT_PATTERN = createFragmentPattern(CART_FRAGMENT_CONTRACT);

const HYDROGEN_CART_FRAGMENT = gql(`
  fragment HydrogenCartFragment on Cart {
    id
    checkoutUrl
    totalQuantity
    note
    attributes {
      key
      value
    }
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
        attributes {
          key
          value
        }
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
        sellingPlanAllocation {
          sellingPlan {
            id
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
`);

const CART_QUERY = gql(
  `query Cart($id: ID!, $country: CountryCode, $language: LanguageCode)
  @inContext(country: $country, language: $language) {
    cart(id: $id) {
      ...HydrogenCartFragment
    }
  }`,
  [HYDROGEN_CART_FRAGMENT],
);

const CART_CREATE_MUTATION = gql(
  `mutation CartCreate($input: CartInput!, $country: CountryCode, $language: LanguageCode)
  @inContext(country: $country, language: $language) {
    cartCreate(input: $input) {
      cart {
        ...HydrogenCartFragment
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
  }`,
  [HYDROGEN_CART_FRAGMENT],
);

const CART_LINES_ADD_MUTATION = gql(
  `mutation CartLinesAdd($cartId: ID!, $lines: [CartLineInput!]!, $country: CountryCode, $language: LanguageCode)
  @inContext(country: $country, language: $language) {
    cartLinesAdd(cartId: $cartId, lines: $lines) {
      cart {
        ...HydrogenCartFragment
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
  }`,
  [HYDROGEN_CART_FRAGMENT],
);

const CART_LINES_UPDATE_MUTATION = gql(
  `mutation CartLinesUpdate($cartId: ID!, $lines: [CartLineUpdateInput!]!, $country: CountryCode, $language: LanguageCode)
  @inContext(country: $country, language: $language) {
    cartLinesUpdate(cartId: $cartId, lines: $lines) {
      cart {
        ...HydrogenCartFragment
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
  }`,
  [HYDROGEN_CART_FRAGMENT],
);

const CART_LINES_REMOVE_MUTATION = gql(
  `mutation CartLinesRemove($cartId: ID!, $lineIds: [ID!]!, $country: CountryCode, $language: LanguageCode)
  @inContext(country: $country, language: $language) {
    cartLinesRemove(cartId: $cartId, lineIds: $lineIds) {
      cart {
        ...HydrogenCartFragment
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
  }`,
  [HYDROGEN_CART_FRAGMENT],
);

const CART_DISCOUNT_CODES_UPDATE_MUTATION = gql(
  `mutation CartDiscountCodesUpdate($cartId: ID!, $discountCodes: [String!]!, $country: CountryCode, $language: LanguageCode)
  @inContext(country: $country, language: $language) {
    cartDiscountCodesUpdate(cartId: $cartId, discountCodes: $discountCodes) {
      cart {
        ...HydrogenCartFragment
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
  }`,
  [HYDROGEN_CART_FRAGMENT],
);

const CART_NOTE_UPDATE_MUTATION = gql(
  `mutation CartNoteUpdate($cartId: ID!, $note: String!, $country: CountryCode, $language: LanguageCode)
  @inContext(country: $country, language: $language) {
    cartNoteUpdate(cartId: $cartId, note: $note) {
      cart {
        ...HydrogenCartFragment
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
  }`,
  [HYDROGEN_CART_FRAGMENT],
);

const CART_ATTRIBUTES_UPDATE_MUTATION = gql(
  `mutation CartAttributesUpdate($cartId: ID!, $attributes: [AttributeInput!]!, $country: CountryCode, $language: LanguageCode)
  @inContext(country: $country, language: $language) {
    cartAttributesUpdate(cartId: $cartId, attributes: $attributes) {
      cart {
        ...HydrogenCartFragment
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
  }`,
  [HYDROGEN_CART_FRAGMENT],
);

// The custom variants spread the consumer's `CartFragment`, which only exists
// at runtime. Its spread is interpolated on purpose: the gql.tada plugin skips
// documents containing interpolations instead of flagging an unknown fragment,
// while TypeScript still resolves the full literal source type. The consumer's
// fragment is composed in at runtime by `createCartQueries`.
const CUSTOM_CART_QUERY = gql(
  `query Cart($id: ID!, $country: CountryCode, $language: LanguageCode)
  @inContext(country: $country, language: $language) {
    cart(id: $id) {
      ...HydrogenCartFragment
      ...${CART_FRAGMENT_NAME}
    }
  }`,
  [HYDROGEN_CART_FRAGMENT],
);

const CUSTOM_CART_CREATE_MUTATION = gql(
  `mutation CartCreate($input: CartInput!, $country: CountryCode, $language: LanguageCode)
  @inContext(country: $country, language: $language) {
    cartCreate(input: $input) {
      cart {
        ...HydrogenCartFragment
        ...${CART_FRAGMENT_NAME}
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
  }`,
  [HYDROGEN_CART_FRAGMENT],
);

const CUSTOM_CART_LINES_ADD_MUTATION = gql(
  `mutation CartLinesAdd($cartId: ID!, $lines: [CartLineInput!]!, $country: CountryCode, $language: LanguageCode)
  @inContext(country: $country, language: $language) {
    cartLinesAdd(cartId: $cartId, lines: $lines) {
      cart {
        ...HydrogenCartFragment
        ...${CART_FRAGMENT_NAME}
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
  }`,
  [HYDROGEN_CART_FRAGMENT],
);

const CUSTOM_CART_LINES_UPDATE_MUTATION = gql(
  `mutation CartLinesUpdate($cartId: ID!, $lines: [CartLineUpdateInput!]!, $country: CountryCode, $language: LanguageCode)
  @inContext(country: $country, language: $language) {
    cartLinesUpdate(cartId: $cartId, lines: $lines) {
      cart {
        ...HydrogenCartFragment
        ...${CART_FRAGMENT_NAME}
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
  }`,
  [HYDROGEN_CART_FRAGMENT],
);

const CUSTOM_CART_LINES_REMOVE_MUTATION = gql(
  `mutation CartLinesRemove($cartId: ID!, $lineIds: [ID!]!, $country: CountryCode, $language: LanguageCode)
  @inContext(country: $country, language: $language) {
    cartLinesRemove(cartId: $cartId, lineIds: $lineIds) {
      cart {
        ...HydrogenCartFragment
        ...${CART_FRAGMENT_NAME}
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
  }`,
  [HYDROGEN_CART_FRAGMENT],
);

const CUSTOM_CART_DISCOUNT_CODES_UPDATE_MUTATION = gql(
  `mutation CartDiscountCodesUpdate($cartId: ID!, $discountCodes: [String!]!, $country: CountryCode, $language: LanguageCode)
  @inContext(country: $country, language: $language) {
    cartDiscountCodesUpdate(cartId: $cartId, discountCodes: $discountCodes) {
      cart {
        ...HydrogenCartFragment
        ...${CART_FRAGMENT_NAME}
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
  }`,
  [HYDROGEN_CART_FRAGMENT],
);

const CUSTOM_CART_NOTE_UPDATE_MUTATION = gql(
  `mutation CartNoteUpdate($cartId: ID!, $note: String!, $country: CountryCode, $language: LanguageCode)
  @inContext(country: $country, language: $language) {
    cartNoteUpdate(cartId: $cartId, note: $note) {
      cart {
        ...HydrogenCartFragment
        ...${CART_FRAGMENT_NAME}
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
  }`,
  [HYDROGEN_CART_FRAGMENT],
);

const CUSTOM_CART_ATTRIBUTES_UPDATE_MUTATION = gql(
  `mutation CartAttributesUpdate($cartId: ID!, $attributes: [AttributeInput!]!, $country: CountryCode, $language: LanguageCode)
  @inContext(country: $country, language: $language) {
    cartAttributesUpdate(cartId: $cartId, attributes: $attributes) {
      cart {
        ...HydrogenCartFragment
        ...${CART_FRAGMENT_NAME}
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
  }`,
  [HYDROGEN_CART_FRAGMENT],
);

// Minimal payload on purpose: buyer identity sync callers only need success or
// userErrors, never the cart body, so no custom-fragment variant exists.
const CART_BUYER_IDENTITY_UPDATE_MUTATION_SOURCE = /* GraphQL */ `
  mutation CartBuyerIdentityUpdate($cartId: ID!, $buyerIdentity: CartBuyerIdentityInput!) {
    cartBuyerIdentityUpdate(cartId: $cartId, buyerIdentity: $buyerIdentity) {
      cart {
        id
      }
      userErrors {
        code
        field
        message
      }
    }
  }
`;

const DEFAULT_CART_QUERIES = {
  cart: CART_QUERY,
  cartCreate: CART_CREATE_MUTATION,
  cartLinesAdd: CART_LINES_ADD_MUTATION,
  cartLinesUpdate: CART_LINES_UPDATE_MUTATION,
  cartLinesRemove: CART_LINES_REMOVE_MUTATION,
  cartDiscountCodesUpdate: CART_DISCOUNT_CODES_UPDATE_MUTATION,
  cartNoteUpdate: CART_NOTE_UPDATE_MUTATION,
  cartAttributesUpdate: CART_ATTRIBUTES_UPDATE_MUTATION,
} as const;

type DefaultCartQueries = typeof DEFAULT_CART_QUERIES;

export const cartBuyerIdentityUpdateMutation = gql(CART_BUYER_IDENTITY_UPDATE_MUTATION_SOURCE);

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

type CustomQueryFor<
  Document extends AnyStorefrontQueryString,
  TCartFragment extends CartFragmentDocument,
> = QueryFor<SourceOf<Document>, readonly [TCartFragment]>;

type CartQueriesForFragment<TCartFragment extends CartFragmentDocument> = {
  readonly cart: CustomQueryFor<typeof CUSTOM_CART_QUERY, TCartFragment>;
  readonly cartCreate: CustomQueryFor<typeof CUSTOM_CART_CREATE_MUTATION, TCartFragment>;
  readonly cartLinesAdd: CustomQueryFor<typeof CUSTOM_CART_LINES_ADD_MUTATION, TCartFragment>;
  readonly cartLinesUpdate: CustomQueryFor<typeof CUSTOM_CART_LINES_UPDATE_MUTATION, TCartFragment>;
  readonly cartLinesRemove: CustomQueryFor<typeof CUSTOM_CART_LINES_REMOVE_MUTATION, TCartFragment>;
  readonly cartDiscountCodesUpdate: CustomQueryFor<
    typeof CUSTOM_CART_DISCOUNT_CODES_UPDATE_MUTATION,
    TCartFragment
  >;
  readonly cartNoteUpdate: CustomQueryFor<typeof CUSTOM_CART_NOTE_UPDATE_MUTATION, TCartFragment>;
  readonly cartAttributesUpdate: CustomQueryFor<
    typeof CUSTOM_CART_ATTRIBUTES_UPDATE_MUTATION,
    TCartFragment
  >;
};

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

function createCartQueries<const TCartFragment extends CartFragmentDocument>(
  cartFragment: TCartFragment,
): CartQueriesForFragment<TCartFragment> {
  const fragments = [cartFragment] as const;

  const cart = gql(CUSTOM_CART_QUERY, fragments);

  const cartCreate = gql(CUSTOM_CART_CREATE_MUTATION, fragments);

  const cartLinesAdd = gql(CUSTOM_CART_LINES_ADD_MUTATION, fragments);

  const cartLinesUpdate = gql(CUSTOM_CART_LINES_UPDATE_MUTATION, fragments);

  const cartLinesRemove = gql(CUSTOM_CART_LINES_REMOVE_MUTATION, fragments);

  const cartDiscountCodesUpdate = gql(CUSTOM_CART_DISCOUNT_CODES_UPDATE_MUTATION, fragments);

  const cartNoteUpdate = gql(CUSTOM_CART_NOTE_UPDATE_MUTATION, fragments);

  const cartAttributesUpdate = gql(CUSTOM_CART_ATTRIBUTES_UPDATE_MUTATION, fragments);

  return {
    cart,
    cartCreate,
    cartLinesAdd,
    cartLinesUpdate,
    cartLinesRemove,
    cartDiscountCodesUpdate,
    cartNoteUpdate,
    cartAttributesUpdate,
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

  return DEFAULT_CART_QUERIES;
}

export const cartQueries = makeCartQueries();
