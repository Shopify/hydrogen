import { defineComponent, h, onMounted, shallowRef, watch } from "vue";

import { getLogger } from "../core/logging";
import { hasShopifyAccountWidgetData } from "../core/shopify-scripts/account-widget";
import { CUSTOMER_ACCOUNT_PATHS } from "../core/url";

// The data lives in the single JSON script tag that `ShopifyScripts` renders, so every
// `AccountWidget` restarts together. Only the browser changes the version.
const accountWidgetDataVersion = shallowRef(0);

const log = getLogger("account-widget");

// Set when an `AccountWidget` mounts before the JSON script tag exists, such as when
// `ShopifyScripts` mounts later. The widget may have connected with no data to read.
let hasAccountWidgetsWithoutData = false;

/** Remounts every mounted `AccountWidget` so each one reads the updated JSON script tag. */
export function restartAccountWidgets() {
  hasAccountWidgetsWithoutData = false;
  accountWidgetDataVersion.value += 1;
}

/** Remounts every `AccountWidget` if one mounted before the JSON script tag existed. */
export function restartAccountWidgetsMissingData() {
  if (hasAccountWidgetsWithoutData) restartAccountWidgets();
}

function checkAccountWidgetData() {
  if (hasShopifyAccountWidgetData()) return;
  hasAccountWidgetsWithoutData = true;
  log.warn("account widget rendered without its data. Pass `accountWidget` to ShopifyScripts");
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
    onMounted(checkAccountWidgetData);
    watch(accountWidgetDataVersion, checkAccountWidgetData, { flush: "post" });

    return () =>
      h(
        "shopify-account",
        { key: accountWidgetDataVersion.value, "sign-in-url": CUSTOMER_ACCOUNT_PATHS.login },
        slots.fallback ? h("div", { slot: "signed-out-avatar" }, slots.fallback()) : undefined,
      );
  },
});
