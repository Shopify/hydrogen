import React, {forwardRef, useCallback, useEffect, useId} from 'react';
import {useFetcher, useLocation, Params, useFetchers} from '@remix-run/react';
import {useIsHydrated} from '~/hooks/useIsHydrated';
import type {
  Cart,
  CartLine,
  CartLineConnection,
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
import {getLocalizationFromLang} from '~/lib/utils';
import {getSession} from '~/lib/session.server';
import {getCartLines} from './LinesAdd';

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
  type: 'lines_remove';
  id: string;
  payload: LinesRemoveEventPayload;
}

const ACTION_PATH = '/cart/LinesRemove';

/*
  action ----------------------------------------------------------------
*/
async function action({request, context, params}: ActionArgs) {
  const [session, formData] = await Promise.all([
    getSession(request, context),
    new URLSearchParams(await request.text()),
  ]);

  const cartId = await session.get('cartId');
  invariant(cartId, 'Missing cartId');

  invariant(formData.get('lineIds'), 'Missing lineIds');
  const lineIds = formData.get('lineIds')
    ? (JSON.parse(String(formData.get('lineIds'))) as CartLine['id'][])
    : ([] as CartLine['id'][]);

  // we need to query the prevCart so we can validate
  // what was really added or not for analytics
  const prevCart = await getCartLines({cartId, params, context});

  const {cart, errors} = await linesRemoveMutation({
    cartId,
    lineIds,
    params,
    context,
  });

  return linesRemoveResponse(prevCart, lineIds, cart, errors, formData);
}

/*
  helpers ----------------------------------------------------------------
*/
async function linesRemoveResponse(
  prevCart: Cart,
  lineIds: CartLine['id'][],
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
  const {linesRemoved, linesNotRemoved} = getLinesRemoved(
    prevCart.lines,
    cart.lines,
    lineIds,
  );

  let errorMessage = null;

  const event: LinesRemoveEvent = {
    type: 'lines_remove',
    id: crypto.randomUUID(),
    payload: {
      lineIds,
      linesRemoved,
      linesNotRemoved: [],
    },
  };

  if (linesNotRemoved?.length) {
    event.payload.linesNotRemoved = linesNotRemoved;

    errorMessage = linesNotRemoved.length
      ? `Failed to remove line ids ${linesNotRemoved
          .map(({id}: CartLine) => id)
          .join(',')}`
      : null;
  }

  return json({event, error: errorMessage});
}

function getLinesRemoved(
  prevLines: CartLineConnection,
  cartLines: CartLineConnection,
  lineIds: CartLine['id'][],
) {
  return prevLines?.edges?.reduce(
    (_result, {node: _prevLine}) => {
      const lineStillExists = cartLines.edges.find(
        ({node: line}) => line.id === _prevLine.id,
      );
      if (lineStillExists) {
        if (lineIds.includes(lineStillExists?.node?.id)) {
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
  mutation CartLinesRemove($cartId: ID!, $lineIds: [ID!]!, $country: CountryCode = ZZ)
  @inContext(country: $country) {
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

async function linesRemoveMutation({
  cartId,
  lineIds,
  params,
  context,
}: {
  cartId: string;
  lineIds: Cart['id'][];
  params: Params;
  context: AppLoadContext;
}) {
  const {storefront} = context;
  invariant(storefront, 'missing storefront client in lines remove mutation');

  const {country} = getLocalizationFromLang(params.lang);

  const {cartLinesRemove} = await storefront.query<{
    cartLinesRemove: {cart: Cart; errors: UserError[]};
  }>({
    query: REMOVE_LINE_ITEMS_MUTATION,
    variables: {
      cartId,
      lineIds,
      country,
    },
    cache: CacheNone(),
  });

  invariant(cartLinesRemove, 'No data returned from remove lines mutation');
  return cartLinesRemove;
}

/*
  Component ----------------------------------------------------------------
  Remove a set of line(s) from the cart
  @see: https://shopify.dev/api/storefront/2022-10/mutations/cartLinesRemove
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

    const event = fetcher.data?.event;
    const error = fetcher.data?.error;

    useEffect(() => {
      if (!event) return;
      onSuccess?.(event);
    }, [event, onSuccess]);

    return (
      <fetcher.Form id={formId} method="post" action={ACTION_PATH} ref={ref}>
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

/*
  hooks ----------------------------------------------------------------
*/
function useLinesRemove(
  onSuccess: (event: LinesRemoveEvent) => void = () => {},
) {
  const fetcher = useFetcher();
  const fetchers = useFetchers();
  const linesRemoveFetcher = fetchers.find(
    (fetcher) => fetcher?.submission?.action === ACTION_PATH,
  );

  let linesRemoving;

  // set linesRemoving
  if (linesRemoveFetcher?.submission) {
    const deletingLineIdsStr =
      linesRemoveFetcher?.submission?.formData?.get('lineIds');
    if (deletingLineIdsStr && typeof deletingLineIdsStr === 'string') {
      linesRemoving = JSON.parse(deletingLineIdsStr);
    }
  }

  const linesRemove = useCallback(
    ({lineIds}: {lineIds: CartLine['id'][]}) => {
      const form = new FormData();
      form.set('lineIds', JSON.stringify(lineIds));
      fetcher.submit(form, {
        method: 'post',
        action: ACTION_PATH,
        replace: false,
      });
    },
    [fetcher],
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

function useOptimisticLinesRemove(lines?: CartLine[]) {
  const fetchers = useFetchers();
  const linesRemoveFetcher = fetchers.find(
    (fetcher) => fetcher?.submission?.action === ACTION_PATH,
  );

  let linesRemoving: CartLine['id'][] = [];
  let optimisticLastLineRemove = false;

  if (!linesRemoveFetcher?.submission) {
    return {optimisticLastLineRemove, linesRemoving};
  }

  // determiner lines
  const linesRemoveStr =
    linesRemoveFetcher?.submission?.formData?.get('lineIds');
  if (linesRemoveStr && typeof linesRemoveStr === 'string') {
    linesRemoving = JSON.parse(linesRemoveStr);
  }

  if (lines?.length && linesRemoving?.length) {
    optimisticLastLineRemove = linesRemoving.length === lines.length;
  }

  return {optimisticLastLineRemove, linesRemoving};
}

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
