import { createElement, type ReactElement } from "react";

import {
  getShopPayButtonDeclarativeShadowDomHtml,
  getShopPayButtonElementAttributes,
  initializeShopPayButtonElement,
  SHOP_PAY_BUTTON_TAG_NAME,
  type ShopPayButtonOptions,
} from "../core/shop-pay/shop-pay";

export type ShopPayButtonProps = ShopPayButtonOptions;

const canUseDom = typeof document !== "undefined";

export function ShopPayButton(options: ShopPayButtonProps): ReactElement {
  return createElement(SHOP_PAY_BUTTON_TAG_NAME, {
    ...getShopPayButtonElementAttributes(options),
    ...(canUseDom
      ? {
          ref: (element: unknown) => {
            if (element instanceof HTMLElement) initializeShopPayButtonElement(element, options);
          },
        }
      : {
          dangerouslySetInnerHTML: {
            __html: getShopPayButtonDeclarativeShadowDomHtml(options),
          },
        }),
  });
}
