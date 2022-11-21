import React, {forwardRef, useCallback, useEffect, useId} from 'react';
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
import {getCartLines} from './LinesAdd';
import {usePrefixPathWithLocale} from '~/lib/utils';

interface LinesRemoveProps {
  lineIds: CartLine['id'][];
  children: ({
    state,
    error,
  }: {
    state: 'idle' | 'submitting' | 'loading';
    error: string;
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
  type: 'lines_remove' | 'lines_remove_error';
  id: string;
  payload: LinesRemoveEventPayload;
}

interface DiffLinesProps {
  prevLines: CartLineConnection;
  currentLines: CartLineConnection;
  removingLineIds: CartLine['id'][];
}

const ACTION_PATH = '/cart/LinesRemove';

/**
 * action that handles the line(s) remove mutation
 */
async function action({request, context}: ActionArgs) {
  const formData = await request.formData();

  const cartId = await context.session.get('cartId');
  invariant(cartId, 'Missing cartId');

  invariant(formData.get('lineIds'), 'Missing lineIds');
  const lineIds = formData.get('lineIds')
    ? (JSON.parse(String(formData.get('lineIds'))) as CartLine['id'][])
    : ([] as CartLine['id'][]);

  // we need to query the prevCart so we can validate
  // what was really added or not for analytics
  const prevCart = await getCartLines({cartId, context});

  const {cart, errors} = await linesRemoveMutation({
    cartId,
    lineIds,
    context,
  });

  if (errors.length) {
    const errorMessage = errors?.map(({message}) => message).join('/n') || '';
    return json({error: errorMessage});
  }

  const redirectTo = JSON.parse(String(formData.get('redirectTo')));
  if (redirectTo) {
    return redirect(redirectTo);
  }

  const {event, error} = instrumentEvent({
    removingLineIds: lineIds,
    prevLines: prevCart.lines,
    currentLines: cart.lines,
  });

  return json({event, error});
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

  let error = null;
  if (linesNotRemoved?.length) {
    event.type = 'lines_remove_error';
    event.payload.linesNotRemoved = linesNotRemoved;

    error = linesNotRemoved.length
      ? `Failed to remove line ids ${linesNotRemoved
          .map(({id}: CartLine) => id)
          .join(',')}`
      : null;
  }

  return {event, error};
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
async function linesRemoveMutation({
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
 * @see: https://shopify.dev/api/storefront/2022-10/mutations/cartLinesRemove
 */
const LinesRemoveForm = forwardRef(
  (
    {lineIds, children, onSuccess}: LinesRemoveProps,
    ref: React.Ref<HTMLFormElement>,
  ) => {
    const formId = useId();
    const isHydrated = useIsHydrated();
    const fetcher = useFetcher();
    const location = useLocation();
    const currentUrl = `${location.pathname}${location.search}`;
    const localizedActionPath = usePrefixPathWithLocale(ACTION_PATH);

    const event = fetcher.data?.event;
    const error = fetcher.data?.error;

    useEffect(() => {
      if (!event) return;
      onSuccess?.(event);
    }, [event, onSuccess]);

    return (
      <fetcher.Form
        id={formId}
        method="post"
        action={localizedActionPath}
        ref={ref}
      >
        <input type="hidden" name="lineIds" value={JSON.stringify(lineIds)} />
        {/* used to trigger a redirect back to the same url when JS is disabled */}
        {isHydrated ? null : (
          <input type="hidden" name="redirectTo" defaultValue={currentUrl} />
        )}
        {children({state: fetcher.state, error})}
      </fetcher.Form>
    );
  },
);

/**
 * A hook version of LinesRemoveForm to remove cart line(s) programmatically
 * @param onSuccess callback function that executes on success
 * @returns { linesRemove, linesRemoveFetcher, linesRemoving, }
 */
function useLinesRemove(
  onSuccess: (event: LinesRemoveEvent) => void = () => {},
) {
  const localizedActionPath = usePrefixPathWithLocale(ACTION_PATH);

  const fetcher = useFetcher();
  const fetchers = useFetchers();
  const linesRemoveFetcher = fetchers.find(
    (fetcher) => fetcher?.submission?.action === localizedActionPath,
  );

  let linesRemoving = [];

  // set linesRemoving
  if (linesRemoveFetcher?.submission) {
    const deletingLineIdsStr =
      linesRemoveFetcher?.submission?.formData?.get('lineIds');
    if (deletingLineIdsStr && typeof deletingLineIdsStr === 'string') {
      try {
        linesRemoving = JSON.parse(deletingLineIdsStr);
      } catch (_) {
        // noop
      }
    }
  }

  const linesRemove = useCallback(
    ({lineIds}: {lineIds: CartLine['id'][]}) => {
      const form = new FormData();
      form.set('lineIds', JSON.stringify(lineIds));
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
    linesRemove,
    linesRemoveFetcher,
    linesRemoving,
  };
}

/**
 * A utility hook to implement optimistic lines removal
 * @param lines CartLine[]
 * @returns {optimisticLastLineRemove, linesRemoving}
 */
function useOptimisticLinesRemove(
  lines?: PartialDeep<CartLine, {recurseIntoArrays: true}>[] | CartLine[],
) {
  const localizedActionPath = usePrefixPathWithLocale(ACTION_PATH);

  const fetchers = useFetchers();
  const linesRemoveFetcher = fetchers.find(
    (fetcher) => fetcher?.submission?.action === localizedActionPath,
  );

  let linesRemoving: CartLine['id'][] = [];
  let optimisticLastLineRemove = false;

  if (!linesRemoveFetcher?.submission) {
    return {optimisticLastLineRemove, linesRemoving};
  }

  const linesRemoveStr =
    linesRemoveFetcher?.submission?.formData?.get('lineIds');
  if (linesRemoveStr && typeof linesRemoveStr === 'string') {
    try {
      linesRemoving = JSON.parse(linesRemoveStr);
    } catch (_) {
      // noop
    }
  }

  if (lines?.length && linesRemoving?.length) {
    optimisticLastLineRemove = linesRemoving.length === lines.length;
  }

  return {optimisticLastLineRemove, linesRemoving};
}

/**
 * A utility hook to implement optimistic single line removal
 * @param line? optional CartLine
 * @returns {optimisticLineRemove, linesRemoving}
 */
function useOptimisticLineRemove(line?: CartLine) {
  const {linesRemoving} = useOptimisticLinesRemove();

  const optimisticLineRemove =
    line && linesRemoving?.length
      ? Boolean(linesRemoving.includes(line.id))
      : false;

  return {optimisticLineRemove, linesRemoving};
}

export {
  action,
  LinesRemoveForm,
  linesRemoveMutation,
  useLinesRemove,
  useOptimisticLineRemove,
  useOptimisticLinesRemove,
};
