# Cart POC

The most basic implementation of this cart requires the following steps.

**Add the cart to the Remix context in `server.ts`.**.

```tsx diff
// server.ts
const cart = await AlphaCart.init(
  request,
  storefront,
  createCookieSessionStorage({
    cookie: {
      name: 'session',
      httpOnly: true,
      path: '/',
      sameSite: 'lax',
    },
  }),
);


const handleRequest = createRequestHandler({
  build: remixBuild,
  mode: process.env.NODE_ENV,
- getLoadContext: () => ({session, storefront, env}),
+ getLoadContext: () => ({session, storefront, cart, env}),
});

```

**Request the cart in the root.tsx file.** This data will be shared across other routes and components and can be accessed with a provided `useCart(): Cart | null` hook.

```tsx
export async function loader({context}: LoaderArgs) {
  return defer({cart: context.cart.get()});
}
```

Developers can return a partial cart if they know there are parts of the payload that are not required for their use-case.

The cart class on the context also allows for developers to override the cart fragment when it is instantiated in `server.ts` using the fourth `CartOptions` param, or in any cart operation `context.cart.linesAdd(inputs, {cartFragment})`.

**Add a `/cart` route to intercept the cart operation `POST` requests.**

```tsx
// routes/cart.tsx
export async function action({request, context}: ActionArgs) {
  const [cart, headers, status] = await context.cart.perform(request);

  return json({cart}, {headers, status});
}
```

This is the most basic action possible, but advanced users will have all the flexibility to handle errors, perform individual operations on the cart and chain logic before and after the request hits the SFAPI.

More examples to come.

**Add your UI using the `<CartAction />` component and `useCart()` hook.**

- The `useCart` hook returns the current cart state.
- The `<CartAction />` component provides a typed interface for the expected data given the SFAPI cart operation. It also takes care of adding this data to the payload and users are provided a child function with access to a [fetcher](https://remix.run/docs/en/1.14.3/hooks/use-fetcher) object. This allows them to build out a UI for submitting the action and showing pending, optimistic and/or failure states.

Here are some initial examples, more to come.

```tsx
// routes/cart.tsx

export function Cart({theme}: CartProps) {
  const cart = useCart();

  if (!cart) return <CartEmpty />;

  const flattenedLines = flattenConnection(cart.lines);

  if (flattenedLines.length === 0) return <CartEmpty />;

  return (
    <>
      <h1>Cart</h1>
      {flattenedLines.map((item) => {
        if (!item?.id) return null;

        const {id, quantity, merchandise} = item;
        const {product, price, image} = merchandise;

        if (typeof quantity === 'undefined' || !product) return null;

        const {handle, title} = product;
        return (
          <>
            <Link to={`/products/${handle}`}>{title}</Link>
            <Money data={price} className="Item__Price" />

            <CartAction
              inputs={[{...item, quantity: quantity - 1}]}
              action="LINES_UPDATE"
            >
              {() => <button type="submit">-</button>}
            </CartAction>
            <span>{quantity}</span>
            <CartAction
              inputs={[{...item, quantity: quantity + 1}]}
              action="LINES_UPDATE"
            >
              {() => <button type="submit">+</button>}
            </CartAction>

            <CartAction inputs={{lineIds: [id]}} action="LINES_REMOVE">
              {() => <button aria-label="Remove from cart">remove</button>}
            </CartAction>
          </>
        );
      })}
    </>
  );
}
```

```tsx
// routes/$productHandle.tsx
export default function Product() {
  const {product} = useLoaderData<typeof loader>();
  const {title, descriptionHtml} = product;
  const firstVariant = product.variants.nodes[0];
  const selectedVariant = product.selectedVariant ?? firstVariant;
  const lines = [
    {
      merchandiseId: selectedVariant.id,
      quantity: 1,
    },
  ];

  return (
    <>
      <h1>{title}</h1>
      <div dangerouslySetInnerHTML={{__html: descriptionHtml}} />
      <Money
        data={{
          amount: selectedVariant.price.amount,
          currencyCode: selectedVariant.price.currencyCode,
        }}
      />
      <CartAction action="LINES_ADD" inputs={lines}>
        {({state, type}) => {
          if (type === 'done') {
            return (
              <p>
                {title} added to your cart! <Link to="/cart">Checkout now</Link>
              </p>
            );
          }

          return (
            <button disabled={state === 'submitting'} type="submit">
              Add to cart
            </button>
          );
        }}
      </CartAction>
    </>
  );
}
```

## Internals

All the code to provide the above API is located in `lib/cart`.

- `cart.server.ts` contains the cart context
- `hooks.ts` contains the `useCart()` hook
- `components.ts` contains the `<CartAction /> component
- `types.ts` shared types
