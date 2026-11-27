"use client";

import {
  createElement,
  forwardRef,
  type HTMLAttributes,
  type ReactElement,
  type ReactNode,
  type Ref,
  useCallback,
  useRef,
} from "react";

import type { ViewEventElement } from "../../vendor/standard-events";
import { getProductViewAttributes, type ProductViewOptions } from "../core/product/product-view";
import { VIEW_EVENT_TAG_NAME } from "../core/shopify-scripts/view-event-element";
import { useViewEvent } from "./use-view-event";

/**
 * Props for the `ProductView` component: the product, where the storefront shows it, an optional
 * trigger, a ref to the element, and HTML attributes such as `className` for the element.
 *
 * @publicDocs
 */
export type ProductViewProps = ProductViewOptions &
  HTMLAttributes<HTMLElement> & {
    /** Ref to the element. With `trigger="manual"`, call its `dispatchViewEvent()` to send the event. */
    ref?: Ref<HTMLElement & ViewEventElement>;
  };

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
 * send the event: pass a `ref` and call the element's `dispatchViewEvent()`.
 *
 * @param props - The product, where the storefront shows it, the trigger, the children, and HTML attributes for the element.
 * @returns The product view element.
 * @publicDocs
 */
export const ProductView: (props: ProductViewProps) => ReactNode = forwardRef<
  HTMLElement & ViewEventElement,
  ProductViewProps
>(function ProductView(props, forwardedRef): ReactElement {
  // `forwardRef` passes `ref` on React 18, which doesn't pass `ref` to function components. The
  // function type on the export keeps the generated docs for a function.
  // `context` and `trigger` go into the view attributes, not onto the element.
  const { product, context: _context, trigger: _trigger, children, className, ...rest } = props;
  const ref = useRef<HTMLElement & ViewEventElement>(null);
  const attributes = getProductViewAttributes(props);
  const effectiveTrigger = attributes["view-event-trigger"];
  const sendsOnConnect = effectiveTrigger === "connect";
  useViewEvent(ref, sendsOnConnect, product.id);

  const mergedRef = useCallback(
    (element: (HTMLElement & ViewEventElement) | null) => {
      ref.current = element;
      if (typeof forwardedRef === "function") forwardedRef(element);
      else if (forwardedRef) forwardedRef.current = element;
    },
    [forwardedRef],
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
          ? // The app sends the view with the element's `dispatchViewEvent()`.
            {}
          : // React remounts the element for a new product, so the element's own trigger runs
            // again. IntersectionObserver ignores elements in a hidden <Activity>.
            { key: product.id }),
    },
    children,
  );
});
