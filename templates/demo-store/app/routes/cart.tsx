import {CartLoading, Cart} from '~/components';
import {Await, useMatches} from '@remix-run/react';
import {Suspense} from 'react';
import invariant from 'tiny-invariant';
import {type ActionArgs, json} from '@shopify/hydrogen-remix';
import type {
  CartLineInput,
  CartBuyerIdentityInput,
  Cart as CartType,
  UserError,
  CartUserError,
} from '@shopify/hydrogen-react/storefront-api-types';
import {cartCreate, cartAdd, cartDiscountCodesUpdate, cartRemove} from '~/data';
import {isLocalPath} from '~/lib/utils';

type CartAction = 'ADD_TO_CART' | 'REMOVE_FROM_CART' | 'UPDATE_DISCOUNT';

export async function action({request, context}: ActionArgs) {
  const {session, storefront} = context;
  const headers = new Headers();

  const [formData, cartId] = await Promise.all([
    request.formData(),
    session.get('cartId'),
  ]);

  const cartAction = formData.get('cartAction') as CartAction;
  invariant(cartAction, 'No cartAction defined');

  const countryCode = formData.get('countryCode')
    ? (formData.get('countryCode') as CartBuyerIdentityInput['countryCode'])
    : null;

  let result: {
    cart: CartType;
    errors?: CartUserError[] | UserError[];
  };

  switch (cartAction) {
    case 'ADD_TO_CART':
      const lines = formData.get('lines')
        ? (JSON.parse(String(formData.get('lines'))) as CartLineInput[])
        : ([] as CartLineInput[]);
      invariant(lines.length, 'No lines to add');

      //! Flow A — no previous cart, create and add line(s)
      if (!cartId) {
        result = await cartCreate({
          input: countryCode ? {lines, buyerIdentity: {countryCode}} : {lines},
          storefront,
        });

        // cart created - we only need a Set-Cookie header if we're creating
        session.set('cartId', result.cart.id);
        headers.set('Set-Cookie', await session.commit());
      } else {
        //! Flow B — add line(s) to existing cart
        result = await cartAdd({
          cartId,
          lines,
          storefront,
        });
      }
      break;
    case 'REMOVE_FROM_CART':
      const lineIds = formData.get('linesIds')
        ? (JSON.parse(String(formData.get('linesIds'))) as CartType['id'][])
        : ([] as CartType['id'][]);
      invariant(lineIds.length, 'No lines to remove');

      result = await cartRemove({
        cartId,
        lineIds,
        storefront,
      });

      break;
    case 'UPDATE_DISCOUNT':
      invariant(cartId, 'Missing cartId');

      const formDiscountCodes = formData.getAll('discountCodes');
      invariant(formDiscountCodes, 'Missing discountCodes');
      const discountCodes = (formDiscountCodes || []) as string[];

      result = await cartDiscountCodesUpdate({
        cartId,
        discountCodes,
        storefront,
      });
      break;
    default:
      invariant(false, `${cartAction} action is not defined`);
  }

  const redirectTo = formData.get('redirectTo') ?? null;
  if (typeof redirectTo === 'string' && isLocalPath(redirectTo)) {
    headers.set('Location', redirectTo);
  }

  const {cart, errors} = result;
  return json({cart, errors}, {headers});
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
