import {
  getShopPayButtonAttributes,
  getShopPayButtonStyleProperties,
  loadShopJs,
  SHOP_PAY_BUTTON_TAG_NAME,
  type ShopPayButtonOptions,
} from "@shopify/hydrogen";
import { createEffect, createMemo, onCleanup, onMount } from "solid-js";

export function ShopPayButton(props: ShopPayButtonOptions) {
  let container: HTMLDivElement | undefined;
  let button: HTMLElement | null = null;
  const currentOptions = createMemo(() => ({ ...props }));

  function renderButton(options: ShopPayButtonOptions) {
    void loadShopJs().then(() => {
      if (!container) return;
      button?.remove();
      button = document.createElement(SHOP_PAY_BUTTON_TAG_NAME);
      for (const [name, value] of Object.entries(getShopPayButtonAttributes(options))) {
        button.setAttribute(name, value);
      }
      for (const [name, value] of Object.entries(getShopPayButtonStyleProperties(options))) {
        button.style.setProperty(name, value);
      }
      container.append(button);
    });
  }

  onMount(() => renderButton(currentOptions()));
  createEffect(() => {
    renderButton(currentOptions());
  });

  onCleanup(() => {
    button?.remove();
  });

  return <div ref={(element) => (container = element)} />;
}
