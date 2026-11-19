import { createElement, type HTMLAttributes, type ReactElement } from "react";

import {
  COLLECTION_VIEW_TAG_NAME,
  getCollectionViewAttributes,
  type CollectionViewOptions,
} from "../core/collection/collection-view";

/**
 * Props for the `CollectionView` component: the collection, the number of products that the page
 * loaded, and HTML attributes such as `className` for the element.
 *
 * @publicDocs
 */
export type CollectionViewProps = CollectionViewOptions & HTMLAttributes<HTMLElement>;

/**
 * Sends the `shopify:collection:view` event when the collection page renders. Wrap the product
 * grid of the collection page. `ShopifyScripts` registers the element.
 *
 * The Storefront API has no product total for a collection, so pass the number of products that
 * the page loaded as `productsCount`. The element sends the event again when the collection
 * handle changes, but not when filters, sorting, or pagination change the products.
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
  return createElement(
    COLLECTION_VIEW_TAG_NAME,
    // React 18 sets `className` on custom elements as a `classname` attribute, so pass `class`.
    { ...rest, class: className, ...getCollectionViewAttributes({ collection, productsCount }) },
    children,
  );
}
