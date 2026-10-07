import { createElement, type ReactElement } from "react";

import {
  defineShopPayButton,
  getShopPayButtonDeclarativeShadowDomHtml,
  getShopPayButtonElementAttributes,
  SHOP_PAY_BUTTON_TAG_NAME,
  type ShopPayButtonOptions,
} from "../core/shop-pay/shop-pay";

/**
 * Props for the ShopPayButton component in React and Vue. The props match the options of
 * createShopPayButton. During server rendering, the component outputs declarative shadow DOM,
 * which displays the button before scripts load. The component doesn't accept class or style props.
 *
 * @publicDocs
 */
export type ShopPayButtonProps = ShopPayButtonOptions;

const canUseDom = typeof document !== "undefined";
defineShopPayButton();

/**
 * Renders the Shop Pay button custom element. During server rendering, the component outputs
 * declarative shadow DOM, which displays the button before scripts load. The component takes the
 * options of createShopPayButton and doesn't accept `className` or `style` props.
 *
 * @param options - The checkout target, variants, attribution, and display settings for the button.
 * @returns The Shop Pay button custom element, with declarative shadow DOM during server rendering.
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
