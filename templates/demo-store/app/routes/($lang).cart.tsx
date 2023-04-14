import {CartLoading, Cart} from '~/components';
import {Await, useMatches} from '@remix-run/react';
import {Suspense} from 'react';
import invariant from 'tiny-invariant';
import {
  json,
  type ActionArgs,
  type AppLoadContext,
} from '@shopify/remix-oxygen';
import type {
  Cart as CartType,
  CartInput,
  CartLineInput,
  CartLineUpdateInput,
  CartUserError,
  UserError,
  CartBuyerIdentityInput,
} from '@shopify/hydrogen/storefront-api-types';
import {isLocalPath, getCartId} from '~/lib/utils';
import {CartFormInput, CartFormInputAction} from '@shopify/hydrogen';

export async function action({request, context}: ActionArgs) {
  const {session, storefront, cart} = context;
  const headers = new Headers();
  let cartId = getCartId(request);

  const [formData, customerAccessToken] = await Promise.all([
    request.formData(),
    session.get('customerAccessToken'),
  ]);

  const cartFormInput = formData.has('cartFormInput')
    ? (JSON.parse(String(formData.get('cartFormInput'))) as CartFormInput)
    : ({} as CartFormInput);
  const {action: cartAction, ...restOfInput} = cartFormInput;
  invariant(cartAction, 'No cartAction defined');

  const countryCode = formData.get('countryCode')
    ? (formData.get('countryCode') as CartBuyerIdentityInput['countryCode'])
    : null;

  let status = 200;
  let result: {
    cart: CartType;
    errors?: CartUserError[] | UserError[];
  };

  switch (cartAction) {
    case CartFormInputAction.CartLinesAdd:
      result = await cart.addLine(restOfInput);
      break;
    case CartFormInputAction.CartLinesUpdate:
      result = await cart.updateLines(restOfInput);
      break;
    case CartFormInputAction.CartLinesRemove:
      result = await cart.removeLines(restOfInput);
      break;
    case CartFormInputAction.CartDiscountCodesUpdate:
      const formDiscountCode = formData.get('discountCode');
      const discountCodes = (
        formDiscountCode ? [formDiscountCode] : ['']
      ) as string[];
      result = await cart.updateDiscountCodes({discountCodes});
      break;
    case CartFormInputAction.CartBuyerIdentityUpdate:
      result = await cart.updateBuyerIdentity(restOfInput);
      break;
    default:
      invariant(false, `${cartAction} cart action is not defined`);
  }

  console.log(`${cartAction} result`, result);

  /**
   * The Cart ID may change after each mutation. We need to update it each time in the session.
   */
  cartId = result.cart.id;
  headers.append('Set-Cookie', `cart=${cartId.split('/').pop()}`);

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
