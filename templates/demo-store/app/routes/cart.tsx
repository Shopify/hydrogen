import {CartLoading, Cart} from '~/components';
import {Await, useMatches} from '@remix-run/react';
import {Suspense} from 'react';
import invariant from 'tiny-invariant';
import {type ActionArgs, json} from '@shopify/hydrogen-remix';
import type {
  CartLineInput,
  CartBuyerIdentityInput,
} from '@shopify/hydrogen-react/storefront-api-types';
import {cartCreate, cartAdd} from '~/data';

type CartAction = 'ADD_TO_CART' | 'REMOVE_FROM_CART';

export async function action({request, context}: ActionArgs) {
  const {session, storefront} = context;
  const headers = new Headers();

  const [formData, cartId] = await Promise.all([
    request.formData(),
    session.get('cartId'),
  ]);

  const cartAction = formData.get('cartAction') as CartAction;
  invariant(cartAction, 'No cartAction defined');

  const lines = formData.get('lines')
    ? (JSON.parse(String(formData.get('lines'))) as CartLineInput[])
    : ([] as CartLineInput[]);
  invariant(lines.length, 'No lines to add');

  const countryCode = formData.get('countryCode')
    ? (formData.get('countryCode') as CartBuyerIdentityInput['countryCode'])
    : null;

  switch (cartAction) {
    case 'ADD_TO_CART':
      //! Flow A — no previous cart, create and add line(s)
      if (!cartId) {
        const {cart, errors} = await cartCreate({
          input: countryCode ? {lines, buyerIdentity: {countryCode}} : {lines},
          storefront,
        });

        // cart created - we only need a Set-Cookie header if we're creating
        session.set('cartId', cart.id);
        headers.set('Set-Cookie', await session.commit());

        return json({cart, errors}, {headers});
      }

      //! Flow B — add line(s) to existing cart
      const {cart, errors} = await cartAdd({
        cartId,
        lines,
        storefront,
      });

      return json({cart, errors}, {headers});
      break;
  }
  invariant(false, `${cartAction} action is not defined`);
}

export default function CartRoute() {
  const [root] = useMatches();
  // @todo: finish on a separate PR
  return (
    <div className="grid w-full gap-8 p-6 py-8 md:p-8 lg:p-12 justify-items-start">
      <Suspense fallback={<CartLoading />}>
        <Await resolve={root.data?.cart}>
          {(cart) => <Cart layout="page" cart={cart} />}
        </Await>
      </Suspense>
    </div>
  );
}
