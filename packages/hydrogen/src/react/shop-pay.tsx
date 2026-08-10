import type { CSSProperties, ReactElement } from "react";

import {
  getShopPayButtonAnchorAttributes,
  getShopPayButtonContentHtml,
  getShopPayButtonStyleProperties,
  SHOP_PAY_BUTTON_STYLES,
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
  } = getShopPayButtonAnchorAttributes(options);

  return (
    <>
      <a
        className={className ? `${buttonClassName} ${className}` : buttonClassName}
        href={href}
        aria-disabled={ariaDisabled as "true" | undefined}
        style={{
          ...(getShopPayButtonStyleProperties(options) as ShopPayButtonStyle),
          ...style,
        }}
        // Static, locale-keyed markup owned by this package; user-provided
        // buttonText is escaped by getShopPayButtonContentHtml.
        dangerouslySetInnerHTML={{ __html: getShopPayButtonContentHtml(options) }}
      />
      <style>{SHOP_PAY_BUTTON_STYLES}</style>
    </>
  );
}
