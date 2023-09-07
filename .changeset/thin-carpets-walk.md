---
'@shopify/hydrogen': patch
'@shopify/cli-hydrogen': patch
'@shopify/create-hydrogen': patch
'@shopify/remix-oxygen': patch
---

(Unstable) server-side network request debug virtual route

1. Update your `server.ts` so that it also passes in the `waitUntil` and `env`.

   ```diff
     const handleRequest = createRequestHandler({
       build: remixBuild,
       mode: process.env.NODE_ENV,
   +    getLoadContext: () => ({session, storefront, env, waitUntil}),
     });
   ```

   If you are using typescript, make sure to update `remix.env.d.ts`

   ```diff
     declare module '@shopify/remix-oxygen' {
       export interface AppLoadContext {
   +     env: Env;
         cart: HydrogenCart;
         storefront: Storefront;
         session: HydrogenSession;
   +      waitUntil: ExecutionContext['waitUntil'];
       }
     }
   ```

2. Run `npm run dev` and you should see terminal log information about a new virtual route that you can view server-side network requests at http://localhost:3000/debug-network

3. Open http://localhost:3000/debug-network in a tab and your app another tab. When you navigate around your app, you should see server network requests being logged in the debug-network tab
