"use client";

import { createElement, type HTMLAttributes, type ReactElement, useRef } from "react";

import type { ViewEventElement } from "../../vendor/standard-events";
import { getProductViewAttributes, type ProductViewOptions } from "../core/product/product-view";
import { VIEW_EVENT_TAG_NAME } from "../core/shopify-scripts/view-event-element";
import { useViewEvent } from "./use-view-event";

export type ProductViewProps = ProductViewOptions & {
  /**
   * When the element sends the event. Defaults to the trigger of the context: `connect` for
   * `page`, `dialog` for `dialog`, and `intersect` for the card contexts. Set it when CSS stops the
   * default trigger, such as `connect` for a card with no box.
   */
  trigger?: "connect" | "intersect" | "dialog";
} & HTMLAttributes<HTMLElement>;

/**
 * Sends the `shopify:product:view` event for a product that the storefront shows. Wrap the
 * product page content with `context="page"`, and each product card with `collection`,
 * `search`, or `recommendation`. It renders a `VIEW_EVENT_TAG_NAME` element, which
 * `ShopifyScripts` registers.
 *
 * The element is inline by default. Give card elements a box, such as a class with
 * `display: block`, because card contexts send the event when half of the element is visible.
 * The element sends the event again when the product ID changes, but not when the variant changes.
 * Inside a React `<Activity>`, an element with the `connect` trigger, such as a `page` element,
 * sends the event again each time it is shown.
 *
 * Set `trigger` when CSS stops the default trigger. To send the event yourself, render a
 * `VIEW_EVENT_TAG_NAME` element with the attributes from
 * `getProductViewAttributes({ product, context, trigger: "manual" })` and your own ref, and call
 * the element's `dispatchViewEvent()`.
 *
 * @param props - The product, where the storefront shows it, the trigger, the children, and HTML attributes for the element.
 * @returns The product view element.
 * @publicDocs
 */
export function ProductView(props: ProductViewProps): ReactElement {
  // `context` and `trigger` go into the view attributes, not onto the element.
  const { product, context: _context, trigger: _trigger, children, className, ...rest } = props;
  const ref = useRef<HTMLElement & ViewEventElement>(null);
  const attributes = getProductViewAttributes(props);
  const sendsOnConnect = attributes["view-event-trigger"] === "connect";
  useViewEvent(ref, sendsOnConnect, product.id);

  return createElement(
    VIEW_EVENT_TAG_NAME,
    {
      ...rest,
      ref,
      // React 18 doesn't map `className` to `class` on custom elements.
      class: className,
      ...attributes,
      ...(sendsOnConnect
        ? // `useViewEvent` sends the view. It sends again when the product ID changes and
          // when an <Activity> shows the element again.
          { "view-event-trigger": "manual" }
        : // React remounts the element for a new product, so the element's own trigger runs
          // again. IntersectionObserver ignores elements in a hidden <Activity>.
          { key: product.id }),
    },
    children,
  );
}
