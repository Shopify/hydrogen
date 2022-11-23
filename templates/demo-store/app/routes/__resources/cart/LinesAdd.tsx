import {diff} from 'fast-array-diff';
import {useEffect, forwardRef, useCallback, useMemo, useId} from 'react';
import {
  type Fetcher,
  useFetcher,
  useFetchers,
  useLocation,
} from '@remix-run/react';
import {useIsHydrated} from '~/hooks/useIsHydrated';
import invariant from 'tiny-invariant';
import type {SerializeFrom} from '@remix-run/server-runtime';
import {
  type ActionArgs,
  type HydrogenContext,
  redirect,
  json,
} from '@shopify/hydrogen-remix';
import type {
  Cart,
  CartInput,
  CartLine,
  CartLineInput,
  CartUserError,
  ProductVariant,
  UserError,
} from '@shopify/hydrogen-react/storefront-api-types';
import type {PartialDeep} from 'type-fest';
import React from 'react';
import {usePrefixPathWithLocale} from '~/lib/utils';

interface LinesAddEventPayload {
  linesAdded: CartLineInput[];
  linesNotAdded?: CartLineInput[];
}

interface LinesAddEvent {
  type: 'lines_add' | 'lines_add_error';
  id: string;
  payload: LinesAddEventPayload;
}

interface LinesAddLine extends Omit<CartLineInput, 'merchandiseId'> {
  /* variant is needed to optimistically add line items to the cart */
  variant:
    | SerializeFrom<ProductVariant>
    | ProductVariant
    | PartialDeep<ProductVariant, {recurseIntoArrays: true}>;
}

interface LinesAddProps {
  lines: LinesAddLine[] | [];
  children: ({
    state,
    error,
  }: {
    state: 'idle' | 'submitting' | 'loading';
    error: string;
  }) => React.ReactNode;
  onSuccess?: (event: LinesAddEvent) => void;
}

interface OptimisticLinesAdd {
  linesAdding: LinesAddLine[] | [];
  optimisticLinesAdd: CartLine[] | [];
}

interface LinesAddResponseProps {
  prevCart: Cart | null;
  cart: Cart;
  lines: CartLineInput[];
  formData: FormData;
  headers: Headers;
}

type DiffingLine = Pick<CartLine, 'id' | 'quantity'> & {
  merchandiseId: CartLine['merchandise']['id'];
};

interface DiffLinesProps {
  addingLines: CartLineInput[];
  prevLines: Cart['lines'];
  currentLines: Cart['lines'];
}

interface UseLinesAdd {
  linesAdd: ({lines}: {lines: LinesAddProps['lines']}) => void;
  linesAdding: LinesAddLine[] | null;
  linesAddingFetcher: Fetcher<any> | undefined;
}

// should match the path of the file
const ACTION_PATH = '/cart/LinesAdd';

/**
 * action that handles cart create (with lines) and lines add
 */
async function action({request, context}: ActionArgs) {
  const {session} = context;
  const headers = new Headers();

  const formData = await request.formData();

  const rawLines = formData.get('lines')
    ? (JSON.parse(String(formData.get('lines'))) as LinesAddLine[])
    : ([] as LinesAddLine[]);
  invariant(rawLines.length, 'No lines to add');

  // pluck away `variant` which is only needed for optimistic UI
  const lines = rawLines.map(({variant, ...line}) => {
    return {
      ...line,
      merchandiseId: variant.id,
    };
  }) as CartLineInput[];

  const cartId = await session.get('cartId');

  // Flow A — no previous cart, create and add line(s)
  if (!cartId) {
    const {cart, errors} = await cartCreateLinesMutation({
      input: {lines},
      context,
    });

    if (errors?.length) {
      return linesAddErrorResponse(errors);
    }

    // cart created - we only need a Set-Cookie header if we're creating
    session.set('cartId', cart.id);
    headers.set('Set-Cookie', await session.commit());

    return linesAddResponse({
      prevCart: null,
      cart,
      lines,
      formData,
      headers,
    });
  }

  /*
    for analytics we need to query the previous cart lines, so we
    can diff what was really added or not :(
    although it's slower, we now have optimistic lines add
  */
  const prevCart = await getCartLines({cartId, context});

  // Flow B — add line(s) to existing cart
  const {cart, errors} = await linesAddMutation({
    cartId,
    lines,
    context,
  });

  if (errors?.length) {
    return linesAddErrorResponse(errors);
  }

  return linesAddResponse({prevCart, cart, lines, formData, headers});
}

function linesAddErrorResponse(errors: CartUserError[]) {
  const errorMessage = errors.map(({message}) => message).join('\n');
  return json({error: errorMessage});
}

/**
 * Helper function to handle linesAdd action responses
 * @returns action response
 */
function linesAddResponse({
  prevCart,
  cart,
  lines,
  formData,
  headers,
}: LinesAddResponseProps) {
  // if JS is disabled, this will redirect back to the referer
  if (formData.get('redirectTo')) {
    return redirect(String(formData.get('redirectTo')), {headers});
  }

  const prevLines = (prevCart?.lines || []) as Cart['lines'];

  // create analytics event payload
  const {event, error} = instrumentEvent({
    addingLines: lines,
    prevLines,
    currentLines: cart.lines,
  });

  return json({event, error}, {headers});
}

/**
 * helper function to instrument lines_add | lines_add_error events
 * @param addingLines - line inputs being added
 * @param prevLines - lines before the mutation
 * @param currentLines - lines after the mutation
 * @returns {event, error}
 */
function instrumentEvent({
  addingLines,
  currentLines,
  prevLines,
}: DiffLinesProps) {
  // diff lines for analytics
  const {linesAdded, linesNotAdded} = diffLines({
    addingLines,
    prevLines,
    currentLines,
  });

  const event: LinesAddEvent = {
    type: 'lines_add',
    id: crypto.randomUUID(),
    payload: {linesAdded},
  };

  let error = null;
  if (linesNotAdded.length) {
    event.type = 'lines_add_error';
    event.payload.linesNotAdded = linesNotAdded;

    const failedVariantIds = linesNotAdded
      .map((line) => line.merchandiseId.split('/').pop())
      .join(', ');

    error = `Failed to add variant(s): ${failedVariantIds}`;
  }

  return {event, error};
}

/**
 * Diff prev lines with current lines to determine what was added
 * This is a temporary workaround for analytics until we land
 * @see: https://github.com/Shopify/storefront-api-feedback/discussions/151
 * @todo: remove when storefront api releases this feature
 * @param addingLines - line inputs being added
 * @param prevLines - lines before the mutation
 * @param currentLines - lines after the mutation
 * @returns {linesAdded, linesNotAdded}
 */
function diffLines({addingLines, prevLines, currentLines}: DiffLinesProps) {
  const prev: DiffingLine[] =
    prevLines?.edges?.map(({node: {id, quantity, merchandise}}) => ({
      id,
      quantity,
      merchandiseId: merchandise.id,
    })) || [];

  const next: DiffingLine[] =
    currentLines?.edges?.map(({node: {id, quantity, merchandise}}) => ({
      id,
      quantity,
      merchandiseId: merchandise.id,
    })) || [];

  // lines comparison function
  function comparer(prevLine: DiffingLine, line: DiffingLine) {
    return (
      prevLine.id === line.id &&
      prevLine.merchandiseId === line.merchandiseId &&
      line.quantity <= prevLine.quantity
    );
  }

  const {added} = diff(prev, next, comparer);
  const linesAdded = added || [];
  const linesAddedIds = linesAdded?.map(({merchandiseId}) => merchandiseId);
  const linesNotAdded =
    addingLines?.filter(({merchandiseId}) => {
      return !linesAddedIds.includes(merchandiseId);
    }) || [];

  return {linesAdded, linesNotAdded};
}

/*
  action mutations & queries -----------------------------------------------------------------------------------------
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

const CART_LINES_QUERY = `#graphql
  query ($cartId: ID!, $country: CountryCode = ZZ, $language: LanguageCode)
  @inContext(country: $country, language: $language) {
    cart(id: $cartId) {
      ...CartLinesFragment
    }
  }
  ${LINES_CART_FRAGMENT}
`;

// @see: https://shopify.dev/api/storefront/2022-01/mutations/cartcreate
const CREATE_CART_ADD_LINES_MUTATION = `#graphql
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
 * Fetch the current cart lines
 * @param cartId
 * @see https://shopify.dev/api/storefront/2022-01/queries/cart
 * @returns cart query result
 */
async function getCartLines({
  cartId,
  context,
}: {
  cartId: string;
  context: HydrogenContext;
}) {
  const {storefront} = context;
  invariant(storefront, 'missing storefront client in cart create mutation');

  const {cart} = await storefront.query<{cart: Cart}>(CART_LINES_QUERY, {
    variables: {
      cartId,
    },
    cache: storefront.CacheNone(),
  });

  invariant(cart, 'No data returned from cart lines query');
  return cart;
}

/**
 * Create a cart with line(s) mutation
 * @param input CartInput https://shopify.dev/api/storefront/2022-01/input-objects/CartInput
 * @see https://shopify.dev/api/storefront/2022-01/mutations/cartcreate
 * @returns mutated cart
 */
async function cartCreateLinesMutation({
  input,
  context,
}: {
  input: CartInput;
  context: HydrogenContext;
}) {
  const {storefront} = context;
  invariant(storefront, 'missing storefront client in cart create mutation');

  const {cartCreate} = await storefront.mutate<{
    cartCreate: {
      cart: Cart;
      errors: CartUserError[];
    };
    errors: UserError[];
  }>(CREATE_CART_ADD_LINES_MUTATION, {
    variables: {input},
  });

  invariant(cartCreate, 'No data returned from cart create mutation');

  return cartCreate;
}

/**
 * Cart linesAdd mutation
 * @param cartId
 * @param lines [CartLineInput!]! https://shopify.dev/api/storefront/2022-01/input-objects/CartLineInput
 * @see https://shopify.dev/api/storefront/2022-01/mutations/cartLinesAdd
 * @returns mutated cart
 */
async function linesAddMutation({
  cartId,
  lines,
  context,
}: {
  cartId: string;
  lines: CartLineInput[];
  context: HydrogenContext;
}) {
  const {storefront} = context;
  invariant(storefront, 'missing storefront client in lines add mutation');

  const {cartLinesAdd} = await storefront.mutate<{
    cartLinesAdd: {
      cart: Cart;
      errors: CartUserError[];
    };
  }>(ADD_LINES_MUTATION, {
    variables: {cartId, lines},
  });

  invariant(cartLinesAdd, 'No data returned from line(s) add mutation');

  return cartLinesAdd;
}

/**
 * Add to cart form that adds a set of line(s) to the cart
 * @param lines an array of line(s) to add. {quantity, variant}[]
 * @param children render submit button
 * @param onSuccess? callback that runs after each form submission
 */
const LinesAddForm = forwardRef<HTMLFormElement, LinesAddProps>(
  ({children, lines = [], onSuccess}, ref) => {
    const formId = useId();
    const {pathname, search} = useLocation();
    const fetcher = useFetcher();
    const isHydrated = useIsHydrated();
    const error = fetcher?.data?.error;
    const event = fetcher?.data?.event;
    const eventId = fetcher?.data?.event?.id;
    const localizedActionPath = usePrefixPathWithLocale(ACTION_PATH);

    useEffect(() => {
      if (!eventId) return;
      onSuccess?.(event);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [eventId]);

    // @todo: Maybe throw if no lines were provided?
    if (!lines?.length) {
      return null;
    }

    return (
      <fetcher.Form
        id={formId}
        method="post"
        action={localizedActionPath}
        ref={ref}
      >
        <input
          type="hidden"
          name="lines"
          defaultValue={JSON.stringify(lines)}
        />
        {/* used to trigger a redirect back to the PDP when JS is disabled */}
        {isHydrated ? null : (
          <input
            type="hidden"
            name="redirectTo"
            defaultValue={`${pathname}${search}`}
          />
        )}
        {children({state: fetcher.state, error})}
      </fetcher.Form>
    );
  },
);

/*
  hooks ----------------------------------------------------------------
*/
/**
 * Utility hook to get the active LinesAdd fetcher
 * @returns fetcher
 */
function useLinesAddingFetcher() {
  const localizedActionPath = usePrefixPathWithLocale(ACTION_PATH);

  const fetchers = useFetchers();
  return fetchers.find(
    (fetcher) => fetcher?.submission?.action === localizedActionPath,
  );
}

/**
 * A hook version of LinesAddForm to add cart line(s) programmatically
 * @param onSuccess callback function that executes on success
 * @returns { linesAdd, linesAdding, linesAddingFetcher }
 */
function useLinesAdd(
  onSuccess: (event: LinesAddEvent) => void = () => {},
): UseLinesAdd {
  const linesAddingFetcher = useLinesAddingFetcher();
  const fetcher = useFetcher();
  const localizedActionPath = usePrefixPathWithLocale(ACTION_PATH);

  let linesAdding = null;

  if (linesAddingFetcher?.submission) {
    const linesAddingStr =
      linesAddingFetcher?.submission?.formData?.get('lines');
    if (linesAddingStr && typeof linesAddingStr === 'string') {
      try {
        linesAdding = JSON.parse(linesAddingStr);
      } catch (_) {
        //
      }
    }
  }

  const linesAdd = useCallback(
    ({lines}: {lines: LinesAddProps['lines']}) => {
      const form = new FormData();
      form.set('lines', JSON.stringify(lines));
      fetcher.submit(form, {
        method: 'post',
        action: localizedActionPath,
        replace: false,
      });
    },
    [fetcher, localizedActionPath],
  );

  useEffect(() => {
    if (!fetcher?.data?.event) return;
    onSuccess?.(fetcher.data.event);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetcher?.data?.event]);

  return {
    linesAdd,
    linesAdding,
    linesAddingFetcher,
  };
}

/**
 * A utility hook to implement adding lines optimistic UI
 * @param lines CartLine[] | unknown
 * @returns {linesAdding, optimisticLinesAdd: []}
 */
function useOptimisticLinesAdd(
  lines?: PartialDeep<CartLine, {recurseIntoArrays: true}>[] | unknown,
): OptimisticLinesAdd {
  const linesAddingFetcher = useLinesAddingFetcher();
  const linesAddingStr = linesAddingFetcher?.submission?.formData?.get('lines');

  // filter lines being currently added and map them as cart line(s)
  // returns {linesAdding, optimisticLinesAdd: []}
  return useMemo(() => {
    let linesAdding: LinesAddLine[] | [] = [];

    // get lines currently being added
    if (linesAddingStr && typeof linesAddingStr === 'string') {
      linesAdding = JSON.parse(linesAddingStr);
    } else {
      return {linesAdding, optimisticLinesAdd: []};
    }

    // default return
    const result: OptimisticLinesAdd = {linesAdding, optimisticLinesAdd: []};

    if (!linesAdding?.length) return result;

    function mapVariantToLine(
      line: LinesAddLine,
    ): PartialDeep<CartLine> | null {
      const {variant} = line;
      if (!variant) return null;
      const optimisticLine = {
        id: crypto.randomUUID(),
        quantity: line.quantity,
        merchandise: {
          id: variant.id,
          image: variant.image,
          product: variant.product,
          selectedOptions: variant.selectedOptions,
        },
      } as PartialDeep<CartLine>;

      const {price, compareAtPrice} = variant;

      if (price && price?.amount && price?.currencyCode) {
        const lineTotalAmount = String(
          parseFloat(price.amount) * (line.quantity || 1),
        );
        optimisticLine.cost = {
          totalAmount: {
            amount: lineTotalAmount,
            currencyCode: price.currencyCode,
          },
          amountPerQuantity: price,
        };
      }
      if (compareAtPrice) {
        if (optimisticLine?.cost) {
          optimisticLine.cost.compareAtAmountPerQuantity = compareAtPrice;
        }
      }

      return optimisticLine;
    }

    // convert all variants being added to cart lines that can
    // be rendered as optimistic lines with <CartLine />
    const cartLinesAdding = linesAdding
      .map(mapVariantToLine)
      .filter(Boolean)
      .reverse() as CartLine[];

    if (!cartLinesAdding || !cartLinesAdding?.length) return result;

    // filter just the new optimistic lines
    const addedIds = Array.isArray(lines)
      ? lines
          .map((line) => {
            if (!line?.merchandise?.id) return null;
            return line.merchandise.id;
          })
          .filter(Boolean)
      : [];

    const addingIds = cartLinesAdding.map((line) => line.merchandise.id);
    const addingIdsNew = addingIds.filter((id) => !addedIds.includes(id));

    if (!addedIds.length) {
      // assign all adding lines empty cart
      result.optimisticLinesAdd = cartLinesAdding;
      return result;
    }

    if (addingIds?.length) {
      // assign new lines only: existing cart with lines
      const linesNew = addingIdsNew
        .map((lineId) => {
          const line = cartLinesAdding.find(
            (line) => line.merchandise.id === lineId,
          );
          return line || null;
        })
        .filter(Boolean) as CartLine[];
      result.optimisticLinesAdd = linesNew;
      return result;
    }

    return result;
  }, [linesAddingStr, lines]);
}

export {
  action,
  cartCreateLinesMutation,
  getCartLines,
  LINES_CART_FRAGMENT, // @todo: would be great if these lived in a shared graphql/ folder
  LinesAddForm,
  linesAddMutation,
  useLinesAdd,
  useOptimisticLinesAdd,
  USER_ERROR_FRAGMENT, // @todo: would be great if these lived in a shared graphql/ folder
};
