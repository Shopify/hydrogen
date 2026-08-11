import { createElement, type ReactElement } from "react";

import {
  getShopPayButtonElementContentHtml,
  SHOP_PAY_BUTTON_TAG_NAME,
  type ShopPayButtonOptions,
} from "../core/shop-pay/shop-pay";

export type ShopPayButtonProps = ShopPayButtonOptions;

export function ShopPayButton(options: ShopPayButtonProps): ReactElement {
  return createElement(SHOP_PAY_BUTTON_TAG_NAME, {
    dangerouslySetInnerHTML: {
      __html: getShopPayButtonElementContentHtml(options),
    },
  });
}
