import { renderShopPayButton, type ShopPayButtonOptions } from "@shopify/hydrogen";

export function ShopPayButton(props: ShopPayButtonOptions) {
  // Trusted markup produced by @shopify/hydrogen; user inputs are escaped by
  // renderShopPayButton.
  return <div style={{ display: "contents" }} innerHTML={renderShopPayButton(props)} />;
}
