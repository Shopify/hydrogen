import {diff} from 'fast-array-diff';
import {
  useEffect,
  forwardRef,
  useCallback,
  useMemo,
  useId,
  useRef,
} from 'react';
import type {PartialDeep} from 'type-fest';
import {
  type Fetcher,
  useFetcher,
  useFetchers,
  useLocation,
  useMatches,
} from '@remix-run/react';
import {useIsHydrated} from '~/hooks/useIsHydrated';
import invariant from 'tiny-invariant';
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
  UserError,
  CartBuyerIdentityInput,
} from '@shopify/hydrogen-react/storefront-api-types';
import React from 'react';
import {isLocalPath, usePrefixPathWithLocale} from '~/lib/utils';

interface LinesAddEventPayload {
  linesAdded: CartLineInput[];
  linesNotAdded?: CartLineInput[];
}

interface LinesAddEvent {
  type: 'lines_add';
  id: string;
  payload: LinesAddEventPayload;
}

interface CartLinesAddFormProps {
  lines: CartLineInput[] | [];
  optimisticLines?: PartialDeep<CartLine>[] | [];
  className?: string;
  children: ({
    state,
    errors,
  }: {
    state: 'idle' | 'submitting' | 'loading';
    errors: PartialDeep<UserError>[];
  }) => React.ReactNode;
  onSuccess?: (event: LinesAddEvent) => void;
}

interface OptimisticLinesAddingReturnType {
  optimisticLines: PartialDeep<CartLine>[] | [];
  optimisticLinesNew: PartialDeep<CartLine>[] | [];
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

type LinesOptimisticLinesProps = Pick<
  CartLinesAddFormProps,
  'lines' | 'optimisticLines'
>;

interface UseCartLinesAddReturnType {
  cartLinesAdd: ({lines, optimisticLines}: LinesOptimisticLinesProps) => void;
  fetcher: Fetcher<any> | undefined;
}

// should match the path of the file
const ACTION_PATH = '/cart/CartLinesAdd';

/**
 * action that handles cart create (with lines) and lines add
 */
async function action({request, context}: ActionArgs) {
  const {session} = context;
  const headers = new Headers();

  const [formData, cartId] = await Promise.all([
    request.formData(),
    session.get('cartId'),
  ]);

  const lines = formData.get('lines')
    ? (JSON.parse(String(formData.get('lines'))) as CartLineInput[])
    : ([] as CartLineInput[]);
  invariant(lines.length, 'No lines to add');

  const countryCode = formData.get('countryCode')
    ? (formData.get('countryCode') as CartBuyerIdentityInput['countryCode'])
    : null;

  // Flow A — no previous cart, create and add line(s)
  if (!cartId) {
    const {cart, errors: graphqlErrors} = await cartCreate({
      input: countryCode ? {lines, buyerIdentity: {countryCode}} : {lines},
      context,
    });

    if (graphqlErrors?.length) {
      return json({errors: graphqlErrors});
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
    for analytics we need to query the previous cart lines,
    so we can diff what was really added or not :(
    although it's slower, we now have optimistic lines add
  */
  const prevCart = await getCartLines({cartId, context});

  // Flow B — add line(s) to existing cart
  const {cart, errors: graphqlErrors} = await cartLinesAdd({
    cartId,
    lines,
    context,
  });

  if (graphqlErrors?.length) {
    return json({errors: graphqlErrors});
  }

  return linesAddResponse({prevCart, cart, lines, formData, headers});
}

/**
 * Helper function to handle linesAdd action responses
 * @returns json {errors, event}
 */
function linesAddResponse({
  prevCart,
  cart,
  lines,
  formData,
  headers,
}: LinesAddResponseProps) {
  // if no js, we essentially reload to avoid being routed to the actions route
  const redirectTo = formData.get('redirectTo') ?? null;
  if (typeof redirectTo === 'string' && isLocalPath(redirectTo)) {
    return redirect(redirectTo, {headers});
  }

  const prevLines = (prevCart?.lines || []) as Cart['lines'];

  // create analytics event payload
  const {event, errors} = instrumentEvent({
    addingLines: lines,
    prevLines,
    currentLines: cart.lines,
  });

  return json({event, errors}, {headers});
}

/**
 * helper function to instrument lines_add | lines_add_error events
 * @param addingLines - line inputs being added
 * @param prevLines - lines before the mutation
 * @param currentLines - lines after the mutation
 * @returns json {event, error}
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

  const event = {
    type: 'lines_add',
    id: crypto.randomUUID(),
    payload: {
      linesAdded,
    },
  };

  let errors: PartialDeep<UserError>[] = [];

  if (linesNotAdded.length) {
    errors = linesNotAdded.map((line) => ({
      code: 'LINE_NOT_ADDED',
      message: line.merchandiseId.split('/').pop(),
    }));
  }

  return {event, errors};
}

/**
 * Diff prev lines with current lines to determine what was added
 * This is a temporary workaround for analytics until we land
 * @todo: remove when storefront api releases this feature
 * @param addingLines - line inputs being added
 * @param prevLines - lines before the mutation
 * @param currentLines - lines after the mutation
 * @returns object {linesAdded, linesNotAdded}
 * @see https://github.com/Shopify/storefront-api-feedback/discussions/151
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
 * @returns object cart
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
 * @returns result {cart, errors}
 */
async function cartCreate({
  input,
  context,
}: {
  input: CartInput;
  context: HydrogenContext;
}) {
  const {storefront} = context;
  invariant(storefront, 'missing storefront client in cartCreate mutation');

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

/**
 * Storefront API cartLinesAdd mutation
 * @param cartId
 * @param lines [CartLineInput!]! https://shopify.dev/api/storefront/2022-01/input-objects/CartLineInput
 * @see https://shopify.dev/api/storefront/2022-01/mutations/cartLinesAdd
 * @returns result {cart, errors}
 */
async function cartLinesAdd({
  cartId,
  lines,
  context,
}: {
  cartId: string;
  lines: CartLineInput[];
  context: HydrogenContext;
}) {
  const {storefront} = context;
  invariant(storefront, 'missing storefront client in cartLinesAdd mutation');

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

/**
 * Form component to add line(s) to the cart
 * @param lines an array of line(s) to add. CartLineInput[]
 * @param optimisticLines (optional) CartLine[] an array of cart line(s) being added.
 * @param children render submit button.
 * @param onSuccess (optional) callback that runs after each form submission
 * @example
 * Basic example:
 * ```ts
 * function AddToCartButton({selectedVariant, quantity}) {
 *   return (
 *     <CartLinesAddForm
 *       lines={[
 *         {
 *           merchandiseId: selectedVariant.id,
 *           quantity,
 *         }
 *       ]}
 *     >
 *       {() => <button>Add to Cart</button>}
 *     </CartLinesAddForm>
 *   );
 * }
 * ```
 * @example
 * Advanced example:
 * ```ts
 * function AddToCartButton({selectedVariant, quantity}) {
 *   const line = {
 *     merchandiseId: selectedVariant.id,
 *     quantity,
 *   }
 *   const optimisticLine = variantToLine({
 *     quantity,
 *     variant: selectedVariant
 *   })
 *
 *   return (
 *     <CartLinesAddForm
 *       lines={[line]}
 *       optimisticLines={[optimisticLine]}
 *       onSuccess={(event) => {
 *         navigator.sendBeacon('/events', JSON.stringify(event))
 *       }}
 *     >
 *       {(state, errors) => (
 *         <button>{state === 'idle' ? 'Add to Bag' : 'Adding to Bag'}</button>
 *         {errors ? <p>{error[0].message}</p>}
 *       )}
 *     </CartLinesAddForm>
 *   )
 * }
 * ```
 */
const CartLinesAddForm = forwardRef<HTMLFormElement, CartLinesAddFormProps>(
  ({children, lines = [], optimisticLines = [], onSuccess, className}, ref) => {
    const formId = useId();
    const [root] = useMatches();
    const selectedLocale = root?.data?.selectedLocale;
    const lastEventId = useRef<string | undefined>();
    const {pathname, search} = useLocation();
    const fetcher = useFetcher();
    const isHydrated = useIsHydrated();
    const errors = fetcher?.data?.errors;
    const event = fetcher?.data?.event;
    const eventId = fetcher?.data?.event?.id;
    const localizedCurrentPath = usePrefixPathWithLocale(
      `${pathname}${search}`,
    );

    useEffect(() => {
      if (!eventId) return;
      if (eventId === lastEventId.current) return;
      onSuccess?.(event);
      lastEventId.current = eventId;
    }, [eventId, event, onSuccess]);

    if (!Array.isArray(lines) || !lines?.length) {
      return null;
    }

    return (
      <fetcher.Form
        id={formId}
        method="post"
        action={ACTION_PATH}
        className={className}
        ref={ref}
      >
        {selectedLocale?.country && (
          <input
            type="hidden"
            name="countryCode"
            defaultValue={selectedLocale.country}
          />
        )}
        {Array.isArray(lines) && (
          <input
            type="hidden"
            name="lines"
            defaultValue={JSON.stringify(lines)}
          />
        )}
        {Array.isArray(optimisticLines) && (
          <input
            type="hidden"
            name="optimisticLines"
            defaultValue={JSON.stringify(optimisticLines)}
          />
        )}
        {/* used to trigger a redirect back to the PDP when JS is disabled */}
        {isHydrated ? null : (
          <input
            type="hidden"
            name="redirectTo"
            defaultValue={localizedCurrentPath}
          />
        )}
        {children({state: fetcher.state, errors})}
      </fetcher.Form>
    );
  },
);

/**
 * A hook version of CartLinesAddForm to add cart line(s) programmatically
 * @param onSuccess callback function that executes on success
 * @returns object { cartLinesAdd, fetcher }
 */
function useCartLinesAdd(
  onSuccess: (event: LinesAddEvent) => void = () => {},
): UseCartLinesAddReturnType {
  const fetcher = useFetcher();
  const lastEventId = useRef<string | undefined>();

  /**
   * Add line(s) programmatically
   * @param lines CartLineInput[]
   * @param optimisticLines (optional) CartLine[]
   * @example
   * A hook that programmatically adds a free gift variant to the cart if there are 3 or more items in the cart
   * ```ts
   * function useAddFreeGift({cart}) {
   *   const {cartLinesAdd} = useLinesAdd();
   *   const giftInCart = cart.lines.filter...
   *   const freeGiftProductVariant = {...}
   *   const shouldAddGift = !linesAdding && !giftInCart && cart.lines.edges.length >= 3;
   *
   *   useEffect(() => {
   *     if (!shouldAddGift) return;
   *     cartLinesAdd({
   *       lines: [{
   *         quantity: 1,
   *         variant: freeGiftProductVariant
   *       }]
   *     })
   *   }, [shouldAddGift, freeGiftProductVariant])
   * }
   * ```
   */
  const cartLinesAdd = useCallback(
    ({lines = [], optimisticLines = []}: LinesOptimisticLinesProps) => {
      const form = new FormData();
      Array.isArray(lines) && form.set('lines', JSON.stringify(lines));
      Array.isArray(optimisticLines) &&
        form.set('optimisticLines', JSON.stringify(optimisticLines));

      fetcher.submit(form, {
        method: 'post',
        action: ACTION_PATH,
        replace: false,
      });
    },
    [fetcher, ACTION_PATH],
  );

  useEffect(() => {
    if (!fetcher?.data?.event) return;
    if (lastEventId.current === fetcher?.data?.event?.id) return;
    onSuccess?.(fetcher.data.event);
    lastEventId.current = fetcher.data.event.id;
  }, [fetcher?.data?.event, onSuccess]);

  return {cartLinesAdd, fetcher};
}

/**
 * Utility hook to get an active lines adding fetcher
 * @returns result fetcher or undefined
 */
function useCartLinesAddingFetcher() {
  const fetchers = useFetchers();
  return fetchers.find(
    (fetcher) => fetcher?.submission?.action === ACTION_PATH,
  );
}

/**
 * A utility hook to get the current lines being added
 * @param onSuccess callback function that executes on success
 * @returns object { linesAdding, fetcher }
 * @example
 * Toggle a cart drawer when adding to cart
 * ```
 * function Layout() {
 *   const {linesAdding} = useCartLinesAdding();
 *   const [drawer, setDrawer] = useState(false);
 *
 *   useEffect(() => {
 *     if (drawer || !linesAdding?.length) return;
 *     setDrawer(true);
 *   }, [linesAdding, drawer, setDrawer]);
 *
 *   return (
 *     <div>
 *       <Header />
 *       <CartDrawer className={drawer ? '' : 'hidden'} setDrawer={setDrawer} />
 *     </div>
 *   );
 * }
 * ```
 */
function useCartLinesAdding() {
  const fetcher = useCartLinesAddingFetcher();

  let linesAdding: CartLineInput[] = [];

  const linesStr = fetcher?.submission?.formData?.get('lines');
  if (linesStr && typeof linesStr === 'string') {
    try {
      linesAdding = JSON.parse(linesStr);
    } catch (_) {
      // no-op
    }
  }

  return {linesAdding, fetcher};
}

/**
 * A utility hook to get the optimistic lines being added
 * @param lines CartLine[] | undefined
 * @returns object {optimisticLines: [], optimisticLinesNew: []}
 */
function useOptimisticCartLinesAdding(
  lines?: PartialDeep<CartLine, {recurseIntoArrays: true}>[] | unknown,
): OptimisticLinesAddingReturnType {
  const fetcher = useCartLinesAddingFetcher();
  const optimisticLinesStr =
    fetcher?.submission?.formData?.get('optimisticLines');

  // parse all lines currently added and filter new ones
  return useMemo(() => {
    let optimisticLines: PartialDeep<CartLine>[] | [] = [];
    const optimisticLinesNew: PartialDeep<CartLine>[] | [] = [];

    // get optimistic lines currently being added
    if (optimisticLinesStr && typeof optimisticLinesStr === 'string') {
      optimisticLines = JSON.parse(optimisticLinesStr);
    } else {
      return {optimisticLines, optimisticLinesNew};
    }

    // default return
    const result: OptimisticLinesAddingReturnType = {
      optimisticLines,
      optimisticLinesNew,
    };

    // not adding optimistic lines
    if (!optimisticLines?.length) return result;

    // no existing lines, all adding are new
    if (!Array.isArray(lines) || !lines?.length) {
      result.optimisticLinesNew = optimisticLines;
      return result;
    }

    // lines comparison function
    function comparer(
      prevLine: PartialDeep<CartLine>,
      line: PartialDeep<CartLine>,
    ) {
      if (typeof prevLine?.merchandise?.id === 'undefined') return false;
      if (typeof line?.merchandise?.id === 'undefined') return false;
      return prevLine.merchandise.id === line.merchandise.id;
    }

    const {added} = diff(lines, optimisticLines, comparer);

    result.optimisticLinesNew = added;
    return result;
  }, [optimisticLinesStr, lines]);
}

export {
  action,
  cartCreate,
  cartLinesAdd,
  CartLinesAddForm,
  getCartLines,
  LINES_CART_FRAGMENT, // @todo: would be great if these lived in a shared graphql/ folder
  useCartLinesAdd,
  useCartLinesAdding,
  useOptimisticCartLinesAdding,
  USER_ERROR_FRAGMENT, // @todo: would be great if these lived in a shared graphql/ folder
};
