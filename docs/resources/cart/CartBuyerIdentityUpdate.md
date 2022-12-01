# CartBuyerIdentityUpdate

The `CartBuyerIdentityUpdate` cart resource is a full-stack component that provides a set of utilities to update the cart buyer identity. It also provides a set of hooks to help you handle optimistic and pending UI.

## `CartBuyerIdentityUpdateForm`

A Remix `fetcher.Form` that updates a cart buyer identity. This form mutates the cart via the [cartBuyerIdentityUpdate](https://shopify.dev/api/storefront/2022-10/mutations/cartBuyerIdentityUpdate) mutation and provides `errors`, `state` and `event` instrumentation for analytics.

| Prop                       | Type                                                                                                      | Description                                                                    |
| :------------------------- | :-------------------------------------------------------------------------------------------------------- | :----------------------------------------------------------------------------- |
| `buyerIdentity?`           | [CartBuyerIdentityInput](https://shopify.dev/api/storefront/2022-10/input-objects/CartBuyerIdentityInput) | `The updated buyer identity`                                                   |
| `onSuccess?`               | `(event) => void`                                                                                         | `A callback that runs after every successful event`                            |
| `redirectTo?`              | `string`                                                                                                  | `A pathname to redirect to after submit`                                       |
| `withCustomerAccessToken?` | `boolean` defaults to `false`                                                                             | `Wether to apply the customerAccessToken to the buyerIdentity (if logged in)`  |
| `children`                 | `({ state: 'idle' or 'submitting' or 'loading'; errors: UserError[]})`                                    | `A render prop that provides the state and errors for the current submission.` |

Basic use:

```jsx
function SwitchToCAD() {
  return (
    <CartBuyerIdentityUpdateForm buyerIdentity={{countryCode: 'CA'}}>
      {(state, errors) => <button>CAD</button>}
    </CartBuyerIdentityUpdateForm>
  );
}
```

Advanced use:

```jsx
// Advanced example
function UpdateCartBuyerInfo() {
  return (
    <CartBuyerIdentityUpdateForm
      onSuccess={(event) => {
        navigator.sendBeacon('/events', JSON.stringify(event));
      }}
    >
      {(state, errors) => (
        <>
          {/*  Any CartBuyerIdentityInput field can be passed as a hidden input */}
          <input type="text" name="email" placeholder="Enter your email" />
          <input
            type="text"
            name="phone"
            placeholder="Enter your phone number"
          />
          <button>{state === 'idle' ? 'Update' : 'Updating...'}</button>
          {errors ? <p>{error[0].message}</p> : null}
        </>
      )}
    </CartBuyerIdentityUpdateForm>
  );
}
```

## `useCartBuyerIdentityUpdate`

This hook provides a programmatic way to update a cart buyer identity;

Hook signature

```jsx
function onSuccess(event) {
  console.log('buyer identity updated');
}

const {cartBuyerIdentityUpdate, fetcher} =
  useCartBuyerIdentityUpdate(onSuccess);
```

| Action                    | Description                                                             |
| :------------------------ | :---------------------------------------------------------------------- |
| `cartBuyerIdentityUpdate` | A utility that submits the buyer identity mutation via fetcher.submit() |
| `fetcher`                 | The Remix `fetcher` handling the current form submission                |

| Prop         | Type              | Description                                         |
| :----------- | :---------------- | :-------------------------------------------------- |
| `onSuccess?` | `(event) => void` | `A callback that runs after every successful event` |

Example use

```jsx
// A hook that applies an email to the current cart buyer identity
function useUpdateCartEmail({email}) {
  const {cartBuyerIdentityUpdate} = useCartBuyerIdentityUpdate();

  useEffect(() => {
    if (!email) return;
    cartBuyerIdentityUpdate({
      buyerIdentity: {email},
    });
  }, [email]);
}
```

## `useCartBuyerIdentityUpdating`

A utility hook to easily implement optimistic UI when the cart buyer identity is being updated

Hook signature

```jsx
const {buyerIdentityUpdating} = useCartBuyerIdentityUpdating();
```

| Action                  | Description                                     |
| :---------------------- | :---------------------------------------------- |
| `buyerIdentityUpdating` | The buyer identity currently being updated      |
| `fetcher`               | The Remix `fetcher` updating the buyer identity |

Example use

```jsx
function CartEmail({cart}) {
  const {buyerIdentityUpdating} = useCartBuyerIdentityUpdating();
  const {buyerIdentity} = cart;
  const optimisticCartEmail =
    buyerIdentityUpdating?.email ?? buyerIdentity.email;

  return <p>Email: {optimisticCartEmail}</p>;
}
```

## cartBuyerIdentityUpdate

A mutation helper to update the buyer identity associated with a cart

| Action          | Description                                    |
| :-------------- | :--------------------------------------------- |
| `cartId`        | The id of the cart being mutated               |
| `context`       | The action/loader hydrogen context             |
| `buyerIdentity` | CartBuyerIdentityInput[] updated buyerIdentity |

Example use:

```jsx
export async function action({request, context}) {
  const {session} = context;
  const cartId = await session.getCartId();
  const buyerIdentity = formData.get('buyerIdentity')
    ? JSON.parse(formData.get('buyerIdentity'))
    : [];

  // update buyer identity
  const {cart, errors} = await cartBuyerIdentityUpdate({
    cartId,
    buyerIdentity,
    context,
  });

  return json({cart});
}
```
