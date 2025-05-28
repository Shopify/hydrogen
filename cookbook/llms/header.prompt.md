# Overview

This prompt describes how to implement "header" in a Hydrogen storefront. Below is a "recipe" that contains the steps to apply to a basic Hydrogen skeleton template to achieve the desired outcome.
The same logic can be applied to any other Hydrogen storefront project, adapting the implementation details to the specific needs/structure/conventions of the project, but it's up to the developer to do so.
If there are any prerequisites, the recipe below will explain them; if the user is trying to implement the feature described in this recipe, make sure to prominently mention the prerequisites and any other preliminary instructions, as well as followups.
If the user is asking on how to implement the feature from scratch, please first describe the feature in a general way before jumping into the implementation details.
Please note that the recipe steps below are not necessarily ordered in the way they should be executed, as it depends on the user's needs and the specific details of the project. The recipe steps descriptions should allow you to understand what is required to be done in a certain order and what is not. Remember that file names in the recipe are related to the Hydrogen skeleton template, not the user's project, so make sure to adapt the file names to the user's project.

# AI model verification steps

- Never edit generated files (ending with .d.ts) directly; instead, run the `npm run codegen` command to update them (if the command is available).

# Summary

Add a header menu to your Hydrogen store

# User Intent Recognition

<user_queries>

</user_queries>

# Troubleshooting

<troubleshooting>

</troubleshooting>

# Recipe Implementation

Here's the header recipe for the base Hydrogen skeleton template:

<recipe_implementation>

## Description

This recipe lets you add a header menu to your Hydrogen store

In this recipe you'll make the following changes:

1. Set up a header menu in the admin
2. Modify the root layout to query for the header menu
3. Add  <Header /> and <MobileHeaderMenu /> components display the header links
4. Add an <Aside /> component to render the mobile header menu
4. Display the header inside the <PageLayout /> and <Aside />

## New files added to the template by this recipe

- app/components/Aside.tsx
- app/components/Header.tsx

## Steps

### Step 1: app/components/PageLayout.tsx



#### File: /app/components/PageLayout.tsx

```diff
@@ -1,7 +1,56 @@
+import type {CartApiQueryFragment, HeaderQuery} from 'storefrontapi.generated';
+import {Header, HeaderMenu} from '~/components/Header';
+import {Aside} from '~/components/Aside';
+
 interface PageLayoutProps {
+  cart: Promise<CartApiQueryFragment | null>;
+  header: HeaderQuery;
+  isLoggedIn: Promise<boolean>;
+  publicStoreDomain: string;
   children?: React.ReactNode;
 }
 
-export function PageLayout({children = null}: PageLayoutProps) {
-  return <main>{children}</main>;
+export function PageLayout({
+  cart,
+  children = null,
+  header,
+  isLoggedIn,
+  publicStoreDomain,
+}: PageLayoutProps) {
+  return (
+    <Aside.Provider>
+      <MobileMenuAside header={header} publicStoreDomain={publicStoreDomain} />
+      {header && (
+        <Header
+          header={header}
+          cart={cart}
+          isLoggedIn={isLoggedIn}
+          publicStoreDomain={publicStoreDomain}
+        />
+      )}
+      <main>{children}</main>
+    </Aside.Provider>
+  );
+}
+
+function MobileMenuAside({
+  header,
+  publicStoreDomain,
+}: {
+  header: PageLayoutProps['header'];
+  publicStoreDomain: PageLayoutProps['publicStoreDomain'];
+}) {
+  return (
+    header?.menu &&
+    header?.shop?.primaryDomain?.url && (
+      <Aside type="mobile" heading="MENU">
+        <HeaderMenu
+          menu={header.menu}
+          viewport="mobile"
+          primaryDomainUrl={header.shop.primaryDomain.url}
+          publicStoreDomain={publicStoreDomain}
+        />
+      </Aside>
+    )
+  );
 }
```

### Step 1: app/components/Aside.tsx



#### File: [Aside.tsx](https://github.com/Shopify/hydrogen/blob/3dbbb1ee554d96261a2249d8126c8afd11e7ad47/cookbook/recipes/header/ingredients/templates/skeleton/app/components/Aside.tsx)

```tsx
import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useState,
} from 'react';

type AsideType = 'search' | 'cart' | 'mobile' | 'closed';
type AsideContextValue = {
  type: AsideType;
  open: (mode: AsideType) => void;
  close: () => void;
};

/**
 * A side bar component with Overlay
 * @example
 * ```jsx
 * <Aside type="search" heading="SEARCH">
 *  <input type="search" />
 *  ...
 * </Aside>
 * ```
 */
export function Aside({
  children,
  heading,
  type,
}: {
  children?: React.ReactNode;
  type: AsideType;
  heading: React.ReactNode;
}) {
  const {type: activeType, close} = useAside();
  const expanded = type === activeType;

  useEffect(() => {
    const abortController = new AbortController();

    if (expanded) {
      document.addEventListener(
        'keydown',
        function handler(event: KeyboardEvent) {
          if (event.key === 'Escape') {
            close();
          }
        },
        {signal: abortController.signal},
      );
    }
    return () => abortController.abort();
  }, [close, expanded]);

  return (
    <div
      aria-modal
      className={`overlay ${expanded ? 'expanded' : ''}`}
      role="dialog"
    >
      <button className="close-outside" onClick={close} />
      <aside>
        <header>
          <h3>{heading}</h3>
          <button className="close reset" onClick={close} aria-label="Close">
            &times;
          </button>
        </header>
        <main>{children}</main>
      </aside>
    </div>
  );
}

const AsideContext = createContext<AsideContextValue | null>(null);

Aside.Provider = function AsideProvider({children}: {children: ReactNode}) {
  const [type, setType] = useState<AsideType>('closed');

  return (
    <AsideContext.Provider
      value={{
        type,
        open: setType,
        close: () => setType('closed'),
      }}
    >
      {children}
    </AsideContext.Provider>
  );
};

export function useAside() {
  const aside = useContext(AsideContext);
  if (!aside) {
    throw new Error('useAside must be used within an AsideProvider');
  }
  return aside;
}

```

### Step 2: app/lib/fragments.ts



#### File: /app/lib/fragments.ts

```diff
@@ -0,0 +1,56 @@
+const MENU_FRAGMENT = `#graphql
+  fragment MenuItem on MenuItem {
+    id
+    resourceId
+    tags
+    title
+    type
+    url
+  }
+  fragment ChildMenuItem on MenuItem {
+    ...MenuItem
+  }
+  fragment ParentMenuItem on MenuItem {
+    ...MenuItem
+    items {
+      ...ChildMenuItem
+    }
+  }
+  fragment Menu on Menu {
+    id
+    items {
+      ...ParentMenuItem
+    }
+  }
+` as const;
+
+export const HEADER_QUERY = `#graphql
+  fragment Shop on Shop {
+    id
+    name
+    description
+    primaryDomain {
+      url
+    }
+    brand {
+      logo {
+        image {
+          url
+        }
+      }
+    }
+  }
+  query Header(
+    $country: CountryCode
+    $headerMenuHandle: String!
+    $language: LanguageCode
+  ) @inContext(language: $language, country: $country) {
+    shop {
+      ...Shop
+    }
+    menu(handle: $headerMenuHandle) {
+      ...Menu
+    }
+  }
+  ${MENU_FRAGMENT}
+` as const;
```

### Step 2: app/components/Header.tsx



#### File: [Header.tsx](https://github.com/Shopify/hydrogen/blob/3dbbb1ee554d96261a2249d8126c8afd11e7ad47/cookbook/recipes/header/ingredients/templates/skeleton/app/components/Header.tsx)

```tsx
import {NavLink} from 'react-router';
import type {HeaderQuery, CartApiQueryFragment} from 'storefrontapi.generated';
import {useAside} from '~/components/Aside';
interface HeaderProps {
  header: HeaderQuery;
  cart: Promise<CartApiQueryFragment | null>;
  isLoggedIn: Promise<boolean>;
  publicStoreDomain: string;
}

type Viewport = 'desktop' | 'mobile';

export function Header({header, publicStoreDomain}: HeaderProps) {
  const {shop, menu} = header;
  return (
    <header className="header">
      <NavLink prefetch="intent" to="/" style={activeLinkStyle} end>
        <strong>{shop.name}</strong>
      </NavLink>
      <HeaderMenu
        menu={menu}
        viewport="desktop"
        primaryDomainUrl={header.shop.primaryDomain.url}
        publicStoreDomain={publicStoreDomain}
      />
      <HeaderCtas />
    </header>
  );
}

export function HeaderMenu({
  menu,
  primaryDomainUrl,
  viewport,
  publicStoreDomain,
}: {
  menu: HeaderProps['header']['menu'];
  primaryDomainUrl: HeaderProps['header']['shop']['primaryDomain']['url'];
  viewport: Viewport;
  publicStoreDomain: HeaderProps['publicStoreDomain'];
}) {
  const className = `header-menu-${viewport}`;
  const {close} = useAside();

  return (
    <nav className={className} role="navigation">
      {viewport === 'mobile' && (
        <NavLink
          end
          onClick={close}
          prefetch="intent"
          style={activeLinkStyle}
          to="/"
        >
          Home
        </NavLink>
      )}
      {(menu || FALLBACK_HEADER_MENU).items.map((item) => {
        if (!item.url) return null;

        // if the url is internal, we strip the domain
        const url =
          item.url.includes('myshopify.com') ||
          item.url.includes(publicStoreDomain) ||
          item.url.includes(primaryDomainUrl)
            ? new URL(item.url).pathname
            : item.url;
        return (
          <NavLink
            className="header-menu-item"
            end
            key={item.id}
            onClick={close}
            prefetch="intent"
            style={activeLinkStyle}
            to={url}
          >
            {item.title}
          </NavLink>
        );
      })}
    </nav>
  );
}

function HeaderCtas() {
  return (
    <nav className="header-ctas" role="navigation">
      <HeaderMenuMobileToggle />
    </nav>
  );
}

function HeaderMenuMobileToggle() {
  const {open} = useAside();
  return (
    <button
      className="header-menu-mobile-toggle reset"
      onClick={() => open('mobile')}
    >
      <h3>☰</h3>
    </button>
  );
}

const FALLBACK_HEADER_MENU = {
  id: 'gid://shopify/Menu/199655587896',
  items: [
    {
      id: 'gid://shopify/MenuItem/461609500728',
      resourceId: null,
      tags: [],
      title: 'Collections',
      type: 'HTTP',
      url: '/collections',
      items: [],
    },
    {
      id: 'gid://shopify/MenuItem/461609533496',
      resourceId: null,
      tags: [],
      title: 'Blog',
      type: 'HTTP',
      url: '/blogs/journal',
      items: [],
    },
    {
      id: 'gid://shopify/MenuItem/461609566264',
      resourceId: null,
      tags: [],
      title: 'Policies',
      type: 'HTTP',
      url: '/policies',
      items: [],
    },
    {
      id: 'gid://shopify/MenuItem/461609599032',
      resourceId: 'gid://shopify/Page/92591030328',
      tags: [],
      title: 'About',
      type: 'PAGE',
      url: '/pages/about',
      items: [],
    },
  ],
};

function activeLinkStyle({
  isActive,
  isPending,
}: {
  isActive: boolean;
  isPending: boolean;
}) {
  return {
    fontWeight: isActive ? 'bold' : undefined,
    color: isPending ? 'grey' : 'black',
  };
}

```

### Step 3: app/root.tsx



#### File: /app/root.tsx

```diff
@@ -1,4 +1,4 @@
-import {Analytics, getShopAnalytics, useNonce} from '@shopify/hydrogen';
+import {getShopAnalytics, useNonce} from '@shopify/hydrogen';
 import {type LoaderFunctionArgs} from '@shopify/remix-oxygen';
 import {
   Outlet,
@@ -15,6 +15,7 @@ import favicon from '~/assets/favicon.svg';
 import resetStyles from '~/styles/reset.css?url';
 import appStyles from '~/styles/app.css?url';
 import {PageLayout} from '~/components/PageLayout';
+import {HEADER_QUERY} from '~/lib/fragments';
 
 export type RootLoader = typeof loader;
 
@@ -74,6 +75,7 @@ export async function loader(args: LoaderFunctionArgs) {
   const {storefront, env} = args.context;
 
   return {
+    ...criticalData,
     ...deferredData,
     publicStoreDomain: env.PUBLIC_STORE_DOMAIN,
     shop: getShopAnalytics({
@@ -96,7 +98,19 @@ export async function loader(args: LoaderFunctionArgs) {
  * needed to render the page. If it's unavailable, the whole page should 400 or 500 error.
  */
 async function loadCriticalData({context}: LoaderFunctionArgs) {
-  return {};
+  const {storefront} = context;
+
+  const [header] = await Promise.all([
+    storefront.query(HEADER_QUERY, {
+      cache: storefront.CacheLong(),
+      variables: {
+        headerMenuHandle: 'main-menu', // Adjust to your header menu handle
+      },
+    }),
+    // Add other queries here, so that they are loaded in parallel
+  ]);
+
+  return {header};
 }
 
 /**
```

</recipe_implementation>