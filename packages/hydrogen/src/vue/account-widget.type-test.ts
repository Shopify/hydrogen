import { describe, expectTypeOf, it } from "vitest";
import { h, type VNode } from "vue";

import type { ShopifyAccountWidgetOptions } from "../core/account-widget";
import {
  ShopifyAccountWidget,
  type ShopifyAccountWidgetEventHandler,
  type ShopifyAccountWidgetProps,
  type ShopifyAccountWidgetSlots,
} from "./account-widget";

type Instance = InstanceType<typeof ShopifyAccountWidget>;
type InstanceProps = Instance["$props"];
type InstanceSlots = Instance["$slots"];

const avatar = () => [h("img")];

describe("ShopifyAccountWidget types", () => {
  it("mirrors the core structure options without the string renderer's HTML option", () => {
    expectTypeOf<ShopifyAccountWidgetProps>().toEqualTypeOf<
      Omit<ShopifyAccountWidgetOptions, "signedOutAvatarHtml">
    >();
    expectTypeOf<ShopifyAccountWidgetProps>().not.toHaveProperty("signedOutAvatarHtml");
    expectTypeOf<InstanceProps>().not.toHaveProperty("signedOutAvatarHtml");
    expectTypeOf<InstanceProps["storeDomain"]>().toEqualTypeOf<string>();
    expectTypeOf<InstanceProps["customerAccessToken"]>().toEqualTypeOf<
      string | null | undefined
    >();
  });

  it("declares a required signed-out-avatar slot and no default slot", () => {
    expectTypeOf<ShopifyAccountWidgetSlots>().toEqualTypeOf<{
      "signed-out-avatar": () => VNode[];
    }>();
    expectTypeOf<InstanceSlots["signed-out-avatar"]>().toEqualTypeOf<() => VNode[]>();
    expectTypeOf<InstanceSlots>().not.toHaveProperty("default");
    expectTypeOf<keyof InstanceSlots>().toEqualTypeOf<"signed-out-avatar">();
  });

  it("types open and close handlers with the native CustomEvent<null>", () => {
    expectTypeOf<ShopifyAccountWidgetEventHandler>().toEqualTypeOf<
      (event: CustomEvent<null>) => void
    >();
    expectTypeOf<Parameters<NonNullable<InstanceProps["onOpen"]>>>().toEqualTypeOf<
      [event: CustomEvent<null>]
    >();
    expectTypeOf<Parameters<NonNullable<InstanceProps["onClose"]>>>().toEqualTypeOf<
      [event: CustomEvent<null>]
    >();

    h(
      ShopifyAccountWidget,
      {
        storeDomain: "your-store.myshopify.com",
        publicAccessToken: "public-token",
        customerAccessToken: null,
        menu: "customer-account-main-menu",
        signInUrl: "/auth/login",
        nonce: "nonce-1",
        onOpen: (event) => expectTypeOf(event).toEqualTypeOf<CustomEvent<null>>(),
        onClose: (event) => expectTypeOf(event.detail).toEqualTypeOf<null>(),
      },
      { "signed-out-avatar": avatar },
    );

    h(
      ShopifyAccountWidget,
      {
        storeDomain: "your-store.myshopify.com",
        publicAccessToken: "public-token",
        // @ts-expect-error handlers receive the native CustomEvent, not a MouseEvent
        onOpen: (event: MouseEvent) => event,
      },
      { "signed-out-avatar": avatar },
    );
  });

  it("requires the store identity props", () => {
    // @ts-expect-error storeDomain and publicAccessToken are required
    h(ShopifyAccountWidget, { nonce: "nonce-1" }, { "signed-out-avatar": avatar });
  });

  it("does not enforce slot presence or reject unknown props at h() call sites", () => {
    // Vue's `h()` types slots as loose RawSlots and props as `RawProps & P`
    // (which includes `Record<string, any>`), so a missing required slot is
    // only caught by the synchronous runtime TypeError and unknown props such
    // as `signedOutAvatarHtml` are rejected by the instance props type rather
    // than at `h()` call sites.
    h(ShopifyAccountWidget, {
      storeDomain: "your-store.myshopify.com",
      publicAccessToken: "public-token",
    });
  });
});
