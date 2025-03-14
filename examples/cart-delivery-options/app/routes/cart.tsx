import type { DeliveryGroupFragment, } from 'storefrontapi.generated'
import type { CartSelectableAddressInput, CartSelectableAddressUpdateInput } from '@shopify/hydrogen/storefront-api-types';
import { type MetaFunction, useLoaderData } from '@remix-run/react';
import type { CartQueryDataReturn } from '@shopify/hydrogen';
import { CartForm } from '@shopify/hydrogen';
import { data, type LoaderFunctionArgs, type ActionFunctionArgs, type HeadersFunction } from '@shopify/remix-oxygen';
import { CartMain } from '~/components/Cart';

export const meta: MetaFunction = () => {
  return [{ title: `Hydrogen | Cart` }];
};

export const headers: HeadersFunction = ({ actionHeaders }) => actionHeaders;

export async function action({ request, context }: ActionFunctionArgs) {
  const { cart, storefront } = context;

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
    // @ts-ignore
    case "CartDeliveryAddressesAdd": {
      const cartId = cart.getCartId();
      if (!cartId) {
        console.warn('Cart not found')
        break;
      }
      result = await cartDeliveryAddressesAdd({ address: inputs, cartId, storefront });
      console.log("result", JSON.stringify(result))
      break;
    }
    // @ts-ignore
    case "CartDeliveryAddressesUpdate": {
      const cartId = cart.getCartId();
      if (!cartId) {
        console.warn('Cart not found')
        break;
      }
      console.log('inputs', JSON.stringify(inputs, null, 2))

      if (typeof inputs.selected === 'string') {
        inputs.selected = inputs.selected === 'on'
      }
      // @ts-ignore
      result = await cartDeliveryAddressesUpdate({ cartId, storefront, ...inputs });
      console.log("result", JSON.stringify(result))
      break;
    }
    // @ts-ignore
    case "CartDeliveryAddressesRemove": {
      const cartId = cart.getCartId();
      if (!cartId) {
        console.warn('Cart not found')
        break;
      }
      // @ts-ignore
      if (!inputs?.addressIds) {
        console.warn('No addressIds provided')
        break;
      }
      result = await cartDeliveryAddressesRemove({ addressIds: inputs.addressIds, cartId, storefront });
      console.log("result", JSON.stringify(result))
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

// TODO: Improve to receive a SFAPI input type instead of a generic object
async function cartDeliveryAddressesAdd({
  address,
  selected = true,
  oneTimeUse = false,
  copyFromCustomerAddressId,
  cartId,
  storefront
}: {
  address: DeliveryGroupFragment['deliveryAddress'] & { selected?: boolean };
  oneTimeUse?: boolean;
  selected?: boolean;
  copyFromCustomerAddressId?: string | undefined;
  cartId: string
  storefront: LoaderFunctionArgs['context']['storefront']
}) {
  const { selected: inputSelected, ...inputAddress } = address;
  const addresses: Array<CartSelectableAddressInput> = [
    {
      address: {
        deliveryAddress: inputAddress,
      },
      oneTimeUse,
      selected: typeof inputSelected === 'string' ? Boolean(inputSelected) : selected,
      validationStrategy: 'COUNTRY_CODE_ONLY' // STRICT
    }
  ]
  if (copyFromCustomerAddressId) {
    addresses[0].address.copyFromCustomerAddressId = copyFromCustomerAddressId;
  }
  const MUTATION = `#graphql
    mutation cartDeliveryAddresses($addresses: [CartSelectableAddressInput!]!, $cartId: ID!) {
    cartDeliveryAddressesAdd(addresses: $addresses, cartId: $cartId) {
      cart {
        id
      }
      userErrors {
        field
        message
      }
      warnings {
        message
      }
    }
  }
  `
  return await storefront.mutate(
    MUTATION, {
    variables: { addresses, cartId },
    storefrontApiVersion: '2025-01'
  })
}

async function cartDeliveryAddressesRemove({
  addressIds = [],
  cartId,
  storefront
}: {
  addressIds: Array<DeliveryGroupFragment['deliveryAddress']['id']>;
  cartId: string
  storefront: LoaderFunctionArgs['context']['storefront']
}) {
  const MUTATION = `#graphql
  mutation cartDeliveryAddressesRemove($addressIds: [ID!]!, $cartId: ID!) {
    cartDeliveryAddressesRemove(addressIds: $addressIds, cartId: $cartId) {
      cart {
        id
      }
      userErrors {
        code
        field
        message
      }
      warnings {
        code
        message
        target
      }
    }
  }`
  return await storefront.mutate(
    MUTATION, {
    variables: { addressIds, cartId },
    storefrontApiVersion: '2025-01'
  })
}

async function cartDeliveryAddressesUpdate({
  id,
  address,
  oneTimeUse = true,
  selected = false,
  cartId,
  storefront
}: CartSelectableAddressUpdateInput & {
  cartId: string | undefined;
  storefront: LoaderFunctionArgs['context']['storefront']
}) {
  const addresses: Array<CartSelectableAddressUpdateInput> = [
    {
      id,
      address,
      oneTimeUse,
      selected,
      validationStrategy: 'COUNTRY_CODE_ONLY' // STRICT
    }
  ];
  const MUTATION = `#graphql
    mutation cartDeliveryAddressesUpdate($addresses: [CartSelectableAddressUpdateInput!]!, $cartId: ID!) {
      cartDeliveryAddressesUpdate(addresses: $addresses, cartId: $cartId) {
        cart {
          id
        }
        userErrors {
          code
          field
          message
        }
        warnings {
          code
          message
          target
        }
      }
    }
  `;
  return await storefront.mutate(
    MUTATION, {
    variables: { addresses, cartId },
    storefrontApiVersion: '2025-01'
  })
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
