import {
  defineShopPayButton,
  getShopPayButtonDeclarativeShadowDomHtml,
  getShopPayButtonElementAttributes,
  SHOP_PAY_BUTTON_TAG_NAME,
  type ShopPayButtonOptions,
} from "@shopify/hydrogen";
import { Dynamic } from "solid-js/web";

const canUseDom = typeof document !== "undefined";
defineShopPayButton();

export function ShopPayButton(props: ShopPayButtonOptions) {
  // Trusted markup produced by @shopify/hydrogen; user inputs are escaped by
  // the shared Shop Pay render helpers.
  return (
    <Dynamic
      component={SHOP_PAY_BUTTON_TAG_NAME}
      {...getShopPayButtonElementAttributes(props)}
      {...(!canUseDom ? { innerHTML: getShopPayButtonDeclarativeShadowDomHtml(props) } : {})}
    />
  );
}
