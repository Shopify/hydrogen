import invariant from 'tiny-invariant';
import type {PartialDeep} from 'type-fest';
import {forwardRef, useCallback, useEffect, useId, useRef} from 'react';
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
} from './CartLinesAdd';
import {isLocalPath, usePrefixPathWithLocale} from '~/lib/utils';

interface UpdateCartLineProps {
  lines: CartLineUpdateInput[];
  className?: string;
  children: ({
    state,
    errors,
  }: {
    state: 'idle' | 'submitting' | 'loading';
    errors: PartialDeep<UserError>[];
  }) => React.ReactNode;
  onSuccess?: (event: LinesUpdateEvent) => void;
}

interface LinesUpdateEventPayload {
  lines: CartLineUpdateInput[];
  linesUpdated: CartLine[];
  linesNotUpdated: CartLine[];
}

interface LinesUpdateEvent {
  type: 'lines_update';
  id: string;
  payload: LinesUpdateEventPayload;
}

interface InstrumentLinesProps {
  updatingLines: CartLineUpdateInput[];
  prevLines: CartLineConnection;
  currentLines: CartLineConnection;
}

const ACTION_PATH = '/cart/CartLinesUpdate';

/**
 * action that handles the line(s) update mutation
 * @preserve
 */
async function action({request, context}: ActionArgs) {
  const {session} = context;
  const formData = await request.formData();

  //! 1. Grab the cart ID from the session
  const cartId = await session.get('cartId');
  invariant(cartId, 'Missing cartId');

  invariant(formData.get('lines'), 'Missing lines');
  const lines = formData.get('lines')
    ? (JSON.parse(String(formData.get('lines'))) as CartLineUpdateInput[])
    : ([] as CartLineUpdateInput[]);

  //! we need to query the prevCart lines, so we can validate
  //! what was really updated or not for analytics :(
  const prevCart = await getCartLines({cartId, context});

  const {cart, errors: graphqlErrors} = await cartLinesUpdate({
    cartId,
    lines,
    context,
  });

  if (graphqlErrors.length) {
    return json({errors: graphqlErrors});
  }

  //! if no js, we essentially reload to avoid being routed to the actions route
  const redirectTo = formData.get('redirectTo') ?? null;
  if (typeof redirectTo === 'string' && isLocalPath(redirectTo)) {
    return redirect(redirectTo);
  }

  const {event, errors} = instrumentEvent({
    updatingLines: lines,
    currentLines: cart.lines,
    prevLines: prevCart.lines,
  });

  return json({event, errors});
}

/**
 * Helper function to instrument lines_update
 * @param updatingLines the line ids being updated
 * @param prevLines the line(s) available before removing
 * @param currentLines the line(s) still available after removing
 * @returns {event, error}
 * @preserve
 */
function instrumentEvent({
  updatingLines,
  currentLines,
  prevLines,
}: InstrumentLinesProps) {
  //! determine what line(s) were removed or not
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

  let errors = null;
  if (linesNotUpdated.length) {
    errors = linesNotUpdated.map((line) => ({
      code: 'LINE_NOT_UPDATED',
      message: line.merchandise.id,
    }));
  }

  return {event, errors};
}

/**
 * Diff lines to determine which lines were actually updated and which one were not
 * @todo: remove when this is provided by the mutation
 * @param prevLines the line(s) available before removing
 * @param currentLines the line(s) still available after removing
 * @returns
 * @preserve
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

/*!
  mutation -----------------------------------------------------------------------------------------
*/
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
async function cartLinesUpdate({
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
 * @see https://shopify.dev/api/storefront/2022-10/mutations/cartLinesUpdate
 * @preserve
 */
const CartLinesUpdateForm = forwardRef(
  (
    {lines = [], children, onSuccess, className}: UpdateCartLineProps,
    ref: React.Ref<HTMLFormElement>,
  ) => {
    const formId = useId();
    const lastEventId = useRef<string | undefined>();
    const isHydrated = useIsHydrated();
    const fetcher = useFetcher();
    const {pathname, search} = useLocation();
    const event = fetcher.data?.event;
    const eventId = fetcher.data?.event?.id;
    const errors = fetcher.data?.errors;
    const localizedActionPath = usePrefixPathWithLocale(ACTION_PATH);
    const localizedCurrentPath = usePrefixPathWithLocale(
      `${pathname}${search}`,
    );

    useEffect(() => {
      if (!eventId) return;
      if (eventId === lastEventId.current) return;
      onSuccess?.(event);
      lastEventId.current = eventId;
    }, [eventId, event, onSuccess]);

    if (!lines.length) return null;

    return (
      <fetcher.Form
        id={formId}
        method="post"
        action={localizedActionPath}
        className={className}
        ref={ref}
      >
        {Array.isArray(lines) && (
          <input
            type="hidden"
            name="lines"
            defaultValue={JSON.stringify(lines)}
          />
        )}
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
 * A hook version of LinesUpdateForm to update cart line(s) programmatically
 * @param onSuccess callback function that executes on success
 * @returns { cartLinesUpdate, fetcher}
 * @preserve
 */
function useCartLinesUpdate(
  onSuccess: (event: LinesUpdateEvent) => void = () => {},
) {
  const fetcher = useFetcher();
  const lastEventId = useRef<string | undefined>();
  const localizedActionPath = usePrefixPathWithLocale(ACTION_PATH);

  const cartLinesUpdate = useCallback(
    ({lines}: {lines: CartLineUpdateInput}) => {
      const form = new FormData();
      Array.isArray(lines) && form.set('lines', JSON.stringify(lines));
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
    if (lastEventId.current === fetcher?.data?.event?.id) return;
    onSuccess?.(fetcher.data.event);
    lastEventId.current = fetcher.data.event.id;
  }, [fetcher?.data?.event, onSuccess]);

  return {cartLinesUpdate, fetcher};
}

/**
 * Utility hook to get the active LinesUpdate fetcher
 * @returns fetcher
 * @preserve
 */
function useCartLinesUpdatingFetcher() {
  const fetchers = useFetchers();
  const localizedActionPath = usePrefixPathWithLocale(ACTION_PATH);
  return fetchers.find(
    (fetcher) => fetcher?.submission?.action === localizedActionPath,
  );
}

/**
 * Utility hook to retrieve all cart lines being updated
 * @returns {linesUpdating, fetcher}
 * @preserve
 */
function useCartLinesUpdating() {
  const fetcher = useCartLinesUpdatingFetcher();
  let linesUpdating: PartialDeep<CartLine>[] = [];
  // set linesUpdating
  if (fetcher?.submission) {
    const linesStr = fetcher?.submission?.formData?.get('lines');
    if (linesStr && typeof linesStr === 'string') {
      try {
        linesUpdating = JSON.parse(linesStr);
      } catch (_) {
        // noop
      }
    }
  }

  return {linesUpdating, fetcher};
}

/**
 * A utility hook to implement individual line optimistic updates
 * @param line CartLine
 * @returns {lineUpdating, linesUpdating}
 * @preserve
 */
function useCartLineUpdating(
  line: CartLine | PartialDeep<CartLine, {recurseIntoArrays: true}>,
) {
  const {linesUpdating, fetcher} = useCartLinesUpdating();
  let lineUpdating: PartialDeep<CartLine> | null = null;

  if (!fetcher?.submission) {
    return {lineUpdating, linesUpdating};
  }

  //! filter updating line
  if (line && linesUpdating?.length) {
    lineUpdating =
      linesUpdating.find((updatingLine) => updatingLine?.id === line?.id) ||
      null;
  }

  return {lineUpdating, linesUpdating};
}

export {
  action,
  cartLinesUpdate,
  CartLinesUpdateForm,
  useCartLinesUpdate,
  useCartLineUpdating,
};
