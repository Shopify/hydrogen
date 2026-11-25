"use client";

import {
  createElement,
  useEffect,
  useLayoutEffect,
  useRef,
  type HTMLAttributes,
  type ReactElement,
} from "react";

import { connectCollectionUpdates } from "../core/collection/collection-updates";
import {
  getCollectionViewAttributes,
  type CollectionViewOptions,
} from "../core/collection/collection-view";
import { VIEW_EVENT_TAG_NAME } from "../core/shopify-scripts/view-event-element";
import { useRegisterBrowseChangeListener, useRequiredStore } from "./collection";

/**
 * Props for the `CollectionView` component: the collection, the number of products that the page
 * loaded, and HTML attributes such as `className` for the element.
 *
 * @publicDocs
 */
export type CollectionViewProps = CollectionViewOptions & HTMLAttributes<HTMLElement>;

/**
 * Sends the `shopify:collection:view` event when the collection page renders, and the
 * `shopify:collection:update` event for each filter or sort change that the customer makes.
 * Render it inside `CollectionProvider`, around the filter and sort controls, the results, and the
 * empty state. It renders a `VIEW_EVENT_TAG_NAME` element, which `ShopifyScripts` registers. The
 * component throws outside `CollectionProvider`.
 *
 * The Storefront API has no product total for a collection, so pass the number of products that
 * the page loaded as `productsCount`. The view event is sent again when the collection handle
 * changes, but not when filters, sorting, or pagination change the products. Each update event has
 * the products count before the change. Its promise resolves with the new `productsCount` when the
 * new results render, and rejects with an `AbortError` when the collection changes, when back or
 * forward navigation leaves the change, or when the component unmounts first. Back and forward
 * navigation send no update event.
 *
 * On a page without filters and without `CollectionProvider`, render `VIEW_EVENT_TAG_NAME`
 * with the attributes from `getCollectionViewAttributes` from `@shopify/hydrogen` instead.
 *
 * @param props - The collection, the products count, the children, and HTML attributes for the element.
 * @returns The collection view element.
 * @publicDocs
 */
export function CollectionView({
  collection,
  productsCount,
  children,
  className,
  ...rest
}: CollectionViewProps): ReactElement {
  const store = useRequiredStore("CollectionView");
  const registerBrowseChangeListener = useRegisterBrowseChangeListener("CollectionView");
  const elementRef = useRef<HTMLElement>(null);
  const viewRef = useRef<CollectionViewOptions>({ collection, productsCount });

  // A child's layout effect runs before the provider's layout effect that settles the store, so
  // the update promises resolve with the new count.
  useLayoutEffect(() => {
    viewRef.current = { collection, productsCount };
  });

  useEffect(() => {
    const target = elementRef.current;
    if (!target) return;
    const updates = connectCollectionUpdates(store, {
      target,
      getView: () => viewRef.current,
    });
    const unregister = registerBrowseChangeListener(updates.notify);
    return () => {
      unregister();
      updates.disconnect();
    };
  }, [store, registerBrowseChangeListener]);

  return createElement(
    VIEW_EVENT_TAG_NAME,
    {
      ...rest,
      ref: elementRef,
      // React 18 doesn't map `className` to `class` on custom elements.
      class: className,
      ...getCollectionViewAttributes({ collection, productsCount }),
    },
    children,
  );
}
