# 🧑‍🍳 Subscriptions

This recipe adds subscription capabilities to your Hydrogen storefront by implementing [selling plan groups](https://shopify.dev/docs/api/storefront/latest/objects/SellingPlanGroup) and options. Customers can choose between one-time purchases or recurring subscriptions when available.

The implementation:
1. Modifies product detail pages to display subscription options with accurate pricing
2. Adds a SellingPlanSelector component that presents available subscription options
3. Enhances GraphQL fragments to fetch all necessary selling plan data
4. Displays subscription details on applicable cart line items
With this recipe, merchants can offer flexible purchasing options while maintaining a seamless customer experience.


## 🍱 Steps

### 1. Requirements

This recipe comes pre-configured for our demo storefront using an example subscription product with the handle `shopify-wax`.
#### Setting Up in Your Own Store
To implement subscriptions in your store:
1. Install a [Shopify Subscriptions](https://apps.shopify.com/shopify-subscriptions) app
2. Use the app to create selling plans for your products
3. Assign these selling plans to any products you want to offer as subscriptions


### 2. Render the selling plan in the cart

CartLineItem now displays subscription plan names when customers add subscription products to their cart.


#### File: [`app/components/CartLineItem.tsx`](/templates/skeleton/app/components/CartLineItem.tsx)

```diff

```

### 3. app/components/ProductForm.tsx



#### File: [`app/components/ProductForm.tsx`](/templates/skeleton/app/components/ProductForm.tsx)

```diff

```

### 4. app/components/ProductPrice.tsx



#### File: [`app/components/ProductPrice.tsx`](/templates/skeleton/app/components/ProductPrice.tsx)

```diff

```

### 5. Add Selling Plan Data to Cart Queries

Updates cart GraphQL fragments to include subscription plan names, enabling e.g "Subscribe and save" messaging in the applicable cart lines


#### File: [`app/lib/fragments.ts`](/templates/skeleton/app/lib/fragments.ts)

```diff

```

### 6. Add SellingPlanSelector to product pages

Adds SellingPlanSelector component to display subscription options on product pages. Handles pricing adjustments, maintains selection state via URL parameters, and updates add-to-cart functionality. Fetches subscription data through the updated cart GraphQL fragments.


#### File: [`app/routes/products.$handle.tsx`](/templates/skeleton/app/routes/products.$handle.tsx)

```diff

```