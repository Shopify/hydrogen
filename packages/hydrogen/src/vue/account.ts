import { Comment, defineComponent, Fragment, h, isVNode, Text, type VNode } from "vue";

import { CUSTOMER_ACCOUNT_PATHS } from "../core/url";
import { useLocalePathPrefix } from "./locale";

/**
 * Renders Shopify's `<shopify-account>` component, which shows the customer's avatar and opens an account sheet. The component reads the customer from the `/account/widget-data` route of `createCustomerAccountServerHandlers`, so the access token stays on the server, and signs in through `/account/login`.
 *
 * Below the locale provider, both URLs carry the locale's path prefix, such as `/fr-ca/account/widget-data`, so the account sheet shows in the page's language. The `signedOutAvatar` slot shows in place of the avatar while the customer is signed out. Vue doesn't convert slot names, so use `#signedOutAvatar`, not `#signed-out-avatar`. Load the component's script with `<ShopifyScripts account />`. The component drops extra attributes, including `class` and `style`.
 *
 * @example
 * ```vue
 * <ShopifyAccount>
 *   <template #signedOutAvatar>Sign in</template>
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
      const signedOutAvatar = slots.signedOutAvatar?.();
      return h(
        "shopify-account",
        {
          "account-data-url": `${prefix}${CUSTOMER_ACCOUNT_PATHS.widgetData}`,
          "sign-in-url": `${prefix}${CUSTOMER_ACCOUNT_PATHS.login}`,
        },
        signedOutAvatar?.some(isVisible)
          ? // `display: contents` keeps the wrapper out of the layout, so the content sits in the
            // component's avatar button as if it were slotted directly.
            [
              h(
                "div",
                { slot: "signed-out-avatar", style: { display: "contents" } },
                signedOutAvatar,
              ),
            ]
          : [],
      );
    };
  },
});

// An empty slot hides the component's default signed-out icon, so a slot that renders only
// comments, such as a false `v-if`, whitespace, or an empty `v-for` counts as no content.
function isVisible(node: VNode): boolean {
  if (node.type === Comment) return false;
  if (node.type === Text) return String(node.children).trim() !== "";
  if (node.type === Fragment)
    return Array.isArray(node.children) && node.children.some(isVnodeVisible);
  return true;
}

function isVnodeVisible(child: unknown): boolean {
  return isVNode(child) ? isVisible(child) : typeof child === "string" && child.trim() !== "";
}
