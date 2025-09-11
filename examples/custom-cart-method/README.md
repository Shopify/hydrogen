# Hydrogen example: Custom Cart Method

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

This example modifies the standard cart implementation to add custom cart methods.
All files listed are modifications of existing Hydrogen skeleton files.

| File                                                  | Description                                                                                     |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| [`server.ts`](server.ts)                             | Modified Oxygen server worker where the custom cart method `updateLineByOptions` is added      |
| [`app/components/Cart.tsx`](app/components/Cart.tsx) | Modified cart component to include inline product option editing UI                            |
| [`app/routes/cart.tsx`](app/routes/cart.tsx)         | Modified cart route to handle the new `CustomUpdateLineByOptions` action                       |
