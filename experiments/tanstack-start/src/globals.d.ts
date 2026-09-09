import type { ShopifyGlobal } from "@shopify/hydrogen";

declare global {
  interface Window {
    // Populated progressively by the Shopify scripts `ShopifyScripts` injects.
    Shopify?: Partial<ShopifyGlobal>;
  }
}

// Native invoker-commands API (command/commandfor) used to open the cart and
// nav drawers declaratively. React's published types do not describe these
// button attributes yet.
declare module "react" {
  interface ButtonHTMLAttributes<T> {
    command?: string;
    commandfor?: string;
  }
}

export {};
