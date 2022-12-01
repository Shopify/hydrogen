# CartLinesUpdate

The `CartLinesUpdate` cart resource is a full-stack component that provides a set of utilities to update line(s) to the cart. It also provides a set of hooks to help you handle optimistic and pending UI.

## `CartLinesUpdateForm`

A Remix `fetcher.Form` that updates a set of line(s) to the cart. This form mutates the cart via the [cartLinesUpdate](https://shopify.dev/api/storefront/2022-10/mutations/cartLinesUpdate) mutation and provides
`errors`, `state` and `event` instrumentation for analytics.

| Prop         | Type                                                                   | Description                                                                    |
| ------------ | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `lines`      | `[CartLineUpdateInput]`                                                | `lines items to update to the cart`                                            |
| `onSuccess?` | `(event) => void`                                                      | `A callback that runs after every successful event`                            |
| `children`   | `({ state: 'idle' or 'submitting' or 'loading'; errors: UserError[]})` | `A render prop that provides the state and errors for the current submission.` |

Basic use:

```jsx
function IncreaseLineQuantity({line}) {
  const nextQuantity = Number((line.quantity + 1).toFixed(0));
  return (
    <CartLinesUpdateForm
      lines={[
        {
          lineId
          quantity: nextQuantity,
        },
      ]}
    >
      {() => <button>+</button>}
    </CartLinesUpdateForm>
  );
}
```

Advanced use:

```jsx
function DecreaseLineQuantity({line}) {
  const prevQuantity = Number(Math.max(0, line.quantity - 1).toFixed(0));
  return (
    <CartLinesUpdateForm
      lines={[
        {
          lineId
          quantity: prevQuantity,
        },
      ]}
      onSuccess={(event) => {
        navigator.sendBeacon('/events', JSON.stringify(event))
      }}
    >
      {(state, errors) => (
        <button>{state === 'idle' ? '-' : '...'}</button>
        {errors ? <p>{errors[0].message}</p>}
      )}
    </CartLinesUpdateForm>
  )
}
```

## `useCartLinesUpdate`

This hook provides a programmatic way to update cart line(s);

Hook signature

```jsx
function onSuccess(event) {
  console.log('line(s) updated');
}

const {cartLinesUpdate, fetcher} = useCartLinesUpdate(onSuccess);
```

| Action            | Description                                                         |
| :---------------- | :------------------------------------------------------------------ |
| `cartLinesUpdate` | A utility that submits a lines update mutation via fetcher.submit() |
| `fetcher`         | The Remix `fetcher` handling the current form submission            |

| Prop         | Type              | Description                                         |
| :----------- | :---------------- | :-------------------------------------------------- |
| `onSuccess?` | `(event) => void` | `A callback that runs after every successful event` |

Example: programmatic update of a line item attribute(s)

```jsx
function CartLineEngraving({line}) {
  const {cartLinesUpdate} = useCartLinesUpdate();

  function onChange(event) {
    const updatedLine = {
      id: line.id,
      attributes: [{name: 'engraving', value: event.target.value}],
    };
    cartLinesUpdate({lines: [updatedLine]});
  }

  return <input key={line.id} type="text/input" onChange={onChange} />;
}
```

## `useCartLinesUpdating`

A utility hook to easily implement optimistic UI of multiple line(s) being updated.

Hook signature

```jsx
const {linesUpdating, fetcher} = useCartLinesUpdating();
```

| Action          | Description                                                                                                |
| :-------------- | :--------------------------------------------------------------------------------------------------------- |
| `linesUpdating` | The line(s) being updated. If the fetcher is idle it will be null. Useful for handling optimistic updates. |
| `fetcher`       | The Remix `fetcher` handling the current form submission                                                   |

Example use

```jsx
function CartStatus({line}) {
  const {linesUpdating} = useCartLinesUpdating();

  return linesUpdating?.length ? (
    <span>{`${linesUpdating.length} lines updating`}</span>
  ) : null;
}
```

## `useCartLineUpdating`

A utility hook to easily implement optimistic UI of a single line being updated.

Hook signature

```jsx
const {lineUpdating, linesUpdating} = useCartLineUpdating(line);
```

| Action          | Description                                                                                                |
| :-------------- | :--------------------------------------------------------------------------------------------------------- |
| `lineUpdating`  | The line being updated                                                                                     |
| `linesUpdating` | The line(s) being updated. If the fetcher is idle it will be null. Useful for handling optimistic updates. |

Example use

```jsx
function CartLineQuantity({line}) {
  const {lineUpdating} = useLineUpdating(line);

  return <span>{lineUpdating ? lineUpdating.quantity : line.quantity}</span>;
}
```

## cartLinesUpdate

A mutation helper to update cart line(s)

| Action    | Description                                 |
| :-------- | :------------------------------------------ |
| `cartId`  | The id of the cart being mutated            |
| `context` | The action/loader hydrogen context          |
| `lines`   | [CartLineUpdateInput] lines items to update |

Example use:

```jsx
export async function action({request, context}) {
  const {session} = context;
  const cartId = await session.getCartId();
  const lines = formData.get('lines') ? JSON.parse(formData.get('lines')) : [];

  // update cart lines
  const {cart, errors} = await cartLinesUpdate({
    cartId,
    lines,
    context,
  });

  return json({cart});
}
```
