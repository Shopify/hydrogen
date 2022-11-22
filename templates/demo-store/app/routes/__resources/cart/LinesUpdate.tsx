import invariant from 'tiny-invariant';
import type {PartialDeep} from 'type-fest';
import {forwardRef, useCallback, useEffect, useId} from 'react';
import {useFetcher, useLocation, useFetchers} from '@remix-run/react';
import type {
  Cart,
  CartLine,
  CartLineConnection,
  CartLineUpdateInput,
  UserError,
} from '@shopify/hydrogen-react/storefront-api-types';
import {
  type ActionArgs,
  type HydrogenContext,
  redirect,
  json,
} from '@shopify/hydrogen-remix';
import {useIsHydrated} from '~/hooks/useIsHydrated';
import {
  getCartLines,
  LINES_CART_FRAGMENT,
  USER_ERROR_FRAGMENT,
} from './LinesAdd';
import {usePrefixPathWithLocale} from '~/lib/utils';

interface UpdateCartLineProps {
  lines: CartLineUpdateInput[];
  children: ({
    state,
    error,
  }: {
    state: 'idle' | 'submitting' | 'loading';
    error?: string;
  }) => React.ReactNode;
  onSuccess?: (event: LinesUpdateEvent) => void;
}

interface LinesUpdateEventPayload {
  lines: CartLineUpdateInput[];
  linesUpdated: CartLine[];
  linesNotUpdated: CartLine[];
}

interface LinesUpdateEvent {
  type: 'lines_update' | 'lines_update_error';
  id: string;
  payload: LinesUpdateEventPayload;
}

interface InstrumentLinesProps {
  updatingLines: CartLineUpdateInput[];
  prevLines: CartLineConnection;
  currentLines: CartLineConnection;
}

const ACTION_PATH = '/cart/LinesUpdate';

/**
 * action that handles the line(s) update mutation
 */
async function action({request, context}: ActionArgs) {
  const {session} = context;
  const formData = await request.formData();

  // 1. Grab the cart ID from the session
  const cartId = await session.get('cartId');
  invariant(cartId, 'Missing cartId');

  invariant(formData.get('lines'), 'Missing lines');
  const lines = formData.get('lines')
    ? (JSON.parse(String(formData.get('lines'))) as CartLineUpdateInput[])
    : ([] as CartLineUpdateInput[]);

  // we need to query the prevCart lines, so we can validate
  // what was really updated or not for analytics :(
  const prevCart = await getCartLines({cartId, context});

  const {cart, errors} = await linesUpdateMutation({
    cartId,
    lines,
    context,
  });

  if (errors.length) {
    const errorMessage = errors?.map(({message}) => message).join('/n') || '';
    return json({error: errorMessage});
  }

  // if no js, we essentially reload to avoid being routed to the actions route
  const redirectTo = JSON.parse(String(formData.get('redirectTo')));
  if (redirectTo) {
    return redirect(redirectTo);
  }

  const {event, error} = instrumentEvent({
    updatingLines: lines,
    currentLines: cart.lines,
    prevLines: prevCart.lines,
  });

  return json({event, error});
}

/**
 * Helper function to instrument lines_update | lines_update_error events
 * @param updatingLines the line ids being updated
 * @param prevLines the line(s) available before removing
 * @param currentLines the line(s) still available after removing
 * @returns {event, error}
 */
function instrumentEvent({
  updatingLines,
  currentLines,
  prevLines,
}: InstrumentLinesProps) {
  // determine what line(s) were removed or not
  const {linesUpdated, linesNotUpdated} = diffLines({prevLines, currentLines});

  const event: LinesUpdateEvent = {
    type: 'lines_update',
    id: crypto.randomUUID(),
    payload: {
      lines: updatingLines,
      linesUpdated,
      linesNotUpdated: [],
    },
  };

  let error = null;
  if (linesNotUpdated.length) {
    event.type = 'lines_update_error';
    event.payload.linesNotUpdated = linesNotUpdated;
    error = `Failed to update line ids ${linesNotUpdated
      .map(({id}: CartLine) => id)
      .join(',')}`;
  }

  return {event, error};
}

/**
 * Diff lines to determine which lines were actually updated and which one were not
 * @todo: remove when this is provided by the mutation
 * @param prevLines the line(s) available before removing
 * @param currentLines the line(s) still available after removing
 * @returns
 */
function diffLines({
  prevLines,
  currentLines,
}: Omit<InstrumentLinesProps, 'updatingLines'>) {
  return prevLines?.edges?.reduce(
    (_result, {node: _prevLine}) => {
      const line = currentLines.edges.find(
        ({node: line}) => line.id === _prevLine.id,
      );
      if (!line || JSON.stringify(line) !== JSON.stringify(_prevLine)) {
        _result.linesUpdated = [..._result.linesUpdated, _prevLine];
      } else {
        _result.linesNotUpdated = [..._result.linesNotUpdated, _prevLine];
      }
      return _result;
    },
    {linesUpdated: [], linesNotUpdated: []} as Omit<
      LinesUpdateEventPayload,
      'lines'
    >,
  ) as Omit<LinesUpdateEventPayload, 'lines'>;
}

/*
  mutation -----------------------------------------------------------------------------------------
*/
const LINES_UPDATE_MUTATION = `#graphql
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
  ${LINES_CART_FRAGMENT}
  ${USER_ERROR_FRAGMENT}
`;

/**
 * Update cart line(s) mutation
 * @param cartId the current cart id
 * @param lineIds [ID!]! an array of cart line ids to remove
 * @see https://shopify.dev/api/storefront/2022-07/mutations/cartlinesremove
 * @returns mutated cart
 */
async function linesUpdateMutation({
  cartId,
  lines,
  context,
}: {
  cartId: string;
  lines: CartLineUpdateInput[];
  context: HydrogenContext;
}) {
  const {storefront} = context;
  invariant(storefront, 'missing storefront client in lines update mutation');

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
 * Form that updates cart line(s)
 * @param lines [CartLineUpdateInput!]! an array of cart lines to update
 * @param children render submit button
 * @param onSuccess? callback that runs after each form submission
 * @see: https://shopify.dev/api/storefront/2022-10/mutations/cartLinesUpdate
 */
const LinesUpdateForm = forwardRef(
  (
    {lines = [], children, onSuccess}: UpdateCartLineProps,
    ref: React.Ref<HTMLFormElement>,
  ) => {
    const formId = useId();
    const isHydrated = useIsHydrated();
    const fetcher = useFetcher();
    const {pathname, search} = useLocation();
    const event = fetcher.data?.event;
    const eventId = fetcher.data?.event?.id;
    const error = fetcher.data?.error;
    const localizedActionPath = usePrefixPathWithLocale(ACTION_PATH);

    useEffect(() => {
      if (!eventId) return;
      onSuccess?.(event);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [eventId]);

    if (!lines.length) return null;

    return (
      <fetcher.Form
        id={formId}
        method="post"
        action={localizedActionPath}
        ref={ref}
      >
        {/* used to trigger a redirect back to the same url when JS is disabled */}
        {isHydrated ? null : (
          <input
            type="hidden"
            name="redirectTo"
            defaultValue={`${pathname}${search}`}
          />
        )}
        <input type="hidden" name="lines" value={JSON.stringify(lines)} />
        {children({state: fetcher.state, error})}
      </fetcher.Form>
    );
  },
);

/**
 * Utility hook to get the active LinesUpdate fetcher
 * @returns fetcher
 */
function useLinesUpdatingFetcher() {
  const fetchers = useFetchers();
  const localizedActionPath = usePrefixPathWithLocale(ACTION_PATH);
  return fetchers.find(
    (fetcher) => fetcher?.submission?.action === localizedActionPath,
  );
}

/**
 * A hook version of LinesUpdateForm to update cart line(s) programmatically
 * @param onSuccess callback function that executes on success
 * @returns { linesUpdate, linesUpdateFetcher, linesUpdating, }
 */
function useLinesUpdate(
  onSuccess: (event: LinesUpdateEvent) => void = () => {},
) {
  const fetcher = useFetcher();
  const linesUpdateFetcher = useLinesUpdatingFetcher();
  const localizedActionPath = usePrefixPathWithLocale(ACTION_PATH);

  let linesUpdating;

  // set linesUpdating
  if (linesUpdateFetcher?.submission) {
    const updatingLinesStr =
      linesUpdateFetcher?.submission?.formData?.get('lines');
    if (updatingLinesStr && typeof updatingLinesStr === 'string') {
      try {
        linesUpdating = JSON.parse(updatingLinesStr);
      } catch (_) {
        // noop
      }
    }
  }

  const linesUpdate = useCallback(
    ({lines}: {lines: CartLineUpdateInput}) => {
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
    linesUpdate,
    linesUpdateFetcher,
    linesUpdating,
  };
}

/**
 * A utility hook to implement optimistic line updates
 * @param line CartLine
 * @returns {lineUpdating, linesUpdating}
 */
function useLineUpdating(
  line: CartLine | PartialDeep<CartLine, {recurseIntoArrays: true}>,
) {
  const linesUpdateFetcher = useLinesUpdatingFetcher();

  let linesUpdating: CartLine[] = [];
  let lineUpdating: CartLine | null = null;

  if (!linesUpdateFetcher?.submission) {
    return {lineUpdating, linesUpdating};
  }

  // parse updating lines
  const linesUpdatingStr =
    linesUpdateFetcher?.submission?.formData?.get('lines');
  if (linesUpdatingStr && typeof linesUpdatingStr === 'string') {
    try {
      linesUpdating = JSON.parse(linesUpdatingStr);
    } catch (_) {
      // noop
    }
  }

  // filter updating line
  if (line && linesUpdating?.length) {
    lineUpdating =
      linesUpdating.find((updatingLine) => updatingLine.id === line.id) || null;
  }

  return {lineUpdating, linesUpdating};
}

export {
  action,
  LinesUpdateForm,
  linesUpdateMutation,
  useLinesUpdate,
  useLineUpdating,
};
