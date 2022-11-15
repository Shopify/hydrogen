import {forwardRef, useEffect, useId} from 'react';
import {useFetcher, useLocation, Params, useFetchers} from '@remix-run/react';
import type {
  Cart,
  CartLine,
  CartLineConnection,
  CartLineUpdateInput,
  UserError,
} from '@shopify/hydrogen-react/storefront-api-types';
import {
  type ActionArgs,
  redirect,
  json,
  AppLoadContext,
  CacheNone,
} from '@hydrogen/remix';
import invariant from 'tiny-invariant';
import {getSession} from '~/lib/session.server';
import {useIsHydrated} from '~/hooks/useIsHydrated';
import {getLocalizationFromLang} from '~/lib/utils';
import {
  getCartLines,
  LINES_CART_FRAGMENT,
  USER_ERROR_FRAGMENT,
} from './LinesAdd';

interface LinesUpdated {
  linesUpdated: CartLine[];
  linesNotUpdated: CartLine[];
}

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
  linesNotUpdated?: CartLine[];
}

interface LinesUpdateEvent {
  type: 'lines_update';
  id: string;
  payload: LinesUpdateEventPayload;
}

const ACTION_PATH = '/cart/LinesUpdate';

/*
  action ----------------------------------------------------------------
*/
async function action({request, context, params}: ActionArgs) {
  const [session, formData] = await Promise.all([
    getSession(request, context),
    new URLSearchParams(await request.text()),
  ]);

  // 1. Grab the cart ID from the session
  const cartId = await session.get('cartId');
  invariant(cartId, 'Missing cartId');

  invariant(formData.get('lines'), 'Missing lines');
  const lines = formData.get('lines')
    ? (JSON.parse(String(formData.get('lines'))) as CartLineUpdateInput[])
    : ([] as CartLineUpdateInput[]);

  // we need to query the prevCart so we can validate
  // what was really added or not for analytics
  const prevCart = await getCartLines({cartId, params, context});

  const {cart, errors} = await linesUpdateMutation({
    cartId,
    lines,
    params,
    context,
  });

  return linesUpdateResponse(prevCart, lines, cart, errors, formData);
}

/*
  helpers ----------------------------------------------------------------
*/
function linesUpdateResponse(
  prevCart: Cart,
  lines: CartLineUpdateInput[],
  cart: Cart,
  errors: UserError[],
  formData: FormData,
) {
  const mutationErrorMessage =
    errors?.map(({message}) => message).join('/n') || '';
  invariant(!errors.length, mutationErrorMessage);

  // if no js, we essentially reload to avoid being routed to the actions route
  const redirectTo = JSON.parse(String(formData.get('redirectTo')));
  if (redirectTo) {
    return redirect(redirectTo);
  }

  // determine what line(s) were removed or not
  const {linesUpdated, linesNotUpdated} = getLinesUpdated(prevCart.lines, cart);

  const event: LinesUpdateEvent = {
    type: 'lines_update',
    id: crypto.randomUUID(),
    payload: {
      lines,
      linesUpdated,
    },
  };

  let updateErrorMessage = null;
  if (linesNotUpdated.length) {
    event.payload.linesNotUpdated = linesNotUpdated;
    updateErrorMessage = `Failed to update line ids ${linesNotUpdated
      .map(({id}: CartLine) => id)
      .join(',')}`;
  }

  return json({event, error: updateErrorMessage});
}

function getLinesUpdated(prevLines: CartLineConnection, cart: Cart) {
  return prevLines?.edges?.reduce(
    (_result, {node: _prevLine}) => {
      const line = cart.lines.edges.find(
        ({node: line}) => line.id === _prevLine.id,
      );
      if (!line || JSON.stringify(line) !== JSON.stringify(_prevLine)) {
        _result.linesUpdated = [..._result.linesUpdated, _prevLine];
      } else {
        _result.linesNotUpdated = [..._result.linesNotUpdated, _prevLine];
      }
      return _result;
    },
    {linesUpdated: [], linesNotUpdated: []} as LinesUpdated,
  ) as LinesUpdated;
}

/*
  mutation -----------------------------------------------------------------------------------------
*/
const LINES_UPDATE_MUTATION = `#graphql
  mutation ($cartId: ID!, $lines: [CartLineUpdateInput!]!, $country: CountryCode = ZZ)
  @inContext(country: $country) {
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

async function linesUpdateMutation({
  cartId,
  lines,
  params,
  context,
}: {
  cartId: string;
  lines: CartLineUpdateInput[];
  params: Params;
  context: AppLoadContext;
}) {
  const {storefront} = context;
  invariant(storefront, 'missing storefront client in lines update mutation');

  const {country} = getLocalizationFromLang(params.lang);

  const {cartLinesUpdate} = await storefront.query<{
    cartLinesUpdate: {cart: Cart; errors: UserError[]};
  }>({
    query: LINES_UPDATE_MUTATION,
    variables: {
      cartId,
      lines,
      country,
    },
    cache: CacheNone(),
  });

  invariant(
    cartLinesUpdate,
    'No data returned from update lines items mutation',
  );
  return cartLinesUpdate;
}

/*
  Component ----------------------------------------------------------------
  Update a set of cart line(s)
  @see: https://shopify.dev/api/storefront/2022-10/mutations/cartLinesUpdate
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

    // If I add the `event` or `onSuccess` deps
    // the effect reruns even if the deps have not changed. StrictMode?
    useEffect(() => {
      if (!eventId) return;
      onSuccess?.(event);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [eventId]);

    if (!lines.length) return null;

    return (
      <fetcher.Form id={formId} method="post" action={ACTION_PATH} ref={ref}>
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

/*
  hooks ----------------------------------------------------------------
*/
function useOptimisticLineUpdate(line?: CartLine) {
  const fetchers = useFetchers();
  const linesUpdateFetcher = fetchers.find(
    (fetcher) => fetcher?.submission?.action === ACTION_PATH,
  );

  let linesUpdating: CartLine[] = [];
  let lineUpdating: CartLine | null | undefined = null;
  let optimisticLineUpdateQuantity = line?.quantity || 1;

  if (!linesUpdateFetcher?.submission) {
    return {lineUpdating, linesUpdating, optimisticLineUpdateQuantity};
  }

  // parse updating lines
  const linesUpdatingStr =
    linesUpdateFetcher?.submission?.formData?.get('lines');
  if (linesUpdatingStr && typeof linesUpdatingStr === 'string') {
    linesUpdating = JSON.parse(linesUpdatingStr);
  }

  // filter updating line
  lineUpdating =
    line && linesUpdating?.length
      ? linesUpdating.find((updatingLine) => updatingLine.id === line.id)
      : null;

  if (lineUpdating) {
    optimisticLineUpdateQuantity = lineUpdating.quantity;
  }

  return {optimisticLineUpdateQuantity, lineUpdating, linesUpdating};
}

export {action, LinesUpdateForm, linesUpdateMutation, useOptimisticLineUpdate};
