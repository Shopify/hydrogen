# BuyerIdentityUpdate

The `BuyerIdentityUpdate` cart resource is a full-stack component that provides a set of utilities to update the cart buyer identity. It also provides a set of hooks to help you handle optimistic and pending UI.

## `BuyerIdentityUpdateForm`

A Remix `fetcher.Form` that updates a cart buyer identity. This form mutates the cart via the [cartBuyerIdentityUpdate](https://shopify.dev/api/storefront/2022-10/mutations/cartBuyerIdentityUpdate) mutation and provides `error`, `state` and `event` instrumentation for analytics.

| Prop                       | Type                                                                                                      | Description                                                                    |
| :------------------------- | :-------------------------------------------------------------------------------------------------------- | :----------------------------------------------------------------------------- |
| `buyerIdentity?`           | [CartBuyerIdentityInput](https://shopify.dev/api/storefront/2022-10/input-objects/CartBuyerIdentityInput) | `The updated buyer identity`                                                   |
| `onSuccess?`               | `(event) => void`                                                                                         | `A callback that runs after every successful event`                            |
| `redirectTo?`              | `string`                                                                                                  | `A pathname to redirect to after submit`                                       |
| `withCustomerAccessToken?` | `boolean` defaults to `false`                                                                             | `Wether to apply the customerAccessToken to the buyerIdentity (if logged in)`  |
| `children`                 | `({ state: 'idle' or 'submitting' or 'loading'; error: string})`                                          | `A render prop that provides the state and errors for the current submission.` |

Basic use:

```jsx
function SwitchToCAD() {
  return (
    <BuyerIdentityUpdateForm buyerIdentity={{countryCode: 'CA'}}>
      {(state, error) => <button>CAD</button>}
    </BuyerIdentityUpdateForm>
  );
}
```

Advanced use:

```jsx
// Advanced example
function UpdateCartCustomer() {
  return (
    <BuyerIdentityUpdateForm
      onSuccess={(event) => {
        navigator.sendBeacon('/events', JSON.stringify(event));
      }}
    >
      {(state, error) => (
        <>
          <input type="text" name="email" placeholder="Enter your email" />
          <input
            type="text"
            name="phone"
            placeholder="Enter your phone number"
          />
          <button>{state === 'idle' ? 'Update' : 'Updating...'}</button>
          {error ? <p>{error}</p> : null}
        </>
      )}
    </BuyerIdentityUpdateForm>
  );
}
```

## `useBuyerIdentityUpdate`

This hook provides a programmatic way to update a cart buyer identity;

Hook signature

```jsx
function onSuccess(event) {
  console.log('buyer identity updated');
}

const {buyerIdentityUpdate, buyerIdentityUpdateFetcher} =
  useBuyerIdentityUpdate(onSuccess);
```

| Action                       | Description                                                             |
| :--------------------------- | :---------------------------------------------------------------------- |
| `buyerIdentityUpdate`        | A utility that submits the buyer identity mutation via fetcher.submit() |
| `buyerIdentityUpdateFetcher` | The Remix `fetcher` handling the current form submission                |

| Prop         | Type              | Description                                         |
| :----------- | :---------------- | :-------------------------------------------------- |
| `onSuccess?` | `(event) => void` | `A callback that runs after every successful event` |

Example use

```jsx
// A hook that applies an email to the current cart buyer identity
function useUpdateCartEmail({email}) {
  const {buyerIdentityUpdate} = useBuyerIdentityUpdate();

  useEffect(() => {
    if (!email) return;
    buyerIdentityUpdate({
      buyerIdentity: {email},
    });
  }, [email]);
}
```

## `useBuyerIdentityUpdating`

A utility hook to easily implement optimistic UI when a specific line is being removed.

Hook signature

```jsx
const {buyerIdentityUpdating} = useBuyerIdentityUpdating();
```

| Action                  | Description                                |
| :---------------------- | :----------------------------------------- |
| `buyerIdentityUpdating` | The buyer identity currently being updated |

Example use

```jsx
function CartEmail({cart}) {
  const {buyerIdentityUpdating} = useBuyerIdentityUpdating();
  const {buyerIdentity} = cart;
  const optimisticCartEmail =
    buyerIdentityUpdating?.email ?? buyerIdentity.email;

  return <p>Email: {optimisticCartEmail}</p>;
}
```
