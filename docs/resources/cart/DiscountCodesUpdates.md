# DiscountCodesUpdate

The `DiscountCodesUpdate` cart resource is a full-stack component that provides a set of utilities to update discount codes applied to the cart. It also provides a set of hooks to help you handle optimistic and pending UI.

## `DiscountCodesUpdateForm`

A Remix `fetcher.Form` that updates a set of discount codes. This form mutates the cart via the [cartDiscountCodesUpdate](https://shopify.dev/api/storefront/2022-01/mutations/cartDiscountCodesUpdate) mutation and provides
`error`, `state` and `event` instrumentation for analytics.

| Prop            | Type                                                             | Description                                                                    |
| --------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `discountCodes` | `[ID!]`                                                          | `An array of discount codes to apply to the cart`                              |
| `onSuccess?`    | `(event) => void`                                                | `A callback that runs after every successful event`                            |
| `children`      | `({ state: 'idle' or 'submitting' or 'loading'; error: string})` | `A render prop that provides the state and errors for the current submission.` |

Basic use:

```jsx
function FreeShippingDiscount() {
  return (
    <DiscountCodesUpdateForm discountCodes={['FREESHIPPING']}>
      {() => <button>Apply Discount</button>}
    </DiscountCodesUpdateForm>
  );
}
```

Advanced use:

```jsx
function FreeShippingDiscount({line}) {
  return (
    <DiscountCodesUpdateForm
      onSuccess={(event) => {
        navigator.sendBeacon('/events', JSON.stringify(event))
      }}
    >
      {(state, error) => (
        <div>
          <input type="text" name="discountCodes" />
          <button>{state === 'idle' ? 'Apply Discount' : 'Applying discount'}</button>
        </div>
        {error ? <p>{error}</p>}
      )}
    </DiscountCodesUpdateForm>
  )
}
```

## `useDiscountCodesUpdate`

This hook provides a programmatic way to apply discount codes to the cart.

Hook signature

```jsx
function onSuccess(event) {
  console.log('discount codes updated');
}

const {discountCodesUpdate} = useDiscountCodesUpdate(onSuccess);
```

| Action                       | Description                                                                |
| :--------------------------- | :------------------------------------------------------------------------- |
| `discountCodesUpdate`        | A utility that submits a discount codes update mutation via fetcher.submit |
| `discountCodesUpdateFetcher` | The Remix `fetcher` handling the current form submission                   |

| Prop         | Type              | Description                                         |
| :----------- | :---------------- | :-------------------------------------------------- |
| `onSuccess?` | `(event) => void` | `A callback that runs after every successful event` |

Example: Add a free shipping discount code programmatically if cart total is $100 or more

```jsx
function useApplyFreeShipping({cart}) {
  const totalCartAmount = parseFloat(cart.cost.totalAmount.amount);
  const currentDiscountCodes = cart.discountCodes.map(({code}) => code);
  const qualifiesForFreeShipping = totalCartAmount >= 100;
  const discountApplied = currentDiscountCodes.includes('FREESHIPPING');
  const {discountCodesUpdate} = useDiscountCodesUpdate();

  useEffect(() => {
    if (!qualifiesForFreeShipping && discountApplied) {
      // remove discount
      discountCodesUpdate({discountCodes: []});
    } else if (qualifiesForFreeShipping && !discountApplied) {
      // apply discount
      discountCodesUpdate({discountCodes: ['FREESHIPPING']});
    }
  }, [qualifiesForFreeShipping, discountApplied]);
}
```

## `useDiscountCodesUpdating`

A utility hook to easily implement optimistic UI for a line item being updated.

Hook signature

```jsx
const {discountCodesUpdating} = useDiscountCodesUpdating();
```

| Action                  | Description                                |
| :---------------------- | :----------------------------------------- |
| `discountCodesUpdating` | The discount codes currently being updated |

Example use

```jsx
function CartDiscounts({cart}) {
  const currenDiscountCodes = cart.discountCodes;
  const {discountCodesUpdating} = useDiscountCodesUpdating();

  const optimisticDiscounts = discountCodesUpdating ?? currentDiscountCodes;
  const optimisticDiscountCodes = optimisticDiscounts
    .map(({code}) => code)
    .join(',');

  return (
    <div>
      <p>
        Discount(s): <span>{optimisticDiscountCodes}</span>
      </p>
    </div>
  );
}
```
