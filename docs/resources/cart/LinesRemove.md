# LinesRemove

The `LinesRemove` cart resource is a full-stack component that provides a set of utilities to remove line(s) from the cart. It also provides a set of hooks to help you handle optimistic and pending UI.

## `LinesRemoveForm`

A Remix `fetcher.Form` that removes a set of line(s) from the cart. This form mutates the cart via the [cartLinesRemove](https://shopify.dev/api/storefront/2022-10/mutations/cartLinesRemove) mutation and provides
`error`, `state` and `event` instrumentation for analytics.

| Prop         | Type                                                             | Description                                                                    |
| :----------- | :--------------------------------------------------------------- | :----------------------------------------------------------------------------- |
| `lineIds`    | `[ID!]!`                                                         | `line ids to remove from the cart`                                             |
| `onSuccess?` | `(event) => void`                                                | `A callback that runs after every successful event`                            |
| `children`   | `({ state: 'idle' or 'submitting' or 'loading'; error: string})` | `A render prop that provides the state and errors for the current submission.` |

Basic use:

```jsx
function RemoveFromCart({lindeIds}) {
  return (
    <LinesRemoveForm lineIds={lindeIds}>
      {(state, error) => <button>Remove</button>}
    </LinesRemoveForm>
  );
}
```

Advanced use:

```jsx
// Advanced example
function RemoveFromCart({lindeIds}) {
  return (
    <LinesRemoveForm
      lineIds={lindeIds}
      onSuccess={(event) => {
        navigator.sendBeacon('/events', JSON.stringify(event))
      }}
    >
      {(state, error) => (
        <button>{state === 'idle' ? 'Remove' : 'Removing'}</button>
        {error ? <p>{error}</p>}
      )}
    </LinesRemoveForm>
  )
}
```

## `useLinesRemove`

This hook provides a programmatic way to remove line(s) from the cart;

Hook signature

```jsx
function onSuccess(event) {
  console.log('lines removed');
}

const {linesRemove, linesRemoving, linesRemoveFetcher} =
  useLinesRemove(onSuccess);
```

| Action               | Description                                                                                                |
| :------------------- | :--------------------------------------------------------------------------------------------------------- |
| `linesRemove`        | A utility that submits the lines remove mutation via fetcher.submit()                                      |
| `linesRemoving`      | The lines being submitted. If the fetcher is idle it will be null. Useful for handling optimistic updates. |
| `linesRemoveFetcher` | The Remix `fetcher` handling the current form submission                                                   |

| Prop         | Type              | Description                                         |
| :----------- | :---------------- | :-------------------------------------------------- |
| `onSuccess?` | `(event) => void` | `A callback that runs after every successful event` |

Example use

```jsx
// A hook that removes a free gift variant from the cart, if there are less than 3 items in the cart
function useRemoveFreeGift({cart}) {
  const {linesRemove, linesRemoving} = useLinesRemove();
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

## `useOptimisticLineRemove`

A utility hook to easily implement optimistic UI when a specific line is being removed.

Hook signature

```jsx
const {optimisticLineRemove, linesRemoving} = useOptimisticLineRemove(lines);
```

| Action                 | Description                                                                                                |
| :--------------------- | :--------------------------------------------------------------------------------------------------------- |
| `optimisticLineRemove` | A boolean indicating if the line is being removed                                                          |
| `linesRemoving`        | The lines being submitted. If the fetcher is idle it will be null. Useful for handling optimistic updates. |

Example use

```jsx
function CartLineItem({line}) {
  const {optimisticLineRemove} = useOptimisticLineRemove(line);
  const {id: lineId, merchandise} = line;

  return (
    <li
      key={lineId}
      // Optimistically hide the line while its being removed.
      // It will be automatically removed when the cart lines are updated
      className={optimisticLineRemove ? 'hidden' : ''}
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

## `useOptimisticLinesRemove`

A utility hook to easily implement optimistic UI when a any cart line is being removed.

Hook signature

```jsx
const {optimisticLastLineRemove, linesRemoving} =
  useOptimisticLinesRemove(lines);
```

| Action                     | Description                                                                                                |
| :------------------------- | :--------------------------------------------------------------------------------------------------------- |
| `optimisticLastLineRemove` | A boolean indicating that the last line in cart is being removed                                           |
| `linesRemoving`            | The lines being submitted. If the fetcher is idle it will be null. Useful for handling optimistic updates. |

Example use

```jsx
function Cart({cart}) {
  const {lines} = cart;
  const {optimisticLastLineRemove} = useOptimisticLinesRemove(lines);

  // optimistically show an empty cart if removing the last line
  const cartEmpty = lines.length === 0 || optimisticLastLineRemove;

  return (
    <div>
      {cartEmpty
        ? <CartEmpty>
        : <CartLines lines={lines}>
      }
    </div>
  );
}
```
