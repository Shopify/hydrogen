import { createElement, type CSSProperties, type ReactElement } from "react";

import {
  getShopPayButtonAnchorAttributes,
  getShopPayButtonContentHtml,
  getShopPayButtonStyleProperties,
  SHOP_PAY_BUTTON_STYLES,
  SHOP_PAY_BUTTON_TAG_NAME,
  type ShopPayButtonOptions,
} from "../core/shop-pay/shop-pay";

export type ShopPayButtonProps = ShopPayButtonOptions & {
  className?: string;
  style?: CSSProperties;
};

type ShopPayButtonStyle = CSSProperties & Record<string, string>;

export function ShopPayButton({ className, style, ...options }: ShopPayButtonProps): ReactElement {
  const {
    class: buttonClassName,
    href,
    "aria-disabled": ariaDisabled,
    "aria-label": ariaLabel,
  } = getShopPayButtonAnchorAttributes(options);

  return createElement(
    SHOP_PAY_BUTTON_TAG_NAME,
    null,
    createElement("style", { dangerouslySetInnerHTML: { __html: SHOP_PAY_BUTTON_STYLES } }),
    createElement("a", {
      className: className ? `${buttonClassName} ${className}` : buttonClassName,
      href,
      "aria-disabled": ariaDisabled as "true" | undefined,
      "aria-label": ariaLabel,
      style: {
        ...(getShopPayButtonStyleProperties(options) as ShopPayButtonStyle),
        ...style,
      },
      // Static markup owned by this package; user-provided text is escaped by
      // getShopPayButtonContentHtml.
      dangerouslySetInnerHTML: { __html: getShopPayButtonContentHtml(options) },
    }),
  );
}
