import {Await, useFetcher, useMatches} from '@remix-run/react';
import {Button} from '~/components';
import {useIsHydrated} from '~/hooks/useIsHydrated';
import invariant from 'tiny-invariant';
import {addLineItem, createCart} from '~/data';
import {getSession} from '~/lib/session.server';
import {Suspense, useEffect} from 'react';
import {type ActionFunction, redirect, json} from '@hydrogen/remix';
import {
  Cart,
  CartLineInput,
} from '@shopify/hydrogen-react/storefront-api-types';
import type {ButtonProps} from '~/components/Button';

export const action: ActionFunction = async ({request, context, params}) => {
  const headers = new Headers();

  const [session, formData] = await Promise.all([
    getSession(request, context),
    new URLSearchParams(await request.text()),
  ]);

  invariant(formData.get('lines'), 'Missing lines');
  const lines = formData.get('lines')
    ? (JSON.parse(String(formData.get('lines'))) as CartLineInput[])
    : ([] as CartLineInput[]);
  invariant(lines.length, 'No lines to add');

  const cartId = await session.get('cartId');

  // A — no previous cart, create and add line(s)
  if (!cartId) {
    const {cart, errors} = await createCart({
      cart: {lines},
      params,
    });

    if (errors?.length) {
      const errorMessage = errors.map(({message}) => message).join('\n');
      return json({addedToCart: false, error: errorMessage}, {headers});
    }

    // cart created - we only need a Set-Cookie header if we're creating
    session.set('cartId', cart.id);
    headers.set('Set-Cookie', await session.commit());
    return addToCartResponse(cart, lines, formData, headers);
  }

  // B — else add line(s) to existing cart
  const {cart, errors} = await addLineItem({
    cartId,
    lines,
    params,
  });

  if (errors?.length) {
    const errorMessage = errors.map(({message}) => message).join('\n');
    throw new Error(errorMessage);
  }

  return addToCartResponse(cart, lines, formData, headers);
};

export function AddToCart({
  children,
  lines = [],
  variantUrl,
  disabled = false,
  onSuccess = () => {},
  ...props
}: {
  children: ({state, error}: {state: string; error: string}) => React.ReactNode;
  lines: CartLineInput[];
  /* the variant url to redirect to if JS is disabled/not ready  */
  variantUrl: string;
  disabled: boolean;
  onSuccess?: (event: any) => void;
  [key: keyof ButtonProps]: any;
}) {
  const [root] = useMatches();
  const addToCartFetcher = useFetcher();
  const isHydrated = useIsHydrated();
  const error =
    addToCartFetcher.state === 'idle' && addToCartFetcher?.data?.error;
  const event =
    addToCartFetcher.state === 'idle' && addToCartFetcher?.data?.event;

  useEffect(() => {
    if (!event) return;
    onSuccess?.(event);
  }, [event, onSuccess]);

  if (!lines?.length) return null;

  return (
    <addToCartFetcher.Form method="post" action="/AddToCart">
      <input type="hidden" name="lines" defaultValue={JSON.stringify(lines)} />
      <Suspense fallback={null}>
        <Await resolve={root.data.cart}>
          {(cart: Cart) => {
            const prevLines =
              cart?.lines?.edges?.map(
                ({node: {quantity, id, merchandise}}) => ({
                  id,
                  quantity,
                  merchandise,
                }),
              ) || [];
            return (
              /* used for add to cart analytics */
              <input
                type="hidden"
                name="prevLines"
                defaultValue={JSON.stringify(prevLines)}
              />
            );
          }}
        </Await>
      </Suspense>
      {/* used to trigger a redirect back to the PDP when JS is disabled */}
      {isHydrated ? null : (
        <input type="hidden" name="redirectTo" defaultValue={variantUrl} />
      )}
      <Button disabled={disabled} {...props}>
        {children({state: addToCartFetcher.state, error})}
      </Button>
    </addToCartFetcher.Form>
  );
}

/*
  helpers -----------------------------------------------------------------------------------------
*/
// Temporary workaround until we land
// https://github.com/Shopify/storefront-api-feedback/discussions/151
function getLinesAddedStatus(
  lines: CartLineInput[],
  prevLines: any[],
  cart: Cart,
) {
  return lines.reduce(
    (_result, _line) => {
      const prevLine = prevLines.find(
        (prevLine) => prevLine.merchandise.id === _line.merchandiseId,
      );
      const cartLine = cart.lines.edges.find(
        ({node: updatedLine}) =>
          updatedLine.merchandise.id === _line.merchandiseId,
      );

      // new line added?
      if (!prevLine) {
        if (cartLine?.node?.quantity === _line.quantity) {
          _result.linesAdded.push(_line);
        } else {
          _result.linesNotAdded.push(_line);
        }
        return _result;
      }

      // existing line updated?
      if (prevLine.quantity + _line.quantity === cartLine?.node?.quantity) {
        _result.linesAdded = [..._result.linesAdded, _line];
      } else {
        _result.linesNotAdded = [..._result.linesNotAdded, _line];
      }
      return _result;
    },
    {linesAdded: [], linesNotAdded: []} as {
      linesAdded: CartLineInput[];
      linesNotAdded: CartLineInput[];
    },
  );
}

function addToCartResponse(
  cart: Cart,
  lines: CartLineInput[],
  formData: FormData,
  headers: Headers,
) {
  // if JS is disabled, this will redirect back to the referer
  if (formData.get('redirectTo')) {
    return redirect(String(formData.get('redirectTo')), {headers});
  }

  const prevLines = formData.get('prevLines')
    ? (JSON.parse(String(formData.get('prevLines')) || '[]') as CartLineInput[])
    : ([] as CartLineInput[]);

  // we need to figure out if a particular line failed to add
  const {linesAdded, linesNotAdded} = getLinesAddedStatus(
    lines,
    prevLines,
    cart,
  );

  const event: {type: string; payload: any} = {
    type: 'add_to_cart', // @todo: Event.type.ADD_TO_CART
    payload: {linesAdded},
  };

  let errorMessage = null;
  if (linesNotAdded.length) {
    event.payload.linesNotAdded = linesNotAdded;

    const failedVariantIds = linesNotAdded
      .map((line) => line.merchandiseId.split('/').pop())
      .join(', ');
    errorMessage = `Failed to add variant(s): ${failedVariantIds}`;
  }

  if (linesAdded.length) {
    return json({event, addedToCart: true, error: errorMessage}, {headers});
  }

  // failed to add one or more
  return json({addedToCart: false, error: errorMessage}, {headers});
}
