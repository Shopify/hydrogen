# How to implement Shopify cart with Remix

## 1. Make sure you have `storefront` in `context`

Whatever this integration ending up looking like but it would be the stuff in `oxygen.ts`

## 2. Define your cart routes

```jsx
// app/routes/cart.jsx
export async function action({request, context}: ActionArgs) {
  const {session, storefront} = context;

  const [formData, cartId, customerAccessToken] = await Promise.all([
    request.formData(),
    session.get('cartId'),
    session.get('customerAccessToken'),
  ]);

  const cartAction = formData.get('cartAction');
  invariant(cartAction, 'No cartAction defined');

  switch (cartAction) {
    case 'ADD_TO_CART':
      // Business logic for adding an item to cart

      // Validate form data
      const lines = formData.get('lines')
        ? JSON.parse(String(formData.get('lines')))
        : [];
      invariant(lines.length, 'No lines to add');

      if (!cartId) {
        // cartCreate is a function wrapper for the graphql cartCreate mutation
        result = await cartCreate({
          input: {lines},
          storefront,
        });

        // Cart created - we only need a Set-Cookie header if we're creating
        session.set('cartId', result.cart.id);
        headers.set('Set-Cookie', await session.commit());
      } else {
        // Add line(s) to existing cart
        result = await cartAdd({
          cartId,
          lines,
          storefront,
        });
      }

      break;
    // Define other cart operations
    default:
      invariant(false, `${cartAction} cart action is not defined`);
  }

  // Cart operation completes
  return json({});
}
```

## 3. Make a form request to your cart action

```jsx
import {useFetcher, useMatches} from '@remix-run/react';
import {flattenConnection} from '@shopify/hydrogen-react';

export function ProductCard({product}) {
  const firstVariant = flattenConnection(product?.variants)[0];

  return (
    <div>
      <h2>{product.title}</h2>
      <AddToCartButton
        lines={[
          {
            quantity: 1,
            merchandiseId: firstVariant.id,
          },
        ]}
      />
    </div>
  );
}

function AddToCartButton({lines}) {
  const [root] = useMatches();
  const fetcher = useFetcher();

  return (
    <fetcher.Form action="/cart" method="post">
      <input type="hidden" name="cartAction" value="ADD_TO_CART" />
      <input type="hidden" name="lines" value={JSON.stringify(lines)} />
      <button type="submit">Add to Bag</button>
    </fetcher.Form>
  );
}
```

If you want to accept other form data, such as `sellingPlanId`, update your
action and form for the new input.

```jsx
// app/routes/cart.jsx
switch (cartAction) {
  case 'ADD_TO_CART':
    // Business logic for adding an item to cart

    // Validate form data
    const lines = formData.get('lines')
      ? JSON.parse(String(formData.get('lines')))
      : [];
    invariant(lines.length, 'No lines to add');

    const sellingPlanId = formData.get('sellingPlanId') || null;
```

```jsx
// ProductCard
<fetcher.Form action="/cart" method="post">
  <input type="hidden" name="cartAction" value="ADD_TO_CART" />
  <input type="hidden" name="lines" value={JSON.stringify(lines)} />
  <input type="hidden" name="sellingPlanId" value={sellingPlanId} />
  <button type="submit">Add to Bag</button>
</fetcher.Form>
```

## 4. Open cart drawer on add to cart operation

We can use `useFetchers` to know when a cart operation happens by
looking for a form request with form data named `cartAction`.

```jsx
import {useFetchers} from '@remix-run/react';

export function useCartFetchers(actionName: string) {
  const fetchers = useFetchers();
  const cartFetchers = [];

  for (const fetcher of fetchers) {
    const formData = fetcher.submission?.formData;
    if (formData && formData.get('cartAction') === actionName) {
      cartFetchers.push(fetcher);
    }
  }
  return cartFetchers;
}
```

Anywhere in the app, you can target these cart specific requests.

```jsx
// app/components/Layout.jsx

function Header({title, menu}: {title: string; menu?: EnhancedMenu}) {
  const isHome = useIsHomePath();

  const {
    isOpen: isCartOpen,
    openDrawer: openCart,
    closeDrawer: closeCart,
  } = useDrawer();

  // Detect any add to cart form request
  const addToCartFetchers = useCartFetchers('ADD_TO_CART');

  // toggle cart drawer when adding to cart
  useEffect(() => {
    if (isCartOpen || !addToCartFetchers.length) return;
    openCart();
  }, [addToCartFetchers, isCartOpen, openCart]);
```

## 5. Adding optimistic UI

Optimistic UI gives an immediate feedback to your visitors

```jsx
function AddToCartButton({lines}) {
  const [root] = useMatches();
  const fetcher = useFetcher();

  // Create an unique id for our form
  const eventId = useId();
  const eventIdFetchers = useEventIdFetchers(eventId);
  const isAdding = !!eventIdFetchers.length;

  return (
    <fetcher.Form action="/cart" method="post">
      <input type="hidden" name="cartAction" value="ADD_TO_CART" />
      <input type="hidden" name="eventId" value={eventId} />
      <input type="hidden" name="lines" value={JSON.stringify(lines)} />
      <button type="submit" disabled={isAdding}>
        {isAdding ? 'Adding ...' : 'Add to Bag'}
      </button>
    </fetcher.Form>
  );
}
```

Just like how we use `useFetchers` to know a cart operation has occurred.
We can do the same to search for the exact form that initiated the form request.

```jsx
export function useEventIdFetchers(eventId: string) {
  const fetchers = useFetchers();
  const cartFetchers = [];

  for (const fetcher of fetchers) {
    const formData = fetcher.submission?.formData;
    if (formData && formData.get('eventId') === eventId) {
      cartFetchers.push(fetcher);
    }
  }
  return cartFetchers;
}
```
