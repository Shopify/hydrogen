import {json} from '@remix-run/server-runtime';
import {CartForm__unstable as CartForm} from '@shopify/hydrogen';
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

export async function action({request, context}) {
  const {cart} = context;
  const headers = new Headers();

  const formData = await request.formData();
  const {action, inputs} = cart.getFormInput(formData);

  let status = 200;
  let result;

  if (action === CartForm.ACTIONS.LinesUpdate) {
    result = await cart.updateLines(inputs.lines);
  } else {
    invariant(false, `${action} cart action is not defined`);
  }

  cart.setCartId(result.cart.id, headers);

  return json(result, {status, headers});
}
