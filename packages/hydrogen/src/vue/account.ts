import { defineComponent, h } from "vue";

import { CUSTOMER_ACCOUNT_PATHS } from "../core/url";
import { useLocalePathPrefix } from "./locale";

/**
 * Renders Shopify's `<shopify-account>` component, which shows the customer's avatar and opens an account sheet. The component reads the customer from the `/account/widget-data` route of `createCustomerAccountServerHandlers`, so the access token stays on the server, and signs in through `/account/login`.
 *
 * Below the locale provider, both URLs carry the locale's path prefix, such as `/fr-ca/account/widget-data`, so the account sheet shows in the page's language. Put content for the component's slots, such as an element with `slot="signed-out-avatar"`, in the default slot. Load the component's script with `<ShopifyScripts account />`. The component drops extra attributes, including `class` and `style`.
 *
 * @example
 * ```vue
 * <ShopifyAccount>
 *   <div slot="signed-out-avatar">Sign in</div>
 * </ShopifyAccount>
 * ```
 * @publicDocs
 */
export const ShopifyAccount = defineComponent({
  name: "ShopifyAccount",
  inheritAttrs: false,
  setup(_, { slots }) {
    const pathPrefix = useLocalePathPrefix();

    return () => {
      const prefix = pathPrefix.value ?? "";
      return h(
        "shopify-account",
        {
          "account-data-url": `${prefix}${CUSTOMER_ACCOUNT_PATHS.widgetData}`,
          "sign-in-url": `${prefix}${CUSTOMER_ACCOUNT_PATHS.login}`,
        },
        slots.default?.(),
      );
    };
  },
});
