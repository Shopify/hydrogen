# Localization

There are many different ways to do localization and it all depends on what internationalization scheme is adpoted.
The recommended approach to implement localization is using url schemed approach. This could be:

**Top domain schemed:**

- `example-shop.com`
- `example-shop.ca`
- `example-shop.au`

**Sub domain schemed:**

- `example-shop.com`
- `ca.example-shop.com`
- `au.example-shop.com`

**Url path schemed:**

- `example-shop.com`
- `example-shop.com/en-ca`
- `example-shop.com/en-au`

**Or a mixture of all of the above:**

- `example-shop.com`
- `example-shop.ca/en`
- `example-shop.ca/fr`
- `be.example-shop.eu`

No matter what scheme is used, we need to ensure the following:

1. SEO crawler can find and index these localized pages
2. The localized pages are cacheable

## 1. Provide a static localization mapping

It is recommended that we keep the localization mapping in a static json file. We want localization mapping to have instant data availability because it will be used in many places, such as:

- Determine the storefront api `inContext` country and language
- Generate alternative SEO links

It would delay the rendering of the pages if we have to wait for the response of an api call just to determine the localization scheme.

Here is an example of a static localization mapping:

```jsx
import { CountryCode, LanguageCode } from "@shopify/hydrogen-ui-alpha/storefront-api-types";

export type CountryData = {
  label: string;
  language: LanguageCode,
  country: CountryCode,
}

export type CountriesData = Record<string, CountryData>;

export const countries: CountriesData = {
  '': {
    label: 'United States (USD $)',
    language: 'EN',
    country: 'US',
  },
  '/en-ca': {
    label: 'Canada (CAD $)',
    language: 'EN',
    country: 'CA',
  },
  '/en-au': {
    label: 'Australia (AUD $)',
    language: 'EN',
    country: 'AU',
  },
  ...
};
```

## 2. Create a utility function that can determine the language and country base on the request url

This example returns the locale settings for url scheme localization.

```jsx
import {countries, type CountryData} from '~/data/countries';

export function getLocalizationFromUrl(requestUrl: string): CountryData & {
  pathPrefix: string,
} {
  const url = new URL(requestUrl);
  const firstPathPart = url.pathname.substring(
    0,
    url.pathname.substring(1).indexOf('/') + 1,
  );

  return countries[firstPathPart]
    ? {
        ...countries[firstPathPart],
        pathPrefix: firstPathPart,
      }
    : {
        ...countries[''],
        pathPrefix: '',
      };
}
```

With this utility function, we can obtain the `language` and `country` within loader functions.

```jsx
export const loader: LoaderFunction = async function loader({
  request,
}) {
  const {langage, country} = getLocalizationFromUrl(request.url);

  ...
};
```

## 3. (Optional) Build the country selector

1. Supply the available countries data from the `root` loader function

```jsx
import { countries } from '~/data/countries';

export const loader: LoaderFunction = async function loader() {
  ...

  return defer({
    ...,
    countries,
  });
};
```

2. Render the avaialble countries as anchor links

```jsx
import {Link, useMatches} from '@remix-run/react';
...

export function CountrySelector() {
  const matches = useMatches();
  const rootData = matches.find((match) => match.pathname === '/');
  if (!rootData) return null;

  const countries = rootData?.countries;
  if (!countries) return null;

  return (
    <div>
      {Object.keys(countries).map((countryKey) => {
        const locale = countries[countryKey];
        const isRelativePath = countryKey === '' || countryKey[0] === '/'

        // use <Link> for relative links and <a> for external links
        return isRelativePath ? (
          <Link to={countryKey}>
            {locale.label}
          </Link>
        ) : (
          <a href={countryKey}>{locale.label}</a>
        );
      })}
    </div>
  );
}
```

## 4. (Optional) Update buyer's cart currency on localization change

If you are using url path localization scheme, you want to make sure the buyer's cart
is displaying in the expected localization.

1. In your cart action, add a `update-cart-buyer-country` intent

```jsx
export const action: ActionFunction = async ({request, context}) => {
  ...

  switch (intent) {
    ...
    case 'update-cart-buyer-country': {
      const countryCode = formData.get('country') as CountryCode;
      invariant(countryCode, 'Missing country');

      let currentCartId = cartId;
      const headers = new Headers();

      // Create an empty cart if we don't have a cart
      if (!currentCartId) {
        cart = await createCart({
          cart: {lines: []},
          locale,
        });

        session.set('cartId', cart.id);
        currentCartId = cart.id;
        headers.set('Set-Cookie', await session.commit());
      }

      // Update cart buyer's country code
      if (currentCartId) {
        cart = await updateCartBuyerIdentity({
          cartId: currentCartId,
          buyerIdentity: {
            countryCode,
          },
          locale
        });
      }

      return json({cart}, {headers});
    }

    default: {
      throw new Error(`Cart intent ${intent} not supported`);
    }
  }
};
```

2. Attach this event to the country selector

```jsx
import {Link, useFetcher} from '@remix-run/react';
...

export function CountrySelector() {
  ...

  const countrySelectorFetcher = useFetcher();

  return (
    <div>
      {Object.keys(countries).map((countryKey) => {
        const locale = countries[countryKey];
        const isRelativePath = countryKey === '' || countryKey[0] === '/'

        // use <Link> for relative links and <a> for external links
        return isRelativePath ? (
          <Link
            to={countryKey}
            onClick={() => {
              countrySelectorFetcher.submit({
                country: locale.country,
                intent: 'update-cart-buyer-country',
              }, {
                method: 'post',
                action: '/cart'
              });
            }}
          >
            {locale.label}
          </Link>
        ) : (
          <a href={countryKey}>{locale.label}</a>
        );
      })}
    </div>
  );
}
```

# Url path localization

In order acheive this localiztion scheme, we need to create route pages for the localized url path as well.
Let's say, we have the following routes:

```
routes/
  index.tsx
  products
    $productHandle.tsx
```

When we change locale, we want to have urls to look like:

| URL                             | `en-ca`                               |
| ------------------------------- | ------------------------------------- |
| `example-shop.com`              | `example-shop.com/en-ca`              |
| `example-shop.com/products/abc` | `example-shop.com/en-ca/products/abc` |

To get the localized path, we'll need to add splat routes:

```
routes/
  index.tsx
  products
    $productHandle.tsx
  $lang
    index.tsx
    products
      $productHandle.tsx
```

And what these extra routes will do is simply a re-export of the corresponding route. For example:

```jsx
// routes/index.tsx
export const meta: MetaFunction = ({data}) => {
  ...
}

export async function loader() {
  ...
}

export default function Homepage() {
  ...
}

// routes/$lang/index.tsx
export {default, meta, loader} from '~/routes/index';
```

```jsx
// routes/products/$productHandle.tsx
export async function loader() {
  ...
}

export default function Product() {
  ...
}

export function ProductForm() {
  ...
}

// routes/$lang/products/$productHandle.tsx
export {
  default,
  loader,
  ProductForm,
} from '~/routes/products/$productHandle';
```

You will most likely need to create a wrapper `<Link>` component to make sure navigations
between pages matches with localization.

```jsx
import {
  Link as RemixLink,
  useParams,
  NavLink as RemixNavLink,
  type NavLinkProps as RemixNavLinkProps,
  type LinkProps as RemixLinkProps,
} from '@remix-run/react';

type LinkProps = Omit<RemixLinkProps, 'className'> & {
  className?: RemixNavLinkProps['className'] | RemixLinkProps['className'],
};

export function Link(props: LinkProps) {
  const {to, className, ...resOfProps} = props;
  const {lang} = useParams();

  let toWithLang = to;

  if (typeof to === 'string') {
    toWithLang = lang ? `/${lang}${to}` : to;
  }

  if (typeof className === 'function') {
    return (
      <RemixNavLink to={toWithLang} className={className} {...resOfProps} />
    );
  }

  return <RemixLink to={toWithLang} className={className} {...resOfProps} />;
}
```

# Request header or cookie based localization detection

You would implement this localization detection for better buyer experience. However, this detection
should never be the only way to change localization.

Why?

- Page caching will ignore cookies and most headers and search params
- SEO bots tends to origin from the US and would not change their `accept-language` header or set any cookie

You can implement this logic inside the utility function that can determine the language and country base on the request.

```jsx
import {countries, type CountryData} from '~/data/countries';

export function getLocalizationFromUrl(request: Request): CountryData & {
  pathPrefix: string,
} {
  const url = new URL(requestUrl.url);
  const firstPathPart = url.pathname.substring(
    0,
    url.pathname.substring(1).indexOf('/') + 1,
  );

  const acceptLang = request.headers.get('accept-language');
  // do something with acceptLang

  const cookies = request.headers.get('cookie');
  // extract the cookie that contains user lang preference and do something with it

  return countries[firstPathPart]
    ? {
        ...countries[firstPathPart],
        pathPrefix: firstPathPart,
      }
    : {
        ...countries[''],
        pathPrefix: '',
      };
}
```
