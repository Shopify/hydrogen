---
'skeleton': patch
'@shopify/hydrogen': patch
'@shopify/cli-hydrogen': patch
---

Support for the Remix future flag `v3_routeConfig`.

Please refer to the Remix documentation for more details on `v3_routeConfig` future flag: [https://remix.run/docs/en/main/start/future-flags#v3_routeconfig](https://remix.run/docs/en/main/start/future-flags#v3_routeconfig)

1. Add the following npm package dev dependencies:

    ```diff
      "devDependencies": {
        "@remix-run/dev": "^2.16.1",
    +    "@remix-run/fs-routes": "^2.16.1",
    +    "@remix-run/route-config": "^2.16.1",
    ```

1. If you have `export function Layout` in your `root.tsx`, move this export into its own file. For example:

    ```ts
    // /app/layout.tsx
    export default function Layout() {
      const nonce = useNonce();
      const data = useRouteLoaderData<RootLoader>('root');

      return (
        <html lang="en">
        ...
      );
    }
    ```

1. Create a `routes.ts` file.

    ```ts
    import {flatRoutes} from '@remix-run/fs-routes';
    import {layout, type RouteConfig} from '@remix-run/route-config';
    import {hydrogenRoutes} from '@shopify/hydrogen';

    export default hydrogenRoutes([
      // Your entire app reading from routes folder using Layout from layout.tsx
      layout('./layout.tsx', (await flatRoutes())),
    ]) satisfies RouteConfig;
    ```

1. Update your `vite.config.ts`.

    ```diff
    export default defineConfig({
      plugins: [
        hydrogen(),
        oxygen(),
        remix({
    -      presets: [hydrogen.preset()],
    +      presets: [hydrogen.v3preset()],
    ```
