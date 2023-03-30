---
'@shopify/hydrogen': patch
---

Adopt Remix [`v2_meta`](https://remix.run/docs/en/main/route/meta#metav2) future flag

### `v2_meta` migration steps

1. For any routes that you used `meta` route export, convert it to the `V2_MetaFunction` equivalent.

   **Before** - returns an object;

   ```jsx
   export const meta: MetaFunction = () => {
     return {
       title: 'Login',
     };
   };
   ```

   **After** - returns an array of object:

   ```jsx
   export const meta: V2_MetaFunction = () => {
     return [
       {
         title: 'Login',
       },
     ];
   };
   ```

2. If you are using data from loaders

   **Before** - returns an object;

   ```jsx
   export const meta: MetaFunction = ({data}) => ({
     title: `Order ${data?.order?.name}`,
   });
   ```

   **After** - returns an array of object:

   ```jsx
   export const meta: V2_MetaFunction<typeof loader> = ({data}) => {
     return [
       {
         title: `Order ${data?.order?.name}`,
       },
     ];
   };
   ```

3. If you are using `meta` route export in `root`, convert it to [Global Meta](https://remix.run/docs/en/main/route/meta#global-meta)

   ```diff
   // app/root.tsx

   - export const meta: MetaFunction = () => ({
   -   charset: 'utf-8',
   -   viewport: 'width=device-width,initial-scale=1',
   - });

   export default function App() {

     return (
       <html lang={locale.language}>
         <head>
   +        <meta charSet="utf-8" />
   +        <meta name="viewport" content="width=device-width,initial-scale=1" />
           <Seo />
           <Meta />
   ```
