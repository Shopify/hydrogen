import {CartLoading, Cart} from '~/components';
import {Await, useMatches} from '@remix-run/react';
import {Suspense} from 'react';
import {type ActionFunction, json} from '@shopify/hydrogen-remix';
import invariant from 'tiny-invariant';
import {updateLineItem} from '~/data';

export const action: ActionFunction = async ({request, context}) => {
  let cart;

  const formData = new URLSearchParams(await request.text());
  const intent = formData.get('intent');
  invariant(intent, 'Missing cart intent');

  // 1. Grab the cart ID from the session
  const cartId = await context.session.get('cartId');

  switch (intent) {
    case 'set-quantity': {
      const lineId = formData.get('lineId');
      invariant(lineId, 'Missing lineId');
      invariant(cartId, 'Missing cartId');
      const quantity = Number(formData.get('quantity'));
      cart = await updateLineItem(context, {
        cartId,
        lineItem: {id: lineId, quantity},
      });
      return json({cart});
    }

    default: {
      throw new Error(`Cart intent ${intent} not supported`);
    }
  }
};

export default function CartRoute() {
  const [root] = useMatches();
  // @todo: finish on a separate PR
  return (
    <div className="grid w-full gap-8 p-6 py-8 md:p-8 lg:p-12 justify-items-start">
      <Suspense fallback={<CartLoading />}>
        <Await resolve={root.data.cart}>
          {(cart) => <Cart layout="page" cart={cart} />}
        </Await>
      </Suspense>
    </div>
  );
}
