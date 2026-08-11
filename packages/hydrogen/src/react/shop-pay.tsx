import { createElement, type CSSProperties, type ReactElement } from "react";

import {
  getShopPayButtonElementContentHtml,
  SHOP_PAY_BUTTON_TAG_NAME,
  type ShopPayButtonOptions,
} from "../core/shop-pay/shop-pay";

export type ShopPayButtonProps = ShopPayButtonOptions & {
  className?: string;
  style?: CSSProperties;
};

export function ShopPayButton({ className, style, ...options }: ShopPayButtonProps): ReactElement {
  return createElement(SHOP_PAY_BUTTON_TAG_NAME, {
    dangerouslySetInnerHTML: {
      __html: getShopPayButtonElementContentHtml(options, {
        class: className,
        style: serializeReactStyle(style),
      }),
    },
  });
}

function serializeReactStyle(style: CSSProperties | undefined): string | undefined {
  if (!style) return undefined;

  return Object.entries(style)
    .filter((entry): entry is [string, string | number] => {
      const value = entry[1];
      return typeof value === "string" || typeof value === "number";
    })
    .map(([name, value]) => `${hyphenateStyleName(name)}:${value}`)
    .join(";");
}

function hyphenateStyleName(name: string): string {
  if (name.startsWith("--")) return name;
  return name.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`);
}
