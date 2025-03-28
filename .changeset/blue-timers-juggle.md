---
"@shopify/cli-hydrogen": patch
---

Test

  1. Create a `routes.ts` file.

     ```ts
     import {flatRoutes} from '@remix-run/fs-routes';
     import {layout, type RouteConfi } from '@remix-run/route-config';
     import {hydrogenRoutes} from '@shopify/hydrogen';

     export default hydrogenRoutes([
       // Your entire app reading from routes folder using Layout from layout.tsx
       layout('./layout.tsx', await flatRoutes()),
     ]) satisfies RouteConfig;
     ```
