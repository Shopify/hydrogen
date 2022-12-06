Bulk of this RFC is from Ryan's gist: https://gist.github.com/ryanflorence/66278df97b6feb149b13563181b61048

# How to implement Shopify cart with Remix

## 1. Make sure you have `storefront` in `context`

Whatever this integration ending up looking like but it would be the stuff in `oxygen.ts`

## 2. Define your cart routes

Basic developer code:

```jsx
// app/routes/my-cart.tsx
import {cartAction} from '@shopify/hydrogen';
export {cartAction as action};
```

Developer can extend the cart route however they want:

```jsx
// app/routes/my-cart.tsx
import {cartAction} from '@shopify/hydrogen';
export async function action() {
  // do something extra with ActionArgs or the returning Response from cartAction
  return cartAction({...})
};
```

This api interface of `cartAction` should be exactly the same (or closely) as defined for
Online Store's [Cart API](https://shopify.dev/api/ajax/reference/cart) with some extra
form inputs to work with Remix better (ie. the required `cartAction` hidden form input
so we can allow for better search from fetchers).

Extra hidden form inputs:

- `cartAction` - Basic foundation for using `useFetchers` to implement reactive behaviors
  like closing the cart pop-over or optimistic UI.
- `redirectTo` - (Optional) Default to `location.pathname`
- `country` - (Optional) Default to storefront client
- `language` - (Optional) Default to storefront client

The output of `cartAction` should be typed to:

```tsx
type CartActionResponse = {
  cartAction: 'ADD_TO_CART' | 'REMOVE_FROM_CART' | ... ;
  id: string;
  status: number;
  errors?: [
    ... // TBD
  ];
  lineItems?: CartLineItem[]
  [key: string]: unknown; // Anything else developers would like to add
}
```

## 3. Make a `POST` request to your cart endpoint

```jsx
import {Form, actionData} from '@remix-run/react';

export function ProductCard({product}) {
  return (
    <div>
      <h2>{product.title}</h2>
      <AddToCartButton product={product} />
    </div>
  );
}

// Developer can create the useFetcher equivalent following Remix doc
function AddToCartButton({product, ...props}) {
  let location = useLocation();
  let {formData} = useNavigation();
  let isPending =
    formData &&
    formData.get('cartAction') === 'ADD_TO_CART' &&
    formData.get('merchandiseId') === product.variantId;

  return (
    <Form method="post" action="/my-cart">
      <input type="hidden" name="cartAction" value="ADD_TO_CART" />
      <input type="hidden" name="merchandiseId" value={product.variantId} />
      <input type="hidden" name="quantity" value="1" />
      <input type="hidden" name="customNotes" value="1" />
      <input type="hidden" name="redirectTo" value={location.pathname} />
      <button type="submit" {...props} disabled={isPending}>
        {isPending ? 'Adding...' : 'Add to Cart'}
      </button>
    </Form>
  );
}
```

**Note:** Don't supply an `<AddToCartButton />` component in `@shopify/hydrogen`. It is an
instant drop off the moment developer needs to do something else (ie. add selling plan).

## 4. (Docs only) Add optimistic UI on cart actions

```jsx
// `@shopify/hydrogen` supplied hook
export function useCartFetchers(actionName) {
  let fetchers = useFetchers();
  let cartFetchers = [];
  for (let fetcher of fetchers) {
    if (fetcher.formData.get('cartAction') === actionName) {
      cartFetchers.push(fetcher);
    }
  }
  return cartFetchers;
}
```

Developer code:

```jsx
import {useCartFetchers} from '@shopify/hydrogen';

function Cart() {
  const {cart} = useLoaderData();
  const addingToCartFetchers = useCartFetchers('ADD_TO_CART');
  const updatingToCartFetcher = useCartFetchers('UPDATE_TO_CART');

  return (
    <div>
      {addingToCartFetchers.map((fetcher) => (
        <div>
          <div>{fetcher.formData.get('_title')}</div>
          <img src={fetcher.formData.get('_image')} />
        </div>
      ))}
      {cart.items.map((item) => (
        <div>
          <LineItem
            item={item}
            quantity={updatingToCartFetcher[item.id] | item.quantiy}
          />
        </div>
      ))}
    </div>
  );
}
```

## 5. (Docs only) Track analytics on cart actions

```jsx
// /app/routes/my-cart.tsx
import {cartAction} from '@shopify/hydrogen';
import {useActionData} from '@remix-run/react';

export {cartAction as action};

function Cart() {
  let {cart} = useLoaderData();

  const actionData = useActionData<ActionData>();
  if (actionData.cartAction === 'ADD_TO_CART') {
    // send add to cart analytics
  }

  return (
    <div>
      {cart.items.map((item) => (
        <div>
          <LineItem item={item} />
        </div>
      ))}
    </div>
  );
}
```
