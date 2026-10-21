import { gql, type StorefrontApi } from "@shopify/hydrogen";

import type { Env } from "../env.ts";
import type { Shopify } from "../middleware/shopify.ts";
import { getCartInitialData, type CartInitialData } from "./cart.ts";
import type { Locale } from "./public/i18n.ts";
import { contentCache } from "./storefront.ts";

const MENU_FRAGMENT = gql(`
  fragment MenuItem on MenuItem {
    id
    resourceId
    tags
    title
    type
    url
  }
  fragment ChildMenuItem on MenuItem {
    ...MenuItem
  }
  fragment ParentMenuItem on MenuItem {
    ...MenuItem
    items {
      ...ChildMenuItem
    }
  }
  fragment Menu on Menu {
    id
    items {
      ...ParentMenuItem
    }
  }
`);

const HEADER_QUERY = gql(
  `
  fragment Shop on Shop {
    id
    name
    description
    primaryDomain {
      url
    }
    brand {
      logo {
        image {
          url
        }
      }
    }
  }
  query Header(
    $country: CountryCode
    $headerMenuHandle: String!
    $language: LanguageCode
  ) @inContext(language: $language, country: $country) {
    shop {
      ...Shop
    }
    localization {
      country {
        currency {
          isoCode
        }
      }
    }
    menu(handle: $headerMenuHandle) {
      ...Menu
    }
  }
`,
  [MENU_FRAGMENT],
);

const FOOTER_QUERY = gql(
  `
  query Footer(
    $country: CountryCode
    $footerMenuHandle: String!
    $language: LanguageCode
  ) @inContext(language: $language, country: $country) {
    menu(handle: $footerMenuHandle) {
      ...Menu
    }
  }
`,
  [MENU_FRAGMENT],
);

export type HeaderData = StorefrontApi.ResultOf<typeof HEADER_QUERY>;
export type MenuData = NonNullable<HeaderData["menu"]>;

/** Everything the document shell renders around a page: menus, cart, and analytics. */
export type Layout = {
  header: HeaderData;
  footerMenu: MenuData | null;
  cart: CartInitialData;
  isLoggedIn: boolean;
  locale: Locale;
  publicStoreDomain: string;
  shop: { shopId: string; storefrontId: string; myshopifyDomain: string };
  currency: string | undefined;
};

const FALLBACK_STOREFRONT_ID = "0";

export async function loadLayout({
  env,
  locale,
  request,
  shopify,
}: {
  env: Env;
  locale: Locale;
  request: Request;
  shopify: Shopify;
}): Promise<Layout> {
  const { customerAccount, requestContext, storefront } = shopify;

  const [header, footer, cart, isLoggedIn] = await Promise.all([
    storefront.graphql(HEADER_QUERY, {
      cache: contentCache(),
      variables: { headerMenuHandle: "main-menu" },
    }),
    // The footer is below the fold: a failure renders the fallback menu, not an error page.
    storefront
      .graphql(FOOTER_QUERY, { cache: contentCache(), variables: { footerMenuHandle: "footer" } })
      .catch((error: unknown) => {
        console.error(error);
        return null;
      }),
    getCartInitialData({ request, storefrontClient: storefront }),
    customerAccount.session.isLoggedIn(customerAccount.sessionManager, requestContext),
  ]);

  if (!header.data) {
    throw new Error("The header query returned no data.", { cause: header.errors });
  }

  return {
    header: header.data,
    footerMenu: footer?.data?.menu ?? null,
    cart,
    isLoggedIn,
    locale,
    publicStoreDomain: env.PUBLIC_STORE_DOMAIN,
    shop: {
      shopId: env.SHOP_ID,
      storefrontId: env.PUBLIC_STOREFRONT_ID || FALLBACK_STOREFRONT_ID,
      myshopifyDomain: env.PUBLIC_STORE_DOMAIN,
    },
    currency: header.data.localization.country.currency.isoCode,
  };
}
