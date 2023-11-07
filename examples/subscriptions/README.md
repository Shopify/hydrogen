# Hydrogen example: Subscriptions / Selling Plans

This folder contains an example implementation of [subscriptions](https://shopify.dev/docs/apps/selling-strategies/subscriptions) for Hydrogen. It shows how to display selling plans on a product page.

## Requirements

This example is connected to the `hydrogen-preview` storefront which contains one example subscription product (`shopify-wax`).

To run this example on your own store, you'll need to:

- Install a [subscription app](https://apps.shopify.com/categories/selling-products-purchase-options-subscriptions).
- Use the subscription app to create a selling plan for a product.

## Key files

This folder contains the minimal set of files needed to showcase the implementation.

| File                                                               | Description                                                                                                                                           |
| ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`.env`](.env)                                                     | Environment variable file. This project is connected to the `hydrogen-preview` storefront which has one example subscription product (`shopify-wax`). |
| [`app/routes/product.$handle.tsx`](app/routes/product.$handle.tsx) | Product page modified to display subscription options.                                                                                                |
| [`app/components/Cart.tsx`](app/components/Cart.tsx)               | Cart component modified to display selected subscription.                                                                                             |
| [`server.ts`](server.ts)                                           | Application entry point modified to fetch selected selling plans from cart lines.                                                                     |
