import {json, ActionArgs, LoaderArgs} from '@shopify/remix-oxygen';

import {Cart as CartUi} from '~/components';
import {CartActionInput} from '~/lib/cart/cart-logic';

export async function action({request, context}: ActionArgs) {
  const {cart, session} = context;
  const [formData, storedCartId] = await Promise.all([
    request.formData(),
    cart.id(),
  ]);

  const action = formData.get('action');
  const cartInput = formData.has('cartInput')
    ? ({
        ...JSON.parse(String(formData.get('cartInput'))),
        cartId: storedCartId,
      } as CartActionInput)
    : ({} as CartActionInput);

  console.log('+++++++++++++++++++++++++++++');
  console.log(`Performing cart ${action}`);
  console.log(cartInput);
  console.log('+++++++++++++++++++++++++++++');

  let cartResult;
  switch (action) {
    case 'LINES_ADD':
      cartResult = await cart.addLine(cartInput);
      break;
    case 'LINES_REMOVE':
      cartResult = await cart.removeLine(cartInput);
      break;
    case 'LINES_UPDATE':
      cartResult = await cart.updateLine(cartInput);
      break;
  }

  const headers = new Headers();
  let status = 200;

  if (cartResult?.errors && cartResult.errors.length > 0) {
    status = 400;
  }

  session.set('cartId', cartResult.cart.id);
  headers.set('Set-Cookie', await session.commit());

  return json({...cartResult}, {headers, status});
}

export async function loader({context}: LoaderArgs) {
  const cartId = await context.session.get('cartId');
  const cart = await context.cart.get({cartId});

  return json({cart});
}

export default function Cart() {
  return (
    <div>
      <section className="Cart Global__Section">
        <CartUi />
      </section>
    </div>
  );
}
