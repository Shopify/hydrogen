"use client";

import { createElement, useSyncExternalStore } from "react";
import type * as React from "react";

import { CUSTOMER_ACCOUNT_PATHS } from "../core/url";

/**
 * Props for the React `AccountWidget` component. Pass `ShopifyScripts` the `accountWidget` option
 * so the widget has data to read.
 *
 * @publicDocs
 */
export interface AccountWidgetProps extends Omit<React.HTMLAttributes<HTMLElement>, "children"> {
  /** Replaces the default avatar shown to signed-out visitors, such as with your own icon. */
  fallback?: React.ReactNode;
}

// The data lives in the single JSON script tag that `ShopifyScripts` renders, so every
// `AccountWidget` restarts together. Only the browser changes the version.
let accountWidgetDataVersion = 0;
const accountWidgetDataListeners = new Set<() => void>();

function subscribeToAccountWidgetData(listener: () => void) {
  accountWidgetDataListeners.add(listener);
  return () => {
    accountWidgetDataListeners.delete(listener);
  };
}

const getAccountWidgetDataVersion = () => accountWidgetDataVersion;

/** Remounts every mounted `AccountWidget` so each one reads the updated JSON script tag. */
export function restartAccountWidgets() {
  accountWidgetDataVersion += 1;
  for (const listener of accountWidgetDataListeners) listener();
}

/**
 * Renders Shopify's account widget, the `shopify-account` component. The component reads its
 * data once, when it connects, so `AccountWidget` remounts it whenever the `accountWidget` data
 * passed to `ShopifyScripts` changes. Sign-in goes through Hydrogen's `/account/login` route.
 *
 * @param props - The signed-out fallback and HTML attributes.
 * @returns The `shopify-account` element.
 * @publicDocs
 */
export function AccountWidget({ fallback, ...attributes }: AccountWidgetProps) {
  // The server never bumps the version, and keys aren't part of the HTML, so hydration can use
  // the current version without remounting.
  const version = useSyncExternalStore(
    subscribeToAccountWidgetData,
    getAccountWidgetDataVersion,
    getAccountWidgetDataVersion,
  );

  return createElement(
    "shopify-account",
    { ...attributes, key: version, "sign-in-url": CUSTOMER_ACCOUNT_PATHS.login },
    fallback == null ? null : createElement("div", { slot: "signed-out-avatar" }, fallback),
  );
}
