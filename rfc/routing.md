# Routing

_Date: Nov 7, 2022_

---

Hydrogen will provide built-in support for Shopify routes to make it easier to build a custom storefront.

See [H2 Multiple Storefronts & Routing Problems](https://docs.google.com/document/d/1v0qV3wqAl3wsYvVmJhqBXAqHTX9JdSLjBJ75FJnyW0M/edit#) for a detailed motiviation.

## Built-in Routes

Hydrogen comes with built-in routes automatically available. These are defined with a custom route function within `remix.config.js`:

```ts
import {hydrogenRoutes} from '@shopify/hydrogen';

module.exports = {
  routes: async (defineRoutes) => {
    return defineRoutes((route) => {
      hydrogenRoutes(route, {});
    });
  },
};
```

Some of the built in routes are specific to the framework, and include:

1. `/__health` - used by Oxygen to verify the health of the application
1. `/routeManifest.json` - Manifest describing all available routes in the Hydrogen app. See below for more details.
1. `/graphiql` - Dev-mode UI for querying GraphQL
1. `/admin` - A redirect to the admin for the shop

Other routes are specific to Shopify, and include:

1. `/discounts/DISCOUNT?redirect-to=/redirect/path/name` - Apply discount by a link:
1. `/cart/:variantID:quantity,anotherVariantId:quantity` - Checkout link

Only the Shopify specific routes can be disabled with an option:

```ts
import {hydrogenRoutes} from '@shopify/hydrogen';

module.exports = {
  routes: async (defineRoutes) => {
    return defineRoutes((route) => {
      hydrogenRoutes(route, {
        includeDiscounts: false,
        includeCart: false,
      });
    });
  },
};
```

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

## Backlink Redirects

Merchants migrating onto Hydrogen may not be aware of all the existing routes within the Online Store. We make it easy to automatically redirect online store routes to new custom routes within Hydrogen. This can also be disabled by an option:

```ts
import {hydrogenRoutes} from '@shopify/hydrogen';

module.exports = {
  routes: async (defineRoutes) => {
    return defineRoutes((route) => {
      hydrogenRoutes(route, {
        onlineStoreRedirects: true,
      });
    });
  },
};
```

## Custom redirects

The merchant may define custom redirects within the admin. Optionally Hydrogen can automatically route those custom redirects:

```ts
import {hydrogenRoutes} from '@shopify/hydrogen';

module.exports = {
  routes: async (defineRoutes) => {
    return defineRoutes((route) => {
      hydrogenRoutes(route, {
        customRedirects: true,
      });
    });
  },
};
```

## Online-store Proxying

It is easy to migrate from the online store to a Hydrogen custom storefront. Hydrogen can host some routes while proxying other routes to the online store. All URLs that match the provided pattern(s) are proxied to the online store:

```ts
import {hydrogenRoutes} from '@shopify/hydrogen';

module.exports = {
  routes: async (defineRoutes) => {
    return defineRoutes((route) => {
      hydrogenRoutes(route, {
        proxy: [.+/products\/.+/],
      });
    });
  },
};
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

| **Resource Type** | **Description**           |
| ----------------- | ------------------------- |
| BLOG              | `/blogs`                  |
| ARTICLE           | `/blogs/:handle/articles` |
| CATALOG           | `/products`               |
| COLLECTION        | `/collections/:handle`    |
| COLLECTIONS       | `/collections`            |
| FRONTPAGE         | `/`                       |
| PAGE              | `/pages/:handle`          |
| PRODUCT           | `/products/:products`     |
| SEARCH            | `/search/?q=…`            |
| SHOP_POLICY       | `/policies`               |

Notes:

1. There can only be _one_ route defined of each resource type. An exception is thrown when multiple routes are found of the same resource type.
1. We can warn the developer during dev mode when routes don't exist for a specific resource type.
1. We can warn the developer during dev mode when we know a specific route doesn't meet SEO, Analytics, or other requirements.

## Route manifest

A built-in resource route is available that contains a manifest of all routes defined within the Hydrogen app. All routes of a given resource type are within the `resourceRoutes` property. All other routes are defined within the `customRoutes` property:

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
