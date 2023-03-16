import {json, ActionArgs, LoaderArgs} from '@shopify/remix-oxygen';

import {Cart as CartUi} from '~/components';

export async function action({request, context}: ActionArgs) {
  const {cart} = context;
  const [result, headers, status] = await cart.perform(request);

  // What if we want to do something after line item is updated

  return json({cart: result}, {headers, status});
}

export async function loader({context}: LoaderArgs) {
  const cart = await context.cart.get();

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
