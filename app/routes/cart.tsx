import {
  type LoaderArgs,
  type ActionFunction,
  redirect,
  json,
  defer,
} from '@hydrogen/remix';
import invariant from 'tiny-invariant';
import {addLineItem, createCart, getTopProducts, updateLineItem} from '~/data';
import {getSession} from '~/lib/session.server';

export const handle = {
  isCartRoute: true,
};

export async function loader({params}: LoaderArgs) {
  return defer(
    {
      topProducts: getTopProducts({params}),
    },
    {
      headers: {
        'Cache-Control': 'max-age=600',
      },
    },
  );
}

export const action: ActionFunction = async ({request, context, params}) => {
  let cart;

  const [session, formData] = await Promise.all([
    getSession(request, context),
    new URLSearchParams(await request.text()),
  ]);

  const redirectTo = formData.get('redirectTo');
  const intent = formData.get('intent');
  invariant(intent, 'Missing cart intent');

  // 1. Grab the cart ID from the session
  const cartId = await session.get('cartId');

  switch (intent) {
    case 'addToCart': {
      const variantId = formData.get('variantId');
      invariant(variantId, 'Missing variantId');

      // We only need a Set-Cookie header if we're creating
      // a new cart (aka adding cartId to the session)
      const headers = new Headers();

      // 2. If none exists, create a cart (SFAPI)
      if (!cartId) {
        cart = await createCart({
          cart: {lines: [{merchandiseId: variantId}]},
          params,
        });

        session.set('cartId', cart.id);
        headers.set('Set-Cookie', await session.commit());
      } else {
        // 3. Else, update the cart with the variant ID (SFAPI)
        cart = await addLineItem({
          cartId,
          lines: [{merchandiseId: variantId}],
          params,
        });
      }

      // if JS is disabled, this will redirect back to the referer
      if (redirectTo) {
        return redirect(redirectTo, {headers});
      }

      // returned inside the fetcher.data, addedToCart:true opens the cart drawer
      return json({addedToCart: true}, {headers});
    }

    case 'set-quantity': {
      const lineId = formData.get('lineId');
      invariant(lineId, 'Missing lineId');
      invariant(cartId, 'Missing cartId');
      const quantity = Number(formData.get('quantity'));
      cart = await updateLineItem({
        cartId,
        lineItem: {id: lineId, quantity},
        params,
      });
      return json({cart});
    }

    case 'remove-line-item': {
      /**
       * We're re-using the same mutation as setting a quantity of 0,
       * but theoretically we could use the `cartLinesRemove` mutation.
       */
      const lineId = formData.get('lineId');
      invariant(lineId, 'Missing lineId');
      invariant(cartId, 'Missing cartId');
      await updateLineItem({
        cartId,
        lineItem: {id: lineId, quantity: 0},
        params,
      });
      return json({cart});
    }

    default: {
      throw new Error(`Cart intent ${intent} not supported`);
    }
  }
};

export default function Cart() {
  return <h1>Todo: Build a cart here</h1>;
}
