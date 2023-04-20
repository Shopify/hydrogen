import {CartLoading, Cart} from '~/components';
import {Await, useMatches} from '@remix-run/react';
import {Suspense} from 'react';
import invariant from 'tiny-invariant';
import {json, type ActionArgs} from '@shopify/remix-oxygen';
import type {
  Cart as CartType,
  CartUserError,
  UserError,
} from '@shopify/hydrogen/storefront-api-types';
import {isLocalPath} from '~/lib/utils';
import {CartFormInputAction} from '@shopify/hydrogen';

export async function action({request, context}: ActionArgs) {
  const {session, cart} = context;
  const headers = new Headers();

  const [formData, customerAccessToken] = await Promise.all([
    request.formData(),
    session.get('customerAccessToken'),
  ]);

  const cartInput = cart.getFormInput(formData);
  invariant(action, 'No cartAction defined');

  let status = 200;
  let result: {
    cart: CartType;
    errors?: CartUserError[] | UserError[];
  };

  switch (cartInput.action) {
    case CartFormInputAction.CartLinesAdd:
      result = await cart.addLine(cartInput);
      break;
    case CartFormInputAction.CartLinesUpdate:
      result = await cart.updateLines(cartInput);
      break;
    case CartFormInputAction.CartLinesRemove:
      result = await cart.removeLines(cartInput);
      break;
    case CartFormInputAction.CartDiscountCodesUpdate:
      const formDiscountCode = formData.get('discountCode');
      const discountCodes = (
        formDiscountCode ? [formDiscountCode] : ['']
      ) as string[];
      result = await cart.updateDiscountCodes({
        ...cartInput,
        discountCodes,
      });
      break;
    case CartFormInputAction.CartBuyerIdentityUpdate:
      result = await cart.updateBuyerIdentity({
        ...cartInput,
        buyerIdentity: {
          ...cartInput.buyerIdentity,
          customerAccessToken,
        },
      });
      break;
    default:
      invariant(false, `${action} cart action is not defined`);
  }

  console.log(`${action} result`, result);

  /**
   * The Cart ID may change after each mutation. We need to update it each time in the session.
   */
  const cartId = result.cart.id;
  cart.setCartId(cartId, headers);

  const redirectTo = formData.get('redirectTo') ?? null;
  if (typeof redirectTo === 'string' && isLocalPath(redirectTo)) {
    status = 303;
    headers.set('Location', redirectTo);
  }

  const {cart: cartResult, errors} = result;
  return json(
    {
      cart: cartResult,
      errors,
      analytics: {
        cartId,
      },
    },
    {status, headers},
  );
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
