"use client";

import { createElement, type HTMLAttributes, type ReactElement, useRef } from "react";

import type { ViewEventElement } from "../../vendor/standard-events";
import {
  getCollectionViewAttributes,
  type CollectionViewOptions,
} from "../core/collection/collection-view";
import { VIEW_EVENT_TAG_NAME } from "../core/shopify-scripts/view-event-element";
import { useViewEvent } from "./use-view-event";

/**
 * Props for the `CollectionView` component: the collection, the number of products that the page
 * loaded, and HTML attributes such as `className` for the element.
 *
 * @publicDocs
 */
export type CollectionViewProps = CollectionViewOptions & HTMLAttributes<HTMLElement>;

/**
 * Sends the `shopify:collection:view` event when the collection page renders. Wrap the product
 * grid of the collection page. It renders a `VIEW_EVENT_TAG_NAME` element, which `ShopifyScripts`
 * registers.
 *
 * The Storefront API has no product total for a collection, so pass the number of products that
 * the page loaded as `productsCount`. The element sends the event again when the collection
 * handle changes, but not when filters, sorting, or pagination change the products. Inside a
 * React `<Activity>`, the element sends the event again each time it is shown.
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
  const ref = useRef<HTMLElement & ViewEventElement>(null);
  // Sends the view on mount, when the handle changes, and when an <Activity> shows it again.
  useViewEvent(ref, true, collection.handle);

  return createElement(
    VIEW_EVENT_TAG_NAME,
    {
      ...rest,
      ref,
      // React 18 doesn't map `className` to `class` on custom elements.
      class: className,
      ...getCollectionViewAttributes({ collection, productsCount }),
      "view-event-trigger": "manual",
    },
    children,
  );
}
