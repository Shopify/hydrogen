import { createElement, useEffect, useState, type CSSProperties, type MouseEvent } from "react";

import {
  getShopPayButtonAttributes,
  getShopPayButtonStyleProperties,
  handleShopPayCheckoutClick,
  loadShopJs,
  SHOP_PAY_BUTTON_TAG_NAME,
  type ShopPayButtonOptions,
} from "../core/shop-pay";

export type ShopPayButtonProps = Omit<ShopPayButtonOptions, "checkoutUrl"> & {
  className?: string;
  loadScript?: boolean;
};

type ShopPayButtonStyle = CSSProperties & Record<string, string>;

export function ShopPayButton({ className, loadScript = true, ...options }: ShopPayButtonProps) {
  const storefrontUrl = useStorefrontUrl();

  useEffect(() => {
    if (!loadScript) return;
    loadShopJs().catch((error: unknown) => {
      console.error("[hydrogen:error:ShopPay] shop-js failed to load:", error);
    });
  }, [loadScript]);

  const style = getShopPayButtonStyleProperties(options) as ShopPayButtonStyle;
  const effectiveOptions = {
    ...options,
    checkoutUrl: storefrontUrl,
  };
  const props = {
    ...getShopPayButtonAttributes(effectiveOptions),
    ...(className ? { className } : {}),
    ...(__DEV__
      ? {
          onClickCapture: (event: MouseEvent<HTMLElement>) => {
            handleShopPayCheckoutClick(event, effectiveOptions);
          },
        }
      : {}),
    ...(Object.keys(style).length > 0 ? { style } : {}),
  };

  return createElement(SHOP_PAY_BUTTON_TAG_NAME, props);
}

function useStorefrontUrl(): string | undefined {
  const [storefrontUrl, setStorefrontUrl] = useState<string>();

  useEffect(() => {
    setStorefrontUrl(window.location.origin);
  }, []);

  return storefrontUrl;
}
