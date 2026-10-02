import { createElement, type ReactElement } from "react";

import {
  defineShopPayButton,
  getShopPayButtonDeclarativeShadowDomHtml,
  getShopPayButtonElementAttributes,
  SHOP_PAY_BUTTON_TAG_NAME,
  type ShopPayButtonOptions,
} from "../core/shop-pay/shop-pay";

/**
 * Props accepted by the `ShopPayButton` component.
 *
 * @public
 */
export type ShopPayButtonProps = ShopPayButtonOptions;

const canUseDom = typeof document !== "undefined";
defineShopPayButton();

/**
 * Renders the Shop Pay button custom element. On the server it includes declarative shadow DOM
 * markup so the button renders before scripts load.
 *
 * @public
 */
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
