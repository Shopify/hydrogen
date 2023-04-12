---
'@shopify/hydrogen': patch
---

Adopt Remix [`v2_errorBoundary`](https://remix.run/docs/en/release-next/route/error-boundary-v2) future flag

### `v2_errorBoundary` migration steps

1. Remove all `CatchBoundary` route exports

2. Handle route level errors with `ErrorBoundary`

   Before:

   ```jsx
   // app/root.tsx
   export function ErrorBoundary({error}: {error: Error}) {
     const [root] = useMatches();
     const locale = root?.data?.selectedLocale ?? DEFAULT_LOCALE;

     return (
       <html lang={locale.language}>
         <head>
           <title>Error</title>
           <Meta />
           <Links />
         </head>
         <body>
           <Layout layout={root?.data?.layout}>
             <GenericError error={error} />
           </Layout>
           <Scripts />
         </body>
       </html>
     );
   }
   ```

   After:

   ```jsx
   // app/root.tsx
   import {isRouteErrorResponse, useRouteError} from '@remix-run/react';

   export function ErrorBoundary({error}: {error: Error}) {
     const [root] = useMatches();
     const locale = root?.data?.selectedLocale ?? DEFAULT_LOCALE;
     const routeError = useRouteError();
     const isRouteError = isRouteErrorResponse(routeError);

     let title = 'Error';
     let pageType = 'page';

     // We have an route error
     if (isRouteError) {
       title = 'Not found';

       // We have a page not found error
       if (routeError.status === 404) {
         pageType = routeError.data || pageType;
       }
     }

     return (
       <html lang={locale.language}>
         <head>
           <title>{title}</title>
           <Meta />
           <Links />
         </head>
         <body>
           <Layout
             layout={root?.data?.layout}
             key={`${locale.language}-${locale.country}`}
           >
             {isRouteError ? (
               <>
                 {routeError.status === 404 ? (
                   <NotFound type={pageType} />
                 ) : (
                   <GenericError
                     error={{
                       message: `${routeError.status} ${routeError.data}`,
                     }}
                   />
                 )}
               </>
             ) : (
               <GenericError
                 error={error instanceof Error ? error : undefined}
               />
             )}
           </Layout>
           <Scripts />
         </body>
       </html>
     );
   }
   ```
