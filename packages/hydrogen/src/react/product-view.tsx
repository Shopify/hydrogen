"use client";

import { createElement, type HTMLAttributes, type ReactElement, useRef } from "react";

import type { ViewEventElement } from "../../vendor/standard-events";
import { getProductViewAttributes, type ProductViewOptions } from "../core/product/product-view";
import { VIEW_EVENT_TAG_NAME } from "../core/shopify-scripts/view-event-element";
import { useViewEvent } from "./use-view-event";

/**
 * Props for the `ProductView` component: the product, where the storefront shows it, and
 * HTML attributes such as `className` for the element.
 *
 * @publicDocs
 */
export type ProductViewProps = ProductViewOptions & HTMLAttributes<HTMLElement>;

/**
 * Sends the `shopify:product:view` event for a product that the storefront shows. Wrap the
 * product page content with `context="page"`, and each product card with `collection`,
 * `search`, or `recommendation`. It renders a `VIEW_EVENT_TAG_NAME` element, which
 * `ShopifyScripts` registers.
 *
 * The element is inline by default. Give card elements a box, such as a class with
 * `display: block`, because card contexts send the event when half of the element is visible.
 * The element sends the event again when the product ID changes, but not when the variant changes.
 * Inside a React `<Activity>`, a `page` element sends the event again each time it is shown.
 *
 * @param props - The product, where the storefront shows it, the children, and HTML attributes for the element.
 * @returns The product view element.
 * @publicDocs
 */
export function ProductView(props: ProductViewProps): ReactElement {
  const { product, context, children, className, ...rest } = props;
  const ref = useRef<HTMLElement & ViewEventElement>(null);
  const isPage = context === "page";
  useViewEvent(ref, isPage, product.id);

  return createElement(
    VIEW_EVENT_TAG_NAME,
    {
      ...rest,
      ref,
      // React 18 doesn't map `className` to `class` on custom elements.
      class: className,
      ...getProductViewAttributes(props),
      ...(isPage
        ? // `useViewEvent` sends the page view. It sends again when the product ID changes and
          // when an <Activity> shows the page again.
          { "view-event-trigger": "manual" }
        : // React remounts the element for a new product, so the element's own trigger runs
          // again. IntersectionObserver ignores elements in a hidden <Activity>.
          { key: product.id }),
    },
    children,
  );
}
