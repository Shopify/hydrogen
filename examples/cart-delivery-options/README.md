# Hydrogen example: Cart Delivery Options

This is an example of implementation of how to edit product option in cart. It does this by creating an [custom method](https://shopify.dev/docs/api/hydrogen/2023-10/utilities/createcarthandler#example-custom-methods) named `updateLineByOptions` for cart.

This method takes a product Id, currently selected options, and query for the `merchandiseId` needed to make an cart line item update.

It also showcase an end-to-end implementation of [custom method](https://shopify.dev/docs/api/hydrogen/2023-10/utilities/createcarthandler#example-custom-methods) including the additional handler for `CustomUpdateLineByOptions` action (all custom method action should be prefix with `Custom`) in cart route, and the UI that trigger the handler.

Note that this is an isolated example, for a better edit in cart user experience we recommend implementing an optimistic cart along side of this example.

## Install

Setup a new project with this example:

```bash
npm create @shopify/hydrogen@latest -- --template custom-cart-method
```

## Requirements

- Basic understanding of how to [build a cart with Hydrogen](https://shopify.dev/docs/custom-storefronts/hydrogen/building/cart)

## Key files

This folder contains the minimal set of files needed to showcase the implementation.
Files that aren’t included by default with Hydrogen and that you’ll need to
create are labeled with 🆕.

| File                                                 | Description                                                                                    |
| ---------------------------------------------------- | ---------------------------------------------------------------------------------------------- | --- |
| [`server.ts`](server.ts)                             | Oxygen server worker. `context.cart` is created here and where the custom method is located    | \   |
| [`app/components/Cart.tsx`](app/components/Cart.tsx) | Cart component that renders the side cart                                                      |
| [`app/routes/cart.ts`](app/routes/cart.tsx)          | Cart route that handle cart action such as add or remove line item using `context.cart` object |
