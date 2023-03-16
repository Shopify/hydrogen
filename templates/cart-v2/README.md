# Cart POC

## Public API

1. Request the cart in the root.tsx file

```tsx
export async function loader({context}: LoaderArgs) {
  return defer({cart: context.cart.get()});
}
```

2. Add a cart route with the following action

```tsx
// routes/cart.tsx
export async function action({request, context}: ActionArgs) {
  const [cart, headers, status] = await context.cart.perform(request);

  return json({cart}, {headers, status});
}
```

3. Add your UI using the `<CartAction />` component and `useCart()` hook

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
              {() => <button>-</button>}
            </CartAction>
            <span>{quantity}</span>
            <CartAction
              inputs={[{...item, quantity: quantity + 1}]}
              action="LINES_UPDATE"
            >
              {() => <button>+</button>}
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
        {() => <button>Add to cart</button>}
      </CartAction>
    </>
  );
}
```

## Internals

All the code to provide the above API is located in `lib/cart`.
