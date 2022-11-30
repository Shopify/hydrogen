# CartDiscountCodesUpdate

The `CartDiscountCodesUpdate` cart resource is a full-stack component that provides a set of utilities to update discount codes applied to the cart. It also provides a set of hooks to help you handle optimistic and pending UI.

## `CartDiscountCodesUpdateForm`

A Remix `fetcher.Form` that updates a set of discount codes. This form mutates the cart via the [cartDiscountCodesUpdate](https://shopify.dev/api/storefront/2022-01/mutations/cartDiscountCodesUpdate) mutation and provides
`errors`, `state` and `event` instrumentation for analytics.

| Prop             | Type                                                                   | Description                                                                    |
| ---------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `discountCodes?` | `[ID!]`                                                                | `An array of discount codes to apply to the cart`                              |
| `onSuccess?`     | `(event) => void`                                                      | `A callback that runs after every successful event`                            |
| `children`       | `({ state: 'idle' or 'submitting' or 'loading'; errors: UserError[]})` | `A render prop that provides the state and errors for the current submission.` |

Basic use:

```jsx
function FreeShippingDiscount() {
  return (
    <CartDiscountCodesUpdateForm discountCodes={['FREESHIPPING']}>
      {() => <button>Apply Discount</button>}
    </CartDiscountCodesUpdateForm>
  );
}
```

Advanced use:

```jsx
function FreeShippingDiscount({line}) {
  return (
    <CartDiscountCodesUpdateForm
      onSuccess={(event) => {
        navigator.sendBeacon('/events', JSON.stringify(event))
      }}
    >
      {(state, errors) => (
        <div>
          <input type="text" name="discountCodes" />
           {/* can add multiple codes by repeating the discountCodes input */}
          <input type="text" name="discountCodes" />
          <button>{state === 'idle' ? 'Apply Discount' : 'Applying discount'}</button>
        </div>
        {errors ? <p>{errors[0].message}</p>}
      )}
    </CartDiscountCodesUpdateForm>
  )
}
```

## `useCartDiscountCodesUpdate`

This hook provides a programmatic way to apply discount codes to the cart.

Hook signature

```jsx
function onSuccess(event) {
  console.log('discount codes updated');
}

const {cartDiscountCodesUpdate} = useCartDiscountCodesUpdate(onSuccess);
```

| Action                    | Description                                                                |
| :------------------------ | :------------------------------------------------------------------------- |
| `cartDiscountCodesUpdate` | A utility that submits a discount codes update mutation via fetcher.submit |
| `fetcher`                 | The Remix `fetcher` handling the current form submission                   |

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
  const {cartDiscountCodesUpdate} = useCartDiscountCodesUpdate();

  useEffect(() => {
    if (!qualifiesForFreeShipping && discountApplied) {
      // remove discount
      cartDiscountCodesUpdate({discountCodes: []});
    } else if (qualifiesForFreeShipping && !discountApplied) {
      // apply discount
      cartDiscountCodesUpdate({discountCodes: ['FREESHIPPING']});
    }
  }, [qualifiesForFreeShipping, discountApplied]);
}
```

## `useCartDiscountCodesUpdating`

A utility hook to easily implement optimistic UI for a line item being updated.

Hook signature

```jsx
const {discountCodesUpdating} = useCartDiscountCodesUpdating();
```

| Action                  | Description                                 |
| :---------------------- | :------------------------------------------ |
| `discountCodesUpdating` | The discount codes currently being updated  |
| `fetcher`               | The Remix `fetcher` updating discount codes |

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

## cartDiscountCodesUpdate

A mutation helper to update the discount codes applied to a cart

| Action          | Description                        |
| :-------------- | :--------------------------------- |
| `cartId`        | The id of the cart being mutated   |
| `context`       | The action/loader hydrogen context |
| `discountCodes` | string[] discount codes to update  |

Example use:

```jsx
export async function action({request, context}) {
  const {session} = context;
  const cartId = await session.get('cartId');
  const discountCodes = formData.get('discountCodes')
    ? JSON.parse(formData.get('discountCodes'))
    : [];

  // update cart discount codes
  const {cart, errors} = await cartDiscountCodesUpdate({
    cartId,
    discountCodes,
    context,
  });

  return json({cart});
}
```
