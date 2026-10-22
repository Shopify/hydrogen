"use client";

import { createElement, useSyncExternalStore } from "react";
import type * as React from "react";

/**
 * Props for the React `ShopifyAccount` component. Pass `ShopifyScripts` the `accountWidget` option
 * so the component has data to read.
 *
 * @publicDocs
 */
export interface ShopifyAccountProps extends React.HTMLAttributes<HTMLElement> {
  /** The handle of the menu to show in the account sheet, such as `customer-account-main-menu`. */
  menu?: string;
  /** The path that starts a customer sign-in. Defaults to `/customer_authentication/login`. */
  signInUrl?: string;
}

// The data lives in the single JSON script tag that `ShopifyScripts` renders, so every
// `ShopifyAccount` restarts together. The version only changes in the browser, after hydration.
let accountWidgetDataVersion = 0;
const accountWidgetDataListeners = new Set<() => void>();

function subscribeToAccountWidgetData(listener: () => void) {
  accountWidgetDataListeners.add(listener);
  return () => {
    accountWidgetDataListeners.delete(listener);
  };
}

const getAccountWidgetDataVersion = () => accountWidgetDataVersion;
const getServerAccountWidgetDataVersion = () => 0;

/** Remounts every mounted `ShopifyAccount` so each one reads the updated JSON script tag. */
export function restartShopifyAccountWidgets() {
  accountWidgetDataVersion += 1;
  for (const listener of accountWidgetDataListeners) listener();
}

/**
 * Renders Shopify's `shopify-account` component. The component reads its data once, when it
 * connects, so `ShopifyAccount` remounts it whenever the `accountWidget` data passed to
 * `ShopifyScripts` changes.
 *
 * @param props - The menu, the sign-in path, HTML attributes, and the signed-out avatar slot content.
 * @returns The `shopify-account` element.
 * @publicDocs
 */
export function ShopifyAccount({ menu, signInUrl, children, ...attributes }: ShopifyAccountProps) {
  const version = useSyncExternalStore(
    subscribeToAccountWidgetData,
    getAccountWidgetDataVersion,
    getServerAccountWidgetDataVersion,
  );

  return createElement(
    "shopify-account",
    { ...attributes, key: version, menu, "sign-in-url": signInUrl },
    children,
  );
}
