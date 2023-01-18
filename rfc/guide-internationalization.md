# Internationalization

## Change your default localization

1. In your `server.ts`, update `i18n`'s `language` and `country` to your locale preference

   ```jsx
   return await requestHandler(
     request,
     {
       env,
       context,
       storefront: {
         ...
         storefrontApiVersion: '2022-10',
         i18n: {
           language: 'EN',
           country: 'CA',
         },
       },
     },
     {
       session,
     },
   );
   ```

   Notes:

   - `language` should follow [LanguageCode enum](https://shopify.dev/api/storefront/2022-10/enums/LanguageCode)
   - `country` should follow [CountryCode enum](https://shopify.dev/api/storefront/2022-10/enums/CountryCode)

2. Make sure your `root.tsx` are updated according to your locale preference as well.

   ```jsx
   export default function App() {
     return (
       <html lang="EN">
         ...
       </html>
     );
   }

   export function CatchBoundary() {
     return (
       <html lang="EN">
         ...
       </html>
     );
   }

   export ErrorBoundary({error}: {error: Error}) {
     return (
       <html lang="EN">
         ...
       </html>
     );
   }
   ```

## Setting up with more than one localizations

### Localization scheme using domains and sub domains

1. Create a utilities function that will return an object with a partial shape of following:

   ```jsx
   import {
     CountryCode,
     LanguageCode,
   } from '@shopify/storefront-kit-react/storefront-api-types';

   export type Locale = {
     language: LanguageCode,
     country: CountryCode,
   };
   ```

   Example utilities function:

   ```jsx
   export function getLocaleFromRequest(request: Request): Locale {
     const url = new URL(request.url);

     switch (url.host) {
       case 'ca.hydrogen.shop':
         return {
           language: 'EN',
           country: 'CA',
         };
         break;
       case 'hydrogen.au':
         return {
           language: 'EN',
           country: 'AU',
         };
         break;
       default:
         return {
           language: 'EN',
           country: 'US',
         };
     }
   }
   ```

2. In your `server.ts`, update `i18n` to the result of the utilities function

   ```jsx
   return await requestHandler(
     request,
     {
       env,
       context,
       storefront: {
         ...
         storefrontApiVersion: '2022-10',
         i18n: getLocaleFromRequest(request),
       },
     },
     {
       session,
     },
   );
   ```

3. Update your graphql queries with `inContext` directives

   For example:

   ```jsx
   const FEATURED_QUERY = `#graphql
     query homepage {
       collections(first: 3, sortKey: UPDATED_AT) {
         nodes {
           id
           title
           handle
           image {
             altText
             width
             height
             url
           }
         }
       }
     }
   `;
   ```

   Add the `inContext` with `$country` and `$language`

   ```jsx
   const FEATURED_COLLECTIONS_QUERY = `#graphql
     query homepage($country: CountryCode, $language: LanguageCode)
     @inContext(country: $country, language: $language) {
       collections(first: 3, sortKey: UPDATED_AT) {
         nodes {
           id
           title
           handle
           image {
             altText
             width
             height
             url
           }
         }
       }
     }
   `;
   ```

   Then you can make the query with `storefront.query` in the data loader

   ```jsx
   export async function loader({
     context: {storefront},
   }: LoaderArgs) {
     return json({
       featureCollections: await storefront.query<{
         collections: CollectionConnection;
       }>(FEATURED_COLLECTIONS_QUERY),
     });
   }
   ```

   Notice that we didn't need to provide query variables for `country` and `language`?
   This is because `storefront.query` function will inject these values for you base on
   what's defined in the `i18n`.

   For example, if a request came from `hydrogen.au`, country `AU` and language `EN` will be
   used as defined in the example utilities function above.

   However, if you need to override it, you just need to supply the query variables

   ```jsx
   export async function loader({
     context: {storefront},
   }: LoaderArgs) {
     return json({
       featureCollection: await storefront.query<{
         collections: CollectionConnection;
       }>(FEATURED_COLLECTIONS_QUERY, {
         variables: {
           country: 'CA',    // Always query back in CA currency
           language: 'FR',   // Always query back in FR language
         }
       }),
     });
   }
   ```

### Localization scheme using url paths

Let's say we want to add language localization as an url path.
We want to have urls to look like the following:

| URL                             | `fr-ca`                            |
| ------------------------------- | ---------------------------------- |
| `ca.hydrogen.shop`              | `ca.hydrogen.shop/fr`              |
| `ca.hydrogen.shop/products/abc` | `ca.hydrogen.shop/fr/products/abc` |

1. Update the utilities function to handle the new url path

   ```jsx
   export function getLocaleFromRequest(request: Request): Locale {
     const url = new URL(request.url);

     switch (url.host) {
       case 'ca.hydrogen.shop':
         if (/^\/fr($|\/)/.test(url.pathname)) {
           return {
             language: 'FR',
             country: 'CA',
           };
         } else {
           return {
             language: 'EN',
             country: 'CA',
           };
         }
         break;
       case 'hydrogen.au':
         return {
           language: 'EN',
           country: 'AU',
         };
         break;
       default:
         return {
           language: 'EN',
           country: 'US',
         };
     }
   }
   ```

2. Using Remix's splat routes, we are going to generate `/$lang/*` files
   (Note: This is temporary workaround for now)

   All route files under `$lang` are just re-exports of the main routes file.
   For now, we can update `remix.config.js` to auto generate these files on build.
   Feel free to `.gitignore` files generated under `$lang` folder and re-run `dev`
   or `build` whenever a file or module export is added or removed.

   ```jsx
   const fs = require('fs');
   const path = require('path');
   const esbuild = require('esbuild');
   const recursive = require('recursive-readdir');

   module.exports = {
     ignoredRouteFiles: ['**/.*'],
     async routes() {
       const appDir = path.resolve(__dirname, 'app');
       const routesDir = path.resolve(appDir, 'routes');
       const langDir = path.resolve(routesDir, '$lang');

       const files = await recursive(routesDir, [
         (file) => {
           return file.replace(/\\/g, '/').match(/routes\/\$lang\//);
         },
       ]);

       // eslint-disable-next-line no-console
       console.log(`Duplicating ${files.length} route(s) for translations`);

       for (let file of files) {
         let bundle = await esbuild.build({
           entryPoints: {entry: file},
           bundle: false,
           metafile: true,
           write: false,
         });

         const moduleExports = bundle.metafile.outputs['entry.js'].exports;

         const moduleId =
           '~/' +
           path
             .relative(appDir, file)
             .replace(/\\/g, '/')
             .slice(0, -path.extname(file).length);

         const outFile = path.resolve(langDir, path.relative(routesDir, file));

         fs.mkdirSync(path.dirname(outFile), {recursive: true});
         fs.writeFileSync(
           outFile,
           `export {${moduleExports.join(', ')}} from ${JSON.stringify(
             moduleId,
           )};\n`,
         );
       }

       return {};
     },
   };
   ```

3. Make sure to add a `$.tsx` files under `/routes` folder. This splat route
   will handle all the non-matching splat routes. It should contain the following:

   ```jsx
   export async function loader() {
     throw new Response('Not found', {status: 404});
   }

   export default function Component() {
     return null;
   }
   ```

4. In the `routes/index.tsx`, handle invalid url path localizations

   ```jsx
   export async function loader({
     request,
     params,
     context: {storefront},
   }: LoaderArgs) {
     const {language} = storefront.i18n;

     if (
       params.lang &&
       params.lang.toLowerCase() !== language.toLowerCase()
     ) {
       // If the lang URL param is defined, and it didn't match a valid localization,
       // then the lang param must be invalid, send to the 404 page
       throw new Response('Not found', {status: 404});
     }

     ...
   }
   ```

5. Create an utility function that will add the path prefix to url path

   ```jsx
   export function usePrefixPathWithLocale(path: string) {
     const [root] = useMatches();
     const selectedLocale = root.data.selectedLocale;

     return selectedLocale
       ? `${selectedLocale.pathPrefix}${
           path.startsWith('/') ? path : '/' + path
         }`
       : path;
   }
   ```

   Use this utility function anywhere where you need to define a localized path.
   For example, form actions should be localize path as well.

6. Create a `<Link />` wrapper component that will add the path prefix and
   make sure your project is using this `Link` component for all inbound
   navigation.

   ```jsx
   import {
     Link as RemixLink,
     NavLink as RemixNavLink,
     useMatches,
   } from '@remix-run/react';
   import {usePrefixPathWithLocale} from '~/lib/utils';

   export function Link(props) {
     const {to, className, ...resOfProps} = props;
     const [root] = useMatches();
     const selectedLocale = root.data.selectedLocale;

     let toWithLocale = to;

     if (typeof to === 'string') {
       toWithLocale = selectedLocale ? `${selectedLocale.pathPrefix}${to}` : to;
     }

     if (typeof className === 'function') {
       return (
         <RemixNavLink
           to={toWithLocale}
           className={className}
           {...resOfProps}
         />
       );
     }

     return (
       <RemixLink to={toWithLocale} className={className} {...resOfProps} />
     );
   }
   ```

### Localization detection using response header, cookies, or url search params

You can do all of these detection inside the utility function that we created.

However, you would implement this localization detection only for better buyer experience.
This localization detection should never be the only way to change localization.

**Why?**

- Page caching will ignore cookies and most headers and search params
- SEO bots tends to origin from the US and would not change their `accept-language` header or set any cookie

```jsx
export function getLocaleFromRequest(request: Request): Locale {
  const url = new URL(request.url);
  const acceptLang = request.headers.get('accept-language');
  // do something with acceptLang

  const cookies = request.headers.get('cookie');
  // extract the cookie that contains user lang preference and do something with it

  switch (url.host) {
    case 'ca.hydrogen.shop':
      if (/^\/fr($|\/)/.test(url.pathname)) {
        return {
          language: 'FR',
          country: 'CA',
        };
      } else {
        return {
          language: 'EN',
          country: 'CA',
        };
      }
      break;
    case 'hydrogen.au':
      return {
        language: 'EN',
        country: 'AU',
      };
      break;
    default:
      return {
        language: 'EN',
        country: 'US',
      };
  }
}
```

## Build a country selector

1. Provide a list of available countries. This file should be just a static json instead of a
   result from an api query. This available countries list will most likely need to be rendered
   at every page. For performance and SEO reasons, it is recommended that it is just a static
   json variable. Optionally, you can create a build script that generates this file on build.

   ```jsx
   export const countries = {
     default: {
       language: 'EN',
       country: 'US',
       label: 'United States (USD $)',
       host: 'hydrogen.shop',
     },
     'en-ca': {
       language: 'EN',
       country: 'CA',
       label: 'Canada (CAD $)',
       host: 'ca.hydrogen.shop',
     },
     'fr-ca': {
       language: 'EN',
       country: 'CA',
       label: 'Canada (Français) (CAD $)',
       host: 'ca.hydrogen.shop',
       pathPrefix: '/fr',
     },
     'en-au': {
       language: 'EN',
       country: 'AU',
       label: 'Australia (AUD $)',
       host: 'hydrogen.au',
     },
   };
   ```

   You are feel to add any keys that would help you generate the country selector easier.
   Make sure to update your utility function with the countries json

   ```jsx
   import {countries} from '~/data/countries';

   export function getLocaleFromRequest(request: Request): Locale {
     const url = new URL(request.url);

     switch (url.host) {
       case 'ca.hydrogen.shop':
         if (/^\/fr($|\/)/.test(url.pathname)) {
           return countries['fr-ca'];
         } else {
           return countries['en-ca'];
         }
         break;
       case 'hydrogen.au':
         return countries['en-au'];
         break;
       default:
         return countries['default'];
     }
   }
   ```

2. Supply the selected locale in the `root` loader function

   ```jsx
   import {countries} from '~/data/countries';

   export const loader: LoaderFunction = async function loader() {
     ...
     return defer({
       ...,
       selectedLocale: await getLocaleFromRequest(request),
     });
   };
   ```

3. Create an api endpoint for the available countries

   ```jsx
   // routes/api/countries
   import {json} from '@remix-run/server-runtime';
   import {CacheLong, generateCacheControlHeader} from '@shopify/hydrogen';
   import {countries} from '~/data/countries';

   export async function loader() {
     return json(
       {
         ...countries,
       },
       {
         headers: {
           'cache-control': generateCacheControlHeader(CacheLong()),
         },
       },
     );
   }

   // no-op
   export default function CountriesApiRoute() {
     return null;
   }
   ```

4. Render the available countries as forms

   ```jsx
   import {Form, useMatches, useLocation} from '@remix-run/react';
   ...
   export function CountrySelector() {
     const [root] = useMatches();
     const selectedLocale = root.data.selectedLocale;
     const {pathname, search} = useLocation();

     const [countries, setCountries] = useState({});

      // Get available countries list
      const fetcher = useFetcher();
      useEffect(() => {
        if (!fetcher.data) {
          fetcher.load('/api/countries');
          return;
        }
        setCountries(fetcher.data);
      }, [countries, fetcher.data]);

     const strippedPathname = pathname.replace(selectedLocale.pathPrefix, '');

     return (
       <details>
         <summary>
           {selectedLocale.label}
         </summary>
         <div className="overflow-auto border-t py-2 bg-contrast w-full max-h-36">
           {countries && Object.keys(countries).map((countryKey) => {
             const locale = countries[countryKey];
             const hreflang = `${locale.language}-${locale.country}`;

             return (
               <Form method="post" action="/locale" key={hreflang}>
                 <input
                   type="hidden"
                   name="language"
                   value={locale.language}
                 />
                 <input type="hidden" name="country" value={locale.country} />
                 <input
                   type="hidden"
                   name="path"
                   value={`${strippedPathname}${search}`}
                 />
                 <Button
                   type="submit"
                   variant="primary"
                 >
                   {locale.label}
                 </Button>
               </Form>
             );
           })}
         </div>
       </details>
     );
   }
   ```

5. Create the `routes/locale.tsx` route that will handle locale change

   ```jsx
   import {
     CountryCode,
     LanguageCode,
   } from '@shopify/storefront-kit-react/storefront-api-types';
   import {redirect, type AppLoadContext, type ActionFunction} from '@shopify/remix-oxygen';
   import invariant from 'tiny-invariant';
   import {updateCartBuyerIdentity} from '~/data';
   import {countries} from '~/data/countries';

   export const action: ActionFunction = async ({request, context}) => {
     const {session} = context;
     const formData = await request.formData();

     // Make sure the form request is valid
     const languageCode = formData.get('language') as LanguageCode;
     invariant(languageCode, 'Missing language');

     const countryCode = formData.get('country') as CountryCode;
     invariant(countryCode, 'Missing country');

     // determine where to redirect to relative to where user navigated from
     // ie. hydrogen.shop/collections -> ca.hydrogen.shop/collections
     const path = formData.get('path');
     const toLocale = countries[`${languageCode}-${countryCode}`.toLowerCase()];

     const cartId = await session.get('cartId');

     // Update cart buyer's country code if we have a cart id
     if (cartId) {
       await updateCartBuyerIdentity(context, {
         cartId,
         buyerIdentity: {
           countryCode,
         },
       });
     }

     return redirect(`https://${toLocale.host}${toLocale.pathPrefix || ''}${path}`, 302);
   };

   function updateCartBuyerIdentity(
     {storefront}: AppLoadContext,
     {
       cartId,
       buyerIdentity,
     }: {
       cartId: string;
       buyerIdentity: CartBuyerIdentityInput;
     },
   ) {
     const data = await storefront.mutate<{
       cartBuyerIdentityUpdate: {cart: Cart};
     }>(UPDATE_CART_BUYER_COUNTRY, {
       variables: {
         cartId,
         buyerIdentity,
       },
     });

     invariant(data, 'No data returned from Shopify API');

     return data.cartBuyerIdentityUpdate.cart;
   }

   const UPDATE_CART_BUYER_COUNTRY = `#graphql
     mutation CartBuyerIdentityUpdate(
       $cartId: ID!
       $buyerIdentity: CartBuyerIdentityInput!
       $country: CountryCode = ZZ
     ) @inContext(country: $country) {
       cartBuyerIdentityUpdate(cartId: $cartId, buyerIdentity: $buyerIdentity) {
         cart {
           id
         }
       }
     }
   `;
   ```

6. Make sure to provide a `key` to the components that will change due to localization.
   Especially for url path localization schemes.

   Sometimes, React won't know when to re-render a component. This means that, you could
   be changing the locale and you will see the correct currency data being returned, but
   React didn't re-render and old currency is still being displayed.

   The easy way to avoid this problem is to put localization as key in the `App`.

   ```jsx
   export default function App() {
     const data = useLoaderData<typeof loader>();
     const locale = data.selectedLocale;

     return (
       <html lang={locale.language}>
         <head>
           <Seo />
           <Meta />
           <Links />
         </head>
         <body>
           <Layout
             layout={data.layout as LayoutData}
             key={`${locale.language}-${locale.country}`} . // key by hreflang
           >
             <Outlet />
           </Layout>
           <Debugger />
           <ScrollRestoration />
           <Scripts />
         </body>
       </html>
     );
   }
   ```

   However, you may see a page jump when changing locale.

   The other way is to key by individual components. As you can see, this gets
   messy very quickly.

   Reference: https://kentcdodds.com/blog/understanding-reacts-key-prop
