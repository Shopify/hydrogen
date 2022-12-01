# CartLinesAdd

The `CartLinesAdd` cart resource is a full-stack component that provides a set of utilities to add line(s) to the cart. It also provides a set of hooks to help you handle optimistic and pending UI.

## `CartLinesAddForm`

A Remix `fetcher.Form` that adds a set of line(s) to the cart. This form mutates the cart via the [cartLinesAdd](https://shopify.dev/api/storefront/2022-10/mutations/cartLinesAdd) mutation and provides
`errors`, `state` and `event` instrumentation for analytics.

| Prop         | Type                                                                   | Description                                                                    |
| ------------ | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `lines`      | `{quantity, variant}[]`                                                | `lines items to add to the cart`                                               |
| `onSuccess?` | `(event) => void`                                                      | `A callback that runs after every successful event`                            |
| `children`   | `({ state: 'idle' or 'submitting' or 'loading'; errors: UserError[]})` | `A render prop that provides the state and errors for the current submission.` |

Basic use:

```jsx
function AddToCartButton({selectedVariant, quantity}) {
  return (
    <CartLinesAddForm
      lines={[
        {
          merchandiseId: selectedVariant.id,
          quantity,
        },
      ]}
    >
      {() => <button>Add to Cart</button>}
    </CartLinesAddForm>
  );
}
```

Advanced use:

```jsx
// Advanced example
function AddToCartButton({selectedVariant, quantity}) {
  const line = {
    merchandiseId: selectedVariant.id,
    quantity,
  }
  // create an optimistic CartLine for the adding variant and quantity
  const optimisticLine = variantToLine({
    quantity,
    variant: selectedVariant
  })

  return (
    <CartLinesAddForm
      lines={[line]}
      optimisticLines={[optimisticLine]}
      onSuccess={(event) => {
        navigator.sendBeacon('/events', JSON.stringify(event))
      }}
    >
      {(state, errors) => (
        <button>{state === 'idle' ? 'Add to Bag' : 'Adding to Bag'}</button>
        {errors ? <p>{error[0].message}</p>}
      )}
    </CartLinesAddForm>
  )
}
```

## `useCartLinesAdd`

This hook provides a programmatic way to add line(s) to the cart;

Hook signature

```jsx
function onSuccess(event) {
  console.log('lines added');
}

const {cartLinesAdd, fetcher} = useCartLinesAdd(onSuccess);
```

| Action         | Description                                                        |
| :------------- | :----------------------------------------------------------------- |
| `cartLinesAdd` | A utility that submits the lines add mutation via fetcher.submit() |
| `fetcher`      | The Remix `fetcher` handling the current form submission           |

| Prop         | Type              | Description                                         |
| :----------- | :---------------- | :-------------------------------------------------- |
| `onSuccess?` | `(event) => void` | `A callback that runs after every successful event` |

Example use: programmatic add to cart

```jsx
// A hook that programmatically adds a free gift variant to the cart,
// if there are 3 or more items in the cart
function useAddFreeGift({cart}) {
  const {cartLinesAdd} = useCartLinesAdd();
  const giftInCart = cart.lines.filter...
  const freeGiftProductVariant = {...}
  const shouldAddGift = !linesAdding && !giftInCart && cart.lines.edges.length >= 3;

  useEffect(() => {
    if (!shouldAddGift) return;
    cartLinesAdd({
      lines: [{
        quantity: 1,
        variant: freeGiftProductVariant
      }]
    })
  }, [shouldAddGift, freeGiftProductVariant])
}
```

## `useCartLinesAdding`

This utility hook provides the line(s) currently being added

Hook signature

```jsx
const {linesAdding, fetcher} = useCartLinesAdding();
```

| Action        | Description                                                        |
| :------------ | :----------------------------------------------------------------- |
| `linesAdding` | A utility that submits the lines add mutation via fetcher.submit() |
| `fetcher`     | The Remix `fetcher` handling the current form submission           |

Example use: reacting to add to cart event

```jsx
// Toggle a cart drawer when adding to cart
function Layout() {
  const {linesAdding} = useCartLinesAdding();
  const [drawer, setDrawer] = useState(false);

  useEffect(() => {
    if (drawer || !linesAdding?.length) return;
    setDrawer(true);
  }, [linesAdding, drawer, setDrawer]);

  return (
    <div>
      <Header />
      <CartDrawer className={drawer ? '' : 'hidden'} setDrawer={setDrawer} />
    </div>
  );
}
```

## `useOptimisticCartLinesAdding`

A utility hook to easily retrieve optimistic lines being added. It returns all optimistic lines as well as the new lines not currently in the cart.

Hook signature

```jsx
const {optimisticLines, optimisticLinesNew} =
  useOptimisticCartLinesAdding(lines);
```

| Action               | Description                                                    |
| :------------------- | :------------------------------------------------------------- |
| `optimisticLines`    | All optimistic cart line(s) currently being added to the cart  |
| `optimisticLinesNew` | Only the new optimistic cart lines(s) no currently in the cart |

Example use

```jsx
function CartLines({lines}) {
  // retrieve optimistic lines not currently in the cart
  const {optimisticLinesNew} = useOptimisticCartLinesAdding(lines);

  return (
    <ul className="grid gap-6 md:gap-10">
      {/* Optimistic cart lines will be replaced with actual lines when ready */}
      {optimisticLinesNew?.map((line) => (
        <CartLineItem key={line.merchandise.id} line={line} />
      ))}
      {/* car lines already added */}
      {lines.map((line) => (
        <CartLineItem key={line.merchandise.id} line={line} />;
      ))}
    </ul>
  );
}
```

## cartLinesAdd

A mutation helper to add line(s) to the cart

| Action    | Description                        |
| :-------- | :--------------------------------- |
| `cartId`  | The id of the cart being mutated   |
| `context` | The action/loader hydrogen context |
| `lines`   | CartLineInput[] line(s) to add     |

Example use:

```jsx
export async function action({request, context}) {
  const {session} = context;
  const cartId = await session.getCartId();
  const lines = formData.get('lines') ? JSON.parse(formData.get('lines')) : [];

  // add cart lines to the cart
  const {cart, errors} = await cartLinesAdd({
    cartId,
    lines,
    context,
  });

  return json({cart});
}
```
