import React, {Suspense} from 'react';
import {useFetcher, useMatches, Await} from '@remix-run/react';
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
}: {
  lineIds: CartLine['id'][];
  children: ({state}: {state: string}) => React.ReactNode;
}) {
  const fetcher = useFetcher();
  const [root] = useMatches();
  const currentUrl = location.pathname + location.search;
  return (
    <fetcher.Form method="post" action="/RemoveFromCart">
      <Suspense fallback={null}>
        <Await resolve={root.data.cart}>
          {(cart: Cart) => (
            <>
              <input
                type="hidden"
                name="prevLines"
                value={JSON.stringify(cart.lines)}
              />
              <input
                type="hidden"
                name="totalQuantity"
                value={JSON.stringify(cart.totalQuantity)}
              />
            </>
          )}
        </Await>
      </Suspense>
      <input type="hidden" name="lineIds" value={JSON.stringify(lineIds)} />
      <input type="hidden" name="redirect" value={currentUrl} />
      <button
        type="submit"
        className="flex items-center justify-center w-10 h-10 border rounded"
      >
        {children({state: fetcher.state})}
      </button>
    </fetcher.Form>
  );
}

/*
  helpers --------
*/
interface SortedLines {
  linesRemoved: CartLine[];
  linesNotRemoved: CartLine[];
}

function removeFromCartResponse(
  lineIds: CartLine['id'][],
  cart: Cart,
  errors: UserError[],
  formData: FormData,
) {
  const mutationErrorMessage =
    errors?.map(({message}) => message).join('/n') || null;
  if (mutationErrorMessage) {
    throw new Error(mutationErrorMessage);
  }

  // if no js, we essentially reload to avoid being routed to the actions route
  const shouldRedirect = String(formData.get('redirect'));
  if (shouldRedirect) {
    return redirect(shouldRedirect);
  }

  const prevLines: CartLineConnection = formData.get('prevLines')
    ? JSON.parse(String(formData.get('prevLines')))
    : [];

  // determine what line(s) were removed or not
  const {linesRemoved = [], linesNotRemoved = []} = prevLines?.edges?.reduce(
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
    {linesRemoved: [], linesNotRemoved: []} as SortedLines,
  ) as SortedLines;

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
    error: removeErrorMessage,
  };

  return json({event});
}
