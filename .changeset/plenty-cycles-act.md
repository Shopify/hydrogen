---
'skeleton': patch
---

Turn on Remix `v3_singleFetch` future flag

Remix single fetch migration quick guide: https://remix.run/docs/en/main/start/future-flags#v3_singlefetch
Remix single fetch migration guide: https://remix.run/docs/en/main/guides/single-fetch

**Note:** If you have any routes that appends (or looks for) a search param named `_data`, make sure to rename it to something else.

1. In your `vite.config.ts`, add the single fetch future flag.

    ```diff
    +  declare module "@remix-run/server-runtime" {
    +    interface Future {
    +     v3_singleFetch: true;
    +    }
    +  }

      export default defineConfig({
        plugins: [
          hydrogen(),
          oxygen(),
          remix({
            presets: [hydrogen.preset()],
            future: {
              v3_fetcherPersist: true,
              v3_relativeSplatPath: true,
              v3_throwAbortReason: true,
              v3_lazyRouteDiscovery: true,
    +         v3_singleFetch: true,
            },
          }),
          tsconfigPaths(),
        ],
    ```

2. In your `entry.server.tsx`, add `nonce` to the `<RemixServer>`.

   ```diff
   const body = await renderToReadableStream(
     <NonceProvider>
       <RemixServer
         context={remixContext}
         url={request.url}
   +     nonce={nonce}
       />
     </NonceProvider>,
   ```

3. Update the `shouldRevalidate` function in `root.tsx`.

   Defaulting to no revalidation for root loader data to improve performance. When using this feature, you risk your UI getting out of sync with your server. Use with caution. If you are uncomfortable with this optimization, update the `return false;` to `return defaultShouldRevalidate;` instead.

   For more details see: https://remix.run/docs/en/main/route/should-revalidate

    ```diff
    export const shouldRevalidate: ShouldRevalidateFunction = ({
      formMethod,
      currentUrl,
      nextUrl,
    -  defaultShouldRevalidate,
    }) => {
      // revalidate when a mutation is performed e.g add to cart, login...
      if (formMethod && formMethod !== 'GET') return true;

      // revalidate when manually revalidating via useRevalidator
      if (currentUrl.toString() === nextUrl.toString()) return true;

    -  return defaultShouldRevalidate;
    +  return false;
    };
    ```

4. Update `cart.tsx` to add a headers export and update to `data` import usage.

    ```diff
      import {
    -  json,
    +  data,
        type LoaderFunctionArgs,
        type ActionFunctionArgs,
        type HeadersFunction
      } from '@shopify/remix-oxygen';
    + export const headers: HeadersFunction = ({actionHeaders}) => actionHeaders;

      export async function action({request, context}: ActionFunctionArgs) {
        ...
    -   return json(
    +   return data(
          {
            cart: cartResult,
            errors,
            warnings,
            analytics: {
              cartId,
            },
          },
          {status, headers},
        );
      }

      export async function loader({context}: LoaderFunctionArgs) {
        const {cart} = context;
   -    return json(await cart.get());
   +    return await cart.get();
      }
   ```

5. Deprecate `json` and `defer` import usage from `@shopify/remix-oxygen`.

    Remove `json()`/`defer()` in favor of raw objects.

    Single Fetch supports JSON objects and Promises out of the box, so you can return the raw data from your loader/action functions:

    ```diff
    - import {json} from "@shopify/remix-oxygen";

      export async function loader({}: LoaderFunctionArgs) {
        let tasks = await fetchTasks();
    -   return json(tasks);
    +   return tasks;
      }
    ```

    ```diff
    - import {defer} from "@shopify/remix-oxygen";

      export async function loader({}: LoaderFunctionArgs) {
        let lazyStuff = fetchLazyStuff();
        let tasks = await fetchTasks();
    -   return defer({ tasks, lazyStuff });
    +   return { tasks, lazyStuff };
      }
   ```

    If you were using the second parameter of json/defer to set a custom status or headers on your response, you can continue doing so via the new data API:

    ```diff
    -  import {json} from "@shopify/remix-oxygen";
    +  import {data, type HeadersFunction} from "@shopify/remix-oxygen";

    +  /**
    +   * If your loader or action is returning a response with headers,
    +   * make sure to export a headers function that merges your headers
    +   * on your route. Otherwise, your headers may be lost.
    +   * Remix doc: https://remix.run/docs/en/main/route/headers
    +   **/
    +  export const headers: HeadersFunction = ({loaderHeaders}) => loaderHeaders;

      export async function loader({}: LoaderFunctionArgs) {
        let tasks = await fetchTasks();
    -    return json(tasks, {
    +    return data(tasks, {
          headers: {
            "Cache-Control": "public, max-age=604800"
          }
        });
      }
    ```

6. If you are using legacy customer account flow or multipass, there are a couple more files that requires updating:

    In `root.tsx` and `routes/account.tsx`, add a `headers` export for `loaderHeaders`.

    ```diff
    + export const headers: HeadersFunction = ({loaderHeaders}) => loaderHeaders;
    ```

    In `routes/account_.register.tsx`, add a `headers` export for `actionHeaders`.

    ```diff
    + export const headers: HeadersFunction = ({actionHeaders}) => actionHeaders;
    ```

7. If you are using multipass, in `routes/account_.login.multipass.tsx`

    a. export a `headers` export

    ```diff
    + export const headers: HeadersFunction = ({actionHeaders}) => actionHeaders;
    ```

    b.  Update all `json` response wrapper to `remixData`

    ```diff
    import {
    - json,
    + data as remixData,
    } from '@shopify/remix-oxygen';

    -  return json(
    +  return remixData(
        ...
      );
    ```
