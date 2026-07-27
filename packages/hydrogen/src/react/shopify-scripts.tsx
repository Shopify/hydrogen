"use client";

import { createElement, Fragment, useEffect } from "react";
import type * as React from "react";

import {
  getShopifyScriptTags,
  initializeShopifyScripts,
  type ShopifyRoutesOptions,
  type ShopifyScriptTagsOptions,
} from "../core/shopify-scripts";

export type ShopifyScriptsProps = ShopifyScriptTagsOptions & {
  navigate?: ShopifyRoutesOptions["navigate"];
  routes?: ShopifyRoutesOptions["routes"];
  webMcp?: boolean;
};

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "shopify-chat": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    }
  }
}

export function ShopifyScripts(options: ShopifyScriptsProps) {
  const { consent, inbox = false, navigate, routes, webMcp = true, ...scriptOptions } = options;

  useEffect(() => {
    void initializeShopifyScripts({ inbox, navigate, routes, webMcp });
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- ShopifyScripts browser startup is initialized once from initial props.
  }, []);

  return createElement(
    Fragment,
    null,
    getShopifyScriptTags({ ...scriptOptions, consent, inbox }).tags.map(
      ({ tagName, attributes, innerHTML }, index) =>
        createElement(tagName, {
          key: index,
          ...getReactAttributes(attributes),
          ...(innerHTML ? { dangerouslySetInnerHTML: { __html: innerHTML } } : {}),
        }),
    ),
  );
}

function getReactAttributes(attributes: Record<string, string | boolean> = {}) {
  const reactAttributes = Object.fromEntries(
    Object.entries(attributes).map(([name, value]) => [
      name === "crossorigin" ? "crossOrigin" : name,
      value,
    ]),
  );

  if (attributes.nonce !== undefined) {
    // Browsers intentionally hide nonce content attributes from getAttribute(),
    // which can make React report a false hydration mismatch for SSR scripts.
    reactAttributes.suppressHydrationWarning = true;
  }

  if (attributes.async === true && typeof attributes.src === "string") {
    // React hoists async scripts without handlers, which can let them execute before
    // the inline Shopify bootstrap scripts that configure their globals.
    return { ...reactAttributes, onLoad: disableReactScriptHoisting };
  }

  return reactAttributes;
}

const disableReactScriptHoisting = () => {};
