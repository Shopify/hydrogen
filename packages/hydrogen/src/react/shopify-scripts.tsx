"use client";

import { createElement, Fragment, useEffect } from "react";

import {
  getShopifyScriptTags,
  initializeShopifyScripts,
  type ShopifyScriptsOptions,
} from "../core/shopify-scripts/index";

export type ShopifyScriptsProps = ShopifyScriptsOptions;

export function ShopifyScripts(options: ShopifyScriptsProps) {
  const { navigate, routes, webMcp = true, ...scriptOptions } = options;

  useEffect(() => {
    void initializeShopifyScripts({ navigate, routes, webMcp });
  }, [navigate, routes, webMcp]);

  return createElement(
    Fragment,
    null,
    getShopifyScriptTags(scriptOptions).tags.map(({ tagName, attributes, innerHTML }, index) =>
      createElement(tagName, {
        key: index,
        // When a CSP nonce is supplied, the browser hides the parsed script's
        // nonce content attribute (exposing `nonce=""` while retaining the real
        // value on the `.nonce` property), which React reports as a hydration
        // attribute mismatch. Suppress that known, benign diff. Inline scripts
        // are already covered below via their `innerHTML` branch; this handles
        // the external (src) generated script.
        ...(scriptOptions.nonce !== undefined ? { suppressHydrationWarning: true } : {}),
        ...getReactAttributes(attributes),
        ...(innerHTML
          ? {
              suppressHydrationWarning: true,
              dangerouslySetInnerHTML: { __html: innerHTML },
            }
          : {}),
      }),
    ),
  );
}

function getReactAttributes(attributes: Record<string, string | boolean> = {}) {
  return Object.fromEntries(
    Object.entries(attributes).map(([name, value]) => [
      name === "crossorigin" ? "crossOrigin" : name,
      value,
    ]),
  );
}
