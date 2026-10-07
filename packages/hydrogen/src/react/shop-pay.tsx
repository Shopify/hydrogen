import { createElement, type ReactElement } from "react";

import {
  defineShopPayButton,
  getShopPayButtonDeclarativeShadowDomHtml,
  getShopPayButtonElementAttributes,
  SHOP_PAY_BUTTON_TAG_NAME,
  type ShopPayButtonOptions,
} from "../core/shop-pay/shop-pay";

/**
 * Props for the ShopPayButton component. The props match the options of createShopPayButton.
 * The component doesn't accept `className` or `style` props.
 *
 * @publicDocs
 */
export type ShopPayButtonProps = ShopPayButtonOptions;

const canUseDom = typeof document !== "undefined";
defineShopPayButton();

/**
 * Renders a Shop Pay button that takes the customer to checkout with Shop Pay. The button renders on the server and shows before scripts load.
 *
 * Set the size and shape with the `width` and `borderRadius` props. The component doesn't accept `className` or `style` props.
 *
 * @param options - The checkout target, variants, attribution, and display settings for the button.
 * @returns The Shop Pay button element.
 * @publicDocs
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
