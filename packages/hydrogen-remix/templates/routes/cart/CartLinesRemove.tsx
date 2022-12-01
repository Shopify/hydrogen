import React, {forwardRef, useCallback, useEffect, useId, useRef} from 'react';
import {useFetcher, useLocation, useFetchers} from '@remix-run/react';
import {useIsHydrated} from '~/hooks/useIsHydrated';
import type {PartialDeep} from 'type-fest';
import type {
  Cart,
  CartLine,
  CartLineConnection,
  UserError,
} from '@shopify/hydrogen-react/storefront-api-types';
import {
  type ActionArgs,
  type HydrogenContext,
  redirect,
  json,
} from '@shopify/hydrogen-remix';
import invariant from 'tiny-invariant';
import {getCartLines} from './CartLinesAdd';
import {isLocalPath, usePrefixPathWithLocale} from '~/lib/utils';

interface LinesRemoveProps {
  lineIds: CartLine['id'][];
  className?: string;
  children: ({
    state,
    errors,
  }: {
    state: 'idle' | 'submitting' | 'loading';
    errors: PartialDeep<UserError>[];
  }) => React.ReactNode;
  onSuccess?: (event: LinesRemoveEvent) => void;
}

interface LinesRemove {
  linesRemoved: CartLine[];
  linesNotRemoved: CartLine[];
}

interface LinesRemoveEventPayload extends LinesRemove {
  lineIds: CartLine['id'][];
}

interface LinesRemoveEvent {
  type: 'lines_remove';
  id: string;
  payload: LinesRemoveEventPayload;
}

interface DiffLinesProps {
  prevLines: CartLineConnection;
  currentLines: CartLineConnection;
  removingLineIds: CartLine['id'][];
}

const ACTION_PATH = '/cart/CartLinesRemove';

/**
 * action that handles the line(s) remove mutation
 */
async function action({request, context}: ActionArgs) {
  const formData = await request.formData();

  const cartId = await context.session.getCartId();
  invariant(cartId, 'Missing cartId');

  invariant(formData.get('lineIds'), 'Missing lineIds');
  const lineIds = formData.get('lineIds')
    ? (JSON.parse(String(formData.get('lineIds'))) as CartLine['id'][])
    : ([] as CartLine['id'][]);

  // we need to query the prevCart so we can validate
  // what was really added or not for analytics
  const prevCart = await getCartLines({cartId, context});

  const {cart, errors: graphqlErrors} = await cartLinesRemove({
    cartId,
    lineIds,
    context,
  });

  if (graphqlErrors.length) {
    return json({errors: graphqlErrors});
  }

  // if no js, we essentially reload to avoid being routed to the actions route
  const redirectTo = formData.get('redirectTo') ?? null;
  if (typeof redirectTo === 'string' && isLocalPath(redirectTo)) {
    return redirect(redirectTo);
  }

  const {event, errors} = instrumentEvent({
    removingLineIds: lineIds,
    prevLines: prevCart.lines,
    currentLines: cart.lines,
  });

  return json({event, errors});
}

/**
 * Helper function to instrument lines_remove | lines_remove_error events
 * @param removingLineIds the line ids being removed
 * @param prevLines the line(s) available before removing
 * @param currentLines the line(s) still available after removing
 * @returns {event, error}
 */
function instrumentEvent({
  removingLineIds,
  prevLines,
  currentLines,
}: DiffLinesProps) {
  // determine what line(s) were actually removed or not
  const {linesRemoved, linesNotRemoved} = diffLines({
    removingLineIds,
    prevLines,
    currentLines,
  });

  const event: LinesRemoveEvent = {
    type: 'lines_remove',
    id: crypto.randomUUID(),
    payload: {
      lineIds: removingLineIds,
      linesRemoved,
      linesNotRemoved: [],
    },
  };

  let errors = null;
  if (linesNotRemoved?.length) {
    errors = linesNotRemoved.map((line) => ({
      code: 'LINE_NOT_REMOVED',
      message: line.merchandise.id,
    }));
  }

  return {event, errors};
}

/**
 * Diff lines to determine which lines were actually removed and which one were not
 * @todo: remove when this is provided by the mutation
 * @param removingLineIds the line ids being removed
 * @param prevLines the line(s) available before removing
 * @param currentLines the line(s) still available after removing
 * @returns
 */
function diffLines({removingLineIds, prevLines, currentLines}: DiffLinesProps) {
  return prevLines?.edges?.reduce(
    (_result, {node: _prevLine}) => {
      const lineStillExists = currentLines.edges.find(
        ({node: line}) => line.id === _prevLine.id,
      );
      if (lineStillExists) {
        if (removingLineIds.includes(lineStillExists?.node?.id)) {
          _result.linesNotRemoved = [..._result.linesNotRemoved, _prevLine];
        }
      } else {
        _result.linesRemoved = [..._result.linesRemoved, _prevLine];
      }
      return _result;
    },
    {linesRemoved: [], linesNotRemoved: []} as LinesRemove,
  ) as LinesRemove;
}

/*
  Mutation -----------------------------------------------------------------------------------------
*/
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
 */
async function cartLinesRemove({
  cartId,
  lineIds,
  context,
}: {
  cartId: string;
  lineIds: Cart['id'][];
  context: HydrogenContext;
}) {
  const {storefront} = context;
  invariant(storefront, 'missing storefront client in lines remove mutation');

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

/**
 * Form that remove line(s) from cart
 * @param lineIds [ID!]! an array of cart line ids to remove
 * @param children render submit button
 * @param onSuccess? callback that runs after each form submission
 * @see API https://shopify.dev/api/storefront/2022-10/mutations/cartLinesRemove
 * @example
 * Basic example
 * ```
 * function RemoveFromCart({lindeIds}) {
 *   return (
 *     <CartLinesRemoveForm lineIds={lindeIds}>
 *       {(state, error) => <button>Remove</button>}
 *     </CartLinesRemoveForm>
 *   );
 * }
 * ```
 * @example
 * Advanced example
 * ```
 * function RemoveFromCart({lindeIds}) {
 *   return (
 *     <CartLinesRemoveForm
 *       lineIds={lindeIds}
 *       onSuccess={(event) => {
 *         navigator.sendBeacon('/events', JSON.stringify(event))
 *       }}
 *     >
 *       {(state, error) => (
 *         <button>{state === 'idle' ? 'Remove' : 'Removing'}</button>
 *         {errors ? <p>{errors[0].message}</p>}
 *       )}
 *     </CartLinesRemoveForm>
 *   )
 * }
 * ```
 */
const CartLinesRemoveForm = forwardRef(
  (
    {lineIds, children, onSuccess, className}: LinesRemoveProps,
    ref: React.Ref<HTMLFormElement>,
  ) => {
    const formId = useId();
    const isHydrated = useIsHydrated();
    const fetcher = useFetcher();
    const {pathname, search} = useLocation();
    const lastEventId = useRef<string | undefined>();
    const event = fetcher.data?.event;
    const eventId = event?.id;
    const errors = fetcher.data?.errors;
    const localizedCurrentPath = usePrefixPathWithLocale(
      `${pathname}${search}`,
    );

    useEffect(() => {
      if (!eventId) return;
      if (eventId === lastEventId.current) return;
      onSuccess?.(event);
      lastEventId.current = eventId;
    }, [eventId, event, onSuccess]);

    return (
      <fetcher.Form
        id={formId}
        method="post"
        action={ACTION_PATH}
        className={className}
        ref={ref}
      >
        {Array.isArray(lineIds) && (
          <input type="hidden" name="lineIds" value={JSON.stringify(lineIds)} />
        )}
        {/* used to trigger a redirect back to the same url when JS is disabled */}
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
 * A hook to remove cart line(s) programmatically
 * @param onSuccess callback function that executes on success
 * @returns object {cartLinesRemove, fetcher}
 * @example
 * ```ts
 * function onSuccess(event) {
 *  console.log('line(s) removed');
 * }
 * const {cartLinesRemove, fetcher} = useLinesRemove(onSuccess);
 * ```
 */
function useCartLinesRemove(
  onSuccess: (event: LinesRemoveEvent) => void = () => {},
) {
  const lastEventId = useRef<string | undefined>();
  const fetcher = useFetcher();

  /**
   * A hook to remove cart line(s) programmatically
   * @param lineIds An array of cart line ids
   * @example
   * ```ts
   * function useRemoveFreeGift({cart}) {
   *   const {linesRemove} = useLinesRemove();
   *   const {linesRemoving} = useLinesRemoving();
   *   const freeGiftLineId = cart.lines.filter;
   *   const shouldRemoveGift = !linesRemoving &&
   *      freeGiftLineId &&
   *      cart.lines.edges.length < 3 ;
   *
   *   useEffect(() => {
   *     if (!shouldRemoveGift) return;
   *     linesRemove({
   *       lineIds: [freeGiftLineId],
   *     });
   *   }, [shouldRemoveGift, freeGiftLineId]);
   * }
   * ```
   */
  const cartLinesRemove = useCallback(
    ({lineIds}: {lineIds: CartLine['id'][]}) => {
      const form = new FormData();
      Array.isArray(lineIds) && form.set('lineIds', JSON.stringify(lineIds));
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

  return {cartLinesRemove, fetcher};
}

/**
 * Utility hook to retrieve an active lines remove fetcher
 * @returns fetcher | undefined
 */
function useCartLinesRemoveFetcher() {
  const fetchers = useFetchers();
  const fetcher = fetchers.find(
    (fetcher) => fetcher?.submission?.action === ACTION_PATH,
  );
  return fetcher;
}

/**
 * A utility hook to retrieve the line(s) being removed
 * @returns object {linesRemoving, fetcher}
 * @example
 * ```
 * function Cart({cart}) {
 *   const {lines} = cart;
 *   const linesCount = cart?.lines?.edges?.length || 0;
 *   const {linesRemoving} = useCartLinesRemoving();
 *   const removingLastLine = Boolean(linesCount === 1 && linesRemoving.length);
 *   const cartEmpty = lines.length === 0 || removingLastLine;
 *
 *   return (
 *     <div>
 *       <CartEmpty hidden={!cartEmpty} />
 *       <CartLines lines={lines}>
 *     </div>
 *   );
 * }
 * ```
 */
function useCartLinesRemoving() {
  const fetcher = useCartLinesRemoveFetcher();
  let linesRemoving: CartLine['id'][] = [];
  const linesRemoveStr = fetcher?.submission?.formData?.get('lineIds');
  if (linesRemoveStr && typeof linesRemoveStr === 'string') {
    try {
      linesRemoving = JSON.parse(linesRemoveStr);
    } catch (_) {
      // noop
    }
  }
  return {linesRemoving, fetcher};
}

/**
 * A utility hook to implement optimistic single line removal
 * @param line? optional CartLine
 * @returns {optimisticLineRemove, linesRemoving}
 */
function useCartLineRemoving(line: CartLine) {
  const {linesRemoving} = useCartLinesRemoving();

  const lineRemoving =
    line && linesRemoving?.length
      ? Boolean(linesRemoving.includes(line.id))
      : false;

  return {lineRemoving, linesRemoving};
}

export {
  action,
  cartLinesRemove,
  CartLinesRemoveForm,
  useCartLineRemoving,
  useCartLinesRemove,
  useCartLinesRemoving,
};
