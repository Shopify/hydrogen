import { getLogger } from "../logging";
import { loadScript } from "../utils/load-script";
import { SHOPIFY_STOREFRONT_WEBMCP_SCRIPT } from "./constants";

const log = getLogger("webmcp");

export function loadShopifyWebMcpTools(): Promise<boolean | void> {
  if (
    (typeof document !== "undefined" && "modelContext" in document) ||
    (typeof navigator !== "undefined" && "modelContext" in navigator)
  ) {
    return loadScript(SHOPIFY_STOREFRONT_WEBMCP_SCRIPT, {
      in: "head",
      attributes: { id: "shopify-webmcp", crossorigin: "anonymous" },
    }).catch((error) => {
      log.warn("failed to load Shopify WebMCP", { error });
    });
  }

  return Promise.resolve();
}
