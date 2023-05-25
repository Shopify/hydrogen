import {type ActionArgs, json} from '@remix-run/server-runtime';
import {
  type CartQueryData,
  type CartHandlerReturnBase,
  CartForm,
} from '@shopify/hydrogen';
import invariant from 'tiny-invariant';

export default function Cart() {
  return (
    <CartForm
      action={CartForm.ACTIONS.LinesUpdate}
      inputs={{
        lines: [
          {
            id: 'gid://shopify/CartLine/123456789',
            quantity: 3,
          },
        ],
        other: 'data',
      }}
    >
      <button>Quantity up</button>
    </CartForm>
  );
}

export async function action({request, context}: ActionArgs) {
  const cart = context.cart as CartHandlerReturnBase;
  // cart is type CartHandlerReturnBase or CartHandlerReturnCustom
  // Declare cart type in remix.env.d.ts for interface AppLoadContext to avoid type casting
  // const {cart} = context;
  const headers = new Headers();

  const formData = await request.formData();
  const {action, inputs} = cart.getFormInput(formData);

  let status = 200;
  let result: CartQueryData;

  if (action === CartForm.ACTIONS.LinesUpdate) {
    result = await cart.updateLines(inputs.lines);
  } else {
    invariant(false, `${action} cart action is not defined`);
  }

  cart.setCartId(result.cart.id, headers);

  return json(result, {status, headers});
}
