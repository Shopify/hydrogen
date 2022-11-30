# CartLinesRemove

The `CartLinesRemove` cart resource is a full-stack component that provides a set of utilities to remove line(s) from the cart. It also provides a set of hooks to help you handle optimistic and pending UI.

## `CartLinesRemoveForm`

A Remix `fetcher.Form` that removes a set of line(s) from the cart. This form mutates the cart via the [cartLinesRemove](https://shopify.dev/api/storefront/2022-10/mutations/cartLinesRemove) mutation and provides
`errors`, `state` and `event` instrumentation for analytics.

| Prop         | Type                                                                   | Description                                                                    |
| :----------- | :--------------------------------------------------------------------- | :----------------------------------------------------------------------------- |
| `lineIds`    | `[ID!]!`                                                               | `line ids to remove from the cart`                                             |
| `onSuccess?` | `(event) => void`                                                      | `A callback that runs after every successful event`                            |
| `children`   | `({ state: 'idle' or 'submitting' or 'loading'; errors: UserError[]})` | `A render prop that provides the state and errors for the current submission.` |

Basic use:

```jsx
function RemoveFromCart({lindeIds}) {
  return (
    <CartLinesRemoveForm lineIds={lindeIds}>
      {(state, error) => <button>Remove</button>}
    </CartLinesRemoveForm>
  );
}
```

Advanced use:

```jsx
// Advanced example
function RemoveFromCart({lindeIds}) {
  return (
    <CartLinesRemoveForm
      lineIds={lindeIds}
      onSuccess={(event) => {
        navigator.sendBeacon('/events', JSON.stringify(event))
      }}
    >
      {(state, error) => (
        <button>{state === 'idle' ? 'Remove' : 'Removing'}</button>
        {errors ? <p>{errors[0].message}</p>}
      )}
    </CartLinesRemoveForm>
  )
}
```

## `useCartLinesRemove`

This hook provides a programmatic way to remove line(s) from the cart;

Hook signature

```jsx
function onSuccess(event) {
  console.log('lines removed');
}

const {cartLinesRemove, fetcher} = useLinesRemove(onSuccess);
```

| Action            | Description                                                           |
| :---------------- | :-------------------------------------------------------------------- |
| `cartLinesRemove` | A utility that submits the lines remove mutation via fetcher.submit() |
| `fetcher`         | The Remix `fetcher` handling the current form submission              |

| Prop         | Type              | Description                                         |
| :----------- | :---------------- | :-------------------------------------------------- |
| `onSuccess?` | `(event) => void` | `A callback that runs after every successful event` |

Example use

```jsx
// A hook that removes a free gift variant from the cart, if there are less than 3 items in the cart
function useRemoveFreeGift({cart}) {
  const {linesRemove} = useLinesRemove();
  const {linesRemoving} = useLinesRemoving();
  const freeGiftLineId = cart.lines.filter;
  const shouldRemoveGift =
    !linesRemoving && freeGiftLineId && cart.lines.edges.length < 3;

  useEffect(() => {
    if (!shouldRemoveGift) return;
    linesRemove({
      lineIds: [freeGiftLineId],
    });
  }, [shouldRemoveGift, freeGiftLineId]);
}
```

## `useCartLinesRemoving`

A utility hook to retrieve the line(s) being removed

Hook signature

```jsx
const {linesRemoving, fetcher} = useLinesRemoving();
```

| Action          | Description                                                                                              |
| :-------------- | :------------------------------------------------------------------------------------------------------- |
| `linesRemoving` | The lines being removed. If the fetcher is idle it will be null. Useful for handling optimistic updates. |
| `fetcher`       | The Remix `fetcher` handling the current form submission                                                 |

Example use

```jsx
function Cart({cart}) {
  const {lines} = cart;
  const linesCount = cart?.lines?.edges?.length || 0;
  const {linesRemoving} = useCartLinesRemoving();
  const removingLastLine = Boolean(linesCount === 1 && linesRemoving.length);

  // optimistically show an empty cart if removing the last line or empty
  const cartEmpty = lines.length === 0 || removingLastLine;

  return (
    <div>
      <CartEmpty hidden={!cartEmpty} />
      <CartLines lines={lines}>
    </div>
  );
}
```

## `useCartLineRemoving`

A utility hook to easily implement optimistic UI when a specific line is being removed.

Hook signature

```jsx
const {lineRemoving, linesRemoving} = useCartLineRemoving(line);
```

| Action          | Description                                                                                              |
| :-------------- | :------------------------------------------------------------------------------------------------------- |
| `lineRemoving`  | A boolean indicating if the line is being removed                                                        |
| `linesRemoving` | The lines being removed. If the fetcher is idle it will be null. Useful for handling optimistic updates. |

Example use

```jsx
function CartLineItem({line}) {
  const {lineRemoving} = useCartLineRemoving(line);
  const {id: lineId, merchandise} = line;

  return (
    <li
      key={lineId}
      // Optimistically hide the line while its being removed.
      // It will be automatically removed when the cart lines are updated
      className={lineRemoving ? 'hidden' : ''}
    >
      <h4>{{merchandise.product.title}}</h4>
      <img
        width={112}
        height={112}
        src={merchandise.image.url}
        className="object-cover object-center w-24 h-24 border rounded md:w-28 md:h-28"
        alt={merchandise.title}
      />
      ...
    </li>
  );
}
```

## cartLinesRemove

A mutation helper to remove line(s) from the cart

| Action    | Description                        |
| :-------- | :--------------------------------- |
| `cartId`  | The id of the cart being mutated   |
| `context` | The action/loader hydrogen context |
| `lineIds` | Cart['id'][] line ids to remove    |

Example use:

```jsx
export async function action({request, context}) {
  const {session} = context;
  const cartId = await session.get('cartId');
  const lineIds = formData.get('lineIds')
    ? JSON.parse(formData.get('lineIds'))
    : [];

  // remove cart lines by ids
  const {cart, errors} = await cartLinesRemove({
    cartId,
    lineIds,
    context,
  });

  return json({cart});
}
```
