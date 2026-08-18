import { createElement, type ReactElement } from "react";

import {
  defineShopPayButton,
  getShopPayButtonDeclarativeShadowDomHtml,
  getShopPayButtonElementAttributes,
  SHOP_PAY_BUTTON_TAG_NAME,
  type ShopPayButtonOptions,
} from "../core/shop-pay/shop-pay";

export type ShopPayButtonProps = ShopPayButtonOptions;

const canUseDom = typeof document !== "undefined";
defineShopPayButton();

export function ShopPayButton(options: ShopPayButtonProps): ReactElement {
  return createElement(SHOP_PAY_BUTTON_TAG_NAME, {
    ...getShopPayButtonElementAttributes(options),
    ...(!canUseDom
      ? {
          dangerouslySetInnerHTML: {
            __html: getShopPayButtonDeclarativeShadowDomHtml(options),
          },
        }
      : {}),
  });
}
