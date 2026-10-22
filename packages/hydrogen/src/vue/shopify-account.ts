import { defineComponent, h, shallowRef } from "vue";

/**
 * Props for the Vue `ShopifyAccount` component. Pass `ShopifyScripts` the `accountWidget` option
 * so the component has data to read.
 *
 * @publicDocs
 */
export type ShopifyAccountProps = {
  /** The handle of the menu to show in the account sheet, such as `customer-account-main-menu`. */
  menu?: string;
  /** The path that starts a customer sign-in. Defaults to `/customer_authentication/login`. */
  signInUrl?: string;
};

// The data lives in the single JSON script tag that `ShopifyScripts` renders, so every
// `ShopifyAccount` restarts together. The version only changes in the browser, after hydration.
const accountWidgetDataVersion = shallowRef(0);

/** Remounts every mounted `ShopifyAccount` so each one reads the updated JSON script tag. */
export function restartShopifyAccountWidgets() {
  accountWidgetDataVersion.value += 1;
}

/**
 * Renders Shopify's `shopify-account` component. The component reads its data once, when it
 * connects, so `ShopifyAccount` remounts it whenever the `accountWidget` data passed to
 * `ShopifyScripts` changes. The default slot fills the component's slots, such as
 * `signed-out-avatar`.
 *
 * @publicDocs
 */
export const ShopifyAccount = defineComponent({
  name: "ShopifyAccount",
  props: {
    menu: { type: String, default: undefined },
    signInUrl: { type: String, default: undefined },
  },
  setup(props, { slots }) {
    return () =>
      h(
        "shopify-account",
        {
          key: accountWidgetDataVersion.value,
          menu: props.menu,
          "sign-in-url": props.signInUrl,
        },
        slots.default?.(),
      );
  },
});
