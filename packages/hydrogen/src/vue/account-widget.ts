import { defineComponent, h, shallowRef } from "vue";

import { CUSTOMER_ACCOUNT_PATHS } from "../core/url";

// The data lives in the single JSON script tag that `ShopifyScripts` renders, so every
// `AccountWidget` restarts together. Only the browser changes the version.
const accountWidgetDataVersion = shallowRef(0);

/** Remounts every mounted `AccountWidget` so each one reads the updated JSON script tag. */
export function restartAccountWidgets() {
  accountWidgetDataVersion.value += 1;
}

/**
 * Renders Shopify's account widget, the `shopify-account` component. The component reads its
 * data once, when it connects, so `AccountWidget` remounts it whenever the `accountWidget` data
 * passed to `ShopifyScripts` changes. Sign-in goes through Hydrogen's `/account/login` route.
 *
 * Use the `fallback` slot to replace the default avatar shown to signed-out visitors.
 *
 * @publicDocs
 */
export const AccountWidget = defineComponent({
  name: "AccountWidget",
  setup(_props, { slots }) {
    return () =>
      h(
        "shopify-account",
        { key: accountWidgetDataVersion.value, "sign-in-url": CUSTOMER_ACCOUNT_PATHS.login },
        slots.fallback ? h("div", { slot: "signed-out-avatar" }, slots.fallback()) : undefined,
      );
  },
});
