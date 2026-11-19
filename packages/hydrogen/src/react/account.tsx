"use client";

import { createElement, type ReactElement, type ReactNode } from "react";

import { CUSTOMER_ACCOUNT_PATHS } from "../core/url";
import { useLocalePathPrefix } from "./locale";

/** Props for `ShopifyAccount`. */
export interface ShopifyAccountProps {
  /** Shows in place of the avatar while the customer is signed out, such as a "Sign in" label or an icon. */
  signedOutAvatar?: ReactNode;
}

/**
 * Renders Shopify's `<shopify-account>` component, which shows the customer's avatar and opens an account sheet. The component reads the customer from the `/account/widget-data` route of `createCustomerAccountServerHandlers`, so the access token stays on the server, and signs in through `/account/login`.
 *
 * Inside `LocaleProvider`, both URLs carry the locale's path prefix, such as `/fr-ca/account/widget-data`, so the account sheet shows in the page's language. Load the component's script with `<ShopifyScripts account />`. The component doesn't accept `className` or `style` props.
 *
 * @param props - The content to show while the customer is signed out.
 * @returns The `shopify-account` element.
 *
 * @example
 * ```tsx
 * <ShopifyAccount signedOutAvatar="Sign in" />
 * ```
 * @publicDocs
 */
export function ShopifyAccount({ signedOutAvatar }: ShopifyAccountProps): ReactElement {
  const pathPrefix = useLocalePathPrefix() ?? "";

  return createElement(
    "shopify-account",
    {
      "account-data-url": `${pathPrefix}${CUSTOMER_ACCOUNT_PATHS.widgetData}`,
      "sign-in-url": `${pathPrefix}${CUSTOMER_ACCOUNT_PATHS.login}`,
    },
    signedOutAvatar == null
      ? null
      : // `display: contents` keeps the wrapper out of the layout, so the content sits in the
        // component's avatar button as if it were slotted directly.
        createElement(
          "div",
          { slot: "signed-out-avatar", style: { display: "contents" } },
          signedOutAvatar,
        ),
  );
}
