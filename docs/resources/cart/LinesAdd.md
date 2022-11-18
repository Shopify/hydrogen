# LinesAdd

The `LinesAdd` cart resource is a full-stack component that provides a set of utilities to add line(s) to the cart. It also provides a set of hooks to help you handle optimistic and pending UI.

## `LinesAddForm`

A Remix `fetcher.Form` that adds a set of line(s) to the cart. This form mutates the cart via the [cartLinesAdd](https://shopify.dev/api/storefront/2022-10/mutations/cartLinesAdd) mutation and provides
`error`, `state` and `event` instrumentation for analytics.

| Prop         | Type                                                             | Description                                                                    |
| ------------ | ---------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `lines`      | `{quantity, variant}[]`                                          | `lines items to add to the cart`                                               |
| `onSuccess?` | `(event) => void`                                                | `A callback that runs after every successful event`                            |
| `children`   | `({ state: 'idle' or 'submitting' or 'loading'; error: string})` | `A render prop that provides the state and errors for the current submission.` |

Basic use:

```jsx
function AddToCartButton({selectedVariant, quantity}) {
  return (
    <LinesAddForm
      lines={[
        {
          variant: selectedVariant,
          quantity,
        },
      ]}
    >
      {(state, error) => <button>Add to Cart</button>}
    </LinesAddForm>
  );
}
```

Advanced use:

```jsx
// Advanced example
function AddToCartButton({selectedVariant, quantity}) {
  return (
    <LinesAddForm
      lines={[
        {
          variant: selectedVariant,
          quantity,
        },
      ]}
      onSuccess={(event) => {
        navigator.sendBeacon('/events', JSON.stringify(event))
      }}
    >
      {(state, error) => (
        <button>{state === 'idle' ? 'Add to Bag' : 'Adding to Bag'}</button>
        {error ? <p>{error}</p>}
      )}
    </LinesAddForm>
  )
}
```

## `useLinesAdd`

This hook provides a programmatic way to add line(s) to the cart;

Hook signature

```jsx
function onSuccess(event) {
  console.log('lines added');
}

const {linesAdd, linesAdding, linesAddingFetcher} = useLinesAdd(onSuccess);
```

| Action               | Description                                                                                                |
| :------------------- | :--------------------------------------------------------------------------------------------------------- |
| `linesAdd`           | A utility that submits the lines add mutation via fetcher.submit()                                         |
| `linesAdding`        | The lines being submitted. If the fetcher is idle it will be null. Useful for handling optimistic updates. |
| `linesAddingFetcher` | The Remix `fetcher` handling the current form submission                                                   |

| Prop         | Type              | Description                                         |
| :----------- | :---------------- | :-------------------------------------------------- |
| `onSuccess?` | `(event) => void` | `A callback that runs after every successful event` |

Example use: reacting to add to cart event

```jsx
// Toggle a cart drawer when adding to cart
function Layout() {
  const {linesAdding} = useLinesAdd();
  const [drawer, setDrawer] = useState(false);

  useEffect(() => {
    if (drawer || !linesAdding) return;
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

Example use: programmatic add to cart

```jsx
// A hook that programmatically adds a free gift variant to the cart,
// if there are 3 or more items in the cart
function useAddFreeGift({cart}) {
  const {linesAdd, linesAdding} = useLinesAdd();
  const giftInCart = cart.lines...
  const freeGiftProductVariant = ...
  const shouldAddGift = !linesAdding && !giftInCart && cart.lines.edges.length >= 3;

  useEffect(() => {
    if (!shouldAddGift) return;
    linesAdd({
      lines: [{
        quantity: 1,
        variant: freeGiftProductVariant
      }]
    })
  }, [shouldAddGift, freeGiftProductVariant])
}
```

## `useOptimisticLinesAdd`

A utility hook to easily implement optimistic UI for lines being added.

Hook signature

```jsx
const {optimisticLinesAdd, linesAdding} = useOptimisticLinesAdd(lines);
```

| Action               | Description                                                                                                |
| :------------------- | :--------------------------------------------------------------------------------------------------------- |
| `optimisticLinesAdd` | A set of optimistic cart line(s) currently being added to the cart                                         |
| `linesAdding`        | The lines being submitted. If the fetcher is idle it will be null. Useful for handling optimistic updates. |

Example use

```jsx
function CartLines({lines}) {
  const {optimisticLinesAdd} = useOptimisticLinesAdd(lines);

  return (
    <ul className="grid gap-6 md:gap-10">
      {/* Optimistic cart lines will be replaced with actual lines when ready */}
      {optimisticLinesAdd?.length
        ? optimisticLinesAdd.map((line) => (
            <CartLineItem key={line.merchandise.id} line={line} />
          ))
        : null}
      {/* car lines already added */}
      {lines.map((line) => {
        return <CartLineItem key={merchandise.id} line={line} />;
      })}
    </ul>
  );
}
```
