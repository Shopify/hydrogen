# Cart RFC

_Date: Nov 7, 2022_

---

The Hydrogen cart has three distinct parts, some of which is provided as an example, other is available from the Hydrogen package.

## Loader data

The query for cart data is made within the root loader. The data is deferred so that the app performance is not affected by the cart load time. Many merchants customize how product line items appear within the cart, because of this, it's simplest to directly expose the query in the loader, and not abstract it within the Hydrogen package. Additionally, on cart mutations, the root loader automatically runs again, updating the state of the cart.

```js
// root.jsx

export const loader = async function loader({request, context, params}) {
  const session = await getSession(request, context);
  const cartId = await session.get('cartId');

  return defer({
    // Cart data is deferred to improve app performance
    cart:
      cartId ??
      context.storefront.query({
        query: CART_QUERY,
        variables: {
          cartId,
        },
      }),
  });
};

// The merchant customizes data available for the cart by simply
// modifying the query provided within the template
const CART_QUERY = `...`;
```

## Components

Hydrogen provides helper components for adding and removing items from the cart, and modifying cart line items. These components _only_ work in conjunction with a cart action route which must also be configured.

### `<AddToCartButton>`

An `<AddToCartButton>` component renders an underlying remix `<Form>` to post a `variantId` to a remix action route. The component takes the following props:

| **Prop**     | **Type**   | **Required** | **Description**                                   |
| ------------ | ---------- | ------------ | ------------------------------------------------- |
| `variantId`  | `string`   | true         | ID of the variant to be added to the cart         |
| `formaction` | `string`   | false        | The path of the action. Defaults to `"/cart/add"` |
| `className`  | `string`   | false        | Proxied to the wrapper button                     |
| `style`      | `Object`   | false        | Proxied to the wrapper button                     |
| `onClick`    | `Callback` | false        | An event callback                                 |

### `<RemoveFromCartButton>`

A `<RemoveFromCartButton>` component renders an underlying remix `<Form>` to post a `variantId` to a remix action route. The component takes the following props:

| **Prop**     | **Type**   | **Required** | **Description**                                      |
| ------------ | ---------- | ------------ | ---------------------------------------------------- |
| `variantId`  | `string`   | true         | ID of the variant to be removed from the cart        |
| `formaction` | `string`   | false        | The path of the action. Defaults to `"/cart/remove"` |
| `className`  | `string`   | false        | Proxied to the wrapper button                        |
| `style`      | `Object`   | false        | Proxied to the wrapper button                        |
| `onClick`    | `Callback` | false        | An event callback                                    |

### `<SetLineItemQuantityButton>`

A `<SetLineItemQuantityButton>` component renders an underlying remix `<Form>` to post a `variantId` and `quantity` to a remix action route. The component takes the following props:

| **Prop**     | **Type**   | **Required** | **Description**                                            |
| ------------ | ---------- | ------------ | ---------------------------------------------------------- |
| `lineId`     | `string`   | true         | ID of the line item to be adjusted                         |
| `quantity`   | `number`   | true         | The new quantity of the line item                          |
| `formaction` | `string`   | false        | The path of the action. Defaults to `"/cart/lineQuantity"` |
| `className`  | `string`   | false        | Proxied to the wrapper button                              |
| `style`      | `Object`   | false        | Proxied to the wrapper button                              |
| `onClick`    | `Callback` | false        | An event callback                                          |

## Action Route

Using any of the built-in components requires you to also configure action routes:

```js
// app/routes/cart/add.jsx

import {addToCart} from '@shopify/hydrogen';

export async function action({request, context, params}) {
  const session = await getSession();

  // Optionally do something custom before adding to cart

  const {data, headers, redirectTo} = await addToCart({
    session,
    request,
    context,
  });

  if (redirectTo) {
    return redirect(redirectTo, {headers});
  }

  // Optionally do something custom after cart is modified
  // For example, maybe add custom data for analytics to the response

  return json(data, {headers});
}
```

Similar routes are necessary for both `removeFromCart` and `lineQuantity`:

```js
// app/routes/cart/remove.jsx

import {removeFromCart} from '@shopify/hydrogen';

export async function action({request, context, params}) {
  const session = await getSession();

  const {data} = await removeFromCart({
    session,
    request,
    context,
  });

  return json(data);
}
```

```js
// app/routes/cart/lineQuantity.jsx

import {adjustLineItemQuantity} from '@shopify/hydrogen';

export async function action({request, context, params}) {
  const session = await getSession();

  const {data} = await adjustLineItemQuantity({
    session,
    request,
    context,
  });

  return json(data);
}
```

## Questions

1. Rather than packaging these components and action functions within Hydrogen, would it be better to simply provide them as an example within the demo store?

   **Pros**

   a. It's very explicit what is going on, and how the `<Form>`'s are wired up to the action routes
   b. It's very easy for the developer to customize.

   **Cons**

   a. There's a lot more to grok in how the cart works. Maybe most merchants don't care, and just want a cart and buttons to easily modify it?
   b. If we need to add or fix functionality in the cart, we have to provide migration instructions to every merchant. And we have no control over them _actually_ making the migration.

2. Rather than three separate action routes, what if there was a single `/cart/update` action route? The user only then imports a single `updateCart()` function from Hydrogen.

   **Pros**

   a. Muchs simpler. Only one route for merchants to implement.
   b. If we add a new `applyDiscountCode` action, it can automatically be supported. The current approach would mean the merchant would have to manually add a new route and import the new `applyDiscountCode` function.

   **Cons**

   a. If the dev wants to do something custom before or after the cart is modified, it's harder for them to know what changed in the cart. Perhaps we could expose the "intent" in the return: `const {data, headers, redirectTo, intent} = updateCart();`

3. Maybe these routes could be completely magic and hidden away from the developer? Rails like. The components are garanteed to work because the routes are always there and implemented properly. The con in this approach is the developer cannot easily customize them.
