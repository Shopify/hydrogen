# LinesUpdate

The `LinesUpdate` cart resource is a full-stack component that provides a set of utilities to update line(s) to the cart. It also provides a set of hooks to help you handle optimistic and pending UI.

## `LinesUpdateForm`

A Remix `fetcher.Form` that updates a set of line(s) to the cart. This form mutates the cart via the [cartLinesUpdate](https://shopify.dev/api/storefront/2022-10/mutations/cartLinesUpdate) mutation and provides
`error`, `state` and `event` instrumentation for analytics.

| Prop         | Type                                                             | Description                                                                    |
| ------------ | ---------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `lines`      | `[CartLineUpdateInput]`                                          | `lines items to update to the cart`                                            |
| `onSuccess?` | `(event) => void`                                                | `A callback that runs after every successful event`                            |
| `children`   | `({ state: 'idle' or 'submitting' or 'loading'; error: string})` | `A render prop that provides the state and errors for the current submission.` |

Basic use:

```jsx
function IncreaseLineQuantity({line}) {
  return (
    <LinesUpdateForm
      lines={[
        {
          lineId
          quantity: line.quantity + 1,
        },
      ]}
    >
      {() => <button>+</button>}
    </LinesUpdateForm>
  );
}
```

Advanced use:

```jsx
function IncreaseLineQuantity({line}) {
  return (
    <LinesUpdateForm
      lines={[
        {
          lineId
          quantity: line.quantity + 1,
        },
      ]}
      onSuccess={(event) => {
        navigator.sendBeacon('/events', JSON.stringify(event))
      }}
    >
      {(state, error) => (
        <button>{state === 'idle' ? '+' : '...'}</button>
        {error ? <p>{error}</p>}
      )}
    </LinesUpdateForm>
  )
}
```

## `useLinesUpdate`

This hook provides a programmatic way to update cart line(s);

Hook signature

```jsx
function onSuccess(event) {
  console.log('line(s) updated');
}

const {linesUpdate, linesUpdating} = useLinesUpdate(onSuccess);
```

| Action                 | Description                                                                                                |
| :--------------------- | :--------------------------------------------------------------------------------------------------------- |
| `linesUpdate`          | A utility that submits a lines update mutation via fetcher.submit()                                        |
| `linesUpdating`        | The lines being submitted. If the fetcher is idle it will be null. Useful for handling optimistic updates. |
| `linesUpdatingFetcher` | The Remix `fetcher` handling the current form submission                                                   |

| Prop         | Type              | Description                                         |
| :----------- | :---------------- | :-------------------------------------------------- |
| `onSuccess?` | `(event) => void` | `A callback that runs after every successful event` |

Example: programmatic update of a line item attribute(s)

```jsx
function CartLineEngraving({line}) {
  const {lineUpdate} = useLinesUpdate();

  function onChange(event) {
    const updatedLine = {
      id: line.id,
      attributes: [{name: 'engraving', value: event.target.value}],
    };
    lineUpdate({lines: [updatedLine]});
  }

  return (
    <input
      key={line.id}
      type="text/input"
      defaultValue=""
      onChange={onChange}
    />
  );
}
```

## `useLineUpdating`

A utility hook to easily implement optimistic UI for a line item being updated.

Hook signature

```jsx
const {lineUpdating, linesUpdating} = useLineUpdating(line);
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
