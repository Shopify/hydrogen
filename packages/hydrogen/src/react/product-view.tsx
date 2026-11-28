"use client";

import {
  createElement,
  type HTMLAttributes,
  type ReactElement,
  type Ref,
  useCallback,
  useRef,
} from "react";

import type { ViewEventElement } from "../../vendor/standard-events";
import { getProductViewAttributes, type ProductViewOptions } from "../core/product/product-view";
import { VIEW_EVENT_TAG_NAME } from "../core/shopify-scripts/view-event-element";
import { useViewEvent } from "./use-view-event";

export type ProductViewProps = ProductViewOptions &
  (
    | {
        /** Sends the event only when you call the element's `dispatchViewEvent()`. */
        trigger: "manual";
        /**
         * Ref to the element. Required with `trigger="manual"`: call
         * `elementRef.current.dispatchViewEvent()` to send the event. It is a normal prop, not
         * `ref`, so it works on React 18 without `forwardRef` and can be required.
         */
        elementRef: Ref<HTMLElement & ViewEventElement>;
      }
    | {
        /**
         * When the element sends the event. Defaults to the trigger of the context: `connect` for
         * `page`, `dialog` for `dialog`, and `intersect` for the card contexts. Set it when CSS
         * stops the default trigger, such as `connect` for a card with no box.
         */
        trigger?: "connect" | "intersect" | "dialog";
        elementRef?: never;
      }
  ) &
  HTMLAttributes<HTMLElement>;

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
 * Set `trigger` when CSS stops the default trigger. With `trigger="manual"`, the component doesn't
 * send the event: pass an `elementRef` and call `elementRef.current.dispatchViewEvent()`.
 *
 * @param props - The product, where the storefront shows it, the trigger, the element ref, the children, and HTML attributes for the element.
 * @returns The product view element.
 * @publicDocs
 */
export function ProductView(props: ProductViewProps): ReactElement {
  // `context` and `trigger` go into the view attributes, and `elementRef` into the ref, not onto
  // the element.
  const {
    product,
    context: _context,
    trigger: _trigger,
    elementRef,
    children,
    className,
    ...rest
  } = props;
  const ref = useRef<HTMLElement & ViewEventElement>(null);
  const attributes = getProductViewAttributes(props);
  const effectiveTrigger = attributes["view-event-trigger"];
  const sendsOnConnect = effectiveTrigger === "connect";
  useViewEvent(ref, sendsOnConnect, product.id);

  const mergedRef = useCallback(
    (element: (HTMLElement & ViewEventElement) | null) => {
      ref.current = element;
      if (typeof elementRef === "function") elementRef(element);
      else if (elementRef) elementRef.current = element;
    },
    [elementRef],
  );

  return createElement(
    VIEW_EVENT_TAG_NAME,
    {
      ...rest,
      ref: mergedRef,
      // React 18 doesn't map `className` to `class` on custom elements.
      class: className,
      ...attributes,
      ...(sendsOnConnect
        ? // `useViewEvent` sends the view. It sends again when the product ID changes and
          // when an <Activity> shows the element again.
          { "view-event-trigger": "manual" }
        : effectiveTrigger === "manual"
          ? // The app sends the view with `elementRef.current.dispatchViewEvent()`.
            {}
          : // React remounts the element for a new product, so the element's own trigger runs
            // again. IntersectionObserver ignores elements in a hidden <Activity>.
            { key: product.id }),
    },
    children,
  );
}
