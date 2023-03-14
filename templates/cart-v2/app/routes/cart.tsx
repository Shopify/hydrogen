import {json, ActionArgs, LoaderArgs} from '@shopify/remix-oxygen';
import {useLoaderData} from '@remix-run/react';
import {useCart} from '~/lib/cart/remix';

export async function action({request, context}: ActionArgs) {
  const {cart} = context;

  const [formData] = await Promise.all([request.formData()]);

  const [result, head] = await cart.perform(request);

  return json({cart: result}, {headers: head.headers, status: head.status});
}

export async function loader({context}: LoaderArgs) {
  const {cart} = context;

  const cartResponse = await cart.get();

  return json({cart: cartResponse});
}

export default function Cart() {
  const cart = useCart();
  const {cart: cartResponse} = useLoaderData<typeof loader>();

  return (
    <div>
      <h1>Cart</h1>
      <pre>{JSON.stringify(cartResponse, null, 2)}</pre>
      <pre>{JSON.stringify(cart, null, 2)}</pre>
    </div>
  );
}
