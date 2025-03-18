import { type MetaFunction, useLoaderData } from '@remix-run/react';
import type { CartQueryDataReturn } from '@shopify/hydrogen';
import { CartForm } from '@shopify/hydrogen';
import { CartSelectableAddressInput } from '@shopify/hydrogen-react/storefront-api-types';
import { CartSelectableAddressUpdateInput } from '@shopify/hydrogen/storefront-api-types';
import { data, type LoaderFunctionArgs, type ActionFunctionArgs, type HeadersFunction } from '@shopify/remix-oxygen';
import { CartMain } from '~/components/Cart';

export const meta: MetaFunction = () => {
  return [{ title: `Hydrogen | Cart` }];
};

export const headers: HeadersFunction = ({ actionHeaders }) => actionHeaders;

export async function action({ request, context }: ActionFunctionArgs) {
  const { cart } = context;

  const formData = await request.formData();

  const { action, inputs } = CartForm.getFormInput(formData);

  if (!action) {
    throw new Error('No action provided');
  }

  let status = 200;
  let result: CartQueryDataReturn;

  switch (action) {
    case CartForm.ACTIONS.LinesAdd:
      result = await cart.addLines(inputs.lines);
      break;
    case CartForm.ACTIONS.LinesUpdate:
      result = await cart.updateLines(inputs.lines);
      break;
    case CartForm.ACTIONS.LinesRemove:
      result = await cart.removeLines(inputs.lineIds);
      break;
    case CartForm.ACTIONS.DiscountCodesUpdate: {
      const formDiscountCode = inputs.discountCode;

      // User inputted discount code
      const discountCodes = (
        formDiscountCode ? [formDiscountCode] : []
      ) as string[];

      // Combine discount codes already applied on cart
      discountCodes.push(...inputs.discountCodes);

      result = await cart.updateDiscountCodes(discountCodes);
      break;
    }
    case CartForm.ACTIONS.GiftCardCodesUpdate: {
      const formGiftCardCode = inputs.giftCardCode;

      // User inputted gift card code
      const giftCardCodes = (
        formGiftCardCode ? [formGiftCardCode] : []
      ) as string[];

      // Combine gift card codes already applied on cart
      giftCardCodes.push(...inputs.giftCardCodes);

      result = await cart.updateGiftCardCodes(giftCardCodes);
      break;
    }
    case CartForm.ACTIONS.BuyerIdentityUpdate: {
      result = await cart.updateBuyerIdentity({
        ...inputs.buyerIdentity,
      });
      break;
    }
    case CartForm.ACTIONS.DeliveryAddressesAdd: {
      console.log('DeliveryAddressesAdd inputs', inputs)
      const { id, selected, oneTimeUse, ...deliveryAddress } = inputs
      const newDeliveryAddresses = [{
        selected: selected === 'on' ? true : false,
        oneTimeUse: oneTimeUse === 'on' ? true : false,
        address: { deliveryAddress }
      }] as CartSelectableAddressInput[]

      result = await cart.addDeliveryAddresses(newDeliveryAddresses)
      break;
    }
    case CartForm.ACTIONS.DeliveryAddressesUpdate: {
      console.log('DeliveryAddressesUpdate inputs.addresses', inputs)
      const { formatted, formartedArea, name, id, selected, oneTimeUse, ...deliveryAddress } = inputs
      const updatedDeliveryAddresses = [{
        id,
        selected: selected === 'on' ? true : false,
        oneTimeUse: oneTimeUse === 'on' ? true : false,
        address: { deliveryAddress }
      }] as CartSelectableAddressUpdateInput[]
      result = await cart.updateDeliveryAddresses(updatedDeliveryAddresses)
      break;
    }
    case CartForm.ACTIONS.DeliveryAddressesRemove: {
      console.log('DeliveryAddressesRemove inputs', inputs)
      result = await cart.removeDeliveryAddresses(inputs.addressIds)
      break;
    }
    default:
      throw new Error(`${action} cart action is not defined`);
  }

  const cartId = result?.cart?.id;
  const headers = cartId ? cart.setCartId(result.cart.id) : new Headers();
  const { cart: cartResult, errors } = result;

  const redirectTo = formData.get('redirectTo') ?? null;
  if (typeof redirectTo === 'string') {
    status = 303;
    headers.set('Location', redirectTo);
  }

  return data(
    {
      cart: cartResult,
      errors,
      analytics: {
        cartId,
      },
    },
    { status, headers },
  );
}

export async function loader({ context }: LoaderFunctionArgs) {
  const { cart } = context;
  return await cart.get();
}

export default function Cart() {
  const cart = useLoaderData<typeof loader>();

  return (
    <div className="cart">
      <h1>Cart</h1>
      <CartMain layout="page" cart={cart} />
    </div>
  );
}
