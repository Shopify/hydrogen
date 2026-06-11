import { bootstrapShopifyAnalytics } from "./bootstrap";

function attach() {
  const existingBus = window.Shopify?.headless?.analytics;
  if (!existingBus) {
    console.error("[h3] Analytics bus was not initialized before Shopify analytics setup.");
    return;
  }

  bootstrapShopifyAnalytics(existingBus);
}

(function init() {
  if (typeof window === "undefined") return;

  if (window.Shopify?.headless?.analytics) {
    attach();
  } else if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", attach, { once: true });
  } else {
    attach();
  }
})();
