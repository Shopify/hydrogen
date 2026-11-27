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
import {
  getCollectionViewAttributes,
  type CollectionViewOptions,
} from "../core/collection/collection-view";
import { VIEW_EVENT_TAG_NAME } from "../core/shopify-scripts/view-event-element";
import { useViewEvent } from "./use-view-event";

/**
 * Props for the `CollectionView` component: the collection, the number of products that the page
 * loaded, the trigger, the element ref, and HTML attributes such as `className` for the element.
 *
 * @publicDocs
 */
export type CollectionViewProps = CollectionViewOptions &
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
         * When the element sends the event. Defaults to `connect`. Set it when the page needs
         * another trigger, such as `intersect`.
         */
        trigger?: "connect" | "intersect" | "dialog";
        elementRef?: never;
      }
  ) &
  HTMLAttributes<HTMLElement>;

/**
 * Sends the `shopify:collection:view` event when the collection page renders. Wrap the product
 * grid of the collection page. It renders a `VIEW_EVENT_TAG_NAME` element, which `ShopifyScripts`
 * registers.
 *
 * The Storefront API has no product total for a collection, so pass the number of products that
 * the page loaded as `productsCount`. The element sends the event again when the collection
 * handle changes, but not when filters, sorting, or pagination change the products. Inside a
 * React `<Activity>`, an element with the `connect` trigger sends the event again each time it is
 * shown.
 *
 * Set `trigger` when the page needs another trigger, such as `intersect`. With
 * `trigger="manual"`, the component doesn't send the event: pass an `elementRef` and call
 * `elementRef.current.dispatchViewEvent()`.
 *
 * @param props - The collection, the products count, the trigger, the element ref, the children, and HTML attributes for the element.
 * @returns The collection view element.
 * @publicDocs
 */
export function CollectionView(props: CollectionViewProps): ReactElement {
  // `productsCount` and `trigger` go into the view attributes, and `elementRef` into the ref, not
  // onto the element.
  const {
    collection,
    productsCount: _productsCount,
    trigger: _trigger,
    elementRef,
    children,
    className,
    ...rest
  } = props;
  const ref = useRef<HTMLElement & ViewEventElement>(null);
  const attributes = getCollectionViewAttributes(props);
  const effectiveTrigger = attributes["view-event-trigger"];
  const sendsOnConnect = effectiveTrigger === "connect";
  useViewEvent(ref, sendsOnConnect, collection.handle);

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
        ? // `useViewEvent` sends the view. It sends again when the collection handle changes and
          // when an <Activity> shows the element again.
          { "view-event-trigger": "manual" }
        : effectiveTrigger === "manual"
          ? // The app sends the view with `elementRef.current.dispatchViewEvent()`.
            {}
          : // React remounts the element for a new collection, so the element's own trigger runs
            // again. IntersectionObserver ignores elements in a hidden <Activity>.
            { key: collection.handle }),
    },
    children,
  );
}
