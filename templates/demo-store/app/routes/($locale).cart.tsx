import {CartLoading, Cart} from '~/components';
import {Await, useMatches} from '@remix-run/react';
import {Suspense} from 'react';
import invariant from 'tiny-invariant';
import {json, type ActionArgs} from '@shopify/remix-oxygen';
import type {
  CartBuyerIdentityInput,
  CartLineInput,
  CartLineUpdateInput,
  Cart as CartType,
  CartUserError,
  MetafieldsSetUserError,
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

  const {action, cartInputs} = cart.getFormInput(formData);
  invariant(action, 'No cartAction defined');

  let status = 200;
  let result: {
    cart: CartType;
    errors?: CartUserError[] | UserError[] | MetafieldsSetUserError[];
  };

  switch (action) {
    case CartFormInputAction.CartLinesAdd:
      result = await cart.addLines(cartInputs.lines as CartLineInput[]);
      break;
    case CartFormInputAction.CartLinesUpdate:
      result = await cart.updateLines(
        cartInputs.lines as CartLineUpdateInput[],
      );
      break;
    case CartFormInputAction.CartLinesRemove:
      result = await cart.removeLines(cartInputs.lineIds as string[]);
      break;
    case CartFormInputAction.CartDiscountCodesUpdate:
      const formDiscountCode = formData.get('discountCode');
      const discountCodes = (
        formDiscountCode ? [formDiscountCode] : ['']
      ) as string[];
      result = await cart.updateDiscountCodes(discountCodes);
      break;
    case CartFormInputAction.CartBuyerIdentityUpdate:
      const buyerIdentity = cartInputs.buyerIdentity as CartBuyerIdentityInput;
      result = await cart.updateBuyerIdentity({
        ...buyerIdentity,
        customerAccessToken,
      });
      break;
    default:
      invariant(false, `${action} cart action is not defined`);
  }

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
