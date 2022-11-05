import React, {Suspense, useEffect} from 'react';
import {useFetcher, useMatches, Await, useLocation} from '@remix-run/react';
import {useIsHydrated} from '~/hooks/useIsHydrated';
import type {
  Cart,
  CartLine,
  CartLineConnection,
  UserError,
} from '@shopify/hydrogen-react/storefront-api-types';
import {type ActionFunction, redirect, json} from '@hydrogen/remix';
import invariant from 'tiny-invariant';
import {removeLineItems} from '~/data';
import {getSession} from '~/lib/session.server';
import type {ButtonProps} from '~/components/Button';

interface LinesRemoved {
  linesRemoved: CartLine[];
  linesNotRemoved: CartLine[];
}

export const action: ActionFunction = async ({request, context, params}) => {
  const [session, formData] = await Promise.all([
    getSession(request, context),
    new URLSearchParams(await request.text()),
  ]);

  const cartId = await session.get('cartId');
  invariant(cartId, 'Missing cartId');

  invariant(formData.get('lineIds'), 'Missing lines');
  const lineIds = formData.get('lineIds')
    ? (JSON.parse(String(formData.get('lineIds'))) as CartLine['id'][])
    : ([] as CartLine['id'][]);

  const {cart, errors} = await removeLineItems({
    cartId,
    lineIds,
    params,
  });

  return removeFromCartResponse(lineIds, cart, errors, formData);
};

/*
  Remove a set of line(s) from the cart
  @see: https://shopify.dev/api/storefront/2022-10/mutations/cartLinesRemove
*/
export function RemoveFromCart({
  lineIds,
  children,
  onSuccess = () => {},
  ...props
}: {
  lineIds: CartLine['id'][];
  children: ({state, error}: {state: string; error: string}) => React.ReactNode;
  onSuccess?: (event: any) => void;
  [key: keyof ButtonProps]: any;
}) {
  const isHydrated = useIsHydrated();
  const [root] = useMatches();
  const fetcher = useFetcher();
  const location = useLocation();
  const currentUrl = `${location.pathname}${
    location.search ? '?' + location.search : ''
  }`.replace('/null', ''); // remix bug in full-stack components?

  const event = fetcher.data?.event;
  const error = fetcher.data?.error;

  useEffect(() => {
    if (!event) return;
    onSuccess?.(event);
  }, [event, onSuccess]);

  return (
    <fetcher.Form method="post" action="/RemoveFromCart">
      <Suspense fallback={null}>
        <Await resolve={root.data.cart}>
          {(cart: Cart) => (
            <input
              type="hidden"
              name="prevLines"
              value={JSON.stringify(cart.lines)}
            />
          )}
        </Await>
      </Suspense>
      <input type="hidden" name="lineIds" value={JSON.stringify(lineIds)} />
      {/* used to trigger a redirect back to the same url when JS is disabled */}
      {isHydrated ? null : (
        <input type="hidden" name="redirectTo" defaultValue={currentUrl} />
      )}
      <button type="submit" {...props}>
        {children({state: fetcher.state, error})}
      </button>
    </fetcher.Form>
  );
}

/*
  helpers --------
*/
function removeFromCartResponse(
  lineIds: CartLine['id'][],
  cart: Cart,
  errors: UserError[],
  formData: FormData,
) {
  const mutationErrorMessage =
    errors?.map(({message}) => message).join('/n') || '';
  invariant(!errors.length, mutationErrorMessage);

  // if no js, we essentially reload to avoid being routed to the actions route
  const shouldRedirect = JSON.parse(String(formData.get('redirect')));
  if (shouldRedirect) {
    return redirect(shouldRedirect);
  }

  const prevLines: CartLineConnection = formData.get('prevLines')
    ? JSON.parse(String(formData.get('prevLines')))
    : [];

  // determine what line(s) were removed or not
  const {linesRemoved, linesNotRemoved} = getLinesRemoved(prevLines, cart);

  const removeErrorMessage = linesNotRemoved.length
    ? `Failed to remove line ids ${linesNotRemoved
        .map(({id}: CartLine) => id)
        .join(',')}`
    : null;

  const event = {
    type: 'remove_from_cart',
    payload: {
      lineIds,
      linesRemoved,
    },
  };

  return json({event, error: removeErrorMessage});
}

function getLinesRemoved(prevLines: CartLineConnection, cart: Cart) {
  return prevLines?.edges?.reduce(
    (_result, {node: _prevLine}) => {
      const lineStillExists = cart.lines.edges.find(
        ({node: line}) => line.id === _prevLine.id,
      );
      if (lineStillExists) {
        _result.linesNotRemoved = [..._result.linesNotRemoved, _prevLine];
      } else {
        _result.linesRemoved = [..._result.linesRemoved, _prevLine];
      }
      return _result;
    },
    {linesRemoved: [], linesNotRemoved: []} as LinesRemoved,
  ) as LinesRemoved;
}
