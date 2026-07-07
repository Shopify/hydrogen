import { loadScript } from "../utils/load-script";
import { SHOPIFY_STOREFRONT_WEBMCP_SCRIPT } from "./constants";

export function loadShopifyWebMcpTools(): Promise<boolean | void> {
  if (
    (typeof document !== "undefined" && "modelContext" in document) ||
    (typeof navigator !== "undefined" && "modelContext" in navigator)
  ) {
    return loadScript(SHOPIFY_STOREFRONT_WEBMCP_SCRIPT, {
      in: "head",
      attributes: { crossorigin: "anonymous" },
    }).catch((error) => {
      console.warn("Failed to load Shopify WebMCP.", error);
    });
  }

  return Promise.resolve();
}
