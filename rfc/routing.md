# Routing

_Date: Nov 7, 2022_

---

Hydrogen will provide built-in support for Shopify routes to make it easier to build a custom storefront.

See [H2 Multiple Storefronts & Routing Problems](https://docs.google.com/document/d/1v0qV3wqAl3wsYvVmJhqBXAqHTX9JdSLjBJ75FJnyW0M/edit#) for a detailed motiviation.

## Built-in Routes

Hydrogen comes with built-in routes automatically available. These are defined with a custom route function within `remix.config.js`:

```ts
import {hydrogenRoutes} from '@shopify/hydrogen/build';

module.exports = {
  async routes(defineRoutes) {
    return await hydrogenRoutes(defineRoutes, {});
  },
};
```

Some of the built in routes are specific to the framework, and include:

1. `/__health` - used by Oxygen to verify the health of the application
1. `/route-manifest.json` - Manifest describing all available routes in the Hydrogen app. See below for more details.
1. `/graphiql` - Dev-mode UI for querying GraphQL
1. `/admin` - A redirect to the admin for the shop

### Packaging Built-in Routes

Some routes are packaged directly within Hydrogen. The user cannot remove these routes, they are necessary for the framework. They include `/__heatlh` and `__routeManifest.json`.

Other routes are packaged within hydrogen, but exposed to the user within a `.hydrogen` directory. Consider the following app structure:

```
📂 HydrogenApp
 ┣ 📂 app
 ┃ ┗ 📂 routes
 ┃   ┗ 📜 index.tsx
 ┣ 📂 .hydrogen
 ┃ ┗ 📂 routes
 ┃   ┗ 📜 cart.tsx
 ┗ 📜package.json
```

The `.hydrogen` directory is generated _each_ time the app builds. The files within it are copied from the hydrogen package. These files should _not_ be directly modified by the user. Any changes the developer makes will be overwritten the next time the app boots. The developer has the ability to see the implementation of the built-in hydrogen route. They also can copy the file out and into their own routes. Doing so means that their implementation overrides the implementation packaged by hydrogen:

```
📂 HydrogenApp
 ┣ 📂 app
 ┃ ┗ 📂 routes
 ┃   ┣ 📜 index.tsx
 ┃   ┗ 📜 cart.tsx
 ┣ 📂 .hydrogen
 ┃ ┗ 📂 routes
 ┃   ┗ 📜 cart.tsx
 ┗ 📜package.json
```

The route override when the path exactly matches. Alternatively the route could override based on route name (see below).

#### Built-in full-stack components

Some built-in routes, like the cart, include pre-built components that interact with the routes. These components are imported from `.hydrogen`:

```ts
import {BuyerIdentityUpdateForm} from '.hydrogen';
```

## Backlink Redirects

Merchants migrating onto Hydrogen may not be aware of all the existing routes within the Online Store. We make it easy to automatically redirect online store routes to new custom routes within Hydrogen. This can also be disabled by an option:

```ts
import {hydrogenRoutes} from '@shopify/hydrogen/build';

module.exports = {
  async routes(defineRoutes) {
    return await hydrogenRoutes(defineRoutes, {
      onlineStoreRedirects: true,
    });
  },
};
```

## Custom redirects

The merchant may define custom redirects within the admin. Optionally Hydrogen can automatically route those custom redirects with the `notFoundMaybeRedirect` function. Call this function whenever you might need to 404. If a redirect exists for the URL, the function will return a 302, else it returns a normal 404.

```ts
import {notFoundMaybeRedirect} from '@shopify/hydrogen';

export async function loader({params, request, context}: LoaderArgs) {
  const {productHandle} = params;

  const {product} = await context.storefront.query(PRODUCT_QUERY, {
    variables: {
      handle: productHandle,
    },
  });

  if (!product) {
    throw await notFoundMaybeRedirect(request, context);
  }
}
```

The `notFoundMaybeRedirect` function also automatically handles a `return_to` query parameter. For example, given the URL: `https://wwww.hydrogen.shop/products/oldsnowboard?return_to=/products/hydrogen`, the main URL doesn't exist, but instead of returning a 404, Hydrogen will return a 302 to `/products/hydrogen`.

## Online-store Proxying

It is easy to migrate from the online store to a Hydrogen custom storefront. Hydrogen can host some routes while proxying other routes to the online store. _Proxying is only supported on Oxygen, because proxying relies on privileged signed headers._ Configuring proxying is done within the oxygen.ts:

```ts
import {createRequestHandler} from '@shopify/hydrogen-remix';

const requestHandler = createRequestHandler({
  // Before Hydrogen renders each request, it is tested if it should be proxied.
  // Return a string for the proxy destination. Return null or undefined to not proxy.
  // This example would proxy https://hydrogen.shop/proxy -> https://hydrogen-preview.myshopify.com/pages/about
  shouldProxyOnlineStore: (request: Request) =>
    new URL(request.url).pathname === '/proxy' ? '/pages/about' : null,
});
```

## Named Routes

Routes in Hydrogen can be defined in completely custom ways. Other services need to understand how to link to Shopify entities within a custom storefront. For example, products might exist on `/productos/:handle` instead of `/products/:handle`.

The `/routes/productos/$handle.tsx` file should include `handle` meta-data that describes this route as a `PRODUCT` route:

```ts
import {RESOURCE_TYPES} from '@shopify/hydrogen';

export const handle = {
  hydrogen: {
    resourceType: RESOURCE_TYPES.PRODUCT,
  },
};

export default function Productos() {
  /*...*/
}
```

The available resource types are:

| **Resource Type** | **Description**                          |
| ----------------- | ---------------------------------------- |
| BLOG              | `/blogs`                                 |
| ARTICLE           | `/blogs/:handle/articles`                |
| CATALOG           | `/products`                              |
| COLLECTION        | `/collections/:handle`                   |
| COLLECTIONS       | `/collections`                           |
| FRONTPAGE         | `/`                                      |
| PAGE              | `/pages/:handle`                         |
| PRODUCT           | `/products/:products`                    |
| SEARCH            | `/search/?q=…`                           |
| SHOP_POLICY       | `/policies`                              |
| LOGIN             | `/account/login`                         |
| REGISTER          | `/account/register`                      |
| RESET_PASSWORD    | `/account/reset.$id.$resetToken`         |
| ACTIVATE          | `/account/activate.$id.$activationToken` |
| RECOVER_PASSWORD  | `/account/recover`                       |
| ACCOUNT           | `/account`.                              |
| ACCOUNT_EDIT      | `/account/edit`                          |
| ORDERS            | `/account/orders`                        |
| ORDER_DETAIL      | `/account/orders.$id`                    |
| ADDRESSES         | `/account/addresses`                     |
| ADDRESS_DETAIL    | `/account/addresses.$id`                 |

Notes:

1. There can only be _one_ route defined of each resource type. An exception is thrown when multiple routes are found of the same resource type.
1. We can warn the developer during dev mode when routes don't exist for a specific resource type.
1. We can warn the developer during dev mode when we know a specific route doesn't meet SEO, Analytics, or other requirements.

## Route manifest

A built-in resource route is available at `/route-manifest.json` and contains a manifest of all routes defined within the Hydrogen app. All routes of a given resource type are within the `resourceRoutes` property. All other routes are defined within the `customRoutes` property:

```ts
{
  resourceRoutes: [
    {
      type: 'BLOG',
      pathname: '/blogs/:handle',
    },
    {
      type: 'ARTICLE',
      pathname: '/blogs/:handle/articles/:handle',
    },
    {
      type: 'COLLECTION',
      pathname: '/collections/:handle',
    },
    {
      type: 'PRODUCT',
      pathname: '/products/:handle',
    }
  ],
  customRoutes: [
    {
      pathname: '/about',
    }
  ]
}
```

## Future

Though not priority for the initial Hydrogen release, there are other routing features we can add down the road:

### CLI

The CLI could scaffold routes of a given resource type:

```
h2 scaffold route products --path "/bundles/:handle"
h2 scaffold route page --path "/about"
h2 setup sentry
h2 setup elevar
```

### Hydrogen `<Link>`

We could also explore a Hydrogen specific `<Link>` component that can calculate the route URL just given the type and necessary parameters:

```ts
<Link to="product" handle="hydrogen">
```

## Questions
