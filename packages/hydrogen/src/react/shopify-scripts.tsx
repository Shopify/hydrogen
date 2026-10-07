"use client";

import { createElement, Fragment, useEffect } from "react";
import type * as React from "react";

import {
  getShopifyScriptTags,
  initializeShopifyScripts,
  type ShopifyRoutesOptions,
  type ShopifyScriptTagsOptions,
} from "../core/shopify-scripts";

/**
 * Props for the ShopifyScripts component in React and Vue. The component renders Shopify's script
 * tags and starts the scripts in the browser after hydration. The component starts the scripts
 * once, with the first props. Later prop changes don't restart the scripts.
 *
 * In Next.js App Router, render the component from a client component when you pass a consent `setup` function. Function props can't cross the server-to-client boundary.
 *
 * @publicDocs
 */
export type ShopifyScriptsProps = ShopifyScriptTagsOptions & {
  /** Navigates after Shopify's scripts resolve a URL to your app's route. Defaults to a full page load. */
  navigate?: ShopifyRoutesOptions["navigate"];
  /** Your app's custom route templates, which Shopify's scripts use to match storefront URLs. */
  routes?: ShopifyRoutesOptions["routes"];
  /** Loads Shopify's WebMCP tools when the browser supports WebMCP. Defaults to `true`. */
  webMcp?: boolean;
};

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "shopify-chat": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    }
  }
}

/**
 * Renders Shopify's script tags and starts the scripts in the browser after hydration. The component starts the scripts once, with the first props. Later prop changes don't restart the scripts.
 *
 * ShopifyScripts is a client component. In Next.js App Router, render it from a client component when you pass a consent `setup` function. Function props can't cross the server-to-client boundary.
 *
 * @param options - The script tag options, plus the consent, route, and WebMCP settings for starting the scripts.
 * @returns Shopify's link and script tags, with the link tags first.
 * @publicDocs
 */
export function ShopifyScripts(options: ShopifyScriptsProps) {
  const { consent, navigate, routes, webMcp = true, ...scriptOptions } = options;

  useEffect(() => {
    void initializeShopifyScripts({ consent, navigate, routes, webMcp });
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- ShopifyScripts browser startup is initialized once from initial props.
  }, []);

  return createElement(
    Fragment,
    null,
    getShopifyScriptTags({ ...scriptOptions, consent }).tags.map(
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
