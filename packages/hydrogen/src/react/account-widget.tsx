"use client";

import { createElement, useEffect, useRef, type ReactElement, type RefObject } from "react";

import {
  getShopifyAccountWidgetStructure,
  type ShopifyAccountWidgetAttributes,
  type ShopifyAccountWidgetStructureOptions,
} from "../core/account-widget";

/** Handler for the `open` and `close` events dispatched by `<shopify-account>`. */
export type ShopifyAccountWidgetEventHandler = (event: CustomEvent<null>) => void;

export type ShopifyAccountWidgetProps = ShopifyAccountWidgetStructureOptions & {
  /**
   * Avatar shown while the customer is signed out and before Shopify's
   * component loads. Hydrogen wraps it in the `signed-out-avatar` slot with
   * `aria-hidden="true"`, so it must be visual only.
   */
  signedOutAvatar: ReactElement;
  /** Called when the account sheet opens. The event does not bubble. */
  onOpen?: ShopifyAccountWidgetEventHandler;
  /** Called when the account sheet closes. The event does not bubble. */
  onClose?: ShopifyAccountWidgetEventHandler;
};

type ShopifyAccountWidgetEventType = "open" | "close";

/** Narrows the native listener signature to the events Shopify dispatches. */
type ShopifyAccountElement = HTMLElement & {
  addEventListener(
    type: ShopifyAccountWidgetEventType,
    listener: ShopifyAccountWidgetEventHandler,
  ): void;
  removeEventListener(
    type: ShopifyAccountWidgetEventType,
    listener: ShopifyAccountWidgetEventHandler,
  ): void;
};

/**
 * Renders Shopify's `<shopify-account>` component and its `<shopify-store>`
 * configuration. Load the bundle by enabling `account` in
 * `ShopifyScripts`.
 *
 * `<shopify-store>` does not observe `customer-access-token` changes, so the
 * store subtree remounts whenever the store identity (domain, public token or
 * customer token) changes.
 *
 * @see {@link https://shopify.dev/docs/api/storefront-web-components/components/shopify-account | shopify-account}
 */
export function ShopifyAccountWidget(props: ShopifyAccountWidgetProps): ReactElement {
  const { signedOutAvatar, onOpen, onClose, ...options } = props;
  const { store, account, style, avatar } = getShopifyAccountWidgetStructure(options);
  const storeKey = getStoreKey(options);
  const accountRef = useRef<ShopifyAccountElement>(null);

  useShopifyAccountEvent(accountRef, "open", onOpen, storeKey);
  useShopifyAccountEvent(accountRef, "close", onClose, storeKey);

  return createElement(
    store.tagName,
    { key: storeKey, ...store.attributes },
    createElement(
      account.tagName,
      { ref: accountRef, ...account.attributes },
      createElement(style.tagName, {
        ...getStyleAttributes(style.attributes),
        dangerouslySetInnerHTML: { __html: style.textContent },
      }),
      createElement(avatar.tagName, avatar.attributes, signedOutAvatar),
    ),
  );
}

function useShopifyAccountEvent(
  accountRef: RefObject<ShopifyAccountElement | null>,
  type: ShopifyAccountWidgetEventType,
  handler: ShopifyAccountWidgetEventHandler | undefined,
  storeKey: string,
): void {
  useEffect(() => {
    const account = accountRef.current;
    if (account === null || handler === undefined) return;
    account.addEventListener(type, handler);
    return () => account.removeEventListener(type, handler);
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- storeKey remounts the account element, so the listener must re-attach to the new node.
  }, [accountRef, type, handler, storeKey]);
}

/**
 * `null` and `undefined` share the signed-out identity; an empty-string token
 * is a distinct (present) identity, matching the emitted attribute.
 */
function getStoreKey(options: ShopifyAccountWidgetStructureOptions): string {
  const token = options.customerAccessToken == null ? "" : `:${options.customerAccessToken}`;
  return `${options.storeDomain}\n${options.publicAccessToken}\n${token}`;
}

function getStyleAttributes(attributes: ShopifyAccountWidgetAttributes) {
  // Browsers intentionally hide nonce content attributes from getAttribute(),
  // which can make React report a false hydration mismatch for the SSR style.
  return attributes.nonce === undefined
    ? attributes
    : { ...attributes, suppressHydrationWarning: true };
}
