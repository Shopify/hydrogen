"use client";

import { createElement, type ReactElement, type ReactNode } from "react";

import { CUSTOMER_ACCOUNT_PATHS } from "../core/url";
import { useLocalePathPrefix } from "./locale";

/** Props for `ShopifyAccount`. */
export interface ShopifyAccountProps {
  /** Content for the component's slots, such as `<div slot="signed-out-avatar">Sign in</div>`. */
  children?: ReactNode;
}

/**
 * Renders Shopify's `<shopify-account>` component, which shows the customer's avatar and opens an account sheet. The component reads the customer from the `/account/widget-data` route of `createCustomerAccountServerHandlers`, so the access token stays on the server, and signs in through `/account/login`.
 *
 * Inside `LocaleProvider`, both URLs carry the locale's path prefix, such as `/fr-ca/account/widget-data`, so the account sheet shows in the page's language. Load the component's script with `<ShopifyScripts account />`.
 *
 * @param props - Content for the component's slots.
 * @returns The `shopify-account` element.
 *
 * @example
 * ```tsx
 * <ShopifyAccount>
 *   <div slot="signed-out-avatar">Sign in</div>
 * </ShopifyAccount>
 * ```
 * @publicDocs
 */
export function ShopifyAccount({ children }: ShopifyAccountProps): ReactElement {
  const pathPrefix = useLocalePathPrefix() ?? "";

  return createElement(
    "shopify-account",
    {
      "account-data-url": `${pathPrefix}${CUSTOMER_ACCOUNT_PATHS.widgetData}`,
      "sign-in-url": `${pathPrefix}${CUSTOMER_ACCOUNT_PATHS.login}`,
    },
    children,
  );
}
