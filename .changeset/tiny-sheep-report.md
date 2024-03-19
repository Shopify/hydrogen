---
'@shopify/hydrogen': patch
---

Deprecate the `<Seo />` component in favor of directly using Remix meta route exports. Add the `getSeoMeta` to make migration easier:

Migration steps:

**1. Remove the `<Seo />` component from `root.jsx`:**

```diff
 export default function App() {
   const nonce = useNonce();
   const data = useLoaderData<typeof loader>();

   return (
     <html lang="en">
       <head>
         <meta charSet="utf-8" />
         <meta name="viewport" content="width=device-width,initial-scale=1" />
-        <Seo />
         <Meta />
         <Links />
       </head>
       <body>
         <Layout {...data}>
           <Outlet />
         </Layout>
         <ScrollRestoration nonce={nonce} />
         <Scripts nonce={nonce} />
         <LiveReload nonce={nonce} />
       </body>
     </html>
   );
 }

```

**2. Add a Remix meta export to each route that returns an `seo` property from a `loader` or `handle`:**

```diff
+import {getSeoMeta} from '@shopify/hydrogen';

 export async function loader({context}) {
   const {shop} = await context.storefront.query(`
     query layout {
       shop {
         name
         description
       }
     }
   `);

   return {
     seo: {
       title: shop.title,
       description: shop.description,
     },
   };
 }

+export const meta = ({data}) => {
+   return getSeoMeta(data.seo);
+};
```
