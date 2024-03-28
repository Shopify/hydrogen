# Hydrogen example: B2B

> Note:
>
> This example is currently Unstable

This is an example implementation of a B2B storefront using Hydrogen. It includes the following high level changes.

1. Retrieving company location data from a logged in customer using the [Customer Account API](https://shopify.dev/docs/api/customer/2024-04/queries/customer)
2. Displaying a list of company locations and setting a `companyLocationId` in session
3. Using a storefront `customerAccessToken` and `companyLocationId` to update cart and get B2B specific rules and pricing
4. Using a storefront `customerAccessToken` and `companyLocationId` to [contextualize queries](https://shopify.dev/docs/api/storefront#directives) and get B2B pricing, volume pricing, and quantity rules

## Install

Setup a new project with this example:

```bash
npm create @shopify/hydrogen@latest -- --template custom-cart-method
```

## Requirements

- Your store is on a [Shopify Plus plan](https://help.shopify.com/manual/intro-to-shopify/pricing-plans/plans-features/shopify-plus-plan).
- Your store is using [new customer accounts](https://help.shopify.com/en/manual/customers/customer-accounts/new-customer-accounts).
- You have access to a customer which has permission to order for a [B2B company](https://help.shopify.com/en/manual/b2b).

## Key files

This folder contains the minimal set of files needed to showcase the implementation.
More files were changed, but these are the ones requried to implement a basic headless B2B storefront.
Files that aren’t included by default with Hydrogen and that you’ll need to
create are labeled with 🆕.

| File                                                 | Description                                                                                    |
| ---------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| [`app/root.tsx`](app/root.tsx)                             | Includes a customer query to determine if the the logged in session is for a B2B buyer. Set `companyLocationId` in session if there is only one location available to buy for    |
| 🆕 [`app/graphql/CustomerLocationsQuery.ts`](app/graphql/CustomerLocationsQuery.ts)  | Customer query to fetch company locations        |
| 🆕 [`app/components/LocationSelector.tsx`](app/components/LocationSelector.tsx) | Component to choose a Company location to buy for. Rendered if there is no `companyLocationId` set in session    |
| [`app/routes/products.$handle.tsx`](app/routes/products.$handle.tsx)      | Added buyer context to the product and product varient queries. Includes logic and components to display quantity rules and quantity price breaks |
| 🆕 [`app/components/PriceBreaks.tsx`](app/components/PriceBreaks.tsx)  | Component rendered on the product page to highlight quantity price breaks        |
| 🆕 [`app/components/QuantityRules.tsx`](app/components/QuantityRules.tsx)  | Component rendered on the product page to highlight quantity rules        |
