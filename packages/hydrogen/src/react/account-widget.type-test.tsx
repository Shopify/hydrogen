import type { ReactElement } from "react";
import { expectTypeOf } from "vitest";

import type { ShopifyAccountWidgetOptions } from "../core/account-widget";
import { ShopifyAccountWidget, type ShopifyAccountWidgetProps } from "./account-widget";

declare const avatar: ReactElement;

export function accountWidgetTypes() {
  const minimal = (
    <ShopifyAccountWidget
      storeDomain="your-store.myshopify.com"
      publicAccessToken="public-token"
      signedOutAvatar={avatar}
    />
  );
  const full = (
    <ShopifyAccountWidget
      storeDomain="your-store.myshopify.com"
      publicAccessToken="public-token"
      customerAccessToken={null}
      menu="customer-account-main-menu"
      signInUrl="/auth/login"
      nonce="nonce-1"
      signedOutAvatar={avatar}
      onOpen={(event) => expectTypeOf(event).toEqualTypeOf<CustomEvent<null>>()}
      onClose={(event) => expectTypeOf(event.detail).toEqualTypeOf<null>()}
    />
  );
  void minimal;
  void full;

  expectTypeOf<ShopifyAccountWidgetProps["signedOutAvatar"]>().toEqualTypeOf<ReactElement>();
  expectTypeOf<ShopifyAccountWidgetProps>().not.toHaveProperty("children");
  expectTypeOf<ShopifyAccountWidgetProps>().not.toHaveProperty("signedOutAvatarHtml");
  expectTypeOf<
    Omit<ShopifyAccountWidgetProps, "signedOutAvatar" | "onOpen" | "onClose">
  >().toEqualTypeOf<Omit<ShopifyAccountWidgetOptions, "signedOutAvatarHtml">>();

  // @ts-expect-error signedOutAvatar is required
  <ShopifyAccountWidget storeDomain="your-store.myshopify.com" publicAccessToken="public-token" />;

  <ShopifyAccountWidget
    storeDomain="your-store.myshopify.com"
    publicAccessToken="public-token"
    // @ts-expect-error signedOutAvatar must be a React element, not a string
    signedOutAvatar="<img>"
  />;

  <ShopifyAccountWidget
    storeDomain="your-store.myshopify.com"
    publicAccessToken="public-token"
    // @ts-expect-error signedOutAvatar must be a single element, not an array
    signedOutAvatar={[avatar]}
  />;

  <ShopifyAccountWidget
    storeDomain="your-store.myshopify.com"
    publicAccessToken="public-token"
    // @ts-expect-error signedOutAvatar must be a React element, not null
    signedOutAvatar={null}
  />;

  // @ts-expect-error the avatar is passed through signedOutAvatar, not children
  <ShopifyAccountWidget
    storeDomain="your-store.myshopify.com"
    publicAccessToken="public-token"
    signedOutAvatar={avatar}
  >
    {avatar}
  </ShopifyAccountWidget>;

  <ShopifyAccountWidget
    storeDomain="your-store.myshopify.com"
    publicAccessToken="public-token"
    signedOutAvatar={avatar}
    // @ts-expect-error the string renderer's HTML option is not a React prop
    signedOutAvatarHtml="<img>"
  />;

  <ShopifyAccountWidget
    storeDomain="your-store.myshopify.com"
    publicAccessToken="public-token"
    signedOutAvatar={avatar}
    // @ts-expect-error handlers receive the native CustomEvent, not a MouseEvent
    onOpen={(event: MouseEvent) => event}
  />;
}
