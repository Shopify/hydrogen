---
'skeleton': patch
'@shopify/cli-hydrogen': patch
---

This is an important fix to a bug with 404 routes and path-based i18n projects where some unknown routes would not properly render a 404. This fixes all new projects, but to fix existing projects, add a `($locale).tsx` route with the following contents:

```ts
import {type LoaderFunctionArgs} from '@remix-run/server-runtime';

export async function loader({params, context}: LoaderFunctionArgs) {
  const {language, country} = context.storefront.i18n;

  if (
    params.locale &&
    params.locale.toLowerCase() !== `${language}-${country}`.toLowerCase()
  ) {
    // If the locale URL param is defined, yet we still are still at the default locale
    // then the the locale param must be invalid, send to the 404 page
    throw new Response(null, {status: 404});
  }

  return null;
}
```
